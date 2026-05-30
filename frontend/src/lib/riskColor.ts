/**
 * Single source of truth for risk COLORING. Calm baseline → loud exception:
 * the nominal band is a neutral SLATE (not green), so a low-risk call looks
 * serene and the shift to amber/red reads as a real event. The CRITICAL banner
 * is NOT driven by this — it fires off the explicit `alert` event.
 */
export interface RiskBandColor {
  max: number
  color: string
  label: string
}

export const RISK_BANDS: RiskBandColor[] = [
  { max: 39, color: '#6B7280', label: 'Nominal' },
  { max: 69, color: '#B7791F', label: 'Elevated' },
  { max: 100, color: '#DC2626', label: 'Critical' },
]

export function riskColor(score: number): RiskBandColor {
  return RISK_BANDS.find((b) => score <= b.max) ?? RISK_BANDS[RISK_BANDS.length - 1]
}
