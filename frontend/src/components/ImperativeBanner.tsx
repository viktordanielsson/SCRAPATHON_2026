import { AnimatePresence, motion } from 'framer-motion'
import { Volume2, X } from 'lucide-react'
import { CallStatus, TACTIC_LABEL, type Tactic } from '@shared/protocol'
import { redactText } from '../lib/redaction'
import { useSessionStore } from '../store/sessionStore'
import { selActiveAlert, selDrivers } from '../store/selectors'

/**
 * Per-tactic counter-guidance — the "why this, do that" line. Phrased as a
 * handling instruction, never a label, because the value shift is from
 * "this person is dangerous" → "here is what to do right now".
 */
const COUNTER: Record<Tactic, string> = {
  Urgency: 'The rush is the attack — it is safe to slow down.',
  FalseAuthority: 'Rank is unverified — authority does not bypass verification.',
  Pretexting: 'The backstory may be fabricated — confirm identity independently.',
  Fear: 'Fear is being used as leverage — pause before you act.',
  Reciprocity: 'A favor does not earn access — hold the policy.',
  RapportBuilding: 'Friendliness is not identity — verify anyway.',
}

const GENERIC_HEADLINE = 'Hold — verify before you act'
const GENERIC_ACTION =
  'Do not reset MFA, read back codes, or change account access. Call the customer back on the number already on file.'

function speak(text: string): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
  window.speechSynthesis.cancel()
  window.speechSynthesis.speak(new SpeechSynthesisUtterance(text))
}

/**
 * The Imperative Banner: when the detector fires a CRITICAL alert, surface a
 * directive (an action, not a number) above the threat strip. On-screen by
 * default for the shared-mic demo; the Speak button is manual so it is never
 * audible to the caller unless the operator chooses (headphones / AI-caller mode).
 */
export function ImperativeBanner() {
  const alerts = useSessionStore((s) => s.alerts)
  const flags = useSessionStore((s) => s.flags)
  const flagIds = useSessionStore((s) => s.flagIds)
  const status = useSessionStore((s) => s.status)
  const ask = useSessionStore((s) => s.ask)
  const dismissAlert = useSessionStore((s) => s.dismissAlert)

  const alert = selActiveAlert({ alerts } as never)
  const drivers = selDrivers({ flags, flagIds } as never)

  // Hide once the call ends — the incident report takes over there.
  const show = alert !== null && status !== CallStatus.Ended
  const top = drivers[0]
  const why = top ? COUNTER[top] : ''

  // "The Ask" makes the directive specific. Redact any value inside it (defense
  // in depth) before it hits the screen. Falls back to generic guidance.
  const hasAsk = ask !== null && ask.action.trim().length > 0
  const safeAction = hasAsk ? redactText(ask.action).masked : ''
  const safeTarget = hasAsk && ask.target.trim() ? redactText(ask.target).masked : ''
  const headline = hasAsk ? `Do not ${safeAction}` : GENERIC_HEADLINE
  const action = hasAsk
    ? `The caller is working to ${safeAction}${safeTarget ? ` on ${safeTarget}` : ''} without verifying identity. Call the customer back on the number already on file before acting.`
    : GENERIC_ACTION
  const speakText = `${headline}. ${action}`

  return (
    <AnimatePresence>
      {show && alert && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
          className="rounded-lg border border-critical bg-critical px-5 py-4 text-white shadow-card"
        >
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <div className="text-[14px] font-semibold tracking-tight">{headline}</div>
              <p className="mt-1 text-[13px] leading-snug text-white/90">{action}</p>
              {(why || drivers.length > 0) && (
                <p className="mt-1.5 text-[11.5px] text-white/75">
                  {drivers.length > 0 && (
                    <span className="font-medium">
                      {drivers.slice(0, 3).map((t) => TACTIC_LABEL[t]).join(' · ')}
                    </span>
                  )}
                  {why && <span> — {why}</span>}
                </p>
              )}
            </div>

            <button
              onClick={() => speak(speakText)}
              title="Read aloud (for the agent's ear only)"
              className="flex shrink-0 items-center gap-1 rounded-md bg-white/15 px-2.5 py-1 text-[11px] font-medium text-white transition-colors hover:bg-white/25"
            >
              <Volume2 className="h-3.5 w-3.5" />
              Speak
            </button>
            <button
              onClick={() => dismissAlert(alert.alertId)}
              title="Dismiss"
              className="flex shrink-0 items-center rounded-md p-1 text-white/70 transition-colors hover:bg-white/15 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
