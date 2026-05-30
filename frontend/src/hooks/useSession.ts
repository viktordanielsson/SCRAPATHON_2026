import { useEffect, useRef } from 'react'
import { createEventSource } from '../lib/transport/createEventSource'
import type { EventSource } from '../lib/transport/EventSource'
import { useHistoryStore } from '../store/historyStore'
import { useSessionStore } from '../store/sessionStore'
import { useTransportMode } from '../store/useTransportMode'

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
 * into the store, and exposes demo controls. Mount ONCE (in App). Swapping
 * mock↔real backend happens entirely inside `createEventSource()`.
 */
export function useSession(): SessionControls {
  const sourceRef = useRef<EventSource | null>(null)
  const dispatch = useSessionStore((s) => s.dispatch)
  const reset = useSessionStore((s) => s.reset)
  const mode = useTransportMode((s) => s.mode)

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
