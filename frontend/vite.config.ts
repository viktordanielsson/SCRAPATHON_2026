import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'
import { GoogleGenAI, Type } from '@google/genai'

/**
 * Dev-only `/token` endpoint: mints a short-lived Gemini Live ephemeral token
 * from the server-side GEMINI_API_KEY so the browser never sees the real key.
 * In production the real backend exposes the same endpoint.
 */
function geminiTokenEndpoint(apiKey: string | undefined): Plugin {
  return {
    name: 'sentinel-gemini-token',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/token', (_req, res) => {
        res.setHeader('content-type', 'application/json')
        if (!apiKey) {
          res.statusCode = 500
          res.end(JSON.stringify({ error: 'GEMINI_API_KEY not set (put it in frontend/.env.local)' }))
          return
        }
        const ai = new GoogleGenAI({ apiKey })
        const now = Date.now()
        ai.authTokens
          .create({
            config: {
              uses: 1,
              expireTime: new Date(now + 30 * 60_000).toISOString(),
              newSessionExpireTime: new Date(now + 2 * 60_000).toISOString(),
              httpOptions: { apiVersion: 'v1alpha' },
            },
          })
          .then((token) => res.end(JSON.stringify({ token: token.name })))
          .catch((e: unknown) => {
            res.statusCode = 500
            res.end(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }))
          })
      })
    },
  }
}

const ANALYZE_SYSTEM =
  'You are SENTINEL, a real-time social-engineering analyst monitoring a customer-support phone call. You receive the conversation so far and the latest line. Decide which role said the latest line and detect manipulation tactics in it. Be precise and conservative: only flag a tactic the latest line clearly exhibits.'

const ANALYZE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    speaker: { type: Type.STRING, enum: ['Caller', 'Agent'] },
    text: { type: Type.STRING },
    tactics: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          tactic: {
            type: Type.STRING,
            enum: ['Urgency', 'FalseAuthority', 'Pretexting', 'Fear', 'Reciprocity', 'RapportBuilding'],
          },
          confidence: { type: Type.NUMBER },
          rationale: { type: Type.STRING },
          quote: { type: Type.STRING },
        },
        required: ['tactic', 'confidence', 'rationale'],
      },
    },
    risk: { type: Type.NUMBER },
  },
  required: ['speaker', 'text', 'tactics', 'risk'],
}

/**
 * Dev-only `/analyze` endpoint: the SENTINEL detector. Takes the conversation
 * so far + the latest line, runs Gemini 2.5 Flash with a structured schema, and
 * returns { speaker, tactics, risk }. Uses the server-side key (never bundled).
 */
function geminiAnalyzeEndpoint(apiKey: string | undefined): Plugin {
  return {
    name: 'sentinel-gemini-analyze',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/analyze', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405
          res.end()
          return
        }
        res.setHeader('content-type', 'application/json')
        if (!apiKey) {
          res.statusCode = 500
          res.end(JSON.stringify({ error: 'GEMINI_API_KEY not set (frontend/.env.local)' }))
          return
        }
        let raw = ''
        req.on('data', (chunk) => {
          raw += chunk
        })
        req.on('end', () => {
          let body: { history?: { speaker: string; text: string }[]; text?: string }
          try {
            body = JSON.parse(raw || '{}')
          } catch {
            res.statusCode = 400
            res.end(JSON.stringify({ error: 'invalid JSON' }))
            return
          }
          const convo = (body.history ?? []).map((h) => `${h.speaker}: ${h.text}`).join('\n')
          const prompt =
            `Conversation so far:\n${convo || '(start of call)'}\n\n` +
            `Latest line (unattributed):\n${body.text ?? ''}\n\n` +
            `Tasks:\n` +
            `1) speaker: who said the latest line — "Caller" (phoned in; possible attacker) or "Agent" (support rep)? Infer from content and flow.\n` +
            `2) text: the latest line in clear, fluent ENGLISH. Keep it essentially as-is if already English; translate it if it appears to be in another language (e.g. from speech mis-recognition).\n` +
            `3) tactics: which manipulation tactics, if any, are present in the latest line? Allowed: Urgency, FalseAuthority, Pretexting, Fear, Reciprocity, RapportBuilding.\n` +
            `4) risk: overall manipulation risk of the whole call so far, 0-100.\n` +
            `Return JSON.`
          const ai = new GoogleGenAI({ apiKey })
          ai.models
            .generateContent({
              model: 'gemini-2.5-flash',
              contents: prompt,
              config: {
                systemInstruction: ANALYZE_SYSTEM,
                responseMimeType: 'application/json',
                responseSchema: ANALYZE_SCHEMA,
                temperature: 0.2,
              },
            })
            .then((r) => res.end(r.text ?? '{}'))
            .catch((e: unknown) => {
              res.statusCode = 500
              res.end(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }))
            })
        })
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load GEMINI_API_KEY with no prefix → it stays server-side and is never bundled.
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [
      react(),
      geminiTokenEndpoint(env.GEMINI_API_KEY),
      geminiAnalyzeEndpoint(env.GEMINI_API_KEY),
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
        '@shared': fileURLToPath(new URL('../shared', import.meta.url)),
      },
    },
    server: {
      port: 5173,
    },
  }
})
