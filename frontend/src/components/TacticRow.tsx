import clsx from 'clsx'
import { motion } from 'framer-motion'
import { TACTIC_LABEL, type Tactic } from '@shared/protocol'
import { TACTIC_TONE } from '../lib/tacticStyle'
import type { TacticActivity } from '../store/selectors'

interface Props {
  tactic: Tactic
  activity?: TacticActivity
}

export function TacticRow({ tactic, activity }: Props) {
  const active = activity !== undefined && activity.count > 0
  const tone = TACTIC_TONE[tactic]
  const conf = active && activity ? activity.maxConfidence : 0

  return (
    <div className="flex items-center gap-3 py-1.5">
      <span className="relative flex h-2 w-2 items-center justify-center">
        {active && activity && (
          <motion.span
            key={activity.count}
            initial={{ scale: 0, opacity: 0.5 }}
            animate={{ scale: 2.4, opacity: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="absolute h-2 w-2 rounded-full"
            style={{ background: tone }}
          />
        )}
        <span
          className="h-2 w-2 rounded-full"
          style={{ background: active ? tone : '#DAD8D1' }}
        />
      </span>

      <span
        className={clsx(
          'w-[104px] shrink-0 text-[13px]',
          active ? 'font-medium text-ink' : 'text-muted',
        )}
      >
        {TACTIC_LABEL[tactic]}
      </span>

      <div className="h-1 flex-1 overflow-hidden rounded-full bg-raised">
        <div
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{ width: `${conf * 100}%`, background: tone }}
        />
      </div>

      <span
        className="w-9 text-right font-mono text-[11px] tabular-nums"
        style={{ color: active ? tone : '#B9B7AE' }}
      >
        {active ? conf.toFixed(2) : '—'}
      </span>
    </div>
  )
}
