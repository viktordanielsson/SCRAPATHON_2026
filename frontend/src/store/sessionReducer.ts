import { produce } from 'immer'
import {
  CallStatus,
  Speaker,
  type AlertLevel,
  type ServerEvent,
  type ServerEventPayloadMap,
  type Tactic,
} from '@shared/protocol'

/** Bounded so a long call can't grow risk history without limit (~4 min @ 1/s). */
export const RISK_HISTORY_CAP = 240

export interface TurnState {
  speaker: Speaker
  text: string
  final: boolean
  /** Detector's English rendering of `text`, for an opt-in later view (not shown live). */
  translation?: string
  startMs?: number
  endMs?: number
}

export interface FlagState {
  tactic: Tactic
  confidence: number
  rationale: string
  turnId: string
  span?: [number, number]
}

export interface AlertState {
  alertId: string
  level: AlertLevel
  message: string
  riskAtFire: number
  relatedFlagIds: string[]
  dismissed: boolean
}

export interface AskState {
  action: string
  target: string
  sourceTurnId?: string
}

export type SummaryState = ServerEventPayloadMap['session.summary']

export interface SessionState {
  sessionId: string | null
  status: CallStatus
  callerLabel: string | null
  /** Ordering authority — the seq of the last applied non-heartbeat event. */
  lastSeq: number
  hasGap: boolean
  /** Insertion-ordered turn ids; `turns` holds the data (upsert by turnId). */
  turnIds: string[]
  turns: Record<string, TurnState>
  flagIds: string[]
  flags: Record<string, FlagState>
  risk: number
  peakRisk: number
  riskHistory: { seq: number; score: number }[]
  voiceScore: number | null
  voiceEnabled: boolean
  alerts: AlertState[]
  ask: AskState | null
  summary: SummaryState | null
  startedAt: number | null
  endedAt: number | null
}

export function freshState(): SessionState {
  return {
    sessionId: null,
    status: CallStatus.Idle,
    callerLabel: null,
    lastSeq: 0,
    hasGap: false,
    turnIds: [],
    turns: {},
    flagIds: [],
    flags: {},
    risk: 0,
    peakRisk: 0,
    riskHistory: [],
    voiceScore: null,
    voiceEnabled: false,
    alerts: [],
    ask: null,
    summary: null,
    startedAt: null,
    endedAt: null,
  }
}

/**
 * The single pure transition: every event runs through an ordering/idempotency
 * gate, then an exhaustive switch. The `never` default means adding a protocol
 * event without handling it here fails to compile.
 */
export function reduce(state: SessionState, evt: ServerEvent): SessionState {
  return produce(state, (s) => {
    // session.started resets everything and re-bases the seq counter.
    if (evt.type === 'session.started') {
      Object.assign(s, freshState())
      s.sessionId = evt.payload.sessionId
      s.voiceEnabled = evt.payload.voiceScoringEnabled
      s.lastSeq = evt.seq
      return
    }

    // ── ordering & idempotency gate ──
    if (s.sessionId && evt.sessionId !== s.sessionId) return // stale event from an old session
    if (evt.seq <= s.lastSeq) return // duplicate or out-of-order
    if (s.lastSeq !== 0 && evt.seq > s.lastSeq + 1) s.hasGap = true
    if (evt.type !== 'heartbeat') s.lastSeq = evt.seq

    switch (evt.type) {
      case 'call.status': {
        s.status = evt.payload.status
        if (evt.payload.callerLabel !== undefined) s.callerLabel = evt.payload.callerLabel
        if (evt.payload.status === CallStatus.Live && s.startedAt === null) s.startedAt = evt.ts
        if (
          evt.payload.status === CallStatus.Ended ||
          evt.payload.status === CallStatus.Error
        ) {
          s.endedAt = evt.ts
        }
        break
      }
      case 'transcript.turn': {
        const t = evt.payload
        if (!s.turns[t.turnId]) s.turnIds.push(t.turnId)
        s.turns[t.turnId] = {
          speaker: t.speaker,
          text: t.text,
          final: t.final,
          translation: t.translation,
          startMs: t.startMs,
          endMs: t.endMs,
        }
        break
      }
      case 'tactic.flag': {
        const f = evt.payload
        if (s.flags[f.flagId]) break // idempotent
        s.flagIds.push(f.flagId)
        s.flags[f.flagId] = {
          tactic: f.tactic,
          confidence: f.confidence,
          rationale: f.rationale,
          turnId: f.turnId,
          span: f.span,
        }
        break
      }
      case 'risk.update': {
        const r = evt.payload
        s.risk = r.score
        s.peakRisk = Math.max(s.peakRisk, r.score)
        s.riskHistory.push({ seq: evt.seq, score: r.score })
        if (s.riskHistory.length > RISK_HISTORY_CAP) s.riskHistory.shift()
        break
      }
      case 'ask.update': {
        s.ask = {
          action: evt.payload.action,
          target: evt.payload.target,
          sourceTurnId: evt.payload.sourceTurnId,
        }
        break
      }
      case 'voice.score': {
        s.voiceScore = evt.payload.score
        break
      }
      case 'alert': {
        const a = evt.payload
        if (!s.alerts.some((x) => x.alertId === a.alertId)) {
          s.alerts.push({
            alertId: a.alertId,
            level: a.level,
            message: a.message,
            riskAtFire: a.riskAtFire,
            relatedFlagIds: a.relatedFlagIds ?? [],
            dismissed: false,
          })
        }
        break
      }
      case 'session.summary': {
        s.summary = evt.payload
        s.peakRisk = evt.payload.peakRisk // snap derived value to authoritative
        break
      }
      case 'error':
        break // surfaced as a toast elsewhere; no state change
      case 'heartbeat':
        break
      default: {
        const _exhaustive: never = evt
        void _exhaustive
      }
    }
  })
}
