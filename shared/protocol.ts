/**
 * SENTINEL — FE/BE event contract (single source of truth).
 *
 * Both `frontend/` and `backend/` import this via the `@shared` alias:
 *   import { Envelope, ServerEvent, Tactic } from '@shared/protocol'
 *
 * Backend (Node) resolution: either a relative import (`../../shared/protocol`)
 * or a tsconfig `paths` mapping `@shared/*` -> `../shared/*` run under `tsx`.
 *
 * RULE: never invent an event shape inline. Add it to `ServerEventPayloadMap`
 * first — the compiler is the contract test. A protocol-breaking change bumps
 * PROTOCOL_VERSION.
 */

export const PROTOCOL_VERSION = 1 as const

/* ────────────────────────────────────────────────────────────────────────── *
 * Enums — const objects (not TS `enum`s): they erase cleanly, serialize as
 * plain strings on the wire, and iterate for rendering.
 * ────────────────────────────────────────────────────────────────────────── */

/** The fixed, closed set of social-engineering tactics. Extending = protocol bump. */
export const Tactic = {
  Urgency: 'Urgency',
  FalseAuthority: 'FalseAuthority',
  Pretexting: 'Pretexting',
  Fear: 'Fear',
  Reciprocity: 'Reciprocity',
  RapportBuilding: 'RapportBuilding',
} as const
export type Tactic = (typeof Tactic)[keyof typeof Tactic]
export const ALL_TACTICS = Object.values(Tactic) as Tactic[]

/** Human-facing labels. UI renders these; the wire carries the enum key. */
export const TACTIC_LABEL: Record<Tactic, string> = {
  Urgency: 'Urgency',
  FalseAuthority: 'False Authority',
  Pretexting: 'Pretexting',
  Fear: 'Fear',
  Reciprocity: 'Reciprocity',
  RapportBuilding: 'Rapport Building',
}

/** Per-tactic identity colors (distinct hues, separate from the risk ramp). */
export const TACTIC_COLOR: Record<Tactic, string> = {
  Urgency: '#FF6B3D', // orange
  FalseAuthority: '#C04CFF', // violet
  Pretexting: '#3D9BFF', // blue
  Fear: '#FF3B47', // red
  Reciprocity: '#2BD96A', // green
  RapportBuilding: '#F5B83D', // amber
}

/** Risk bands, derived from the 0–100 score via `riskBandFor()`. */
export const RiskBand = {
  Calm: 'Calm', //  0–24
  Elevated: 'Elevated', // 25–49
  High: 'High', // 50–74
  Critical: 'Critical', // 75–100
} as const
export type RiskBand = (typeof RiskBand)[keyof typeof RiskBand]

/** Call lifecycle. The backend may skip states but never moves backwards
 *  except by opening a fresh session. */
export const CallStatus = {
  Idle: 'Idle', // no session (initial / post-reset)
  Connecting: 'Connecting', // Gemini Live session opening
  Live: 'Live', // audio flowing, transcription active
  Ended: 'Ended', // call hung up normally
  Error: 'Error', // call / stream failed
} as const
export type CallStatus = (typeof CallStatus)[keyof typeof CallStatus]

export const Speaker = {
  Caller: 'Caller', // the potential attacker
  Agent: 'Agent', // the support rep (us)
  System: 'System', // IVR / automated, rarely used
} as const
export type Speaker = (typeof Speaker)[keyof typeof Speaker]

export const AlertLevel = {
  Info: 'Info',
  Warning: 'Warning',
  Critical: 'Critical',
} as const
export type AlertLevel = (typeof AlertLevel)[keyof typeof AlertLevel]

/* ────────────────────────────────────────────────────────────────────────── *
 * Shared bodies — reused by the server event map AND the client control union
 * so both directions of the wire stay in lockstep.
 * ────────────────────────────────────────────────────────────────────────── */

/**
 * A transcript turn. UPSERT keyed by `turnId`: zero or more interim updates
 * (`final: false`, growing `text`) followed by exactly one `final: true`.
 *
 * The browser captures these from the live voice session (Gemini Live) and OWNS
 * `turnId`; the backend echoes the same id back on the `transcript.turn` event
 * and on any `tactic.flag` that cites it, so transcript and flags cross-reference.
 */
export interface TranscriptTurnBody {
  turnId: string
  speaker: Speaker
  text: string
  final: boolean
  /** Audio offsets within the call, ms. Optional. */
  startMs?: number
  endMs?: number
}

/* ────────────────────────────────────────────────────────────────────────── *
 * Event catalogue — ONE map describes everything the backend can ever say.
 * Adding a key here (and only here) extends the protocol.
 * ────────────────────────────────────────────────────────────────────────── */

export interface ServerEventPayloadMap {
  /** Opens a session. Receiver resets all state and seq tracking on this. */
  'session.started': {
    sessionId: string
    /** Whether the backend will emit `voice.score` events. UI degrades gracefully if false. */
    voiceScoringEnabled: boolean
  }

  /** Call lifecycle transition. */
  'call.status': {
    status: CallStatus
    /** Masked caller id for display, e.g. "+1 (•••) •••-4827". */
    callerLabel?: string
  }

  /** A transcript turn (see {@link TranscriptTurnBody} for UPSERT + `turnId` rules). */
  'transcript.turn': TranscriptTurnBody

  /** A detected social-engineering tactic, attached to a transcript turn. */
  'tactic.flag': {
    flagId: string
    tactic: Tactic
    /** 0–1. */
    confidence: number
    /** Short human-readable justification shown inline + in the alert. */
    rationale: string
    /** The `transcript.turn` this flag refers to. */
    turnId: string
    /** Optional [start, end] char offsets into that turn's text. */
    span?: [number, number]
  }

  /** Threat score update. `score` is absolute 0–100; `delta` is the change. */
  'risk.update': {
    score: number
    delta: number
    /** Optional breakdown of what drove this update. */
    contributors?: { tactic: Tactic; weight: number }[]
  }

  /** Voice-authenticity / deepfake score. 0–100 (lower = more synthetic). Experimental. */
  'voice.score': {
    score: number
  }

  /**
   * An operator-facing alert. The frontend's CRITICAL banner fires ONLY off this
   * event (level === 'Critical') — the backend owns the trigger threshold.
   */
  'alert': {
    alertId: string
    level: AlertLevel
    message: string
    /** Risk score at the moment the alert fired. */
    riskAtFire: number
    /** Flags that motivated this alert, for cross-highlighting. */
    relatedFlagIds?: string[]
  }

  /** End-of-call summary. Authoritative final stats (snap derived values to these). */
  'session.summary': {
    tacticCount: number
    totalFlags: number
    callerTurns: number
    peakRisk: number
    finalRisk: number
    durationMs: number
  }

  /** Out-of-band error. Surfaced as a toast; does not advance UI state. */
  'error': {
    code: string
    message: string
  }

  /** Keep-alive. Does NOT advance the session seq counter (see seq rules below). */
  'heartbeat': Record<string, never>
}

export type ServerEventType = keyof ServerEventPayloadMap

export const SERVER_EVENT_TYPES = [
  'session.started',
  'call.status',
  'transcript.turn',
  'tactic.flag',
  'risk.update',
  'voice.score',
  'alert',
  'session.summary',
  'error',
  'heartbeat',
] as const satisfies readonly ServerEventType[]

/* ────────────────────────────────────────────────────────────────────────── *
 * Envelope — every server→client message is wrapped identically. The `type`
 * discriminant lives here so a single switch dispatches the whole union.
 * ────────────────────────────────────────────────────────────────────────── */

export interface Envelope<T extends ServerEventType = ServerEventType> {
  /** Protocol version. Receiver rejects mismatches it can't handle. */
  v: typeof PROTOCOL_VERSION
  /** Discriminant — drives the union and the UI dispatch switch. */
  type: T
  /**
   * Per-session, monotonically increasing sequence number. Starts at 0 on
   * `session.started`, +1 for every subsequent event. THE ordering authority.
   * `heartbeat` carries the most-recent non-heartbeat seq and does NOT increment it.
   */
  seq: number
  /** Server wall-clock emit time (epoch ms). Display / latency only — NOT ordering. */
  ts: number
  /** Session this event belongs to. Lets the client drop stale events after a swap. */
  sessionId: string
  /** The typed body, narrowed by `type`. */
  payload: ServerEventPayloadMap[T]
}

/** The fully-narrowed discriminated union the UI switches over. */
export type ServerEvent = { [T in ServerEventType]: Envelope<T> }[ServerEventType]

/* ────────────────────────────────────────────────────────────────────────── *
 * Client → server control messages.
 * ────────────────────────────────────────────────────────────────────────── */

export type ClientControl =
  | { cmd: 'subscribe' }
  /** Open a session. `scenarioId` selects which attacker persona the AI caller plays. */
  | { cmd: 'start'; scenarioId?: string }
  | { cmd: 'stop' }
  | { cmd: 'reset' }
  /**
   * Forward a transcript turn the browser captured from the live voice session
   * (Gemini Live) to the backend detector. Additive extension: clients that never
   * send this still satisfy the contract, so it does not bump `PROTOCOL_VERSION`.
   */
  | { cmd: 'transcript'; turn: TranscriptTurnBody }

/* ────────────────────────────────────────────────────────────────────────── *
 * Helpers — shared by both sides.
 * ────────────────────────────────────────────────────────────────────────── */

/** Map a 0–100 risk score to its band. */
export function riskBandFor(score: number): RiskBand {
  if (score >= 75) return RiskBand.Critical
  if (score >= 50) return RiskBand.High
  if (score >= 25) return RiskBand.Elevated
  return RiskBand.Calm
}

const EVENT_TYPE_SET: ReadonlySet<string> = new Set(SERVER_EVENT_TYPES)

/**
 * Runtime guard for the WebSocket seam. Types are shared at compile time, but
 * the wire is JSON at runtime — a backend field-name/casing bug would otherwise
 * produce NaN gauges or silently dropped events. Validate the envelope shape
 * before dispatching; return null on anything malformed so the caller can
 * surface an error toast instead of corrupting state.
 */
export function parseServerEvent(raw: unknown): ServerEvent | null {
  if (typeof raw !== 'object' || raw === null) return null
  const e = raw as Record<string, unknown>
  if (e.v !== PROTOCOL_VERSION) return null
  if (typeof e.type !== 'string' || !EVENT_TYPE_SET.has(e.type)) return null
  if (typeof e.seq !== 'number' || !Number.isFinite(e.seq)) return null
  if (typeof e.ts !== 'number') return null
  if (typeof e.sessionId !== 'string') return null
  if (typeof e.payload !== 'object' || e.payload === null) return null
  return raw as ServerEvent
}
