import { useSessionStore } from '../store/sessionStore'
import { selStats } from '../store/selectors'
import { Panel } from './Panel'

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[20px] font-semibold text-ink tabular-nums">{value}</span>
      <span className="text-[10px] uppercase tracking-wider text-muted">{label}</span>
    </div>
  )
}

export function SessionStats() {
  const flags = useSessionStore((s) => s.flags)
  const flagIds = useSessionStore((s) => s.flagIds)
  const turns = useSessionStore((s) => s.turns)
  const turnIds = useSessionStore((s) => s.turnIds)
  const peakRisk = useSessionStore((s) => s.peakRisk)

  const stats = selStats({ flags, flagIds, turns, turnIds, peakRisk } as never)

  return (
    <Panel title="Session">
      <div className="grid grid-cols-4 gap-3">
        <Stat label="tactics" value={stats.tacticCount} />
        <Stat label="flags" value={stats.totalFlags} />
        <Stat label="caller" value={stats.callerTurns} />
        <Stat label="peak" value={Math.round(stats.peakRisk)} />
      </div>
    </Panel>
  )
}
