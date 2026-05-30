import { useState } from 'react'
import { Play, RotateCcw, Square } from 'lucide-react'
import { CallStatus } from '@shared/protocol'
import { SCENARIOS, DEFAULT_SCENARIO_ID } from '../scenarios'
import { useSessionStore } from '../store/sessionStore'
import type { SessionControls } from '../hooks/useSession'

export function DemoControls({ controls }: { controls: SessionControls }) {
  const [scenarioId, setScenarioId] = useState(DEFAULT_SCENARIO_ID)
  const status = useSessionStore((s) => s.status)
  const running = status === CallStatus.Live || status === CallStatus.Connecting

  return (
    <footer className="flex items-center gap-3 border-t border-hairline bg-surface px-6 py-3">
      <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted">Demo</span>

      <select
        value={scenarioId}
        onChange={(e) => setScenarioId(e.target.value)}
        className="rounded-md border border-hairline bg-surface px-2.5 py-1.5 text-[12px] text-ink outline-none focus:border-accent"
      >
        {SCENARIOS.map((s) => (
          <option key={s.id} value={s.id}>
            {s.label}
          </option>
        ))}
      </select>

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

      <span className="ml-auto font-mono text-[11px] text-muted">
        [R] reset · ?scenario=id autoplays
      </span>
    </footer>
  )
}
