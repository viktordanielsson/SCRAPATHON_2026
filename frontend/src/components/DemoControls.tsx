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
    <footer className="flex items-center gap-3 border-t border-edge bg-surface/80 px-5 py-3">
      <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">Demo</span>

      <select
        value={scenarioId}
        onChange={(e) => setScenarioId(e.target.value)}
        className="rounded border border-edge bg-panel px-2 py-1.5 font-mono text-xs text-ink outline-none focus:border-accent"
      >
        {SCENARIOS.map((s) => (
          <option key={s.id} value={s.id}>
            {s.label}
          </option>
        ))}
      </select>

      <button
        onClick={() => controls.start(scenarioId)}
        className="flex items-center gap-1.5 rounded bg-accent px-3 py-1.5 font-mono text-xs font-semibold text-[#06222a] transition-opacity hover:opacity-90"
      >
        <Play className="h-3.5 w-3.5" />
        Run
      </button>

      <button
        onClick={controls.stop}
        disabled={!running}
        className="flex items-center gap-1.5 rounded border border-edge px-3 py-1.5 font-mono text-xs text-ink transition-colors hover:border-muted disabled:opacity-40"
      >
        <Square className="h-3.5 w-3.5" />
        Stop
      </button>

      <button
        onClick={controls.resetDemo}
        className="flex items-center gap-1.5 rounded border border-edge px-3 py-1.5 font-mono text-xs text-muted transition-colors hover:border-muted hover:text-ink"
      >
        <RotateCcw className="h-3.5 w-3.5" />
        Reset
      </button>

      <span className="ml-auto font-mono text-[10px] text-muted/60">
        [R] reset · ?scenario=id to autoplay
      </span>
    </footer>
  )
}
