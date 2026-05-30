/** Fetches a short-lived Gemini Live ephemeral token from the (dev or real) `/token` endpoint. */
export async function fetchEphemeralToken(url = '/token'): Promise<string> {
  const res = await fetch(url)
  const body = (await res.json().catch(() => ({}))) as { token?: string; error?: string }
  if (!res.ok || !body.token) throw new Error(body.error ?? `token endpoint failed (${res.status})`)
  return body.token
}
