import {
  CallStatus,
  PROTOCOL_VERSION,
  type ClientControl,
  type Envelope,
  type ServerEvent,
  type ServerEventPayloadMap,
  type ServerEventType,
} from '@/sentinel/protocol'
import { LiveCallerSession } from '../liveCaller/LiveCallerSession'
import type { EventSource } from './EventSource'

/**
 * In-browser EventSource backed by a live Gemini Live voice call. It plays the
 * dev/no-backend role the real backend will later own: it emits the same
 * `session.started` / `call.status` / `transcript.turn` envelopes the dashboard
 * already consumes, sourced from the live conversation. Risk/flag events arrive
 * once the Claude detector is wired in — it consumes these same transcript turns.
 */
export class LiveEventSource implements EventSource {
  private readonly listeners = new Set<(event: ServerEvent) => void>()
  private session: LiveCallerSession | null = null
  private seq = 0
  private sessionId = ''

  connect(): void {
    /* nothing to open until `start` */
  }

  subscribe(listener: (event: ServerEvent) => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  send(control: ClientControl): void {
    switch (control.cmd) {
      case 'subscribe':
        break
      case 'start':
        void this.run(control.scenarioId)
        break
      case 'stop':
        this.session?.stop()
        break
      case 'reset':
        this.teardown()
        break
      case 'transcript':
        // In dev the browser IS the source, so there's no upstream to forward to.
        break
    }
  }

  close(): void {
    this.teardown()
    this.listeners.clear()
  }

  private async run(personaId?: string): Promise<void> {
    this.teardown()
    this.sessionId = `live-${Date.now()}`
    this.seq = 0
    this.emit('session.started', { sessionId: this.sessionId, voiceScoringEnabled: false })
    this.emit('call.status', { status: CallStatus.Connecting })

    this.session = new LiveCallerSession({
      onStatus: (status, detail) => {
        if (status === 'live') this.emit('call.status', { status: CallStatus.Live })
        else if (status === 'ended') this.emit('call.status', { status: CallStatus.Ended })
        else if (status === 'error') {
          this.emit('error', { code: 'live', message: detail ?? 'live error' })
          this.emit('call.status', { status: CallStatus.Error })
        }
      },
      onTurn: (turn) => this.emit('transcript.turn', turn),
    })

    try {
      await this.session.start(personaId)
    } catch (e) {
      this.emit('error', { code: 'live_start', message: e instanceof Error ? e.message : String(e) })
      this.emit('call.status', { status: CallStatus.Error })
    }
  }

  private teardown(): void {
    this.session?.stop()
    this.session = null
  }

  private emit<T extends ServerEventType>(type: T, payload: ServerEventPayloadMap[T]): void {
    const envelope: Envelope<T> = {
      v: PROTOCOL_VERSION,
      type,
      seq: this.seq++,
      ts: Date.now(),
      sessionId: this.sessionId,
      payload,
    }
    // A generic Envelope<T> isn't provably assignable to its own distributed
    // union (ServerEvent), but for a concrete T it always is — hence the cast.
    const event = envelope as unknown as ServerEvent
    for (const listener of this.listeners) listener(event)
  }
}
