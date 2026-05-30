import { AlertLevel, Speaker, riskBandFor, type Tactic } from '@shared/protocol'
import type { SessionState } from './sessionReducer'

export interface SessionStats {
  tacticCount: number
  totalFlags: number
  callerTurns: number
  peakRisk: number
}

/** Session stats are DERIVED from raw events, never stored (one less thing to desync). */
export const selStats = (s: SessionState): SessionStats => ({
  tacticCount: new Set(s.flagIds.map((id) => s.flags[id].tactic)).size,
  totalFlags: s.flagIds.length,
  callerTurns: s.turnIds.reduce(
    (n, id) => n + (s.turns[id].speaker === Speaker.Caller ? 1 : 0),
    0,
  ),
  peakRisk: s.peakRisk,
})

/** The most recent undismissed Critical alert, or null. Drives the banner. */
export const selActiveAlert = (s: SessionState) =>
  [...s.alerts].reverse().find((a) => a.level === AlertLevel.Critical && !a.dismissed) ??
  null

export const selRiskBand = (s: SessionState) => riskBandFor(s.risk)

export interface TacticActivity {
  count: number
  maxConfidence: number
}

/** Per-tactic activity, for lighting up the tactic grid. */
export const selActiveTactics = (s: SessionState): Map<Tactic, TacticActivity> => {
  const m = new Map<Tactic, TacticActivity>()
  for (const id of s.flagIds) {
    const f = s.flags[id]
    const cur = m.get(f.tactic) ?? { count: 0, maxConfidence: 0 }
    m.set(f.tactic, {
      count: cur.count + 1,
      maxConfidence: Math.max(cur.maxConfidence, f.confidence),
    })
  }
  return m
}

/** Flags belonging to a given transcript turn (for inline badges). */
export const selFlagsForTurn = (s: SessionState, turnId: string) =>
  s.flagIds.map((id) => s.flags[id]).filter((f) => f.turnId === turnId)
