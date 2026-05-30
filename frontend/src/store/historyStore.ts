import { create } from 'zustand'
import { CallStatus, type ServerEvent } from '@shared/protocol'
import { freshState, reduce, type SessionState } from './sessionReducer'

/**
 * Call history — event-sourced. We record the raw ServerEvent stream per call
 * and persist it to localStorage; any past call is reconstructed by folding its
 * events back through the SAME reducer the live dashboard uses (so the replay is
 * always faithful and there is no second data format to keep in sync).
 */

const STORAGE_KEY = 'sentinel.history.v1'
const MAX_SESSIONS = 25

export interface SessionSummary {
  peakRisk: number
  totalFlags: number
  tacticCount: number
  turns: number
  durationMs: number
  /** "action — target" or "" if the caller never made a concrete ask. */
  ask: string
  verdict: string
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

function summarize(events: ServerEvent[]): SessionSummary {
  const st = reconstruct(events)
  const tacticCount = new Set(st.flagIds.map((id) => st.flags[id].tactic)).size
  const durationMs = st.startedAt && st.endedAt ? st.endedAt - st.startedAt : 0
  const ask = st.ask?.action
    ? `${st.ask.action}${st.ask.target ? ` — ${st.ask.target}` : ''}`
    : ''
  const verdict =
    st.peakRisk >= 70 ? 'Compromise attempt' : st.peakRisk >= 40 ? 'Suspicious' : 'Cleared'
  return {
    peakRisk: st.peakRisk,
    totalFlags: st.flagIds.length,
    tacticCount,
    turns: st.turnIds.length,
    durationMs,
    ask,
    verdict,
  }
}

function loadSessions(): SavedSession[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? (parsed as SavedSession[]) : []
  } catch {
    return []
  }
}

function persist(sessions: SavedSession[]): void {
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
