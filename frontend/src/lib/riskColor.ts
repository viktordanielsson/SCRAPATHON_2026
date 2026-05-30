/**
 * The single source of truth for risk COLORING (distinct from the protocol's
 * 4-band data model). Drives the gauge fill, needle, big number, and waveform.
 * The CRITICAL banner is NOT driven by this — it fires off the explicit `alert`
 * event so the backend owns that threshold.
 */
export interface RiskBandColor {
  max: number
  color: string
  label: string
}

export const RISK_BANDS: RiskBandColor[] = [
  { max: 39, color: '#2BD96A', label: 'NOMINAL' },
  { max: 69, color: '#F5B83D', label: 'ELEVATED' },
  { max: 100, color: '#FF3B47', label: 'CRITICAL' },
]

export function riskColor(score: number): RiskBandColor {
  return RISK_BANDS.find((b) => score <= b.max) ?? RISK_BANDS[RISK_BANDS.length - 1]
}
