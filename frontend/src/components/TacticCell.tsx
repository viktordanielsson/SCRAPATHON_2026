import clsx from 'clsx'
import { motion } from 'framer-motion'
import { TACTIC_COLOR, TACTIC_LABEL, type Tactic } from '@shared/protocol'
import type { TacticActivity } from '../store/selectors'

interface Props {
  tactic: Tactic
  activity?: TacticActivity
}

export function TacticCell({ tactic, activity }: Props) {
  const active = activity !== undefined && activity.count > 0
  const color = TACTIC_COLOR[tactic]

  return (
    <div
      className={clsx(
        'relative flex flex-col gap-1 overflow-hidden rounded border p-2 transition-colors',
        active ? 'bg-surface' : 'border-edge bg-panel/30',
      )}
      style={active ? { borderColor: color } : undefined}
    >
      {/* one-shot pulse re-keys on every new flag for this tactic */}
      {active && activity && (
        <motion.span
          key={activity.count}
          initial={{ opacity: 0.5, scale: 0.9 }}
          animate={{ opacity: 0, scale: 1.04 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="pointer-events-none absolute inset-0 rounded"
          style={{ backgroundColor: color }}
        />
      )}
      <div className="flex items-center gap-1.5">
        <span className="text-xs" style={{ color: active ? color : '#3a4658' }}>
          {active ? '◉' : '○'}
        </span>
        <span
          className={clsx(
            'font-sans text-[10px] font-semibold uppercase tracking-wide',
            active ? 'text-ink' : 'text-muted',
          )}
        >
          {TACTIC_LABEL[tactic]}
        </span>
      </div>
      <div
        className="flex items-center justify-between font-mono text-[10px]"
        style={{ fontVariantNumeric: 'tabular-nums' }}
      >
        <span style={{ color: active ? color : '#3a4658' }}>
          {activity && active ? activity.maxConfidence.toFixed(2) : '—'}
        </span>
        <span className="text-muted">{activity && active ? `×${activity.count}` : ''}</span>
      </div>
    </div>
  )
}
