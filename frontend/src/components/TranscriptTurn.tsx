import clsx from 'clsx'
import { Speaker } from '@shared/protocol'
import type { FlagState, TurnState } from '../store/sessionReducer'
import { formatClock } from '../lib/format'
import { TACTIC_TONE } from '../lib/tacticStyle'

interface Props {
  turn: TurnState
  flags: FlagState[]
}

export function TranscriptTurn({ turn, flags }: Props) {
  const isCaller = turn.speaker === Speaker.Caller
  const speakerLabel =
    turn.speaker === Speaker.Caller ? 'Caller' : turn.speaker === Speaker.Agent ? 'Agent' : 'System'

  // Caller turns "heat" by the strongest tactic on them.
  const hottest = flags.reduce<FlagState | null>(
    (acc, f) => (acc === null || f.confidence > acc.confidence ? f : acc),
    null,
  )
  const heat = hottest ? TACTIC_TONE[hottest.tactic] : undefined

  return (
    <div className="flex gap-3">
      <div className="w-14 shrink-0 pt-1.5 text-right">
        <div className={clsx('text-[11px] font-semibold', isCaller ? 'text-ink' : 'text-accent')}>
          {speakerLabel}
        </div>
        {turn.startMs !== undefined && (
          <div className="font-mono text-[10px] text-muted tabular-nums">
            {formatClock(turn.startMs)}
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div
          className={clsx(
            'rounded-md px-3 py-2 text-[13.5px] leading-relaxed',
            isCaller ? 'bg-raised text-ink' : 'text-ink-soft',
            !turn.final && 'opacity-60',
          )}
          style={isCaller && heat ? { borderLeft: `2px solid ${heat}` } : undefined}
        >
          {turn.text}
          {!turn.final && <span className="ml-0.5 animate-pulse text-muted">▌</span>}
        </div>
        {/* Tactic detail now lives in the separate Analysis panel; the left-border
            heat is kept as a subtle "this line was flagged" cue. */}
      </div>
    </div>
  )
}
