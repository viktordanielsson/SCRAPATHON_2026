import { motion } from 'framer-motion'
import { AlertTriangle, ShieldCheck, ShieldAlert } from 'lucide-react'
import type { ReactNode } from 'react'
import { CallStatus, TACTIC_LABEL } from '@shared/protocol'
import { useSessionStore } from '../store/sessionStore'
import { selActiveAlert, selDrivers } from '../store/selectors'
import { RiskMeter } from './RiskMeter'

/** The focal module: the verdict + risk meter. Where calm → alarm happens. */
export function VerdictStrip() {
  const status = useSessionStore((s) => s.status)
  const peak = useSessionStore((s) => s.peakRisk)
  const alerts = useSessionStore((s) => s.alerts)
  const flags = useSessionStore((s) => s.flags)
  const flagIds = useSessionStore((s) => s.flagIds)

  const alert = selActiveAlert({ alerts } as never)
  const drivers = selDrivers({ flags, flagIds } as never)
  const ended = status === CallStatus.Ended
  const critical = alert !== null || peak >= 70

  // End-of-call verdict.
  const verdict =
    peak >= 70
      ? { label: 'Compromise attempt', color: '#DC2626' }
      : peak >= 40
        ? { label: 'Suspicious', color: '#B7791F' }
        : { label: 'Cleared', color: '#6B7280' }

  // The "why" line — explainability is the product's whole point.
  let icon: ReactNode
  let text: string
  let tone: string
  if (alert) {
    tone = '#DC2626'
    text = alert.message
    icon = <AlertTriangle className="h-4 w-4 shrink-0" />
  } else if (ended) {
    tone = verdict.color
    text = `Call ended — ${verdict.label.toLowerCase()}.`
    icon = <ShieldAlert className="h-4 w-4 shrink-0" />
  } else if (drivers.length > 0) {
    tone = '#56554E'
    text = `Detecting: ${drivers.slice(0, 3).map((t) => TACTIC_LABEL[t]).join(' · ')}`
    icon = <ShieldAlert className="h-4 w-4 shrink-0" style={{ color: '#B7791F' }} />
  } else {
    tone = '#6B7280'
    text = 'No social-engineering signals detected.'
    icon = <ShieldCheck className="h-4 w-4 shrink-0" />
  }

  return (
    <motion.section
      initial={{ backgroundColor: '#FFFFFF' }}
      animate={{ backgroundColor: critical ? '#FCEBEA' : '#FFFFFF' }}
      transition={{ duration: 0.4 }}
      className={`rounded-lg border px-6 py-5 shadow-card ${
        critical ? 'border-critical/30' : 'border-hairline'
      }`}
    >
      <div className="mb-3.5 flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted">
          Threat index
        </span>
        {ended && (
          <span
            className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide"
            style={{ color: verdict.color, backgroundColor: `${verdict.color}14` }}
          >
            {verdict.label}
          </span>
        )}
      </div>

      <RiskMeter />

      <div
        className="mt-4 flex items-start gap-2 border-t border-hairline pt-3 text-[13px] leading-snug"
        style={{ color: tone }}
      >
        {icon}
        <span>{text}</span>
      </div>
    </motion.section>
  )
}
