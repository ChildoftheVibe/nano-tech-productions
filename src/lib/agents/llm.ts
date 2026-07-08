import "server-only";

/** Minimal Claude API caller for the agent platform. Agents degrade
 *  gracefully (return null) when ANTHROPIC_API_KEY is unset. */

const MODEL = process.env.AGENT_MODEL || "claude-sonnet-5";

export function isLlmConfigured(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

export async function askClaude(
  system: string,
  user: string,
  maxTokens = 2048,
): Promise<string | null> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: user }],
    }),
  });
  if (!res.ok) throw new Error(`anthropic_${res.status}`);
  const data = (await res.json()) as { content?: { type: string; text?: string }[] };
  return data.content?.find((c) => c.type === "text")?.text ?? null;
}

/** Ask for strict JSON and parse it (tolerates code fences). */
export async function askClaudeJson<T>(
  system: string,
  user: string,
  maxTokens = 2048,
): Promise<T | null> {
  const text = await askClaude(
    `${system}\nRespond with valid JSON only — no prose, no markdown fences.`,
    user,
    maxTokens,
  );
  if (!text) return null;
  const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    return null;
  }
}
