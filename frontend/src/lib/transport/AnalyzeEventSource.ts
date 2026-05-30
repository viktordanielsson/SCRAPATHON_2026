import {
  AlertLevel,
  CallStatus,
  PROTOCOL_VERSION,
  type ClientControl,
  type Envelope,
  type ServerEvent,
  type ServerEventPayloadMap,
  type ServerEventType,
} from '@shared/protocol'
import { AnalystSession } from '../analyst/AnalystSession'
import type { EventSource } from './EventSource'

/** Risk at/above which the CRITICAL banner fires (matches the protocol's Critical band). */
const ALERT_THRESHOLD = 75

/**
 * In-browser EventSource for Analysis mode: two humans talk, Gemini transcribes
 * and the `/analyze` detector flags tactics + risk. It emits the same envelopes
 * the dashboard already consumes (this is the dev stand-in for the real backend's
 * detector), so the UI is unchanged.
 */
export class AnalyzeEventSource implements EventSource {
  private readonly listeners = new Set<(event: ServerEvent) => void>()
  private session: AnalystSession | null = null
  private seq = 0
  private sessionId = ''
  private lastRisk = 0
  private alerted = false
  private flagCounter = 0

  connect(): void {
    /* nothing to open until `start` */
  }

  subscribe(listener: (event: ServerEvent) => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  send(control: ClientControl): void {
    switch (control.cmd) {
      case 'subscribe':
        break
      case 'start':
        void this.run()
        break
      case 'stop':
        this.session?.stop()
        break
      case 'reset':
        this.teardown()
        break
      case 'transcript':
        // The browser is the source here; nothing to forward upstream in dev.
        break
    }
  }

  close(): void {
    this.teardown()
    this.listeners.clear()
  }

  private async run(): Promise<void> {
    this.teardown()
    this.sessionId = `analyze-${Date.now()}`
    this.seq = 0
    this.lastRisk = 0
    this.alerted = false
    this.emit('session.started', { sessionId: this.sessionId, voiceScoringEnabled: false })
    this.emit('call.status', { status: CallStatus.Connecting })

    this.session = new AnalystSession({
      onStatus: (status, detail) => {
        if (status === 'live') this.emit('call.status', { status: CallStatus.Live })
        else if (status === 'ended') this.emit('call.status', { status: CallStatus.Ended })
        else if (status === 'error') {
          this.emit('error', { code: 'analyze', message: detail ?? 'analysis error' })
          this.emit('call.status', { status: CallStatus.Error })
        }
      },
      onTurn: (turn) => this.emit('transcript.turn', turn),
      onFlag: (flag) =>
        this.emit('tactic.flag', {
          flagId: `flag-${this.flagCounter++}`,
          tactic: flag.tactic,
          confidence: flag.confidence,
          rationale: flag.rationale,
          turnId: flag.turnId,
        }),
      onAsk: (ask) =>
        this.emit('ask.update', {
          action: ask.action,
          target: ask.target,
          sourceTurnId: ask.turnId,
        }),
      onRisk: (score) => {
        const delta = score - this.lastRisk
        this.lastRisk = score
        this.emit('risk.update', { score, delta })
        if (score >= ALERT_THRESHOLD && !this.alerted) {
          this.alerted = true
          this.emit('alert', {
            alertId: `alert-${this.seq}`,
            level: AlertLevel.Critical,
            message: `High manipulation risk detected (${Math.round(score)}/100).`,
            riskAtFire: score,
          })
        }
      },
    })

    try {
      await this.session.start()
    } catch (e) {
      console.error('[sentinel] analyze start failed:', e)
      this.emit('error', { code: 'analyze_start', message: e instanceof Error ? e.message : String(e) })
      this.emit('call.status', { status: CallStatus.Error })
    }
  }

  private teardown(): void {
    this.session?.stop()
    this.session = null
  }

  private emit<T extends ServerEventType>(type: T, payload: ServerEventPayloadMap[T]): void {
    const envelope: Envelope<T> = {
      v: PROTOCOL_VERSION,
      type,
      seq: this.seq++,
      ts: Date.now(),
      sessionId: this.sessionId,
      payload,
    }
    const event = envelope as unknown as ServerEvent
    for (const listener of this.listeners) listener(event)
  }
}
