import { useSessionStore } from '../store/sessionStore'
import { Panel } from './Panel'

/** Experimental voice-authenticity (deepfake) score. Degrades gracefully when absent. */
export function VoiceAuthMeter() {
  const score = useSessionStore((s) => s.voiceScore)
  const enabled = useSessionStore((s) => s.voiceEnabled)

  const hasSignal = enabled && score !== null
  const pct = hasSignal ? score : 0
  // Lower score = more synthetic = more alarming.
  const color = !hasSignal ? '#3a4658' : pct < 40 ? '#FF3B47' : pct < 70 ? '#F5B83D' : '#2BD96A'

  return (
    <Panel
      title="Voice Authenticity"
      right={<span className="text-[9px] uppercase tracking-wider text-muted">experimental</span>}
    >
      <div className="flex items-center gap-3">
        <span className="font-mono text-2xl font-bold" style={{ color, fontVariantNumeric: 'tabular-nums' }}>
          {hasSignal ? Math.round(pct) : '—'}
        </span>
        <div className="flex-1">
          <div className="h-2 overflow-hidden rounded-full bg-edge">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${hasSignal ? pct : 0}%`, backgroundColor: color }}
            />
          </div>
          <p className="mt-1 font-mono text-[10px] text-muted">
            {hasSignal
              ? pct < 40
                ? 'likely synthetic'
                : pct < 70
                  ? 'anomalous'
                  : 'human'
              : 'no signal'}
          </p>
        </div>
      </div>
    </Panel>
  )
}
