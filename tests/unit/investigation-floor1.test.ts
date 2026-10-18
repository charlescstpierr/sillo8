// Enquête de l'étage 1, contenu complet : parcours d'enquête complet (toutes les déductions, dans l'ordre logique,
// aucune bloquée), fair play (chaque indice requis est obtenable AVANT sa déduction, sans elle), énigmes, positions,
// secret de Lou (se taire, jamais révéler), indices dormants sans effet.
import { describe, expect, it } from "vitest";
import { FLOOR1 } from "@/game/investigation/content/floor1";
import { POS } from "@/game/investigation/content/positions";
import { SCENE } from "@/game/investigation/content/links";
import { lintContent } from "@/game/investigation/lint";
import {
  ContentIndex, applyDeduction, applyPuzzle, checkContradiction, checkPuzzle, checkSentence, conditionMet, cluesFound,
  examinableState, parseSentence, wordBank, type WorldFacts,
} from "@/game/investigation/logic";
import { emptyRecord, type InquiryRecord } from "@/game/investigation/record";
import type { Deduction, Sentence, Trigger } from "@/game/investigation/types";
import { FACT_IDS } from "@/game/state";
import { NOTES } from "@/game/notes";
import { roomAt } from "@/game/level";
import { CAPTIONED } from "@/game/captions";
import { SOUND_NAMES } from "@/game/audio";

const index = new ContentIndex(FLOOR1);

/** Ordre logique de l'enquête (§ 9 : couche 1, couche 2, l'étranger, couche 3). */
const ORDER = ["X1", "C1", "X4", "X2", "X3", "C2", "C3", "X8", "X10", "C5", "X5", "X6", "X7", "X9", "C4"];

/** Bonne réponse d'une phrase : la première variante de chaque case. */
const answer = (s: Sentence) => parseSentence(s.text).flatMap((p) => (typeof p === "string" ? [] : [p.answers[0]]));

/** Ce que donnent les énigmes, et les cartes qui en donnent la solution (elle se déduit des indices). */
const PUZZLE_CLUES: Record<string, string[][]> = {
  locker: [["note_cook_postit", "note_cafeteria"]],
  shed: [["note_shed_left", "note_shed_right"], ["note_shed_left", "chalk_levers"]],
  terminal: [["note_terminal_postit", "note_expedition"], ["note_terminal_postit", "photo_inseparables"], ["note_terminal_postit", "marceau_bracelet"]],
};

/** Faits venus des conversations de l'agent « personnages » (links.ts), supposés joués après la génératrice. */
const SCENES = [SCENE.M1, SCENE.M3, SCENE.cookTestimony];

interface Sim {
  r: InquiryRecord;
  world: { facts: string[]; flags: string[] };
}

/**
 * Explore tout ce qui est accessible sans faire de nouvelle déduction : notes canon, gros plans ouverts (et leurs
 * détails), pensées et événements dont le déclencheur est atteignable, traces UV, énigmes dont on a les indices.
 * Les objectifs de l'étage (FACT_IDS) sont atteignables sans l'enquête (tests/unit/journey.test.ts).
 */
function explore(sim: Sim): void {
  const { r, world } = sim;
  const add = (id: string) => { if (!r.cards.includes(id)) { r.cards.push(id); changed = true; } };
  const reachable = (t: Trigger): boolean => {
    switch (t.on) {
      case "near": case "enter": case "nearEnemy": return true;
      case "examine": case "reveal": {
        const e = index.examinables.get(t.examinable);
        return Boolean(e && examinableState(e, r, world) === "open");
      }
      case "card": return r.cards.includes(t.card);
      case "fact": return world.facts.includes(t.fact) || world.flags.includes(t.fact);
      case "deduction": return r.deductions.includes(t.deduction);
      default: return false;
    }
  };
  let changed = true;
  while (changed) {
    changed = false;
    for (const c of FLOOR1.cards) if (c.note && NOTES[c.note]) add(c.id);
    for (const e of FLOOR1.examinables) {
      if (examinableState(e, r, world) !== "open") continue;
      if (e.card) add(e.card);
      for (const d of e.closeup.details ?? []) if (d.card) add(d.card);
    }
    for (const t of FLOOR1.thoughts) if (t.card && reachable(t.trigger) && conditionMet(t.requires, r, world)) add(t.card);
    for (const t of FLOOR1.traces) if (t.card && conditionMet(t.requires, r, world)) add(t.card);
    for (const e of FLOOR1.events) {
      if (!reachable(e.trigger) || !conditionMet(e.requires, r, world)) continue;
      for (const a of e.actions) if (a.do === "card") add(a.card);
    }
    for (const p of FLOOR1.puzzles) {
      if (r.unlocked.includes(`puzzle:${p.id}`)) continue;
      const holder = FLOOR1.examinables.find((e) => e.puzzle === p.id)!;
      if (examinableState(holder, r, world) !== "open") continue;
      if (!PUZZLE_CLUES[p.id].some((set) => set.every((c) => r.cards.includes(c)))) continue;
      expect(checkPuzzle(p, p.kind === "levers" ? p.answer : [p.answer.join("")]).ok).toBe(true);
      applyPuzzle(index, r, p.id);
      world.flags.push(`puzzle_${p.id}`);
      changed = true;
    }
    for (const c of r.unlocked) if (c.startsWith("card:")) add(c.slice(5));
  }
}

function fresh(scenes = SCENES): Sim {
  return { r: emptyRecord(), world: { facts: FACT_IDS.filter((f) => f !== "floor2"), flags: [...scenes] } };
}

/** Résout une déduction avec les cartes et les mots du joueur, comme au tableau. */
function solve(sim: Sim, d: Deduction): boolean {
  const { r, world } = sim;
  if (d.kind === "contradiction") {
    const pair = d.pairs.find(([a, b]) => r.cards.includes(a) && r.cards.includes(b));
    if (!pair) return false;
    const v = checkContradiction(index, r, pair[0], pair[1], world);
    if (!v.ok || v.deduction.id !== d.id) return false;
  } else {
    const v = checkSentence(index, r, d.id, answer(d), world);
    if (!v.ok) return false;
  }
  applyDeduction(index, r, d.id);
  world.flags.push(d.id.toLowerCase());
  for (const u of d.unlocks) if (u.kind === "fact" || u.kind === "dialogue") world.flags.push(u.id.toLowerCase());
  return true;
}

describe("étage 1 : contenu complet", () => {
  it("passe le vérificateur d'enquête", () => {
    expect(lintContent(FLOOR1)).toEqual([]);
  });

  it("contient toutes les déductions, traces, événements et énigmes du document", () => {
    expect(FLOOR1.deductions.map((d) => d.id).sort()).toEqual([...ORDER].sort());
    expect(FLOOR1.traces.map((t) => t.id)).toEqual(["c1", "c2", "c3", "c4", "c5", "c8"]);
    for (const id of ["d1", "d2", "d3", "d4", "d5", "d6", "d7", "d8", "d9", "d10", "d11", "d12"]) expect(FLOOR1.events.some((e) => e.id === id), id).toBe(true);
    expect(FLOOR1.puzzles.map((p) => p.id)).toEqual(["locker", "shed", "terminal"]);
    for (const id of ["a1", "a2", "a3", "a5", "a6", "a7", "a8", "a9", "a10", "a11", "a12", "a13", "a14", "a15", "a16"]) expect(index.examinables.has(id), id).toBe(true);
  });

  it("chaque phrase à trous a au moins 3 indices venant d'au moins 2 pièces", () => {
    for (const d of FLOOR1.deductions) {
      if (d.kind !== "sentence") continue;
      expect(d.minClues, d.id).toBeGreaterThanOrEqual(3);
      expect(new Set(d.clues.map((c) => index.cards.get(c)!.room)).size, d.id).toBeGreaterThanOrEqual(2);
    }
  });

  it("les 7 notes canon restent mot pour mot", () => {
    for (const c of FLOOR1.cards.filter((k) => k.note)) expect(c.text).toBe(NOTES[c.note!].text);
    expect(FLOOR1.cards.filter((k) => k.note).map((k) => k.note).sort()).toEqual(Object.keys(NOTES).sort());
  });

  it("chaque position du tableau POS est dans sa pièce", () => {
    for (const [name, spot] of Object.entries(POS)) expect(roomAt(spot.x, spot.z)?.id, name).toBe(spot.room);
  });

  it("chaque son des événements existe et a un sous-titre", () => {
    const cues = [...FLOOR1.events.flatMap((e) => e.actions), ...FLOOR1.puzzles.flatMap((p) => [...(p.onError ?? []), ...(p.onSolve ?? [])])]
      .filter((a) => a.do === "sound").map((a) => (a as { cue: string }).cue);
    for (const cue of new Set(cues)) {
      expect(SOUND_NAMES, cue).toContain(cue);
      expect(CAPTIONED, cue).toContain(cue);
    }
  });
});

describe("parcours d'enquête complet", () => {
  it("résout toutes les déductions dans l'ordre logique, aucune n'est bloquée", () => {
    const sim = fresh();
    for (const id of ORDER) {
      explore(sim);
      const d = index.deductions.get(id)!;
      expect(solve(sim, d), `${id} bloquée`).toBe(true);
    }
    explore(sim);
    expect(sim.r.deductions).toEqual(ORDER);
    // Les trois énigmes sont résolues en chemin, et l'affaire est close.
    for (const p of ["locker", "shed", "terminal"]) expect(sim.r.unlocked).toContain(`puzzle:${p}`);
    expect(sim.r.unlocked).toEqual(expect.arrayContaining(["fact:case_solved", "fact:accused_cleared", "dialogue:C4", "dialogue:X9", "dialogue:C5"]));
    expect(sim.world.flags).toEqual(expect.arrayContaining(["x8", "x9", "x10", "c5", "c4", "puzzle_shed"]));
  });

  it("sans les conversations de Cuisine, seules X8 et C5 attendent (rien d'autre n'en dépend)", () => {
    const sim = fresh([]);
    for (const id of ORDER) {
      explore(sim);
      solve(sim, index.deductions.get(id)!);
    }
    expect(ORDER.filter((id) => !sim.r.deductions.includes(id))).toEqual(["X8", "C5"]);
  });
});

describe("fair play", () => {
  it("chaque indice requis est obtenable avant sa déduction (sans elle)", () => {
    for (const target of FLOOR1.deductions) {
      const sim = fresh();
      // Toutes les autres déductions possibles sont faites ; la cible jamais.
      let progress = true;
      while (progress) {
        progress = false;
        explore(sim);
        for (const d of FLOOR1.deductions) {
          if (d.id === target.id || sim.r.deductions.includes(d.id)) continue;
          if (solve(sim, d)) progress = true;
        }
      }
      explore(sim);
      const { r, world } = sim;
      expect(conditionMet(target.requires, r, world), `${target.id} : condition`).toBe(true);
      if (target.kind === "contradiction") {
        expect(target.pairs.some(([a, b]) => r.cards.includes(a) && r.cards.includes(b)), `${target.id} : paire de cartes`).toBe(true);
      } else {
        expect(cluesFound(target, r), `${target.id} : indices`).toBeGreaterThanOrEqual(target.minClues);
        const bank = wordBank(index, r);
        for (const w of answer(target)) expect(bank, `${target.id} : mot « ${w} »`).toContain(w);
      }
    }
  });

  it("C4 : chaque case a au moins 3 sources, et la banque offre des leurres", () => {
    const sim = fresh();
    for (const id of ORDER.slice(0, -1)) { explore(sim); solve(sim, index.deductions.get(id)!); }
    explore(sim);
    const bank = wordBank(index, sim.r);
    for (const decoy of ["Lila", "Cuisine", "Bérard", "Okafor", "1 h 50", "2 h 10", "2 h 14", "blanche", "rouge", "médecin", "amie", "le libérer", "le soigner", "se venger"]) expect(bank).toContain(decoy);
    const c4 = index.deductions.get("C4") as Sentence;
    expect(c4.clues.length).toBeGreaterThanOrEqual(9);
  });
});

describe("énigmes", () => {
  const p = (id: string) => index.puzzles.get(id)!;
  it("PECHES, avec ou sans accent ; une erreur donne une pensée", () => {
    expect(checkPuzzle(p("locker"), ["P", "E", "C", "H", "E", "S"]).ok).toBe(true);
    expect(checkPuzzle(p("locker"), ["pêches"]).ok).toBe(true);
    expect(checkPuzzle(p("locker"), ["POMMES"])).toEqual({ ok: false, thought: "Qu'est-ce qu'on mange encore et encore, ici ?" });
  });
  it("MARCEAU ; GUETTEUR et OKAFOR ont leur pensée", () => {
    expect(checkPuzzle(p("terminal"), ["marceau"]).ok).toBe(true);
    expect(checkPuzzle(p("terminal"), ["GUETTEUR"])).toEqual({ ok: false, thought: "Non. Celui-là, il l'a laissé dehors." });
    expect(checkPuzzle(p("terminal"), ["Okafor"])).toEqual({ ok: false, thought: "Elle n'est jamais sortie. Il parle de quelqu'un qu'il aurait dû laisser dehors." });
  });
  it("leviers : DORTOIRS → CAFÉTÉRIA → INFIRMERIE → CONTRÔLE ; l'erreur fait du bruit", () => {
    expect(checkPuzzle(p("shed"), ["DORTOIRS", "CAFÉTÉRIA", "INFIRMERIE", "CONTRÔLE"]).ok).toBe(true);
    expect(checkPuzzle(p("shed"), ["CONTRÔLE", "DORTOIRS", "CAFÉTÉRIA", "INFIRMERIE"]).ok).toBe(false);
    expect(p("shed").onError!.some((a) => a.do === "noise")).toBe(true);
  });
  it("le cadenas donne 3 piles, une trousse et la feuille de comptage", () => {
    const r = emptyRecord();
    applyPuzzle(index, r, "locker");
    expect(r.cards).toContain("note_battery_count");
    expect(p("locker").items).toEqual([{ kind: "cell", amount: 3 }, { kind: "medkit", amount: 1 }]);
  });
});

describe("secret de Lou (option A) et indices dormants", () => {
  const world: WorldFacts = { facts: [] };
  it("le paquet noué est dans la sacoche dès le début, ne s'ouvre pas, « Pas maintenant. »", () => {
    const a16 = index.examinables.get("a16")!;
    expect(a16.carried).toBe(true);
    expect(a16.card).toBeUndefined();
    expect(a16.closeup.details ?? []).toEqual([]);
    expect(examinableState(a16, emptyRecord(), world)).toBe("open");
    expect(FLOOR1.thoughts.find((t) => t.trigger.on === "examine" && t.trigger.examinable === "a16")!.text).toBe("Pas maintenant.");
  });
  it("première minute : la craie, puis « Je ne devais pas entrer… » ; le triangle se tait", () => {
    const craie = FLOOR1.thoughts.find((t) => t.id === "t_craie")!;
    expect(craie.then).toBe("t_promesse");
    expect(FLOOR1.thoughts.find((t) => t.id === "t_promesse")!.text).toBe("Je ne devais pas entrer…");
    expect(FLOOR1.thoughts.find((t) => t.id === "t_triangle_silence")!.text).toBeUndefined();
    expect(FLOOR1.thoughts.find((t) => t.id === "t_verrous")!.text).toBe("Drôle de porte. On dirait qu'elle ferme de l'extérieur.");
  });
  it("rien ne révèle le secret : ni clé, ni serrurier, ni promesse dans les textes", () => {
    const texts = [
      ...FLOOR1.cards.map((c) => c.text), ...FLOOR1.thoughts.map((t) => t.text ?? ""),
      ...FLOOR1.events.flatMap((e) => e.actions.map((a) => (a.do === "notice" ? a.text : ""))),
      ...FLOOR1.examinables.map((e) => e.closeup.glance),
    ].join("\n");
    expect(texts).not.toMatch(/Gaspard|serrurier|laiton|promis/i);
  });
  it("les questions dormantes n'ont aucune déduction (posées, sans effet)", () => {
    const dormant = FLOOR1.questions.filter((q) => q.dormant).map((q) => q.id);
    expect(dormant).toEqual(["q_verrous", "q_photo", "q_dossier", "q_lila"]);
    expect(FLOOR1.deductions.some((d) => dormant.includes(d.question))).toBe(false);
  });
});
