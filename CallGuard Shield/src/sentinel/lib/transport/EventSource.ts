import type { ClientControl, ServerEvent } from '@/sentinel/protocol'

/**
 * The single seam between the UI and its data source. The UI only ever talks to
 * this interface — it never knows whether events come from the in-browser mock
 * or the real backend WebSocket. Swapping the two is a one-line change in
 * `createEventSource()`.
 */
export interface EventSource {
  /** Open the underlying connection (no-op for the mock). */
  connect(): void
  /** Subscribe to the server→client event stream. Returns an unsubscribe fn. */
  subscribe(listener: (event: ServerEvent) => void): () => void
  /** Send a control message to the source. */
  send(control: ClientControl): void
  /** Tear down the connection and drop all listeners. */
  close(): void
}
