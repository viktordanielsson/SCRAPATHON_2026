# SENTINEL

**Real-time social-engineering detection for support calls.**

SENTINEL listens to a live customer-support call, transcribes it, and uses an LLM to
flag manipulation tactics — urgency, false authority, pretexting, fear, reciprocity,
rapport-building — as they happen, surfacing a live threat score to the supervisor
before the agent gets talked into resetting an MFA token.

> Hackathon project · Scrapathon 2026

## Monorepo layout

| Path        | Owner  | What                                                        |
| ----------- | ------ | ----------------------------------------------------------- |
| `frontend/` | Elias  | React + TS supervisor dashboard (the SENTINEL UI)           |
| `backend/`  | Viktor | Twilio → Deepgram → Claude pipeline (added next)            |
| `shared/`   | both   | The event contract — single source of truth both sides use  |

Frontend and backend are decoupled by a **versioned WebSocket event contract** in
`shared/`. The UI runs fully against a scripted mock today; the real backend swaps in
behind the same interface with **no UI changes**.

## Tech stack

### Frontend (`frontend/`)

| Concern       | Choice              | Why                                                  |
| ------------- | ------------------- | ---------------------------------------------------- |
| Language      | TypeScript (strict) | type-safe contract across the FE/BE seam             |
| Build         | Vite 5              | instant HMR, fast production build                   |
| UI            | React 18            | —                                                    |
| Styling       | Tailwind CSS 3      | rapid dark-dashboard styling, no context-switching   |
| State         | Zustand             | tiny store, ideal for a high-frequency event stream  |
| Motion        | Framer Motion       | gauge needle / badge / alert-banner animation        |
| Icons         | lucide-react        | clean line icons                                     |
| Lint / format | ESLint 9 + Prettier | —                                                    |

The threat gauge and audio waveform are **hand-rolled (SVG / Canvas)** rather than
pulled from a charting library — fewer dependencies and zero risk of a flaky widget on
the demo projector.

### Backend (`backend/`, incoming)

| Concern               | Planned                            |
| --------------------- | ---------------------------------- |
| Telephony             | Twilio Media Streams               |
| Transcription         | Deepgram (streaming + diarization) |
| Tactic classification | Claude API                         |
| Transport to UI       | WebSocket (the `shared/` contract) |

## Getting started (frontend)

```bash
cd frontend
pnpm install
pnpm dev          # http://localhost:5173
```

Other scripts: `pnpm build`, `pnpm typecheck`, `pnpm lint`, `pnpm format`.

## How the pieces connect

```
 ┌──────────┐   audio    ┌──────────────────────────────┐   WS events   ┌──────────────┐
 │  Caller  │ ─────────▶ │  backend/  Twilio → Deepgram  │ ────────────▶ │  frontend/   │
 │  + Agent │            │  → Claude → risk scoring      │   (shared/    │  SENTINEL    │
 └──────────┘            └──────────────────────────────┘    contract)   │  dashboard   │
                                                                          └──────────────┘
```

**Status:** frontend scaffold live. UI panels, the `shared/` event contract, and the
mock scenario engine land next (see the architecture plan).
