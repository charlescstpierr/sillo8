// Validation du proxy app/api/dialogue (logique pure).
import { describe, expect, it } from "vitest";
import { MAX_TOKENS, REQUEST_LIMIT, upstreamUrl, validateRequest } from "@/app/api/dialogue/validate";
import { SiloDialogue } from "@/game/dialogue";
import { SiloState } from "@/game/state";

function gamePayload() {
  const dialogue = new SiloDialogue();
  dialogue.setup(new SiloState());
  return dialogue.buildPayload("n7", "Où est le relais ?");
}

describe("validateRequest", () => {
  it("accepte la charge du jeu, force le modèle et plafonne max_tokens", () => {
    const payload = { ...gamePayload(), model: "client-model", max_tokens: 4000, temperature: 7 };
    const result = validateRequest(JSON.stringify(payload), "server-model");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.body.model).toBe("server-model");
    expect(result.body.max_tokens).toBe(MAX_TOKENS);
    expect(result.body.temperature).toBe(1);
    expect(result.body.stream).toBe(false);
    expect(result.body.response_format).toEqual(payload.response_format);
    expect(result.body.messages).toEqual(payload.messages);
  });

  it("garde un max_tokens plus petit", () => {
    const result = validateRequest(JSON.stringify({ ...gamePayload(), max_tokens: 64 }), "m");
    expect(result.ok && result.body.max_tokens).toBe(64);
  });

  it("refuse un corps trop gros", () => {
    const payload = gamePayload();
    payload.messages[1].content = "x".repeat(REQUEST_LIMIT);
    expect(validateRequest(JSON.stringify(payload), "m")).toMatchObject({ ok: false, status: 413 });
  });

  it("refuse un JSON invalide ou une mauvaise forme", () => {
    expect(validateRequest("{", "m")).toMatchObject({ ok: false, status: 400 });
    expect(validateRequest("[]", "m")).toMatchObject({ ok: false, error: "invalid_shape" });
    const base = gamePayload();
    expect(validateRequest(JSON.stringify({ ...base, messages: [base.messages[0]] }), "m")).toMatchObject({ ok: false, error: "invalid_messages" });
    expect(validateRequest(JSON.stringify({ ...base, messages: [base.messages[1], base.messages[0]] }), "m")).toMatchObject({ ok: false, error: "invalid_messages" });
    expect(validateRequest(JSON.stringify({ ...base, messages: [base.messages[0], { role: "user", content: 3 }] }), "m")).toMatchObject({ ok: false });
    expect(validateRequest(JSON.stringify({ ...base, messages: [base.messages[0], { role: "user", content: "a", name: "x" }] }), "m")).toMatchObject({ ok: false });
    const { response_format: _, ...noFormat } = base;
    expect(validateRequest(JSON.stringify(noFormat), "m")).toMatchObject({ ok: false, error: "missing_response_format" });
  });
});

describe("upstreamUrl", () => {
  it("normalise la base de l'amont", () => {
    expect(upstreamUrl(undefined)).toBeNull();
    expect(upstreamUrl("  ")).toBeNull();
    expect(upstreamUrl("https://api.example.com")).toBe("https://api.example.com/v1/chat/completions");
    expect(upstreamUrl("https://api.example.com/v1/")).toBe("https://api.example.com/v1/chat/completions");
    expect(upstreamUrl("http://127.0.0.1:8080/v1/chat/completions")).toBe("http://127.0.0.1:8080/v1/chat/completions");
  });

  it("refuse les adresses invalides ou avec identifiants", () => {
    expect(upstreamUrl("ftp://example.com")).toBeNull();
    expect(upstreamUrl("https://user:pass@example.com")).toBeNull();
    expect(upstreamUrl("pas une adresse")).toBeNull();
  });
});
