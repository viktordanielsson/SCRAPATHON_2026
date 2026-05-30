import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ShieldOff } from 'lucide-react'
import { redactionLabel, redactText, type RedactionHit } from '../lib/redaction'
import { useSessionStore } from '../store/sessionStore'

/** How long the tripwire banner stays up after a value is intercepted. */
const SHOW_MS = 6000

/**
 * The Redaction Tripwire banner: when a sensitive value is read aloud on the
 * latest finalized turn, flash STOP and name what was masked. Deterministic
 * (regex/Luhn, no model), so it always fires on cue. Auto-hides after a moment.
 */
export function RedactionTripwire() {
  const turnIds = useSessionStore((s) => s.turnIds)
  const turns = useSessionStore((s) => s.turns)

  const [hit, setHit] = useState<RedactionHit | null>(null)
  // turnId -> last scanned text. Keyed by content, not id, because Analysis mode
  // finalizes a turn TWICE for the same id (raw transcription, then the
  // detector's English-normalized text) and the corrected text can land after
  // the turn is no longer the latest — a value may only appear after normalization.
  const scannedRef = useRef<Map<string, string>>(new Map())

  // Detection: scan every finalized turn whose current text we haven't scanned
  // yet. (Each hit is a fresh object, so the auto-hide effect below restarts.)
  useEffect(() => {
    // New run reuses turn ids ("turn-0"…) — forget what we've scanned on reset.
    if (turnIds.length === 0) {
      scannedRef.current.clear()
      setHit(null)
      return
    }
    for (const id of turnIds) {
      const turn = turns[id]
      if (!turn?.final) continue
      if (scannedRef.current.get(id) === turn.text) continue
      scannedRef.current.set(id, turn.text)
      const { hits } = redactText(turn.text)
      if (hits.length > 0) setHit(hits[hits.length - 1])
    }
  }, [turns, turnIds])

  // Auto-hide: runs only when `hit` changes identity, so streaming interim
  // updates can't cancel an in-flight timer.
  useEffect(() => {
    if (!hit) return
    const timer = setTimeout(() => setHit(null), SHOW_MS)
    return () => clearTimeout(timer)
  }, [hit])

  return (
    <AnimatePresence>
      {hit && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25 }}
          className="flex items-center gap-3 rounded-lg border border-critical/40 bg-critical-soft px-5 py-3 shadow-card"
        >
          <ShieldOff className="h-5 w-5 shrink-0 text-critical" />
          <div className="min-w-0">
            <div className="text-[13px] font-semibold text-critical">
              Stop — sensitive value intercepted
            </div>
            <div className="text-[12px] text-ink-soft">
              A {redactionLabel(hit)} (••••{hit.last4}) was masked in the transcript before it
              could be exposed.
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
