import { GoogleGenAI, Modality, type LiveServerMessage, type Session } from '@google/genai'
import { ALL_TACTICS, Speaker, type Tactic, type TranscriptTurnBody } from '@/sentinel/protocol'
import { diarizeTurnFn } from '@/lib/sentinel.functions'
import type { DiarizeResult } from '@/lib/sentinel.server'
import { MicCapture, int16ToBase64 } from '../liveCaller/audio'
import { fetchEphemeralToken } from '../liveCaller/token'

/** Same Live model — here used purely as a streaming transcriber (no audio out). */
const LIVE_MODEL = 'gemini-3.1-flash-live-preview'

const SILENT_INSTRUCTION =
  'You are a passive, silent transcription service for a phone call between a support agent and a caller. Transcribe speech VERBATIM in its original spoken language — never translate. Do NOT speak, respond, greet, or comment — produce no output of your own. Just listen.'

/**
 * Finalize a chunk after this much silence (no new transcription fragments).
 * Lower = snappier turn-taking, but a speaker's own mid-sentence pauses can
 * split one utterance into several chunks; the diarizer's segment-splitting and
 * label revisions absorb most of that.
 */
const TURN_GAP_MS = 500

/** How many already-attributed turns to give the diarizer as context. */
const WINDOW = 8

export type AnalystStatus = 'connecting' | 'live' | 'ended' | 'error'

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
}

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n))
const toSpeaker = (s?: string): Speaker => (s === 'Agent' ? Speaker.Agent : Speaker.Caller)

/**
 * Analysis mode: Gemini Live transcribes a two-person conversation from ONE
 * shared mic (no audio out, no acoustic diarization). Speech is chunked on
 * silence; each finalized chunk is sent to the detector, which acts as a
 * windowed diarizer — it splits the chunk into speaker-attributed segments,
 * may correct recent labels, flags manipulation tactics, and returns a running
 * risk score. We never guess the speaker by alternation; the detector owns it.
 */
export class AnalystSession {
  private session: Session | null = null
  private readonly mic = new MicCapture()
  private stopped = false

  private chunkCounter = 0
  private currentChunkId: string | null = null
  private currentText = ''
  private gapTimer: ReturnType<typeof setTimeout> | null = null
  /** Coalesces rapid transcription fragments into one interim emit per frame. */
  private interimRaf: number | null = null

  /** Finalized, attributed turns — the ground truth window we feed the diarizer. */
  private readonly committed: { turnId: string; speaker: Speaker; text: string }[] = []
  private readonly queue: { chunkId: string; text: string }[] = []
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
    // audio output is ignored. Chunk boundaries come from the silence gap timer.
    const text = m.serverContent?.inputTranscription?.text
    if (text) this.appendText(text)
  }

  /** A stable placeholder for in-progress text, until the detector attributes it. */
  private placeholderSpeaker(): Speaker {
    const last = this.committed[this.committed.length - 1]
    // Conversation tends to alternate, so lean to the *other* role than the last
    // finalized turn — but this is display-only; the diarizer sets the truth.
    if (!last) return Speaker.Caller
    return last.speaker === Speaker.Caller ? Speaker.Agent : Speaker.Caller
  }

  private appendText(text: string): void {
    if (!this.currentChunkId) {
      this.currentChunkId = `chunk-${this.chunkCounter++}`
      this.currentText = ''
    }
    this.currentText += text
    this.scheduleInterim()
    if (this.gapTimer) clearTimeout(this.gapTimer)
    this.gapTimer = setTimeout(() => this.finalizeChunk(), TURN_GAP_MS)
  }

  /** Emit the latest interim text at most once per animation frame (~60fps). */
  private scheduleInterim(): void {
    if (this.interimRaf !== null) return
    this.interimRaf = requestAnimationFrame(() => {
      this.interimRaf = null
      if (!this.currentChunkId) return
      this.cb.onTurn({
        turnId: `${this.currentChunkId}-0`,
        speaker: this.placeholderSpeaker(),
        text: this.currentText,
        final: false,
      })
    })
  }

  private cancelInterim(): void {
    if (this.interimRaf !== null) {
      cancelAnimationFrame(this.interimRaf)
      this.interimRaf = null
    }
  }

  private finalizeChunk(): void {
    if (this.gapTimer) {
      clearTimeout(this.gapTimer)
      this.gapTimer = null
    }
    this.cancelInterim()
    const chunkId = this.currentChunkId
    const text = this.currentText.trim()
    this.currentChunkId = null
    this.currentText = ''
    if (!chunkId || !text) return
    // Show the finalized text immediately (placeholder speaker); the diarizer
    // then corrects the speaker, may split it, and may relabel earlier turns.
    this.cb.onTurn({ turnId: `${chunkId}-0`, speaker: this.placeholderSpeaker(), text, final: true })
    this.queue.push({ chunkId, text })
    void this.drain()
  }

  private async drain(): Promise<void> {
    if (this.draining) return
    this.draining = true
    while (this.queue.length > 0) {
      const item = this.queue.shift()
      if (item) await this.diarizeOne(item.chunkId, item.text)
    }
    this.draining = false
  }

  private async diarizeOne(chunkId: string, text: string): Promise<void> {
    try {
      const res = (await diarizeTurnFn({
        data: {
          window: this.committed.slice(-WINDOW).map((c) => ({
            id: c.turnId,
            speaker: c.speaker === Speaker.Agent ? 'Agent' : 'Caller',
            text: c.text,
          })),
          text,
        },
      })) as DiarizeResult

      const segments = res.segments?.length ? res.segments : [{ speaker: 'Caller', text, tactics: [] }]

      segments.forEach((seg, i) => {
        const turnId = `${chunkId}-${i}`
        const speaker = toSpeaker(seg.speaker)
        const segText = seg.text?.trim() || text
        this.cb.onTurn({ turnId, speaker, text: segText, final: true })
        this.committed.push({ turnId, speaker, text: segText })
        for (const t of seg.tactics ?? []) {
          if (t.tactic && (ALL_TACTICS as string[]).includes(t.tactic)) {
            this.cb.onFlag({
              turnId,
              tactic: t.tactic as Tactic,
              confidence: clamp(typeof t.confidence === 'number' ? t.confidence : 0.5, 0, 1),
              rationale: t.rationale ?? '',
            })
          }
        }
      })

      // Apply speaker corrections to earlier committed turns (UPSERT by turnId).
      for (const rev of res.revisions ?? []) {
        const c = this.committed.find((x) => x.turnId === rev.id)
        if (c && (rev.speaker === 'Agent' || rev.speaker === 'Caller')) {
          const corrected = toSpeaker(rev.speaker)
          if (corrected !== c.speaker) {
            c.speaker = corrected
            this.cb.onTurn({ turnId: c.turnId, speaker: corrected, text: c.text, final: true })
          }
        }
      }
    } catch (e) {
      // Diarization failure is non-fatal — keep the chunk as a single turn.
      console.warn('[sentinel] diarize failed:', e instanceof Error ? e.message : e)
      const turnId = `${chunkId}-0`
      const speaker = this.placeholderSpeaker()
      this.committed.push({ turnId, speaker, text })
      this.cb.onTurn({ turnId, speaker, text, final: true })
    }
  }

  stop(): void {
    this.stopped = true
    if (this.gapTimer) {
      clearTimeout(this.gapTimer)
      this.gapTimer = null
    }
    this.cancelInterim()
    // Flush an in-progress chunk before tearing down.
    const chunkId = this.currentChunkId
    const text = this.currentText.trim()
    this.currentChunkId = null
    this.currentText = ''
    if (chunkId && text) {
      this.cb.onTurn({ turnId: `${chunkId}-0`, speaker: this.placeholderSpeaker(), text, final: true })
      this.queue.push({ chunkId, text })
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
