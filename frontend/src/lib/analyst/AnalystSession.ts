import { GoogleGenAI, Modality, type LiveServerMessage, type Session } from '@google/genai'
import { ALL_TACTICS, Speaker, type Tactic, type TranscriptTurnBody } from '@shared/protocol'
import { MicCapture, int16ToBase64 } from '../liveCaller/audio'
import { fetchEphemeralToken } from '../liveCaller/token'

/** Same Live model — here used purely as a streaming transcriber (no audio out). */
const LIVE_MODEL = 'gemini-3.1-flash-live-preview'

const SILENT_INSTRUCTION =
  'You are a passive, silent transcription service for an English-language phone call between a support agent and a caller. Do NOT speak, respond, greet, or comment — produce no output of your own. Just listen.'

/** Finalize a turn after this much silence (no new transcription fragments).
 *  Shorter = lines commit and get analyzed sooner (more responsive transcript). */
const TURN_GAP_MS = 700

/** Also finalize early once the line reaches a sentence boundary past this
 *  length, so a long utterance is analyzed sentence-by-sentence instead of in
 *  one late block when the speaker finally pauses. */
const MIN_SENTENCE_CHARS = 24

/** Hard cap so a run-on (or punctuation-less transcription) still chunks. */
const MAX_TURN_CHARS = 180

export type AnalystStatus = 'connecting' | 'live' | 'ended' | 'error'

interface AnalysisResponse {
  speaker?: 'Caller' | 'Agent'
  /** The latest line rendered in clear English by the detector. */
  text?: string
  tactics?: { tactic?: string; confidence?: number; rationale?: string; quote?: string }[]
  risk?: number
  /** "The Ask" — what the caller is trying to get done. Empty strings if none yet. */
  ask?: { action?: string; target?: string }
  error?: string
}

export interface AnalystAsk {
  action: string
  target: string
  turnId: string
}

export interface AnalystFlag {
  tactic: Tactic
  confidence: number
  rationale: string
  turnId: string
}

export interface AnalystCallbacks {
  onStatus: (status: AnalystStatus, detail?: string) => void
  onTurn: (turn: TranscriptTurnBody) => void
  onFlag: (flag: AnalystFlag) => void
  onRisk: (score: number) => void
  onAsk: (ask: AnalystAsk) => void
}

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n))

/**
 * Analysis mode: Gemini Live transcribes a two-person conversation from one mic
 * (no audio out). Turns are chunked on silence, and each finalized turn is sent
 * to the `/analyze` detector, which infers the speaker (Caller vs Agent) from
 * content and flags manipulation tactics + a running risk score.
 */
export class AnalystSession {
  private session: Session | null = null
  private readonly mic = new MicCapture()
  private stopped = false

  private turnCounter = 0
  private currentTurnId: string | null = null
  private currentText = ''
  private gapTimer: ReturnType<typeof setTimeout> | null = null

  private readonly history: { speaker: 'Caller' | 'Agent'; text: string }[] = []
  private readonly queue: { turnId: string; text: string }[] = []
  private draining = false

  constructor(private readonly cb: AnalystCallbacks) {}

  async start(): Promise<void> {
    this.stopped = false
    this.cb.onStatus('connecting')
    const token = await fetchEphemeralToken()
    const ai = new GoogleGenAI({ apiKey: token, httpOptions: { apiVersion: 'v1alpha' } })
    this.session = await ai.live.connect({
      model: LIVE_MODEL,
      config: {
        // Native-audio Live models ONLY support the AUDIO response modality —
        // requesting TEXT fails the connect. We take AUDIO and simply never play
        // it; the human speech we care about comes from inputAudioTranscription.
        // (`languageCodes` is Vertex-only — it throws on AI Studio keys.)
        responseModalities: [Modality.AUDIO],
        inputAudioTranscription: {},
        systemInstruction: SILENT_INSTRUCTION,
      },
      callbacks: {
        onopen: () => void this.onOpen(),
        onmessage: (m) => this.onMessage(m),
        onerror: (e) => {
          console.error('[sentinel] analyst live error:', e.message || e)
          this.cb.onStatus('error', e.message)
        },
        onclose: (e) => {
          if (e.code !== 1000) console.warn('[sentinel] analyst live closed:', e.code, e.reason)
          if (!this.stopped) this.cb.onStatus('ended')
        },
      },
    })
  }

  private async onOpen(): Promise<void> {
    this.cb.onStatus('live')
    await this.mic.start((pcm) => {
      this.session?.sendRealtimeInput({
        audio: { data: int16ToBase64(pcm), mimeType: 'audio/pcm;rate=16000' },
      })
    })
  }

  private onMessage(m: LiveServerMessage): void {
    // Only the INPUT transcription (the two humans) matters; the model's own
    // audio output is ignored (never played). Turn boundaries come from the
    // silence gap timer, not the model's turnComplete (which now tracks the
    // model's discarded responses, not the speakers).
    const text = m.serverContent?.inputTranscription?.text
    if (text) this.appendText(text)
  }

  private appendText(text: string): void {
    if (!this.currentTurnId) {
      this.currentTurnId = `turn-${this.turnCounter++}`
      this.currentText = ''
    }
    this.currentText += text
    this.cb.onTurn({
      turnId: this.currentTurnId,
      speaker: this.provisionalSpeaker(),
      text: this.currentText,
      final: false,
    })
    // Chunk into shorter turns: finalize at a sentence boundary (or a hard cap)
    // so each /analyze sees less and feedback arrives sooner; otherwise wait for
    // a short silence gap. (If transcription lacks punctuation, the gap/cap still
    // bound turn length.)
    const trimmed = this.currentText.trim()
    const endsSentence = /[.!?]["')\]]?\s*$/.test(this.currentText)
    if (trimmed.length >= MAX_TURN_CHARS || (endsSentence && trimmed.length >= MIN_SENTENCE_CHARS)) {
      this.finalizeTurn()
      return
    }
    if (this.gapTimer) clearTimeout(this.gapTimer)
    this.gapTimer = setTimeout(() => this.finalizeTurn(), TURN_GAP_MS)
  }

  /** Until the detector labels it, alternate from the last known speaker. */
  private provisionalSpeaker(): Speaker {
    const last = this.history[this.history.length - 1]
    if (!last) return Speaker.Caller
    return last.speaker === 'Caller' ? Speaker.Agent : Speaker.Caller
  }

  private finalizeTurn(): void {
    if (this.gapTimer) {
      clearTimeout(this.gapTimer)
      this.gapTimer = null
    }
    const turnId = this.currentTurnId
    const text = this.currentText.trim()
    this.currentTurnId = null
    this.currentText = ''
    if (!turnId || !text) return
    // Show the finalized text immediately (provisional speaker); the detector corrects it.
    this.cb.onTurn({ turnId, speaker: this.provisionalSpeaker(), text, final: true })
    this.queue.push({ turnId, text })
    void this.drain()
  }

  private async drain(): Promise<void> {
    if (this.draining) return
    this.draining = true
    while (this.queue.length > 0) {
      const item = this.queue.shift()
      if (item) await this.analyzeOne(item.turnId, item.text)
    }
    this.draining = false
  }

  private async analyzeOne(turnId: string, text: string): Promise<void> {
    if (this.stopped) return // teardown already happened — don't analyze a dead session
    let speaker: Speaker = this.provisionalSpeaker()
    try {
      const res = await fetch('/analyze', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ history: this.history.slice(-12), text }),
      })
      const data = (await res.json().catch(() => ({}))) as AnalysisResponse
      if (!res.ok || data.error) throw new Error(data.error ?? `analyze failed (${res.status})`)
      // The fetch can outlive a stop()/restart; never emit into a fresh run.
      if (this.stopped) return
      speaker = data.speaker === 'Agent' ? Speaker.Agent : Speaker.Caller
      // Keep the live transcript RAW (no live translation — that's what made lines
      // bleed into each other); just correct the speaker, and carry the detector's
      // English version as `translation` for an opt-in later view.
      const english = data.text?.trim()
      const translation = english && english !== text.trim() ? english : undefined
      this.cb.onTurn({ turnId, speaker, text, final: true, translation })
      for (const t of data.tactics ?? []) {
        if (t.tactic && (ALL_TACTICS as string[]).includes(t.tactic)) {
          this.cb.onFlag({
            turnId,
            tactic: t.tactic as Tactic,
            confidence: clamp(typeof t.confidence === 'number' ? t.confidence : 0.5, 0, 1),
            rationale: t.rationale ?? '',
          })
        }
      }
      if (typeof data.risk === 'number') this.cb.onRisk(clamp(data.risk, 0, 100))
      // "The Ask" — only surface it once the caller has actually asked for
      // something; never overwrite a known ask with a later empty line.
      const action = data.ask?.action?.trim()
      if (action) this.cb.onAsk({ action, target: data.ask?.target?.trim() ?? '', turnId })
    } catch (e) {
      // Per-turn analysis failure is non-fatal — keep the transcript, just log it.
      console.warn('[sentinel] /analyze failed:', e instanceof Error ? e.message : e)
    } finally {
      // History keeps the raw line (the actual conversation) for detector context.
      this.history.push({ speaker: speaker === Speaker.Agent ? 'Agent' : 'Caller', text })
    }
  }

  stop(): void {
    this.stopped = true
    if (this.gapTimer) {
      clearTimeout(this.gapTimer)
      this.gapTimer = null
    }
    // Flush an in-progress turn before tearing down.
    const turnId = this.currentTurnId
    const text = this.currentText.trim()
    this.currentTurnId = null
    this.currentText = ''
    if (turnId && text) {
      this.cb.onTurn({ turnId, speaker: this.provisionalSpeaker(), text, final: true })
      this.queue.push({ turnId, text })
      void this.drain()
    }
    this.mic.stop()
    try {
      this.session?.close()
    } catch {
      /* already closing */
    }
    this.session = null
    this.cb.onStatus('ended')
  }
}
