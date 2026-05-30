import clsx from 'clsx'
import { CallStatus } from '@shared/protocol'
import { useSessionStore } from '../store/sessionStore'
import { useElapsed } from '../hooks/useElapsed'
import { formatClock } from '../lib/format'
import { riskColor } from '../lib/riskColor'
import { Waveform } from './Waveform'

const STATUS_META: Record<CallStatus, { label: string; color: string }> = {
  Idle: { label: 'STANDBY', color: '#5b6b7f' },
  Connecting: { label: 'CONNECTING', color: '#22d3ee' },
  Live: { label: 'MONITORING', color: '#22c55e' },
  Ended: { label: 'CALL ENDED', color: '#5b6b7f' },
  Error: { label: 'ERROR', color: '#ef4444' },
}

export function CallHeader() {
  const status = useSessionStore((s) => s.status)
  const callerLabel = useSessionStore((s) => s.callerLabel)
  const risk = useSessionStore((s) => s.risk)
  const startedAt = useSessionStore((s) => s.startedAt)
  const endedAt = useSessionStore((s) => s.endedAt)

  const elapsed = useElapsed(startedAt, endedAt)
  const meta = STATUS_META[status]
  const band = riskColor(risk)
  const live = status === CallStatus.Live

  return (
    <header className="flex items-center gap-5 border-b border-edge bg-surface/80 px-5 py-3">
      {/* brand + status */}
      <div className="flex items-center gap-3">
        <span className="font-mono text-sm font-bold tracking-[0.3em] text-accent">SENTINEL</span>
        <span className="flex items-center gap-1.5 rounded border border-edge px-2 py-1">
          <span
            className={clsx('h-2 w-2 rounded-full', live && 'animate-pulse')}
            style={{ backgroundColor: meta.color }}
          />
          <span className="font-mono text-[10px] tracking-wider" style={{ color: meta.color }}>
            {meta.label}
          </span>
        </span>
      </div>

      {/* call meta */}
      <div className="flex items-center gap-4 font-mono text-[11px] text-muted">
        <span>{callerLabel ?? '—'}</span>
        <span style={{ fontVariantNumeric: 'tabular-nums' }}>{formatClock(elapsed)}</span>
      </div>

      {/* waveform */}
      <div className="min-w-0 flex-1">
        <Waveform />
      </div>

      {/* big threat readout */}
      <div className="flex items-center gap-2">
        <span className="text-right text-[9px] uppercase leading-tight tracking-wider text-muted">
          Threat
          <br />
          Index
        </span>
        <span
          className="font-mono text-4xl font-bold leading-none"
          style={{ color: band.color, fontVariantNumeric: 'tabular-nums' }}
        >
          {Math.round(risk)}
        </span>
      </div>
    </header>
  )
}
