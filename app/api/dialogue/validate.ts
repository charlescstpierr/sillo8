// Validation pure du proxy de dialogue (testée par Vitest) : taille, forme, modèle forcé, plafonds.

export const REQUEST_LIMIT = 32 * 1024;
export const RESPONSE_LIMIT = 16 * 1024;
export const MAX_TOKENS = 192;
export const UPSTREAM_TIMEOUT_MS = 8000;

export type Validation =
  | { ok: true; body: Record<string, unknown> }
  | { ok: false; status: number; error: string };

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function byteLength(text: string): number {
  return new TextEncoder().encode(text).length;
}

/** Contrôle le corps envoyé par le jeu et construit celui transmis à l'amont. */
export function validateRequest(raw: string, model: string): Validation {
  if (byteLength(raw) > REQUEST_LIMIT) return { ok: false, status: 413, error: "too_large" };
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return { ok: false, status: 400, error: "invalid_json" };
  }
  if (!isObject(data)) return { ok: false, status: 400, error: "invalid_shape" };
  const messages = data.messages;
  if (!Array.isArray(messages) || messages.length !== 2) return { ok: false, status: 400, error: "invalid_messages" };
  const roles = ["system", "user"];
  for (let i = 0; i < 2; i += 1) {
    const message = messages[i];
    if (!isObject(message) || message.role !== roles[i] || typeof message.content !== "string" || Object.keys(message).length !== 2) {
      return { ok: false, status: 400, error: "invalid_messages" };
    }
  }
  if (!isObject(data.response_format)) return { ok: false, status: 400, error: "missing_response_format" };
  const requested = typeof data.max_tokens === "number" && Number.isFinite(data.max_tokens) && data.max_tokens > 0 ? Math.floor(data.max_tokens) : MAX_TOKENS;
  const temperature = typeof data.temperature === "number" && Number.isFinite(data.temperature) ? Math.min(Math.max(data.temperature, 0), 1) : 0;
  return {
    ok: true,
    body: {
      model,
      messages: messages.map((m) => ({ role: (m as Record<string, unknown>).role, content: (m as Record<string, unknown>).content })),
      temperature,
      max_tokens: Math.min(requested, MAX_TOKENS),
      stream: false,
      response_format: data.response_format,
    },
  };
}

/** Accepte une base (https://hôte, …/v1) ou l'adresse complète des complétions. */
export function upstreamUrl(base: string | undefined): string | null {
  let clean = (base ?? "").trim();
  if (!clean) return null;
  while (clean.endsWith("/")) clean = clean.slice(0, -1);
  try {
    const url = new URL(clean);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    if (url.username || url.password) return null;
  } catch {
    return null;
  }
  if (clean.endsWith("/v1/chat/completions")) return clean;
  if (clean.endsWith("/v1")) return clean + "/chat/completions";
  return clean + "/v1/chat/completions";
}
