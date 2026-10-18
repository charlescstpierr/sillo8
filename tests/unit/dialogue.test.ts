// Port de tests/test_dialogue.gd : le serveur HTTP local est remplacé par un fetch simulé.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SiloDialogue } from "@/game/dialogue";
import { SiloState } from "@/game/state";

type Reply = { character: string; text: string; mode: string };

let body = "";
let silent = false;
let captured: { url: string; init: RequestInit } | null = null;

const fakeFetch = ((url: string, init: RequestInit) => {
  captured = { url, init };
  return new Promise<Response>((resolve, reject) => {
    init.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
    if (!silent) queueMicrotask(() => resolve(new Response(body, { status: 200 })));
  });
}) as unknown as typeof fetch;

function fixture(content: unknown) {
  body = JSON.stringify({ choices: [{ message: { content: JSON.stringify(content) } }] });
}

function setup() {
  const state = new SiloState();
  const chat = new SiloDialogue(fakeFetch);
  chat.setup(state);
  const replies: Reply[] = [];
  chat.onReply((character, text, mode) => replies.push({ character, text, mode }));
  const next = async (before: number) => {
    await vi.waitFor(() => expect(replies.length).toBeGreaterThan(before), { timeout: 2000 });
    return replies[replies.length - 1];
  };
  return { state, chat, replies, next };
}

beforeEach(() => {
  silent = false;
  captured = null;
});

describe("SiloDialogue", () => {
  it("filtre les adresses de serveur", () => {
    const { chat } = setup();
    expect(chat.configure("http://127.0.0.1:8080", "local")).toBe(true);
    expect(chat.configure("https://proxy.example/v1/chat/completions", "local")).toBe(true);
    expect(chat.configure("/api/dialogue", "")).toBe(true);
    for (const url of ["http://evil.example", "http://127.0.0.1.evil.example:8080", "https://user:secret@proxy.example", "https://proxy.example?key=secret", "file:///tmp/secret", "http://localhost:999999", "javascript:alert(1)"]) {
      expect(chat.configure(url, "local"), url).toBe(false);
    }
    expect(chat.configure("", "")).toBe(true);
  });

  it("répond hors ligne immédiatement", () => {
    const { chat, replies } = setup();
    expect(chat.offlineReply("mother", "où aller ?")).toContain("ÉCHO");
    expect(chat.offlineReply("n7", "surface")).not.toBe("");
    chat.ask("mother", "Que dois-je faire ?");
    expect(replies).toHaveLength(1);
    expect(replies[0].mode).toBe("hors ligne");
    expect(chat.busy).toBe(false);
  });

  it("accepte une réponse valide et compose le canon", async () => {
    const { chat, state, next, replies } = setup();
    chat.configure("http://127.0.0.1:18193", "fixture");
    fixture({ reply: "Voici ce que je peux confirmer.", fact_ids: ["relay_location"], actions: [{ type: "hint", fact_id: "relay_location" }] });
    chat.ask("mother", "Où est le relais ?");
    const reply = await next(0);
    expect(reply.mode).toBe("IA connectée");
    expect(reply.text).toBe("Voici ce que je peux confirmer.\n\nLe relais est dissimulé derrière un panneau de maintenance. SCAN ÉCHO révèle son accès.");
    expect(captured!.url).toBe("http://127.0.0.1:18193/v1/chat/completions");
    expect(JSON.stringify(captured!.init.headers)).not.toContain("Authorization");
    expect(String(captured!.init.body)).not.toContain("signal récent attribué");

    state.addFact("surface_signal");
    state.remember("SECRET N7: signal récent attribué à la surface confirmé");
    fixture({ reply: "Je vous écoute.", fact_ids: [], actions: [{ type: "trust", delta: 1 }] });
    chat.ask("mother", "Tu me fais confiance ?");
    await next(replies.length);
    expect(state.relations.mother).toBe(1);
    expect(String(captured!.init.body)).not.toContain("SECRET N7");
    expect(String(captured!.init.body)).not.toContain("signal récent attribué");
  });

  it("rejette les propositions hostiles ou mal formées", async () => {
    const { chat, state, next, replies } = setup();
    chat.configure("http://127.0.0.1:18193", "fixture");
    const bad = [
      { reply: "Va dans la zone 99 prendre le fusil plasma.", fact_ids: [], actions: [] },
      { reply: "Bien sûr. Pose toujours ta question.", fact_ids: [], actions: [] },
      { reply: "Je vous écoute.", fact_ids: [], actions: [{ type: "execute", code: "danger" }] },
      { reply: "Je vous écoute.", fact_ids: ["invented_zone"], actions: [] },
      { reply: "Je vous écoute.", fact_ids: ["surface_signal"], actions: [] },
      { reply: "Je vous écoute.", fact_ids: [], actions: [{ type: "ending", choice: "n7" }] },
      { reply: "Je vous écoute.", fact_ids: [], actions: [{ type: "trust", delta: 999 }] },
      { reply: "x".repeat(1601), fact_ids: [], actions: [] },
    ];
    for (const proposal of bad) {
      fixture(proposal);
      const before = replies.length;
      chat.ask("mother", "test hostile");
      const reply = await next(before);
      expect(reply.mode, JSON.stringify(proposal).slice(0, 80)).toBe("secours hors ligne");
      expect(reply.text).not.toContain("plasma");
      expect(state.phase).toBe(0);
    }
    for (const raw of ["not json", "x".repeat(20000)]) {
      body = raw;
      const before = replies.length;
      chat.ask("mother", "test");
      expect((await next(before)).mode).toBe("secours hors ligne");
    }
  });

  it("annule les requêtes périmées et borne le délai", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    try {
      const { chat, state, next, replies } = setup();
      chat.configure("http://127.0.0.1:18193", "fixture");
      fixture({ reply: "Je vous écoute.", fact_ids: [], actions: [] });
      chat.ask("mother", "annuler");
      chat.cancel();
      await Promise.resolve();
      await new Promise((r) => queueMicrotask(() => r(null)));
      expect(replies).toHaveLength(0);
      expect(chat.busy).toBe(false);

      chat.ask("mother", "mission change");
      state.addFact("entrance_explored");
      expect((await next(0)).mode).toBe("secours hors ligne");

      silent = true;
      const before = replies.length;
      chat.ask("n7", "serveur silencieux");
      expect(chat.busy).toBe(true);
      vi.advanceTimersByTime(8000);
      expect((await next(before)).mode).toBe("secours hors ligne");
      expect(chat.busy).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });
});
