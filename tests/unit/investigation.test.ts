// Enquête : contenu de l'étage 1 vérifié, validation des déductions, déblocages, aide en trois paliers,
// sauvegarde rétrocompatible, géométrie de la lampe UV et de la bulle de pensée.
import { describe, expect, it } from "vitest";
import { SiloState, type KeyValueStore } from "@/game/state";
import { FLOOR1 } from "@/game/investigation/content/floor1";
import { lintContent } from "@/game/investigation/lint";
import {
  ContentIndex, applyDeduction, checkContradiction, checkSentence, examinableState, hintSuggested, parseSentence,
  takeHint, visibleDeductions, wordBank,
} from "@/game/investigation/logic";
import { emptyRecord, readRecord, recordOf, validRecord, type InquiryRecord } from "@/game/investigation/record";
import { inCone, litFraction, overlaps, placeBubble, tracePoints } from "@/game/investigation/geometry";
import { CARRIERS, examinableAvailable } from "@/game/investigation/world";
import { interactableAvailable } from "@/game/rules";
import { EXAMINABLE_DEFS } from "@/game/investigation/world";

class MemoryStore implements KeyValueStore {
  data = new Map<string, string>();
  getItem(key: string) { return this.data.get(key) ?? null; }
  setItem(key: string, value: string) { this.data.set(key, value); }
}

const index = new ContentIndex(FLOOR1);
const world = { facts: [] as string[] };
const withCards = (...cards: string[]): InquiryRecord => ({ ...emptyRecord(), cards });
const C1_ANSWER = ["la porte de service", "la chambre 1", "l'infirmerie"];

describe("contenu de l'étage 1", () => {
  it("passe le vérificateur d'enquête", () => {
    expect(lintContent(FLOOR1)).toEqual([]);
  });

  it("le vérificateur repère les oublis", () => {
    const broken = structuredClone(FLOOR1);
    const c1 = broken.deductions.find((d) => d.id === "C1")!;
    if (c1.kind === "sentence") { c1.minClues = 2; c1.text = "Il sort de [la cave]."; }
    broken.thoughts.push({ id: "t_bad", text: " ", trigger: { on: "card", card: "nope" } });
    const problems = lintContent(broken);
    expect(problems.some((p) => p.includes("au moins 3 indices"))).toBe(true);
    expect(problems.some((p) => p.includes("aucune réponse gagnable"))).toBe(true);
    expect(problems.some((p) => p.includes("carte inconnue « nope »"))).toBe(true);
    expect(problems.some((p) => p.includes("texte vide"))).toBe(true);
  });

  it("garde les identifiants et les textes du document d'histoire", () => {
    // Contenu complet de l'étage 1 : les déductions du prototype restent en tête (X1, C1, X4).
    expect(FLOOR1.deductions.map((d) => d.id).slice(0, 3)).toEqual(["X1", "C1", "X4"]);
    expect(FLOOR1.traces.map((t) => t.id)).toEqual(["c1", "c2", "c3", "c4", "c5", "c8"]);
    expect(index.cards.get("poster_notice")!.text).toContain("des mordus sont entrés par la porte de service");
    expect(index.examinables.get("a15")!.closeup.details![0].card).toBe("service_threshold");
    // Au moins deux gros plans avec un détail caché, 3 à 4 traces, 5 pensées ou plus, un événement étrange.
    expect(FLOOR1.examinables.filter((e) => e.closeup.details?.length).length).toBeGreaterThanOrEqual(2);
    expect(FLOOR1.thoughts.length).toBeGreaterThanOrEqual(5);
    expect(FLOOR1.events.length).toBeGreaterThanOrEqual(1);
  });

  it("une pensée peut se taire (« … »), et chaque phrase demande au moins 3 indices", () => {
    expect(FLOOR1.thoughts.some((t) => t.text === undefined)).toBe(true);
    for (const d of FLOOR1.deductions) if (d.kind === "sentence") expect(d.minClues).toBeGreaterThanOrEqual(3);
  });
});

describe("contradictions", () => {
  const r = withCards("poster_notice", "c1", "note_infirmary", "service_threshold");

  it("relie l'avis officiel et le seuil à la lampe UV, dans les deux sens", () => {
    for (const [a, b] of [["poster_notice", "c1"], ["c1", "poster_notice"]]) {
      const v = checkContradiction(index, r, a, b, world);
      expect(v.ok && v.deduction.id).toBe("X1");
    }
  });

  it("une erreur donne une pensée, précise si elle est prévue, sinon générique, sans rien enlever", () => {
    const precise = checkContradiction(index, r, "poster_notice", "note_infirmary", world);
    expect(precise.ok).toBe(false);
    if (!precise.ok) expect(precise.thought).toBe("La lumière et la porte de service, ça n'a rien à voir. Regarde le seuil, de près.");
    const vague = checkContradiction(index, r, "c1", "service_threshold", world, 1);
    expect(vague.ok).toBe(false);
    if (!vague.ok) expect(FLOOR1.generic.wrong).toContain(vague.thought);
    expect(r.cards).toHaveLength(4);
  });

  it("refuse une carte qu'on n'a pas, et une contradiction déjà établie", () => {
    expect(checkContradiction(index, withCards("poster_notice"), "poster_notice", "c1", world).ok).toBe(false);
    const done = { ...r, deductions: ["X1"] };
    const again = checkContradiction(index, done, "poster_notice", "c1", world);
    expect(!again.ok && again.kind).toBe("already");
  });

  it("une contradiction attend sa condition (X4 après C1)", () => {
    const rec = withCards("poster_notice", "note_notice_draft");
    expect(checkContradiction(index, rec, "poster_notice", "note_notice_draft", world).ok).toBe(false);
    rec.deductions.push("C1");
    expect(checkContradiction(index, rec, "poster_notice", "note_notice_draft", world).ok).toBe(true);
  });
});

describe("phrases à trous", () => {
  it("découpe le texte et ses cases", () => {
    const parts = parseSentence("A [b|c] d [e].");
    expect(parts).toEqual(["A ", { slot: 0, answers: ["b", "c"] }, " d ", { slot: 1, answers: ["e"] }, "."]);
  });

  it("la banque ne contient que les mots des indices trouvés", () => {
    expect(wordBank(index, withCards("poster_notice"))).toEqual(["la porte de service"]);
    const bank = wordBank(index, withCards("poster_notice", "note_generator", "c2", "note_infirmary_map"));
    expect(bank).toEqual(expect.arrayContaining([...C1_ANSWER, "la serre", "les épaves"]));
  });

  it("valide la phrase entière seulement, avec au moins 3 indices", () => {
    // Deux indices seulement : pas encore.
    const few = withCards("poster_notice", "c2", "note_infirmary_map");
    const tooFew = checkSentence(index, few, "C1", C1_ANSWER, world);
    expect(!tooFew.ok && tooFew.kind).toBe("clues");
    const r = withCards("poster_notice", "c1", "c2", "note_infirmary_map", "note_generator");
    // Case vide : rien n'est jugé.
    expect(checkSentence(index, r, "C1", ["la porte de service", null, "l'infirmerie"], world)).toMatchObject({ ok: false, kind: "incomplete" });
    // Une case fausse : « Presque… », sans dire laquelle au joueur.
    const almost = checkSentence(index, r, "C1", ["la porte de service", "les épaves", "l'infirmerie"], world);
    expect(almost).toMatchObject({ ok: false, kind: "almost", thought: "Presque… un détail cloche." });
    // Erreur prévue : pensée précise.
    const serre = checkSentence(index, r, "C1", ["la porte de service", "la serre", "l'infirmerie"], world);
    expect(!serre.ok && serre.thought).toBe("Rien ne luit dans la serre. La traînée part de l'infirmerie.");
    // Toutes fausses : pensée générique.
    const wrong = checkSentence(index, r, "C1", ["l'infirmerie", "la serre", "la porte de service"], world);
    expect(!wrong.ok && wrong.kind).toBe("wrong");
    // Un mot hors banque est refusé.
    expect(checkSentence(index, r, "C1", ["la porte de service", "mensonge", "l'infirmerie"], world).ok).toBe(false);
    expect(checkSentence(index, r, "C1", C1_ANSWER, world).ok).toBe(true);
  });

  it("une phrase apparaît au tableau dès qu'un de ses indices est trouvé", () => {
    expect(visibleDeductions(index, withCards("poster_notice"), world).map((d) => d.id)).toEqual(["X1"]);
    expect(visibleDeductions(index, withCards("c2"), world).map((d) => d.id)).toContain("C1");
  });
});

describe("déblocages", () => {
  it("C1 ouvre le tiroir d'Okafor, X4 ajoute « mensonge » à la banque", () => {
    const r = withCards("poster_notice", "c1", "c2", "note_infirmary_map");
    const drawer = index.examinables.get("okafor_drawer")!;
    expect(examinableState(drawer, r, world)).toBe("locked");
    const applied = applyDeduction(index, r, "C1");
    expect(applied.unlocked).toEqual(["examinable:okafor_drawer"]);
    expect(examinableState(drawer, r, world)).toBe("open");
    // Une seconde fois : rien de nouveau.
    expect(applyDeduction(index, r, "C1").unlocked).toEqual([]);
    r.cards.push("note_notice_draft");
    applyDeduction(index, r, "X4");
    expect(wordBank(index, r)).toContain("mensonge");
    expect(r.deductions).toEqual(["C1", "X4"]);
  });

  it("le monde suit l'état : objet examinable présent, porte à verrou d'enquête", () => {
    const s = new SiloState();
    const def = EXAMINABLE_DEFS.find((d) => d.examine === "okafor_drawer")!;
    expect(examinableAvailable("okafor_drawer", s)).toBe(true);
    expect(interactableAvailable(def, s)).toBe(true);
    expect(examinableAvailable("inconnu", s)).toBe(false);
  });

  it("le ticket du commis n'est plus proposé une fois noté, tant que le commis est debout", () => {
    const s = new SiloState();
    CARRIERS.set("crawler_cafe", { x: 0, z: 0, ready: true, dropped: false });
    try {
      expect(examinableAvailable("note_tray_ticket", s)).toBe(true);
      recordOf(s).cards.push("note_tray_ticket");
      expect(examinableAvailable("note_tray_ticket", s)).toBe(false);
      // Tombé au sol : le ticket se relit (il est posé, plus dans les mains d'un mordu).
      CARRIERS.set("crawler_cafe", { x: 0, z: 0, ready: true, dropped: true });
      expect(examinableAvailable("note_tray_ticket", s)).toBe(true);
    } finally {
      CARRIERS.delete("crawler_cafe");
    }
  });
});

describe("aide en trois paliers", () => {
  it("oriente, pointe, relie, puis reste au palier 3 ; jamais la phrase complète", () => {
    const r = withCards("poster_notice");
    const tiers = [1, 2, 3, 4].map(() => takeHint(index, r, world)!);
    expect(tiers.map((h) => h.tier)).toEqual([1, 2, 3, 3]);
    expect(tiers[0].deduction.id).toBe("X1");
    expect(tiers[0].text).toBe("Je n'ai pas bien regardé la porte de service.");
    expect(tiers[2].text).not.toContain("Personne n'est entré");
    // X1 faite : l'aide passe à la suivante.
    r.deductions.push("X1");
    r.cards.push("c2");
    const next = takeHint(index, r, world)!;
    expect([next.deduction.id, next.tier]).toEqual(["C1", 1]);
    expect(next.text).not.toContain("[");
  });

  it("est suggérée après 3 erreurs ou 150 s sans progrès", () => {
    expect(hintSuggested(2, 30)).toBe(false);
    expect(hintSuggested(3, 0)).toBe(true);
    expect(hintSuggested(0, 151)).toBe(true);
  });
});

describe("sauvegarde de l'enquête", () => {
  it("une ancienne sauvegarde sans enquête se charge, avec un carnet d'enquête vide", () => {
    const store = new MemoryStore();
    const s = new SiloState();
    s.collect("part_0", "components", 1);
    const old = s.snapshot() as unknown as Record<string, unknown>;
    // Sauvegarde v2 (avant les extensions) : migrée en v3 au chargement, sans données d'enquête.
    for (const key of ["ext", "floor", "saved_at", "relations", "flags", "recharge_spent"]) delete old[key];
    old.schema = 2;
    store.setItem("sillo8-save", JSON.stringify(old));
    const loaded = new SiloState();
    recordOf(loaded).cards.push("trace_d_avant");
    expect(loaded.loadGame(store)).toBe("ok");
    expect(loaded.components).toBe(1);
    expect(recordOf(loaded)).toEqual(emptyRecord());
  });

  it("garde cartes, traces, déductions, pensées et paliers d'aide", () => {
    const store = new MemoryStore();
    const s = new SiloState();
    Object.assign(recordOf(s), {
      cards: ["poster_notice", "c1"], traces: ["c1"], deductions: ["X1"], thoughts: ["t_craie", "t_triangle_silence"],
      revealed: ["a1#0"], events: ["d1"], unlocked: ["fact:repere_armoire"], hints: { C1: 2 },
    });
    expect(s.saveGame(store)).toBe("ok");
    const loaded = new SiloState();
    expect(loaded.loadGame(store)).toBe("ok");
    expect(recordOf(loaded)).toEqual(recordOf(s));
    // Rangé dans state.ext.investigation, avec sa version.
    expect((JSON.parse(store.getItem("sillo8-save")!).ext.investigation as InquiryRecord).v).toBe(1);
    // Copie : modifier la partie chargée ne touche pas l'original.
    recordOf(loaded).cards.push("c2");
    expect(recordOf(s).cards).toHaveLength(2);
  });

  it("une liste partielle se lit, une enquête illisible donne un carnet vide sans casser la sauvegarde", () => {
    expect(readRecord({ cards: ["a"] })).toEqual({ ...emptyRecord(), cards: ["a"] });
    expect(validRecord({ v: 2 })).toBe(false);
    expect(validRecord({ cards: ["a", "a"] })).toBe(false);
    expect(validRecord({ cards: [3] })).toBe(false);
    expect(validRecord({ hints: { C1: 7 } })).toBe(false);
    expect(validRecord({ mystery: [] })).toBe(false);
    const store = new MemoryStore();
    const snap = new SiloState().snapshot() as unknown as Record<string, unknown>;
    snap.ext = { investigation: { cards: "pas une liste" }, autre: { x: 1 } };
    store.setItem("sillo8-save", JSON.stringify(snap));
    const loaded = new SiloState();
    expect(loaded.loadGame(store)).toBe("ok");
    expect(recordOf(loaded)).toEqual(emptyRecord());
    // Les données des autres systèmes sont gardées telles quelles.
    expect(loaded.ext.autre).toEqual({ x: 1 });
    snap.ext = "pas un objet";
    store.setItem("sillo8-save", JSON.stringify(snap));
    expect(new SiloState().loadGame(store)).toBe("corrupt");
  });

  it("setExt / getExt : une clé par système", () => {
    const s = new SiloState();
    let calls = 0;
    s.subscribe(() => calls++);
    s.setExt("demo", { v: 1, n: 3 });
    expect(calls).toBe(1);
    expect(s.getExt("demo", (raw) => (raw as { n: number }).n, () => 0)).toBe(3);
    expect(s.getExt("absent", () => 1, () => 0)).toBe(0);
  });

  it("une nouvelle partie repart d'une enquête vide", () => {
    const s = new SiloState();
    recordOf(s).cards.push("c1");
    s.reset();
    expect(recordOf(s)).toEqual(emptyRecord());
  });
});

describe("géométrie", () => {
  it("le cône UV éclaire devant, pas derrière ni trop loin", () => {
    expect(inCone(0, 0, 0, 0, 5)).toBe(true);
    expect(inCone(0, 0, 0, 0, -5)).toBe(false);
    expect(inCone(0, 0, 0, 5, 5)).toBe(false);
    expect(inCone(0, 0, 0, 0, 20)).toBe(false);
    expect(inCone(0, 0, Math.PI / 2, 5, 0)).toBe(true);
    const trail = tracePoints({ kind: "trail", points: [[0, 2], [0, 6]] });
    expect(trail.length).toBeGreaterThan(5);
    expect(litFraction(trail, 0, 0, 0)).toBe(1);
    expect(litFraction(trail, 0, 0, Math.PI)).toBe(0);
  });

  it("la bulle de pensée évite les obstacles et reste dans l'écran", () => {
    const objectives = { x: 160, y: 10, w: 220, h: 80 };
    const rail = { x: 14, y: 196, w: 46, h: 140 };
    for (const [hx, hy] of [[195, 120], [40, 260], [380, 380], [195, 740]]) {
      const p = placeBubble(hx, hy, 200, 56, 390, 760, [objectives, rail]);
      const box = { x: p.x, y: p.y, w: 200, h: 56 };
      expect(overlaps(box, objectives)).toBe(false);
      expect(overlaps(box, rail)).toBe(false);
      expect(p.x).toBeGreaterThanOrEqual(8);
      expect(p.x + 200).toBeLessThanOrEqual(382);
      expect(p.y + 56).toBeLessThanOrEqual(752);
    }
  });
});
