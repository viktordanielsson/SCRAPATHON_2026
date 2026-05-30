import { AnimatePresence, motion } from 'framer-motion'
import { AlertTriangle, X } from 'lucide-react'
import { useSessionStore } from '../store/sessionStore'
import { selActiveAlert } from '../store/selectors'

export function CriticalAlertBanner() {
  const alerts = useSessionStore((s) => s.alerts)
  const dismissAlert = useSessionStore((s) => s.dismissAlert)
  const alert = selActiveAlert({ alerts } as never)

  return (
    <AnimatePresence>
      {alert && (
        <motion.div
          initial={{ y: '-100%' }}
          animate={{ y: 0 }}
          exit={{ y: '-100%' }}
          transition={{ type: 'spring', stiffness: 260, damping: 22, mass: 1.1 }}
          className="flex items-center gap-3 border-b-2 border-critical bg-critical/15 px-5 py-3"
        >
          <AlertTriangle className="h-5 w-5 shrink-0 text-critical" />
          <span className="font-sans text-xs font-bold uppercase tracking-[0.15em] text-critical">
            Critical
          </span>
          <span className="flex-1 font-mono text-sm text-ink">{alert.message}</span>
          <span className="font-mono text-xs text-critical" style={{ fontVariantNumeric: 'tabular-nums' }}>
            risk {Math.round(alert.riskAtFire)}
          </span>
          <button
            onClick={() => dismissAlert(alert.alertId)}
            className="rounded p-1 text-muted transition-colors hover:text-ink"
            aria-label="Dismiss alert"
          >
            <X className="h-4 w-4" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
