import { useEffect, useRef } from 'react'
import { createEventSource } from '../lib/transport/createEventSource'
import type { EventSource } from '../lib/transport/EventSource'
import { useHistoryStore } from '../store/historyStore'
import { useSessionStore } from '../store/sessionStore'
import { useTransportMode, type SourceMode } from '../store/useTransportMode'

export interface SessionControls {
  /** Reset, then play a scenario (or the real call) from the start. */
  start: (scenarioId?: string) => void
  /** Halt the current run in place. */
  stop: () => void
  /** Clear the source and return the dashboard to a clean Standby. */
  resetDemo: () => void
}

/**
 * Owns the single EventSource for the app: creates it once, pipes every event
 * into the store, and exposes demo controls. Mount ONCE per view. Swapping
 * mock↔live↔analyze backend happens entirely inside `createEventSource()`.
 *
 * Pass `modeOverride` to pin the data source for a given page (e.g. the live
 * console pins `'analyze'`/`'live'`, the demo pins `'mock'`); otherwise it
 * follows the global `useTransportMode` store.
 */
export function useSession(modeOverride?: SourceMode): SessionControls {
  const sourceRef = useRef<EventSource | null>(null)
  const dispatch = useSessionStore((s) => s.dispatch)
  const reset = useSessionStore((s) => s.reset)
  const storeMode = useTransportMode((s) => s.mode)
  const mode = modeOverride ?? storeMode

  useEffect(() => {
    reset() // switching mode starts from a clean Standby
    const source = createEventSource(mode)
    sourceRef.current = source
    // Pipe every event into the live store AND the history recorder (the
    // recorder finalizes & persists a call when it ends).
    const unsubscribe = source.subscribe((e) => {
      dispatch(e)
      useHistoryStore.getState().record(e)
    })
    source.connect()
    source.send({ cmd: 'subscribe' })
    return () => {
      // close() first so a terminal Ended is still delivered to the recorder
      // (the listener is removed by unsubscribe); then finalize as a safety net
      // for sources whose teardown emits no terminal event (e.g. mock).
      source.close()
      unsubscribe()
      useHistoryStore.getState().finalizeCurrent()
      sourceRef.current = null
    }
  }, [dispatch, mode, reset])

  return {
    start: (scenarioId) => {
      reset() // clean slate so run #2 doesn't inherit run #1
      sourceRef.current?.send({ cmd: 'start', scenarioId })
    },
    stop: () => {
      sourceRef.current?.send({ cmd: 'stop' })
      useHistoryStore.getState().finalizeCurrent()
    },
    resetDemo: () => {
      sourceRef.current?.send({ cmd: 'reset' })
      useHistoryStore.getState().finalizeCurrent() // save before clearing
      reset() // back to Standby
    },
  }
}
