import { GoogleGenAI, Modality, type LiveServerMessage, type Session } from '@google/genai'
import { Speaker, type TranscriptTurnBody } from '@shared/protocol'
import { MicCapture, PcmPlayer, base64ToInt16, int16ToBase64 } from './audio'
import { getPersona } from './personas'
import { fetchEphemeralToken } from './token'

/** Native-audio Live model. Preview ids move fast — change here if it 404s. */
const LIVE_MODEL = 'gemini-3.1-flash-live-preview'

/** Nudges the caller to speak first (it plays the attacker, who initiates). */
const KICKOFF =
  '[The support line just connected and the agent is on the line. Open the call now, in character.]'

export type LiveStatus = 'connecting' | 'live' | 'ended' | 'error'

export interface LiveCallerCallbacks {
  onStatus: (status: LiveStatus, detail?: string) => void
  /** Fires for every interim and final transcript turn (Agent = mic, Caller = model). */
  onTurn: (turn: TranscriptTurnBody) => void
}

/**
 * Owns one in-browser Gemini Live voice call: mints a token, opens the session,
 * streams the mic up, plays the model's voice, and segments the input/output
 * transcriptions into transcript turns. Speaker mapping is exact — the mic is the
 * Agent, the model is the Caller — because they are two separate streams.
 */
export class LiveCallerSession {
  private session: Session | null = null
  private readonly mic = new MicCapture()
  private readonly player = new PcmPlayer()
  private stopped = false

  private turnCounter = 0
  private agentTurnId: string | null = null
  private agentText = ''
  private callerTurnId: string | null = null
  private callerText = ''

  constructor(private readonly cb: LiveCallerCallbacks) {}

  async start(personaId?: string): Promise<void> {
    this.stopped = false
    this.cb.onStatus('connecting')
    const token = await fetchEphemeralToken()
    const ai = new GoogleGenAI({ apiKey: token, httpOptions: { apiVersion: 'v1alpha' } })
    this.session = await ai.live.connect({
      model: LIVE_MODEL,
      config: {
        responseModalities: [Modality.AUDIO],
        // NOTE: `languageCodes` is Vertex-only and throws on AI Studio (Developer
        // API) keys, so transcription auto-detects language. The persona instructs
        // the model to speak English.
        inputAudioTranscription: {},
        outputAudioTranscription: {},
        systemInstruction: getPersona(personaId).instruction,
      },
      callbacks: {
        onopen: () => void this.onOpen(),
        onmessage: (m) => this.onMessage(m),
        onerror: (e) => this.cb.onStatus('error', e.message),
        onclose: () => {
          if (!this.stopped) this.cb.onStatus('ended')
        },
      },
    })
  }

  private async onOpen(): Promise<void> {
    this.cb.onStatus('live')
    await this.player.resume()
    await this.mic.start((pcm) => {
      this.session?.sendRealtimeInput({
        audio: { data: int16ToBase64(pcm), mimeType: 'audio/pcm;rate=16000' },
      })
    })
    // The caller initiates the call.
    this.session?.sendClientContent({ turns: KICKOFF, turnComplete: true })
  }

  private onMessage(m: LiveServerMessage): void {
    const sc = m.serverContent
    if (m.data) this.player.enqueue(base64ToInt16(m.data)) // 24 kHz audio out
    if (sc?.interrupted) this.player.interrupt()
    const inText = sc?.inputTranscription?.text
    if (inText) this.appendAgent(inText)
    const outText = sc?.outputTranscription?.text
    if (outText) this.appendCaller(outText)
    if (sc?.turnComplete) this.finalizeCaller()
  }

  // ── transcript segmentation ──
  // The two transcription streams are independent; we alternate turns: when one
  // speaker starts, we finalize the other's open turn. The model's `turnComplete`
  // closes the caller's turn.
  private appendAgent(text: string): void {
    if (this.callerTurnId) this.finalizeCaller()
    if (!this.agentTurnId) {
      this.agentTurnId = `agent-${this.turnCounter++}`
      this.agentText = ''
    }
    this.agentText += text
    this.cb.onTurn({ turnId: this.agentTurnId, speaker: Speaker.Agent, text: this.agentText, final: false })
  }

  private appendCaller(text: string): void {
    if (this.agentTurnId) this.finalizeAgent()
    if (!this.callerTurnId) {
      this.callerTurnId = `caller-${this.turnCounter++}`
      this.callerText = ''
    }
    this.callerText += text
    this.cb.onTurn({ turnId: this.callerTurnId, speaker: Speaker.Caller, text: this.callerText, final: false })
  }

  private finalizeAgent(): void {
    if (!this.agentTurnId) return
    this.cb.onTurn({ turnId: this.agentTurnId, speaker: Speaker.Agent, text: this.agentText, final: true })
    this.agentTurnId = null
    this.agentText = ''
  }

  private finalizeCaller(): void {
    if (!this.callerTurnId) return
    this.cb.onTurn({ turnId: this.callerTurnId, speaker: Speaker.Caller, text: this.callerText, final: true })
    this.callerTurnId = null
    this.callerText = ''
  }

  stop(): void {
    this.stopped = true
    this.finalizeAgent()
    this.finalizeCaller()
    this.mic.stop()
    this.player.close()
    try {
      this.session?.close()
    } catch {
      /* already closing */
    }
    this.session = null
    this.cb.onStatus('ended')
  }
}
