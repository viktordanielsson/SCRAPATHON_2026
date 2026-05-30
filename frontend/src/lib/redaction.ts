/**
 * Redaction Tripwire — deterministic, model-free detection of sensitive values
 * (account numbers, card numbers, OTP / verification codes, long IDs) in a line
 * of transcript. Pure string work: no network, no Gemini, so it fires reliably
 * on the demo projector and can mask a value the instant it is spoken.
 *
 * This is the "catch the leak in the agent's own mouth" layer: if a value is
 * being read aloud, we mask it in the transcript and raise a tripwire.
 */

export type RedactionKind = 'card' | 'otp' | 'account'

export interface RedactionHit {
  kind: RedactionKind
  /** Last four digits kept visible (e.g. "4827"); may be shorter for tiny codes. */
  last4: string
}

export interface RedactionResult {
  /** The line with every sensitive value replaced by `••••<last4>`. */
  masked: string
  /** One entry per value masked, in order of appearance. */
  hits: RedactionHit[]
}

/** Luhn check — used only to LABEL a number as a payment card, not to mask. */
function luhnValid(digits: string): boolean {
  let sum = 0
  let alt = false
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = digits.charCodeAt(i) - 48
    if (d < 0 || d > 9) return false
    if (alt) {
      d *= 2
      if (d > 9) d -= 9
    }
    sum += d
    alt = !alt
  }
  return sum % 10 === 0
}

/**
 * A sensitive keyword ANYWHERE in the short look-behind window lowers the digit
 * threshold (verification codes are short). The window is bounded so a distant
 * keyword can't leak in, but filler words no longer defeat the match — so
 * "your code is 4827" and "the account ending in 1234" both qualify.
 */
const CODE_KEYWORD =
  /\b(?:code|otp|pin|cvv|cvc|passcode|verification|one[-\s]?time|security|account|acct|card|ssn|social|routing)\b/i

/** Chars of context scanned before a number when looking for a sensitive keyword. */
const KEYWORD_WINDOW = 24

/**
 * Numeric runs: one or more digits, optionally continued by single space/dash
 * separated groups (so "1234 5678" reads as one identifier). Qualification below
 * is what keeps two unrelated prose numbers from masking just by being adjacent.
 */
const NUMERIC_RUN = /\d+(?:[\s-]\d+)*/g

/**
 * A bare (unkeyworded) number must contain a single contiguous token at least
 * this long to count as an identifier — keeps prices, quantities, times, and
 * two short adjacent prose numbers out of the masker.
 */
const BARE_TOKEN_MIN = 7

function classify(digits: string): RedactionKind {
  if (digits.length >= 13 && digits.length <= 19 && luhnValid(digits)) return 'card'
  if (digits.length >= 8) return 'account'
  return 'otp'
}

/**
 * Mask sensitive numbers in a line. A run qualifies ONLY on a real signal —
 * never on the concatenated length of two short, unrelated prose numbers:
 *   (a) a Luhn-valid payment card,
 *   (b) a keyworded code/account of 4+ digits, or
 *   (c) a single long contiguous identifier token (>= BARE_TOKEN_MIN digits).
 * Each masked value keeps only its last four digits.
 */
export function redactText(text: string): RedactionResult {
  const hits: RedactionHit[] = []
  const masked = text.replace(NUMERIC_RUN, (run, offset: number) => {
    const groups = run.match(/\d+/g) ?? []
    const digits = groups.join('')
    if (digits.length === 0) return run
    const maxToken = groups.reduce((m, g) => Math.max(m, g.length), 0)
    const before = text.slice(Math.max(0, offset - KEYWORD_WINDOW), offset)
    const keyworded = CODE_KEYWORD.test(before)
    const isCard = digits.length >= 13 && digits.length <= 19 && luhnValid(digits)
    const qualifies = isCard || (keyworded && digits.length >= 4) || maxToken >= BARE_TOKEN_MIN
    if (!qualifies) return run
    const last4 = digits.slice(-4)
    hits.push({ kind: classify(digits), last4 })
    return `••••${last4}`
  })
  return { masked, hits }
}

const KIND_LABEL: Record<RedactionKind, string> = {
  card: 'card number',
  otp: 'verification code',
  account: 'account number',
}

export function redactionLabel(hit: RedactionHit): string {
  return KIND_LABEL[hit.kind]
}
