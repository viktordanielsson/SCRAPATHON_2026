import { motion } from 'framer-motion'
import { TACTIC_COLOR, TACTIC_LABEL } from '@shared/protocol'
import type { FlagState } from '../store/sessionReducer'

export function TacticBadgeInline({ flag }: { flag: FlagState }) {
  const color = TACTIC_COLOR[flag.tactic]
  return (
    <motion.div
      initial={{ opacity: 0, y: 6, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 24 }}
      className="mt-1 flex items-start gap-2 rounded border-l-2 bg-surface px-2 py-1"
      style={{ borderColor: color }}
    >
      <span className="font-sans text-[10px] font-semibold uppercase tracking-wider" style={{ color }}>
        {TACTIC_LABEL[flag.tactic]}
      </span>
      <span className="font-mono text-[10px] text-muted" style={{ fontVariantNumeric: 'tabular-nums' }}>
        {flag.confidence.toFixed(2)}
      </span>
      <span className="font-sans text-[11px] leading-tight text-ink/70">{flag.rationale}</span>
    </motion.div>
  )
}
