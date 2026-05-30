import { getGeminiToken } from "@/lib/sentinel.functions";

/** Fetches a short-lived Gemini Live ephemeral token via the server function. */
export async function fetchEphemeralToken(): Promise<string> {
  const { token } = await getGeminiToken();
  if (!token) throw new Error("token endpoint returned no token");
  return token;
}
