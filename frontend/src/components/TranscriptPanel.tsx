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
    <section className="flex min-h-0 flex-col rounded-md border border-edge bg-panel/40">
      <header className="flex items-center justify-between border-b border-edge px-4 py-2">
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
          Live Transcript
        </span>
        <span className="font-mono text-[10px] text-muted">{turnIds.length} turns</span>
      </header>

      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {turnIds.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
            <span className="font-mono text-xs uppercase tracking-[0.3em] text-muted">
              Awaiting call
            </span>
            <span className="text-[11px] text-muted/70">
              Run a scenario to begin live monitoring.
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
