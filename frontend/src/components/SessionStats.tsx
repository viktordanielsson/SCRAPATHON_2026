import { useSessionStore } from '../store/sessionStore'
import { selStats } from '../store/selectors'
import { Panel } from './Panel'

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="font-mono text-xl font-bold text-ink" style={{ fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </span>
      <span className="text-[9px] uppercase tracking-wider text-muted">{label}</span>
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
      <div className="grid grid-cols-4 gap-2">
        <Stat label="tactics" value={stats.tacticCount} />
        <Stat label="flags" value={stats.totalFlags} />
        <Stat label="caller turns" value={stats.callerTurns} />
        <Stat label="peak risk" value={Math.round(stats.peakRisk)} />
      </div>
    </Panel>
  )
}
