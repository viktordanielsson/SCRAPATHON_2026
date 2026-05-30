import { useSessionStore } from '../store/sessionStore'
import { riskColor } from '../lib/riskColor'
import { useCountUp } from '../hooks/useCountUp'
import { Sparkline } from './Sparkline'

/** Big editorial number + slim track + trend. Replaces the skeuomorphic dial. */
export function RiskMeter() {
  const risk = useSessionStore((s) => s.risk)
  const peak = useSessionStore((s) => s.peakRisk)
  const history = useSessionStore((s) => s.riskHistory)
  const band = riskColor(risk)
  const display = useCountUp(risk)

  const prev = history.length >= 2 ? history[history.length - 2].score : 0
  const delta = Math.round(risk - prev)
  const scores = history.map((h) => h.score)

  return (
    <div className="flex items-center gap-7">
      <div className="flex items-baseline gap-3">
        <span
          className="text-[68px] font-semibold leading-none tracking-tight tabular-nums"
          style={{ color: band.color }}
        >
          {display}
        </span>
        <div className="flex flex-col gap-1 pb-1.5">
          <span
            className="text-[12px] font-semibold uppercase tracking-wider"
            style={{ color: band.color }}
          >
            {band.label}
          </span>
          {delta !== 0 && (
            <span className="text-[12px] text-muted tabular-nums">
              {delta > 0 ? '▲' : '▼'} {Math.abs(delta)}
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2.5">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-raised">
          <div
            className="h-full rounded-full transition-all duration-500 ease-out"
            style={{ width: `${Math.max(0, Math.min(100, risk))}%`, background: band.color }}
          />
        </div>
        <div className="flex items-end justify-between">
          <Sparkline data={scores} color={band.color} />
          <span className="text-[11px] text-muted tabular-nums">peak {Math.round(peak)}</span>
        </div>
      </div>
    </div>
  )
}
