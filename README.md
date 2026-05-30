# SENTINEL

**Real-time social-engineering detection for support calls.**

SENTINEL listens to a live customer-support call, transcribes it, and uses an LLM to
flag manipulation tactics — urgency, false authority, pretexting, fear, reciprocity,
rapport-building — as they happen, surfacing a live threat score to the supervisor
before the agent gets talked into resetting an MFA token.

> Hackathon project · Scrapathon 2026

## The demo

Two participants, one live call, **no phones**:

- **The caller is an AI.** A **Gemini Live** voice agent plays the social engineer,
  prompted to work an attack — _"IT security here, we have an incident, I need you to
  reset MFA on account X right now."_ Because the attacker is driven by a persona it
  **reliably deploys real tactics every run**, yet the conversation stays live and
  unscripted.
- **The agent is one of us.** A team member answers in the browser as the support rep —
  mic only.
- **A second AI referees.** **Claude** reads the running transcript, flags each
  manipulation tactic, drives the threat gauge, and fires the CRITICAL alert. That's the
  SENTINEL dashboard.

So the show is an **adversarial AI vs. a human, refereed live by a detector AI.**
Everything runs in the browser — no telephony, no Google Meet, no screen-share hacks.

## Monorepo layout

| Path        | Owner  | What                                                              |
| ----------- | ------ | ---------------------------------------------------------------- |
| `frontend/` | Elias  | React + TS dashboard **+ the in-browser call** (mic + Gemini Live) |
| `backend/`  | Viktor | Ephemeral-token endpoint + Claude detector (transcript → events)  |
| `shared/`   | both   | The event contract — single source of truth both sides use        |

Frontend and backend are decoupled by a **versioned WebSocket event contract** in
`shared/`. The UI runs fully against a scripted mock today; the real backend swaps in
behind the same interface with **no UI changes**.

## How it works

Two layers. The **call** lives entirely in the browser; the **analysis** lives in the
backend and only ever sees text.

```
 BROWSER (frontend/)                              BACKEND (backend/)
 ──────────────────                               ──────────────────
 🎙  agent mic ─getUserMedia─┐
                             ▼
                     Gemini Live API  ───────────  Google voice AI · attacker persona
                             │  🔊 voice → speaker
                             │  📝 transcript (both sides)
                             └──── turns (WS) ────►  Detector: Claude
                                                       │  tactic + risk
    SENTINEL dashboard ◄──── ServerEvents ─────────────┘
    gauge / flags / alert / transcript                  (shared/protocol.ts)

    token:  browser ──► /token ──► ephemeral token for Gemini Live
```

- **Speaker mapping is exact.** The agent is Gemini Live's audio _input_; the caller is
  its _output_ — two separate streams, so every line is attributed correctly with zero
  diarization guesswork.
- **The backend never touches audio.** The browser owns the voice loop and forwards only
  transcript turns up; the backend returns flags, risk, and alerts. No PCM plumbing, no
  audio over the wire.

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
| **Voice**     | **Gemini Live API** | the AI caller — real-time voice in/out + transcription, in-browser |
| Lint / format | ESLint 9 + Prettier | —                                                    |

The threat gauge and audio waveform are **hand-rolled (SVG / Canvas)** rather than
pulled from a charting library — fewer dependencies, and the waveform runs off the real
call audio the browser already holds (Web Audio `AnalyserNode`), so there's nothing to
fake on the demo projector.

### Backend (`backend/`)

| Concern                   | Choice                                                              |
| ------------------------- | ------------------------------------------------------------------ |
| AI caller / transcription | Gemini Live API — browser connects with an ephemeral token the backend mints |
| Tactic classification     | Claude API (transcript → tactic flags + risk)                      |
| Transport to UI           | WebSocket (the `shared/` contract)                                 |

> **Dropped from the earlier plan:** Twilio Media Streams and Deepgram. Gemini Live is
> both the caller's voice **and** the transcription, so the telephony and standalone-STT
> layers are gone.

## The FE/BE seam (`shared/protocol.ts`)

- **Server → client** (`ServerEventPayloadMap`): `session.started`, `call.status`,
  `transcript.turn`, `tactic.flag`, `risk.update`, `alert`, `session.summary`, `error`,
  `heartbeat`. **Unchanged** by the new design — `PROTOCOL_VERSION` stays `1`.
- **Client → server** (`ClientControl`): `subscribe` / `start` / `stop` / `reset`, plus a
  new additive **`transcript`** message — the browser forwards each turn it captured from
  Gemini Live. The client owns `turnId`; the backend echoes it back on `transcript.turn`
  and on any `tactic.flag` that cites it, so transcript and flags cross-reference.

## Demo flow

1. Dashboard open, status **STANDBY**.
2. **Start call** → browser opens the Gemini Live session (ephemeral token) →
   `call.status: Connecting → Live`.
3. The AI calls in as the attacker and starts working the agent.
4. The team member answers in the mic as support.
5. Transcript streams live (both sides); the detector flags **Urgency / FalseAuthority /
   Pretexting**, the gauge climbs, and at threshold the **CRITICAL** banner fires.
6. Hang up → `session.summary` (peak risk, total flags, caller turns).

## Getting started (frontend)

```bash
cd frontend
pnpm install
pnpm dev          # http://localhost:5173
```

Other scripts: `pnpm build`, `pnpm typecheck`, `pnpm lint`, `pnpm format`.

### Gemini modes (live)

With a Gemini key set, the dashboard has a **Mode** dropdown (bottom bar) with three sources:

| Mode          | What happens                                                                                                                                                  |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Mock**      | Scripted scenarios — no key needed.                                                                                                                           |
| **AI Caller** | Gemini Live _plays the social engineer_; you answer as support. The scenario dropdown picks the attacker persona. **Use headphones** — the mic must not hear the AI. |
| **Analysis**  | **(default)** Two teammates talk; Gemini only _listens_ — transcribes, infers caller-vs-agent from content, flags tactics, and drives the risk gauge. No headphones needed (Gemini stays silent). |

Setup:

1. Get a **Gemini API key** from [Google AI Studio](https://aistudio.google.com/apikey).
2. `cp .env.example .env.local` and set `GEMINI_API_KEY=…` — server-side only: the Vite dev
   `/token` (ephemeral tokens for live transcription) and `/analyze` (the Gemini-Flash
   detector) endpoints use it, so it never reaches the browser bundle.
3. `pnpm dev`, then pick a mode and click **Run** (allow the mic).

`VITE_SOURCE` sets the mode on load — it ships as `analyze` (the 2-person view); the dropdown
switches at runtime. All three flow through `shared/protocol.ts`, so the dashboard is identical
across them. (The `/analyze` detector currently uses Gemini Flash; the contract is
model-agnostic, so a Claude detector drops in unchanged.)

## Status

Frontend scaffold and the `shared/` event contract are live. Next: the in-browser Gemini
Live voice loop, the Claude detector, and the dashboard panels.
