import { useState } from 'react'
import { History, Play, RotateCcw, Square } from 'lucide-react'
import { CallStatus } from '@shared/protocol'
import { SCENARIOS, DEFAULT_SCENARIO_ID } from '../scenarios'
import { useSessionStore } from '../store/sessionStore'
import { useHistoryStore } from '../store/historyStore'
import { useTransportMode, type SourceMode } from '../store/useTransportMode'
import type { SessionControls } from '../hooks/useSession'
import { HistoryDrawer } from './HistoryDrawer'

const MODE_LABELS: Record<SourceMode, string> = {
  mock: 'Mock',
  live: 'AI Caller',
  analyze: 'Analysis',
}

export function DemoControls({ controls }: { controls: SessionControls }) {
  const [scenarioId, setScenarioId] = useState(DEFAULT_SCENARIO_ID)
  const [historyOpen, setHistoryOpen] = useState(false)
  const status = useSessionStore((s) => s.status)
  const running = status === CallStatus.Live || status === CallStatus.Connecting
  const mode = useTransportMode((s) => s.mode)
  const setMode = useTransportMode((s) => s.setMode)
  const historyCount = useHistoryStore((s) => s.sessions.length)

  return (
    <footer className="flex items-center gap-3 border-t border-hairline bg-surface px-6 py-3">
      <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted">Mode</span>

      <select
        value={mode}
        onChange={(e) => setMode(e.target.value as SourceMode)}
        className="rounded-md border border-hairline bg-surface px-2.5 py-1.5 text-[12px] text-ink outline-none focus:border-accent"
      >
        {(Object.keys(MODE_LABELS) as SourceMode[]).map((m) => (
          <option key={m} value={m}>
            {MODE_LABELS[m]}
          </option>
        ))}
      </select>

      {mode !== 'analyze' && (
        <select
          value={scenarioId}
          onChange={(e) => setScenarioId(e.target.value)}
          className="rounded-md border border-hairline bg-surface px-2.5 py-1.5 text-[12px] text-ink outline-none focus:border-accent"
          title={mode === 'live' ? 'Attacker persona' : 'Scenario'}
        >
          {SCENARIOS.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      )}

      <button
        onClick={() => controls.start(scenarioId)}
        className="flex items-center gap-1.5 rounded-md bg-accent px-3.5 py-1.5 text-[12px] font-semibold text-white transition-colors hover:bg-accent-strong"
      >
        <Play className="h-3.5 w-3.5" />
        Run
      </button>

      <button
        onClick={controls.stop}
        disabled={!running}
        className="flex items-center gap-1.5 rounded-md border border-hairline px-3 py-1.5 text-[12px] text-ink-soft transition-colors hover:bg-raised disabled:opacity-40"
      >
        <Square className="h-3.5 w-3.5" />
        Stop
      </button>

      <button
        onClick={controls.resetDemo}
        className="flex items-center gap-1.5 rounded-md border border-hairline px-3 py-1.5 text-[12px] text-muted transition-colors hover:bg-raised hover:text-ink"
      >
        <RotateCcw className="h-3.5 w-3.5" />
        Reset
      </button>

      <button
        onClick={() => setHistoryOpen(true)}
        className="ml-auto flex items-center gap-1.5 rounded-md border border-hairline px-3 py-1.5 text-[12px] text-ink-soft transition-colors hover:bg-raised hover:text-ink"
      >
        <History className="h-3.5 w-3.5" />
        History
        {historyCount > 0 && (
          <span className="rounded-full bg-raised px-1.5 text-[10px] font-medium tabular-nums text-muted">
            {historyCount}
          </span>
        )}
      </button>

      <HistoryDrawer open={historyOpen} onClose={() => setHistoryOpen(false)} />
    </footer>
  )
}
