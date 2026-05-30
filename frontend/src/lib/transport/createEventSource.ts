import type { EventSource } from './EventSource'
import { MockEventSource } from './MockEventSource'
import { WebSocketEventSource } from './WebSocketEventSource'

/**
 * The ONE place the data source is chosen. Defaults to the in-browser mock;
 * set `VITE_USE_MOCK=false` (and `VITE_WS_URL`) to use the real backend.
 * No UI code changes when flipping between them.
 */
export function createEventSource(): EventSource {
  const useMock = import.meta.env.VITE_USE_MOCK !== 'false'
  if (useMock) return new MockEventSource()
  const url = import.meta.env.VITE_WS_URL ?? 'ws://localhost:8787'
  return new WebSocketEventSource(url)
}
