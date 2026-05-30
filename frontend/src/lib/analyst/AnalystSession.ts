import { GoogleGenAI, Modality, type LiveServerMessage, type Session } from '@google/genai'
import { ALL_TACTICS, Speaker, type Tactic, type TranscriptTurnBody } from '@shared/protocol'
import { MicCapture, int16ToBase64 } from '../liveCaller/audio'
import { fetchEphemeralToken } from '../liveCaller/token'

/** Same Live model — here used purely as a streaming transcriber (no audio out). */
const LIVE_MODEL = 'gemini-3.1-flash-live-preview'

const SILENT_INSTRUCTION =
  'You are a passive, silent transcription service for an English-language phone call between a support agent and a caller. Do NOT speak, respond, greet, or comment — produce no output of your own. Just listen.'

/** Finalize a turn after this much silence (no new transcription fragments). */
const TURN_GAP_MS = 1200

export type AnalystStatus = 'connecting' | 'live' | 'ended' | 'error'

interface AnalysisResponse {
  speaker?: 'Caller' | 'Agent'
  /** The latest line rendered in clear English by the detector. */
  text?: string
  tactics?: { tactic?: string; confidence?: number; rationale?: string; quote?: string }[]
  risk?: number
  error?: string
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
    let speaker: Speaker = this.provisionalSpeaker()
    let finalText = text
    try {
      const res = await fetch('/analyze', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ history: this.history.slice(-12), text }),
      })
      const data = (await res.json().catch(() => ({}))) as AnalysisResponse
      if (!res.ok || data.error) throw new Error(data.error ?? `analyze failed (${res.status})`)
      speaker = data.speaker === 'Agent' ? Speaker.Agent : Speaker.Caller
      if (data.text && data.text.trim()) finalText = data.text.trim() // English-normalized line
      this.cb.onTurn({ turnId, speaker, text: finalText, final: true }) // correct speaker + language
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
    } catch (e) {
      // Per-turn analysis failure is non-fatal — keep the transcript, just log it.
      console.warn('[sentinel] /analyze failed:', e instanceof Error ? e.message : e)
    } finally {
      this.history.push({ speaker: speaker === Speaker.Agent ? 'Agent' : 'Caller', text: finalText })
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
