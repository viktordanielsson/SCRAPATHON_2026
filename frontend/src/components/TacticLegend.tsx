import { useMemo } from 'react'
import { ALL_TACTICS } from '@shared/protocol'
import { useSessionStore } from '../store/sessionStore'
import { selActiveTactics } from '../store/selectors'
import { Panel } from './Panel'
import { TacticRow } from './TacticRow'

export function TacticLegend() {
  const flags = useSessionStore((s) => s.flags)
  const flagIds = useSessionStore((s) => s.flagIds)

  const activity = useMemo(
    () => selActiveTactics({ flags, flagIds } as never),
    [flags, flagIds],
  )

  return (
    <Panel title="Manipulation tactics" bodyClassName="px-4 py-1">
      <div className="divide-y divide-hairline">
        {ALL_TACTICS.map((t) => (
          <TacticRow key={t} tactic={t} activity={activity.get(t)} />
        ))}
      </div>
    </Panel>
  )
}
