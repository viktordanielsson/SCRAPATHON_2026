import {
  AlertLevel,
  CallStatus,
  PROTOCOL_VERSION,
  type ClientControl,
  type Envelope,
  type ServerEvent,
  type ServerEventPayloadMap,
  type ServerEventType,
  type Tactic,
} from '@/sentinel/protocol'
import { AnalystSession } from '../analyst/AnalystSession'
import type { EventSource } from './EventSource'

/** Risk at/above which the CRITICAL banner fires (matches the protocol's Critical band). */
const ALERT_THRESHOLD = 75

/**
 * Per-tactic severity = the risk a SINGLE maxed-out (confidence 1.0) instance of
 * that tactic implies, as a probability 0-1. These are combined with a noisy-OR
 * (see {@link computeRisk}), so each detected factor is an independent signal:
 * several moderate factors stack into a high score, and a "clear" factor simply
 * contributes nothing — it can never pull the score down.
 */
const TACTIC_SEVERITY: Record<Tactic, number> = {
  Pretexting: 0.55,
  FalseAuthority: 0.5,
  Urgency: 0.45,
  Fear: 0.45,
  Reciprocity: 0.35,
  RapportBuilding: 0.25,
}

/**
 * Noisy-OR over the per-tactic PEAK confidence seen so far:
 *   risk = 1 - Π(1 - severity_t · peakConf_t)
 * Monotonic (peak confidences only grow), so the score never drops on a clean
 * turn. Example: 3 factors at 0.7 confidence ⇒ ~0.73 (High), regardless of how
 * many other factors stay clear.
 */
function computeRisk(peak: Map<Tactic, number>): number {
  let inv = 1
  for (const [tactic, conf] of peak) inv *= 1 - TACTIC_SEVERITY[tactic] * conf
  return Math.round((1 - inv) * 100)
}

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
  /** Peak confidence seen per tactic — the inputs to the factor-based score. */
  private readonly tacticPeak = new Map<Tactic, number>()
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
    this.tacticPeak.clear()
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
      onFlag: (flag) => {
        this.emit('tactic.flag', {
          flagId: `flag-${this.flagCounter++}`,
          tactic: flag.tactic,
          confidence: flag.confidence,
          rationale: flag.rationale,
          turnId: flag.turnId,
        })
        // The flag is what moves the score: track this tactic's peak confidence
        // and recompute the factor-based risk.
        const prev = this.tacticPeak.get(flag.tactic) ?? 0
        if (flag.confidence > prev) {
          this.tacticPeak.set(flag.tactic, flag.confidence)
          this.emitRisk()
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

  /** Recompute the factor-based risk from accumulated flags and emit it. */
  private emitRisk(): void {
    const score = computeRisk(this.tacticPeak)
    const delta = score - this.lastRisk
    this.lastRisk = score
    this.emit('risk.update', {
      score,
      delta,
      contributors: [...this.tacticPeak.entries()].map(([tactic, conf]) => ({
        tactic,
        weight: Math.round(TACTIC_SEVERITY[tactic] * conf * 100),
      })),
    })
    if (score >= ALERT_THRESHOLD && !this.alerted) {
      this.alerted = true
      this.emit('alert', {
        alertId: `alert-${this.seq}`,
        level: AlertLevel.Critical,
        message: `High manipulation risk detected (${score}/100).`,
        riskAtFire: score,
      })
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
