import type { SourceMode } from '../../store/useTransportMode'
import { AnalyzeEventSource } from './AnalyzeEventSource'
import type { EventSource } from './EventSource'
import { LiveEventSource } from './LiveEventSource'
import { MockEventSource } from './MockEventSource'
import { WebSocketEventSource } from './WebSocketEventSource'

/**
 * The ONE place the data source is built. The UI picks a `mode` at runtime
 * (mock / live / analyze); the real WebSocket backend is env-only, since there's
 * no UI for it yet. No UI code changes when flipping between sources.
 */
export function createEventSource(mode?: SourceMode): EventSource {
  // Env can force the real backend regardless of the selected UI mode.
  if (import.meta.env.VITE_SOURCE === 'ws' || import.meta.env.VITE_USE_MOCK === 'false') {
    return new WebSocketEventSource(import.meta.env.VITE_WS_URL ?? 'ws://localhost:8787')
  }
  const m = mode ?? 'mock'
  if (m === 'live') return new LiveEventSource()
  if (m === 'analyze') return new AnalyzeEventSource()
  return new MockEventSource()
}
