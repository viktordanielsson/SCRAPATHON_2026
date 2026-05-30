import {
  CallStatus,
  PROTOCOL_VERSION,
  type Envelope,
  type ClientControl,
  type ServerEvent,
  type ServerEventPayloadMap,
  type ServerEventType,
} from '@shared/protocol'
import { DEFAULT_SCENARIO_ID, getScenario } from '../../scenarios'
import type { EventSource } from './EventSource'

/**
 * In-browser EventSource that replays a scripted scenario on a timer, emitting
 * the exact envelopes the real backend will emit. Injects `v`/`seq`/`ts`/
 * `sessionId` so scenario authors only write `atMs`/`type`/`payload`.
 */
export class MockEventSource implements EventSource {
  private listeners = new Set<(event: ServerEvent) => void>()
  private timers: ReturnType<typeof setTimeout>[] = []
  private seq = 0
  private sessionId = ''
  private scenarioId = DEFAULT_SCENARIO_ID
  private speed = 1

  connect(): void {
    /* mock is ready immediately */
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
        this.run(control.scenarioId ?? this.scenarioId)
        break
      case 'stop':
        // Emit a terminal Ended (like the real sources) so the call finalizes
        // in the history recorder; otherwise clearTimers drops the scripted Ended.
        if (this.sessionId) this.emit('call.status', { status: CallStatus.Ended })
        this.clearTimers()
        break
      case 'reset':
        this.reset()
        break
    }
  }

  close(): void {
    this.reset()
    this.listeners.clear()
  }

  /** Demo speed multiplier (2 = twice as fast). */
  setSpeed(multiplier: number): void {
    this.speed = multiplier
  }

  private run(scenarioId: string): void {
    this.reset()
    this.scenarioId = scenarioId
    const scenario = getScenario(scenarioId)
    if (!scenario) {
      console.warn(`[sentinel] unknown scenario: ${scenarioId}`)
      return
    }
    this.sessionId = `mock-${Date.now()}`
    // seq 0 — opens the session.
    this.emit('session.started', { sessionId: this.sessionId, voiceScoringEnabled: true })
    for (const step of scenario.steps) {
      const timer = setTimeout(
        () => this.emit(step.type, step.payload),
        step.atMs / this.speed,
      )
      this.timers.push(timer)
    }
  }

  private reset(): void {
    this.clearTimers()
    this.seq = 0
    this.sessionId = ''
  }

  private clearTimers(): void {
    for (const timer of this.timers) clearTimeout(timer)
    this.timers = []
  }

  private emit<T extends ServerEventType>(
    type: T,
    payload: ServerEventPayloadMap[T],
  ): void {
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
