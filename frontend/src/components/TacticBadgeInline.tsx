import { motion } from 'framer-motion'
import { TACTIC_LABEL } from '@shared/protocol'
import { TACTIC_TONE } from '../lib/tacticStyle'
import type { FlagState } from '../store/sessionReducer'

export function TacticBadgeInline({ flag }: { flag: FlagState }) {
  const tone = TACTIC_TONE[flag.tactic]
  return (
    <motion.span
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 24 }}
      title={flag.rationale}
      className="inline-flex items-center gap-1.5 rounded-full border bg-surface px-2 py-0.5"
      style={{ borderColor: `${tone}55` }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: tone }} />
      <span className="text-[11px] font-medium" style={{ color: tone }}>
        {TACTIC_LABEL[flag.tactic]}
      </span>
      <span className="font-mono text-[10px] text-muted tabular-nums">
        {flag.confidence.toFixed(2)}
      </span>
    </motion.span>
  )
}
