import { motion } from 'framer-motion'
import { useSessionStore } from '../store/sessionStore'
import { riskColor } from '../lib/riskColor'

const CX = 140
const CY = 140
const R = 104
const SW = 14
const ANGLE_MIN = -120
const ANGLE_MAX = 120
const SWEEP = ANGLE_MAX - ANGLE_MIN

const clamp = (n: number) => Math.max(0, Math.min(100, n))
const angleFor = (risk: number) => ANGLE_MIN + (clamp(risk) / 100) * SWEEP

function polar(angleDeg: number, r = R) {
  const a = ((angleDeg - 90) * Math.PI) / 180
  return { x: CX + r * Math.cos(a), y: CY + r * Math.sin(a) }
}

function arcPath(startDeg: number, endDeg: number, r = R) {
  const start = polar(endDeg, r)
  const end = polar(startDeg, r)
  const large = endDeg - startDeg <= 180 ? 0 : 1
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${large} 0 ${end.x} ${end.y}`
}

const TRACK = [
  { from: 0, to: 40, color: '#2BD96A' },
  { from: 40, to: 70, color: '#F5B83D' },
  { from: 70, to: 100, color: '#FF3B47' },
]

export function ThreatGauge() {
  const risk = useSessionStore((s) => s.risk)
  const peak = useSessionStore((s) => s.peakRisk)
  const band = riskColor(risk)
  const angle = angleFor(risk)
  const critical = risk >= 70

  return (
    <div
      className="relative flex items-center justify-center rounded-md transition-shadow"
      style={critical ? { boxShadow: `0 0 48px ${band.color}33` } : undefined}
    >
      <svg viewBox="0 0 280 212" className="w-full max-w-[300px]">
        {/* dim band track */}
        {TRACK.map((seg) => (
          <path
            key={seg.from}
            d={arcPath(angleFor(seg.from), angleFor(seg.to))}
            stroke={seg.color}
            strokeOpacity={0.22}
            strokeWidth={SW}
            strokeLinecap="round"
            fill="none"
          />
        ))}

        {/* progress arc */}
        {risk > 0.5 && (
          <path
            d={arcPath(ANGLE_MIN, angle)}
            stroke={band.color}
            strokeWidth={SW}
            strokeLinecap="round"
            fill="none"
          />
        )}

        {/* needle */}
        <motion.g
          style={{ transformOrigin: `${CX}px ${CY}px` }}
          initial={false}
          animate={{ rotate: angle }}
          transition={{ type: 'spring', stiffness: 120, damping: 18, mass: 0.8 }}
        >
          <line x1={CX} y1={CY} x2={CX} y2={CY - (R - 6)} stroke={band.color} strokeWidth={3} strokeLinecap="round" />
          <circle cx={CX} cy={CY} r={6} fill={band.color} />
        </motion.g>

        {/* readout */}
        <text x={CX} y={CY - 6} textAnchor="middle" className="font-mono" fontSize={56} fontWeight={700} fill={band.color} style={{ fontVariantNumeric: 'tabular-nums' }}>
          {Math.round(risk)}
        </text>
        <text x={CX} y={CY + 18} textAnchor="middle" className="font-sans" fontSize={11} letterSpacing={3} fill={band.color}>
          {band.label}
        </text>
        <text x={CX} y={CY + 40} textAnchor="middle" className="font-mono" fontSize={11} fill="#5b6b7f">
          PEAK {Math.round(peak)}
        </text>
      </svg>
    </div>
  )
}
