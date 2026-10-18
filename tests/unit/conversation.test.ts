// Conversations écrites : répliques, réponses, conditions et effets sur les faits (game/conversation.ts).
import { describe, expect, it } from "vitest";
import { CONVERSATIONS, ConversationRun, checkConversation, registerConversation, type Conversation } from "@/game/conversation";
import { SiloState } from "@/game/state";

const DEMO: Conversation = {
  id: "demo_porte",
  speaker: { id: "voisin", name: "VOISIN", title: "DERRIÈRE LA PORTE", portrait: "survivor" },
  start: "debut",
  nodes: {
    debut: {
      lines: [
        { who: "narration", text: "[trois coups, réguliers]" },
        { who: "speaker", text: "Qui va là ?" },
        { who: "speaker", text: "Encore toi.", when: { fact: "demo_vu" } },
      ],
      effects: [{ flag: "demo_vu" }],
      choices: [
        { text: "Un ami.", next: "ami", effects: [{ trust: "voisin", delta: 1 }] },
        { text: "J'ai réparé la radio.", next: "radio", when: { fact: "comms_repaired" } },
        { text: "Je repasserai." },
      ],
    },
    ami: {
      lines: [{ who: "speaker", text: "Prouve-le." }],
      choices: [
        { text: "[Montrer la note]", next: "fin", when: { note: "note_entrance" }, effects: [{ remember: "Lou a montré la note au voisin." }] },
        { text: "Je n'ai rien.", effects: [{ trust: "voisin", delta: -2 }] },
      ],
    },
    radio: { lines: [{ who: "speaker", text: "Alors on peut parler." }] },
    fin: { lines: [{ who: "speaker", text: "Entre.", when: { trust: "voisin", min: 1 } }], effects: [{ flag: "demo_ouvert" }] },
  },
};

describe("conversations écrites", () => {
  it("se déroulent selon les conditions et appliquent les effets", () => {
    const s = new SiloState();
    const run = new ConversationRun(DEMO, s);
    let view = run.view();
    expect(view.lines.map((l) => l.text)).toEqual(["[trois coups, réguliers]", "Qui va là ?", "Encore toi."]);
    expect(s.knows("demo_vu")).toBe(true);
    // La réponse sur la radio n'apparaît qu'une fois la radio réparée.
    expect(view.choices.map((c) => c.text)).toEqual(["Un ami.", "Je repasserai."]);
    expect(run.choose(1)).toBeNull();
    expect(run.choose(0)?.text).toBe("Un ami.");
    expect(s.relations.voisin).toBe(1);
    view = run.view();
    expect(view.node).toBe("ami");
    expect(view.choices.map((c) => c.text)).toEqual(["Je n'ai rien."]);
    expect(run.choose(1)).not.toBeNull();
    expect(s.relations.voisin).toBe(-1);
    expect(run.view().done).toBe(true);
    expect(run.choose(0)).toBeNull();
  });

  it("une note lue ouvre une réponse ; la fin pose un fait", () => {
    const s = new SiloState();
    s.readNote("note_entrance");
    const run = new ConversationRun(DEMO, s);
    run.choose(0);
    run.choose(0);
    const view = run.view();
    expect(view.lines.map((l) => l.text)).toEqual(["Entre."]);
    expect(view.done).toBe(true);
    expect(s.knows("demo_ouvert")).toBe(true);
    expect(s.memory).toContain("Lou a montré la note au voisin.");
  });

  it("vérifie la forme des données à l'enregistrement", () => {
    expect(checkConversation(DEMO)).toBe("");
    expect(checkConversation({ ...DEMO, start: "absent" })).toContain("absent");
    expect(checkConversation({ ...DEMO, nodes: { ...DEMO.nodes, radio: { lines: [], choices: [{ text: "x", next: "nulle_part" }] } } })).toContain("nulle_part");
    expect(() => registerConversation({ ...DEMO, id: "Mauvais id" })).toThrow();
    registerConversation(DEMO);
    expect(CONVERSATIONS.demo_porte).toBe(DEMO);
    delete CONVERSATIONS.demo_porte;
  });
});
