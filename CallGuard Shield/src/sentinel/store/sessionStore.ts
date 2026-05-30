import { create } from 'zustand'
import type { ServerEvent } from '@/sentinel/protocol'
import { freshState, reduce, type SessionState } from './sessionReducer'

interface SessionStore extends SessionState {
  /** Apply one server event through the pure reducer. */
  dispatch: (event: ServerEvent) => void
  /** Reset to a clean Standby state (used between demo runs). */
  reset: () => void
  /** Mark an alert dismissed (hides the banner without losing history). */
  dismissAlert: (alertId: string) => void
}

export const useSessionStore = create<SessionStore>((set) => ({
  ...freshState(),
  dispatch: (event) => set((state) => reduce(state, event)),
  reset: () => set(() => freshState()),
  dismissAlert: (alertId) =>
    set((state) => ({
      alerts: state.alerts.map((a) =>
        a.alertId === alertId ? { ...a, dismissed: true } : a,
      ),
    })),
}))
