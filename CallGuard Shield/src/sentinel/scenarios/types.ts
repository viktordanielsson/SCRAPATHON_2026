import type { ServerEventPayloadMap, ServerEventType } from '@/sentinel/protocol'

/**
 * One scripted step in a demo scenario. Authors only the event `type`, its
 * `payload`, and when to fire it (`atMs` from scenario start). The MockEventSource
 * injects the envelope fields (`v`/`seq`/`ts`/`sessionId`) at emit time.
 *
 * This is a discriminated union, so `payload` is type-checked against `type`.
 */
export type ScriptStep = {
  [T in ServerEventType]: { atMs: number; type: T; payload: ServerEventPayloadMap[T] }
}[ServerEventType]

export interface Scenario {
  id: string
  label: string
  description: string
  steps: ScriptStep[]
}
