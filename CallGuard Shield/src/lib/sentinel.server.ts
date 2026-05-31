import process from "node:process";

import { GoogleGenAI, Type } from "@google/genai";

/**
 * Server-only SENTINEL backend. The `.server.ts` suffix keeps this file (and the
 * GEMINI_API_KEY it reads) out of the client bundle — it is reached only from the
 * createServerFn handlers in `sentinel.functions.ts`.
 *
 * Mirrors what the standalone `frontend/` ran as Vite dev middleware:
 *   - mintEphemeralToken(): short-lived Gemini Live token so the browser opens a
 *     live session without ever seeing the real key.
 *   - analyzeTurn(): the social-engineering detector — Gemini 2.5 Flash with a
 *     structured schema returns { speaker, text, tactics, risk } for one turn.
 *
 * Read process.env INSIDE each function: on Cloudflare Workers env binds at
 * request time, so module-scope reads resolve to undefined.
 */

function requireApiKey(): string {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY not set — add it to .env.local (or export it / put it in .dev.vars).",
    );
  }
  return apiKey;
}

/** Mint a 30-min, single-use Gemini Live ephemeral token from the server key. */
export async function mintEphemeralToken(): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: requireApiKey() });
  const now = Date.now();
  const token = await ai.authTokens.create({
    config: {
      uses: 1,
      expireTime: new Date(now + 30 * 60_000).toISOString(),
      newSessionExpireTime: new Date(now + 2 * 60_000).toISOString(),
      httpOptions: { apiVersion: "v1alpha" },
    },
  });
  const name = token.name;
  if (!name) throw new Error("token mint returned no name");
  return name;
}

const DIARIZE_SYSTEM =
  "You are SENTINEL, a real-time social-engineering analyst monitoring a customer-support phone call. " +
  "CRITICAL: the call is captured from ONE shared microphone, so the raw transcript is NOT separated by speaker — you must do the diarization yourself from conversational role cues, not audio. " +
  "There are exactly two roles: the AGENT (the support representative who works for the company — greets the caller, offers help, asks to verify identity, quotes policy, is cooperative) and the CALLER (the person who phoned in — makes the requests, and may be an attacker using social engineering). " +
  "Use the already-attributed conversation so far as ground truth for who tends to say what, and keep speakers consistent across the call. Be precise and conservative: only flag a tactic a segment clearly exhibits.";

const TACTIC_ENUM = ["Urgency", "FalseAuthority", "Pretexting", "Fear", "Reciprocity", "RapportBuilding"];

const TACTICS_SCHEMA = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      tactic: { type: Type.STRING, enum: TACTIC_ENUM },
      confidence: { type: Type.NUMBER },
      rationale: { type: Type.STRING },
      quote: { type: Type.STRING },
    },
    required: ["tactic", "confidence", "rationale"],
  },
};

const DIARIZE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    segments: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          speaker: { type: Type.STRING, enum: ["Caller", "Agent"] },
          text: { type: Type.STRING },
          tactics: TACTICS_SCHEMA,
        },
        required: ["speaker", "text", "tactics"],
      },
    },
    revisions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          speaker: { type: Type.STRING, enum: ["Caller", "Agent"] },
        },
        required: ["id", "speaker"],
      },
    },
  },
  required: ["segments"],
};

export interface DiarizeInput {
  /** The conversation so far, already attributed, each with its stable turn id. */
  window: { id: string; speaker: string; text: string }[];
  /** The new, unattributed transcript fragment to diarize + analyze. */
  text: string;
}

export interface DiarizeSegment {
  speaker?: "Caller" | "Agent";
  text?: string;
  tactics?: { tactic?: string; confidence?: number; rationale?: string; quote?: string }[];
}

export interface DiarizeResult {
  segments?: DiarizeSegment[];
  /** Corrections to earlier turns' speaker labels, keyed by the turn id. */
  revisions?: { id?: string; speaker?: "Caller" | "Agent" }[];
  /** "The Ask" — what the caller is trying to get done. Empty strings if none yet. */
  ask?: { action?: string; target?: string };
}

/**
 * Diarize + analyze one finalized transcript fragment from the single shared mic.
 * Returns speaker-split segments (a fragment may contain a speaker handoff),
 * optional corrections to recent labels, tactics per segment, and overall risk.
 */
export async function diarizeTurn(input: DiarizeInput): Promise<DiarizeResult> {
  const ai = new GoogleGenAI({ apiKey: requireApiKey() });
  const convo =
    (input.window ?? []).map((w) => `[${w.id}] ${w.speaker}: ${w.text}`).join("\n") || "(start of call)";
  const prompt =
    `Conversation so far (already attributed; [id] Speaker: text):\n${convo}\n\n` +
    `New transcript fragment from the shared mic (UNATTRIBUTED — may contain one OR both speakers):\n"${input.text ?? ""}"\n\n` +
    `Tasks:\n` +
    `1) segments: split the new fragment wherever the speaker changes. For each segment output { speaker: "Caller"|"Agent", text, tactics }. ` +
    `Decide speaker from conversational role cues (greetings / offers to help / identity-verification / policy ⇒ Agent; inbound requests / impersonation / pressure / asking the agent to act ⇒ Caller). ` +
    `Keep the segment text VERBATIM — exactly as transcribed, in its original spoken language. Do NOT translate, paraphrase, or rewrite it (you may fix only obvious ASR spacing/punctuation). If the whole fragment is one speaker, return a single segment.\n` +
    `2) tactics (per segment): which manipulation tactics, if any, the segment clearly exhibits, each with a confidence 0-1. Allowed: ${TACTIC_ENUM.join(", ")}. Empty array if none. (The risk score is computed from these flags downstream — be accurate with confidence.)\n` +
    `3) revisions: if this new context reveals an EARLIER turn (from the list above) was mislabeled, include { id, speaker } to correct it. Otherwise omit/empty.\n` +
    `Return JSON.`;
  const r = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: {
      systemInstruction: DIARIZE_SYSTEM,
      responseMimeType: "application/json",
      responseSchema: DIARIZE_SCHEMA,
      temperature: 0.2,
      // Near-real-time structured task — disable "thinking" for lower latency.
      thinkingConfig: { thinkingBudget: 0 },
    },
  });
  return JSON.parse(r.text ?? "{}") as DiarizeResult;
}
