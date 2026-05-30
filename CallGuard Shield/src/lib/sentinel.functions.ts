import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { diarizeTurn, mintEphemeralToken } from "./sentinel.server";

// Server functions are the seam between the in-browser SENTINEL engine and the
// Gemini backend. The handler bodies (and the `.server.ts` they import) run
// server-only and are tree-shaken from the client bundle, so GEMINI_API_KEY
// never ships to the browser. The engine calls these instead of fetch('/token')
// and fetch('/analyze') (the old Vite dev middleware).

/** Mint a short-lived Gemini Live ephemeral token. */
export const getGeminiToken = createServerFn({ method: "GET" }).handler(async () => {
  return { token: await mintEphemeralToken() };
});

/** Diarize + analyze one finalized transcript fragment from the shared mic. */
export const diarizeTurnFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      window: z.array(z.object({ id: z.string(), speaker: z.string(), text: z.string() })),
      text: z.string(),
    }),
  )
  .handler(async ({ data }) => diarizeTurn(data));
