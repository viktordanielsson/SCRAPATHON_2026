import { parseServerEvent, type ClientControl, type ServerEvent } from '@/sentinel/protocol'
import type { EventSource } from './EventSource'

/**
 * Real backend transport. Wraps a native WebSocket, validates every inbound
 * message at the seam with `parseServerEvent` (the wire is JSON even though the
 * types are shared), and queues control messages sent before the socket opens.
 */
export class WebSocketEventSource implements EventSource {
  private ws: WebSocket | null = null
  private readonly listeners = new Set<(event: ServerEvent) => void>()
  private readonly pending: ClientControl[] = []

  constructor(private readonly url: string) {}

  connect(): void {
    const ws = new WebSocket(this.url)
    this.ws = ws

    ws.onopen = () => {
      for (const control of this.pending) this.write(control)
      this.pending.length = 0
    }

    ws.onmessage = (event) => {
      let data: unknown
      try {
        data = JSON.parse(event.data as string)
      } catch {
        console.warn('[sentinel] non-JSON WS message dropped')
        return
      }
      const parsed = parseServerEvent(data)
      if (!parsed) {
        console.warn('[sentinel] malformed event dropped', data)
        return
      }
      for (const listener of this.listeners) listener(parsed)
    }

    ws.onerror = () => console.warn('[sentinel] WS error')
  }

  subscribe(listener: (event: ServerEvent) => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  send(control: ClientControl): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) this.write(control)
    else this.pending.push(control)
  }

  close(): void {
    this.ws?.close()
    this.ws = null
    this.listeners.clear()
  }

  private write(control: ClientControl): void {
    this.ws?.send(JSON.stringify(control))
  }
}
