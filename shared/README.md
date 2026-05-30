# shared/ — the FE/BE event contract

This folder holds the **single source of truth** for the WebSocket protocol between
`backend/` and `frontend/`: the message envelope, the server→client event union, the
client→server control messages, and the shared enums (tactics, risk bands).

Both sides import it via the `@shared` path alias (configured in
`frontend/vite.config.ts` and `frontend/tsconfig.json`).

> `protocol.ts` lands with the approved architecture plan. Until then, the frontend runs
> against an in-browser mock that emits these same events. When the backend is ready it
> emits the identical shapes over a real WebSocket and the UI swaps source with a
> one-line change — no UI rework.
