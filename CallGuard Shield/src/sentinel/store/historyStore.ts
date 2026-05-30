import { create } from 'zustand'
import { CallStatus, Speaker, TACTIC_LABEL, type ServerEvent, type Tactic } from '@/sentinel/protocol'
import { freshState, reduce, type SessionState } from './sessionReducer'

/**
 * Call history — event-sourced. We record the raw ServerEvent stream per call
 * and persist it to localStorage; any past call is reconstructed by folding its
 * events back through the SAME reducer the live dashboard uses (so the replay is
 * always faithful and there is no second data format to keep in sync).
 *
 * SSR note: this runs in a TanStack Start app that server-renders. `localStorage`
 * doesn't exist on the server, so every access is guarded — on the server the
 * store starts empty and fills in on the client after mount.
 */

const STORAGE_KEY = 'callguard.history.v1'
const MAX_SESSIONS = 25

const hasStorage = (): boolean => typeof localStorage !== 'undefined'

export interface SessionSummary {
  peakRisk: number
  finalRisk: number
  totalFlags: number
  tacticCount: number
  turns: number
  callerTurns: number
  durationMs: number
  /** 'Compromise attempt' | 'Suspicious' | 'Cleared'. */
  verdict: string
  /** Dominant tactics, most-flagged first (for badges / a one-line title). */
  topTactics: Tactic[]
}

export interface SavedSession {
  id: string
  /** Wall-clock start (ms). */
  startedAt: number
  endedAt: number
  events: ServerEvent[]
  summary: SessionSummary
}

/** Fold an event stream into final state (the live reducer, reused). */
export function reconstruct(events: ServerEvent[]): SessionState {
  return events.reduce((st, e) => reduce(st, e), freshState())
}

function verdictFor(peak: number): string {
  if (peak >= 70) return 'Compromise attempt'
  if (peak >= 40) return 'Suspicious'
  return 'Cleared'
}

function summarize(events: ServerEvent[]): SessionSummary {
  const st = reconstruct(events)

  const counts = new Map<Tactic, number>()
  for (const id of st.flagIds) {
    const t = st.flags[id].tactic
    counts.set(t, (counts.get(t) ?? 0) + 1)
  }
  const topTactics = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([t]) => t)
  const callerTurns = st.turnIds.reduce((n, id) => n + (st.turns[id].speaker === Speaker.Caller ? 1 : 0), 0)
  const durationMs = st.startedAt && st.endedAt ? st.endedAt - st.startedAt : 0

  return {
    peakRisk: st.peakRisk,
    finalRisk: st.risk,
    totalFlags: st.flagIds.length,
    tacticCount: counts.size,
    turns: st.turnIds.length,
    callerTurns,
    durationMs,
    verdict: verdictFor(st.peakRisk),
    topTactics,
  }
}

/** A one-line label for a saved call ("False Authority + Urgency" / "Cleared call"). */
export function sessionTitle(s: SavedSession): string {
  if (s.summary.topTactics.length === 0) return 'Cleared call — no tactics'
  return s.summary.topTactics.slice(0, 3).map((t) => TACTIC_LABEL[t]).join(' + ')
}

function loadSessions(): SavedSession[] {
  if (!hasStorage()) return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? (parsed as SavedSession[]) : []
  } catch {
    return []
  }
}

function persist(sessions: SavedSession[]): void {
  if (!hasStorage()) return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions))
  } catch {
    /* quota / private mode — history is best-effort */
  }
}

interface HistoryStore {
  sessions: SavedSession[]
  /** Feed every live ServerEvent here; finalizes & saves a call when it ends. */
  record: (evt: ServerEvent) => void
  /**
   * Save the in-progress call now, independent of any terminal event reaching
   * the recorder. Called at every "the call is over" control point (stop / reset
   * / mode-switch / unmount) so a finished call is never orphaned. No-op if there
   * is no buffered call.
   */
  finalizeCurrent: () => void
  remove: (id: string) => void
  clearAll: () => void
}

/** Transient buffer for the in-progress call (module scope → no re-renders per event). */
let current: { id: string; startedAt: number; events: ServerEvent[] } | null = null

export const useHistoryStore = create<HistoryStore>((set, get) => {
  const finalize = (): void => {
    const buf = current
    current = null
    if (!buf) return
    // Don't save an empty call (opened a session but nobody spoke).
    if (!buf.events.some((e) => e.type === 'transcript.turn')) return
    const saved: SavedSession = {
      id: buf.id,
      startedAt: buf.startedAt,
      endedAt: Date.now(),
      events: buf.events,
      summary: summarize(buf.events),
    }
    const sessions = [saved, ...get().sessions].slice(0, MAX_SESSIONS)
    persist(sessions)
    set({ sessions })
  }

  return {
    sessions: loadSessions(),
    record: (evt) => {
      if (evt.type === 'heartbeat') return // keep-alive carries no state
      if (evt.type === 'session.started') {
        finalize() // flush a previous, unsaved call
        current = { id: evt.sessionId, startedAt: Date.now(), events: [evt] }
        return
      }
      if (!current || evt.sessionId !== current.id) return
      current.events.push(evt)
      if (
        evt.type === 'call.status' &&
        (evt.payload.status === CallStatus.Ended || evt.payload.status === CallStatus.Error)
      ) {
        finalize()
      }
    },
    finalizeCurrent: () => finalize(),
    remove: (id) =>
      set((s) => {
        const sessions = s.sessions.filter((x) => x.id !== id)
        persist(sessions)
        return { sessions }
      }),
    clearAll: () => {
      persist([])
      set({ sessions: [] })
    },
  }
})
