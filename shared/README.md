# shared/ — the FE/BE event contract

This folder holds the **single source of truth** for the WebSocket protocol between
`backend/` and `frontend/`: the message envelope, the server→client event union, the
client→server control messages, and the shared enums (tactics, risk bands).

Both sides import it via the `@shared` path alias (configured in
`frontend/vite.config.ts` and `frontend/tsconfig.json`).

## Data path

The **browser** owns the live voice loop (Gemini Live): it captures the agent's mic,
plays the AI caller's voice, and reads the transcript of both sides. It forwards each turn
up with the `transcript` control message. The **backend's Claude detector** classifies
tactics on that text and emits `tactic.flag` / `risk.update` / `alert` back over the same
socket. The backend never touches audio — only text.

- **Server → client**: `ServerEventPayloadMap`, envelope-wrapped and `seq`-ordered.
- **Client → server**: `ClientControl` — `subscribe` / `start` / `stop` / `reset` /
  `transcript`.

`PROTOCOL_VERSION` is `1`. The server event union is unchanged from the original design;
the `transcript` client message is an **additive** extension. Never invent an event shape
inline — add it to the map first, since the compiler is the contract test. A
protocol-breaking change to the server union bumps `PROTOCOL_VERSION`.

> Until the backend is live, the frontend runs against an **in-browser mock** that emits
> these same events. When the backend is ready it emits the identical shapes over a real
> WebSocket and the UI swaps source with a one-line change — no UI rework.
