import { useSessionStore } from '../store/sessionStore'
import { useAutoScroll } from '../hooks/useAutoScroll'
import { TranscriptTurn } from './TranscriptTurn'

export function TranscriptPanel() {
  const turnIds = useSessionStore((s) => s.turnIds)
  const turns = useSessionStore((s) => s.turns)
  const flags = useSessionStore((s) => s.flags)
  const flagIds = useSessionStore((s) => s.flagIds)

  const scrollRef = useAutoScroll<HTMLDivElement>(`${turnIds.length}:${flagIds.length}`)

  return (
    <section className="flex min-h-0 flex-col overflow-hidden rounded-lg border border-hairline bg-surface shadow-card">
      <header className="flex items-center justify-between border-b border-hairline px-5 py-3">
        <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted">
          Transcript
        </span>
        <span className="font-mono text-[11px] text-muted tabular-nums">
          {turnIds.length} turns
        </span>
      </header>

      <div ref={scrollRef} className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
        {turnIds.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
            <span className="text-[13px] font-medium text-ink-soft">No active call</span>
            <span className="text-[12px] text-muted">
              Run a scenario below to begin live monitoring.
            </span>
          </div>
        ) : (
          turnIds.map((id) => (
            <TranscriptTurn
              key={id}
              turn={turns[id]}
              flags={flagIds.map((fid) => flags[fid]).filter((f) => f.turnId === id)}
            />
          ))
        )}
      </div>
    </section>
  )
}
