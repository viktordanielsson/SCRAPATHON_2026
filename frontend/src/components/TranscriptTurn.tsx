import clsx from 'clsx'
import { Speaker, TACTIC_COLOR } from '@shared/protocol'
import type { FlagState, TurnState } from '../store/sessionReducer'
import { formatClock } from '../lib/format'
import { TacticBadgeInline } from './TacticBadgeInline'

interface Props {
  turn: TurnState
  flags: FlagState[]
}

export function TranscriptTurn({ turn, flags }: Props) {
  const isCaller = turn.speaker === Speaker.Caller
  const isAgent = turn.speaker === Speaker.Agent
  // Caller turns "heat" by the strongest tactic on them.
  const hottest = flags.reduce<FlagState | null>(
    (acc, f) => (acc === null || f.confidence > acc.confidence ? f : acc),
    null,
  )
  const heat = hottest ? TACTIC_COLOR[hottest.tactic] : undefined

  return (
    <div className={clsx('flex flex-col', isCaller ? 'items-end pl-8' : 'items-start pr-8')}>
      <div className="mb-0.5 flex items-center gap-2 font-mono text-[10px] text-muted">
        <span>{isCaller ? '▶ CALLER' : isAgent ? '◀ AGENT' : '◦ SYSTEM'}</span>
        {turn.startMs !== undefined && <span>{formatClock(turn.startMs)}</span>}
        {!turn.final && <span className="text-accent">●●● live</span>}
      </div>
      <div
        className={clsx(
          'max-w-[80%] rounded-md border px-3 py-2 font-mono text-[13px] leading-snug',
          isAgent && 'border-l-2 border-l-accent border-edge bg-surface text-ink',
          isCaller && 'bg-surface text-ink',
          !turn.final && 'opacity-60',
        )}
        style={
          isCaller
            ? { borderColor: heat ?? '#1f2733', borderRightWidth: heat ? 3 : 1 }
            : undefined
        }
      >
        {turn.text}
        {!turn.final && <span className="ml-0.5 inline-block animate-pulse">▌</span>}
      </div>
      {flags.length > 0 && (
        <div className={clsx('w-[80%]', isCaller ? 'self-end' : 'self-start')}>
          {flags.map((f) => (
            <TacticBadgeInline key={f.tactic + f.turnId + f.confidence} flag={f} />
          ))}
        </div>
      )}
    </div>
  )
}
