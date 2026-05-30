import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Play, ShieldOff, X } from 'lucide-react'
import { CallStatus, TACTIC_LABEL } from '@shared/protocol'
import type { SessionControls } from '../hooks/useSession'
import { redactText } from '../lib/redaction'
import { formatClock } from '../lib/format'
import { TACTIC_TONE } from '../lib/tacticStyle'
import { useSessionStore } from '../store/sessionStore'
import { selActiveTactics, selStats } from '../store/selectors'

function verdictFor(peak: number): { label: string; color: string } {
  if (peak >= 70) return { label: 'Compromise attempt', color: '#DC2626' }
  if (peak >= 40) return { label: 'Suspicious', color: '#B7791F' }
  return { label: 'Cleared', color: '#6B7280' }
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[22px] font-semibold text-ink tabular-nums">{value}</span>
      <span className="text-[10px] uppercase tracking-wider text-muted">{label}</span>
    </div>
  )
}

/**
 * Incident Report: the "hang up → instant report" beat. Appears when the call
 * ends, summarizing the verdict, what drove it, sensitive values intercepted,
 * and the tactic timeline — all derived from session state (Analysis mode emits
 * no session.summary, so nothing here depends on one).
 */
export function IncidentReport({ controls }: { controls: SessionControls }) {
  const status = useSessionStore((s) => s.status)
  const risk = useSessionStore((s) => s.risk)
  const peakRisk = useSessionStore((s) => s.peakRisk)
  const flags = useSessionStore((s) => s.flags)
  const flagIds = useSessionStore((s) => s.flagIds)
  const turns = useSessionStore((s) => s.turns)
  const turnIds = useSessionStore((s) => s.turnIds)
  const startedAt = useSessionStore((s) => s.startedAt)
  const endedAt = useSessionStore((s) => s.endedAt)
  const ask = useSessionStore((s) => s.ask)

  const [closed, setClosed] = useState(false)
  useEffect(() => {
    if (status !== CallStatus.Ended) setClosed(false)
  }, [status])

  const open = status === CallStatus.Ended && !closed

  const stats = selStats({ flags, flagIds, turns, turnIds, peakRisk } as never)
  const tactics = selActiveTactics({ flags, flagIds } as never)
  const verdict = verdictFor(peakRisk)
  const durationMs = startedAt && endedAt ? endedAt - startedAt : 0
  const redactionCount = turnIds.reduce((n, id) => n + redactText(turns[id].text).hits.length, 0)

  const drivers = [...tactics.entries()].sort((a, b) => b[1].count - a[1].count)
  const hasAsk = ask !== null && ask.action.trim().length > 0
  const askLine = hasAsk
    ? `${redactText(ask.action).masked}${ask.target.trim() ? ` — ${redactText(ask.target).masked}` : ''}`
    : ''

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 p-6 backdrop-blur-sm"
          onClick={() => setClosed(true)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.25 }}
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-hairline bg-surface shadow-card"
          >
            <header className="flex items-center justify-between border-b border-hairline px-6 py-4">
              <div className="flex items-center gap-3">
                <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted">
                  Incident report
                </span>
                <span
                  className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide"
                  style={{ color: verdict.color, backgroundColor: `${verdict.color}14` }}
                >
                  {verdict.label}
                </span>
              </div>
              <button
                onClick={() => setClosed(true)}
                className="flex items-center rounded-md p-1 text-muted transition-colors hover:bg-raised hover:text-ink"
                title="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto px-6 py-5">
              <div className="grid grid-cols-4 gap-3">
                <Stat label="peak risk" value={Math.round(peakRisk)} />
                <Stat label="final" value={Math.round(risk)} />
                <Stat label="flags" value={stats.totalFlags} />
                <Stat label="duration" value={formatClock(durationMs)} />
              </div>

              {hasAsk && (
                <div className="mt-5">
                  <div className="mb-1 text-[11px] font-medium uppercase tracking-[0.12em] text-muted">
                    Caller wanted
                  </div>
                  <p className="text-[13px] font-semibold text-ink">{askLine}</p>
                </div>
              )}

              {redactionCount > 0 && (
                <div className="mt-5 flex items-center gap-2 rounded-md border border-critical/30 bg-critical-soft px-3 py-2 text-[12px] text-critical">
                  <ShieldOff className="h-4 w-4 shrink-0" />
                  <span>
                    {redactionCount} sensitive {redactionCount === 1 ? 'value' : 'values'} intercepted
                    and masked before exposure.
                  </span>
                </div>
              )}

              <div className="mt-5">
                <div className="mb-2 text-[11px] font-medium uppercase tracking-[0.12em] text-muted">
                  What drove it
                </div>
                {drivers.length === 0 ? (
                  <p className="text-[12px] text-ink-soft">
                    No manipulation tactics detected. Call cleared.
                  </p>
                ) : (
                  <ul className="space-y-1.5">
                    {drivers.map(([tactic, activity]) => (
                      <li key={tactic} className="flex items-center gap-2 text-[12.5px]">
                        <span
                          className="h-2 w-2 shrink-0 rounded-full"
                          style={{ background: TACTIC_TONE[tactic] }}
                        />
                        <span className="font-medium text-ink">{TACTIC_LABEL[tactic]}</span>
                        <span className="text-muted">
                          ×{activity.count} · peak {Math.round(activity.maxConfidence * 100)}%
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <footer className="flex items-center justify-end gap-2 border-t border-hairline px-6 py-3">
              <button
                onClick={() => setClosed(true)}
                className="rounded-md border border-hairline px-3 py-1.5 text-[12px] text-ink-soft transition-colors hover:bg-raised"
              >
                Close
              </button>
              <button
                onClick={() => controls.start()}
                className="flex items-center gap-1.5 rounded-md bg-accent px-3.5 py-1.5 text-[12px] font-semibold text-white transition-colors hover:bg-accent-strong"
              >
                <Play className="h-3.5 w-3.5" />
                New call
              </button>
            </footer>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
