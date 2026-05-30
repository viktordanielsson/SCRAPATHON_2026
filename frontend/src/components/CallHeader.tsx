import clsx from 'clsx'
import { CallStatus } from '@shared/protocol'
import { useSessionStore } from '../store/sessionStore'
import { useElapsed } from '../hooks/useElapsed'
import { formatClock } from '../lib/format'

const STATUS: Record<CallStatus, { label: string; dot: string }> = {
  Idle: { label: 'Standby', dot: '#B9B7AE' },
  Connecting: { label: 'Connecting', dot: '#5B5BD6' },
  Live: { label: 'Monitoring', dot: '#3FA06B' },
  Ended: { label: 'Call ended', dot: '#B9B7AE' },
  Error: { label: 'Error', dot: '#DC2626' },
}

export function CallHeader() {
  const status = useSessionStore((s) => s.status)
  const callerLabel = useSessionStore((s) => s.callerLabel)
  const startedAt = useSessionStore((s) => s.startedAt)
  const endedAt = useSessionStore((s) => s.endedAt)

  const elapsed = useElapsed(startedAt, endedAt)
  const meta = STATUS[status]
  const live = status === CallStatus.Live

  return (
    <header className="flex items-center gap-5 border-b border-hairline bg-surface px-6 py-3.5">
      <div className="flex items-baseline gap-2.5">
        <span className="text-[15px] font-semibold tracking-tight text-ink">Sentinel</span>
        <span className="hidden text-[11px] text-muted sm:inline">
          Social-engineering detection
        </span>
      </div>

      <span className="flex items-center gap-2 rounded-full border border-hairline px-2.5 py-1">
        <span
          className={clsx('h-1.5 w-1.5 rounded-full', live && 'animate-pulse')}
          style={{ background: meta.dot }}
        />
        <span className="text-[11px] font-medium text-ink-soft">{meta.label}</span>
      </span>

      <div className="ml-auto flex items-center gap-5 font-mono text-[12px] text-muted">
        <span>{callerLabel ?? 'No active call'}</span>
        <span className="tabular-nums text-ink-soft">{formatClock(elapsed)}</span>
      </div>
    </header>
  )
}
