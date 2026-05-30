import { useMemo } from 'react'
import { ALL_TACTICS } from '@shared/protocol'
import { useSessionStore } from '../store/sessionStore'
import { selActiveTactics } from '../store/selectors'
import { Panel } from './Panel'
import { TacticCell } from './TacticCell'

export function TacticLegend() {
  const flags = useSessionStore((s) => s.flags)
  const flagIds = useSessionStore((s) => s.flagIds)

  const activity = useMemo(
    () => selActiveTactics({ flags, flagIds } as never),
    [flags, flagIds],
  )

  return (
    <Panel title="Detected Tactics">
      <div className="grid grid-cols-3 gap-2">
        {ALL_TACTICS.map((t) => (
          <TacticCell key={t} tactic={t} activity={activity.get(t)} />
        ))}
      </div>
    </Panel>
  )
}
