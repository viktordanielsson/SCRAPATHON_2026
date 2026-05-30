import { useSessionStore } from '../store/sessionStore'
import { Panel } from './Panel'

/** Experimental voice-authenticity (deepfake) score. Degrades gracefully. */
export function VoiceAuthMeter() {
  const score = useSessionStore((s) => s.voiceScore)
  const enabled = useSessionStore((s) => s.voiceEnabled)

  const hasSignal = enabled && score !== null
  const pct = hasSignal ? score : 0
  const color = !hasSignal
    ? '#B9B7AE'
    : pct < 40
      ? '#DC2626'
      : pct < 70
        ? '#B7791F'
        : '#3F8F6B'
  const caption = !hasSignal
    ? 'no signal'
    : pct < 40
      ? 'likely synthetic'
      : pct < 70
        ? 'anomalous'
        : 'authentic'

  return (
    <Panel
      title="Voice authenticity"
      right={
        <span className="text-[10px] uppercase tracking-wider text-muted">experimental</span>
      }
    >
      <div className="flex items-center gap-4">
        <span
          className="text-[28px] font-semibold leading-none tabular-nums"
          style={{ color }}
        >
          {hasSignal ? Math.round(pct) : '—'}
        </span>
        <div className="flex-1">
          <div className="h-1.5 overflow-hidden rounded-full bg-raised">
            <div
              className="h-full rounded-full transition-all duration-500 ease-out"
              style={{ width: `${pct}%`, background: color }}
            />
          </div>
          <p className="mt-1.5 text-[11px] text-muted">{caption}</p>
        </div>
      </div>
    </Panel>
  )
}
