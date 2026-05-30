import { create } from 'zustand'

/** The user-selectable demo modes (the WebSocket backend is env-only, not in the UI). */
export type SourceMode = 'mock' | 'live' | 'analyze'

const fromEnv = import.meta.env.VITE_SOURCE
const initial: SourceMode = fromEnv === 'live' || fromEnv === 'analyze' ? fromEnv : 'mock'

interface TransportModeStore {
  /** mock = scripted scenarios · live = Gemini plays the caller · analyze = Gemini analyses a 2-person call. */
  mode: SourceMode
  setMode: (mode: SourceMode) => void
}

export const useTransportMode = create<TransportModeStore>((set) => ({
  mode: initial,
  setMode: (mode) => set({ mode }),
}))
