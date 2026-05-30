import type { Tactic } from '@shared/protocol'

/**
 * Desaturated, harmonious per-tactic tones for the editorial-light UI. Distinct
 * enough to scan, muted enough not to look like a rainbow. (The protocol ships
 * its own brighter TACTIC_COLOR for any backend use; the UI uses these.)
 */
export const TACTIC_TONE: Record<Tactic, string> = {
  Urgency: '#C2710C', // amber
  FalseAuthority: '#6D5BC0', // muted violet
  Pretexting: '#3B72B0', // muted blue
  Fear: '#C0492F', // muted red-orange
  Reciprocity: '#3F8F6B', // muted green
  RapportBuilding: '#A8861F', // muted gold
}
