// Proxy serveur facultatif pour l'IA conversationnelle : la clé reste côté serveur.
// Variables : DIALOGUE_UPSTREAM (compatible OpenAI), DIALOGUE_MODEL, DIALOGUE_API_KEY (facultative).
import { RESPONSE_LIMIT, REQUEST_LIMIT, UPSTREAM_TIMEOUT_MS, upstreamUrl, validateRequest } from "./validate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

function json(data: unknown, status = 200): Response {
  return Response.json(data, { status, headers: NO_STORE });
}

export async function GET(): Promise<Response> {
  return json({ enabled: upstreamUrl(process.env.DIALOGUE_UPSTREAM) !== null });
}

export async function POST(request: Request): Promise<Response> {
  const target = upstreamUrl(process.env.DIALOGUE_UPSTREAM);
  if (!target) return json({ error: "disabled" }, 503);
  const declared = Number(request.headers.get("content-length") ?? "0");
  if (declared > REQUEST_LIMIT) return json({ error: "too_large" }, 413);
  let raw: string;
  try {
    raw = await request.text();
  } catch {
    return json({ error: "invalid_body" }, 400);
  }
  const checked = validateRequest(raw, process.env.DIALOGUE_MODEL ?? "");
  if (!checked.ok) return json({ error: checked.error }, checked.status);

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const key = process.env.DIALOGUE_API_KEY;
  if (key) headers.Authorization = `Bearer ${key}`;
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), UPSTREAM_TIMEOUT_MS);
  try {
    const upstream = await fetch(target, {
      method: "POST",
      headers,
      body: JSON.stringify(checked.body),
      redirect: "error",
      signal: abort.signal,
      cache: "no-store",
    });
    if (upstream.status !== 200) return json({ error: "upstream_status" }, 502);
    const text = await upstream.text();
    if (text.length > RESPONSE_LIMIT) return json({ error: "upstream_too_large" }, 502);
    try {
      JSON.parse(text);
    } catch {
      return json({ error: "upstream_invalid" }, 502);
    }
    // Seul le corps JSON est relayé : aucun en-tête de l'amont, jamais la clé.
    return new Response(text, { status: 200, headers: { "Content-Type": "application/json", ...NO_STORE } });
  } catch {
    return json({ error: "upstream_unreachable" }, 502);
  } finally {
    clearTimeout(timer);
  }
}
