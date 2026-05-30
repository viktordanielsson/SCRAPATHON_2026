/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** 'false' switches the app from the in-browser mock to the real WebSocket backend. */
  readonly VITE_USE_MOCK?: string
  /** WebSocket URL of the real backend (used when VITE_USE_MOCK === 'false'). */
  readonly VITE_WS_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
