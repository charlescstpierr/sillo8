// Règles de l'enquête, sans rendu ni navigateur (testables sous Vitest) : conditions, banque de mots,
// validation des contradictions et des phrases à trous, déblocages, aide en trois paliers.
import { addOnce, type InquiryRecord } from "./record";
import type {
  Card, Condition, Contradiction, Deduction, Examinable, Id, InvestigationContent, Sentence, Unlock,
} from "./types";

/** Ce que l'enquête lit du reste du jeu. */
export interface WorldFacts {
  /** Faits de progression de l'étage (state.facts). */
  facts: readonly string[];
}

export function conditionMet(cond: Condition | undefined, r: InquiryRecord, world: WorldFacts): boolean {
  if (!cond) return true;
  if (cond.cards && !cond.cards.every((id) => r.cards.includes(id))) return false;
  if (cond.anyCards && !cond.anyCards.some((id) => r.cards.includes(id))) return false;
  if (cond.deductions && !cond.deductions.every((id) => r.deductions.includes(id))) return false;
  if (cond.traces && !cond.traces.every((id) => r.traces.includes(id))) return false;
  if (cond.unlocked && !cond.unlocked.every((id) => r.unlocked.includes(id))) return false;
  if (cond.facts && !cond.facts.every((id) => world.facts.includes(id))) return false;
  return true;
}

export const unlockKey = (u: Unlock): string => {
  switch (u.kind) {
    case "word": return `word:${u.word}`;
    case "card": return `card:${u.card}`;
    default: return `${u.kind}:${u.id}`;
  }
};

// ——— Index du contenu ———

export class ContentIndex {
  readonly cards = new Map<Id, Card>();
  readonly deductions = new Map<Id, Deduction>();
  readonly examinables = new Map<Id, Examinable>();
  constructor(readonly content: InvestigationContent) {
    for (const c of content.cards) this.cards.set(c.id, c);
    for (const d of content.deductions) this.deductions.set(d.id, d);
    for (const e of content.examinables) this.examinables.set(e.id, e);
  }
}

// ——— Banque de mots ———

/** Mots disponibles pour les phrases à trous, dans l'ordre où ils ont été gagnés. */
export function wordBank(index: ContentIndex, r: InquiryRecord): string[] {
  const words: string[] = [];
  const add = (w: string) => { if (!words.includes(w)) words.push(w); };
  for (const id of r.cards) for (const w of index.cards.get(id)?.words ?? []) add(w);
  for (const key of r.unlocked) if (key.startsWith("word:")) add(key.slice(5));
  return words;
}

// ——— Phrases à trous ———

export type SentencePart = string | { slot: number; answers: string[] };

/** Découpe « Le premier est sorti de [la chambre 1|la chambre un]. » en texte et cases. */
export function parseSentence(text: string): SentencePart[] {
  const parts: SentencePart[] = [];
  const re = /\[([^\]]+)\]/g;
  let last = 0;
  let slot = 0;
  for (let m = re.exec(text); m; m = re.exec(text)) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    parts.push({ slot: slot++, answers: m[1].split("|").map((a) => a.trim()) });
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

export function slotCount(sentence: Sentence): number {
  return parseSentence(sentence.text).filter((p) => typeof p !== "string").length;
}

/** Cartes de soutien déjà trouvées. */
export function cluesFound(sentence: Sentence, r: InquiryRecord): number {
  return sentence.clues.filter((id) => r.cards.includes(id)).length;
}

export type Verdict =
  | { ok: true; deduction: Deduction }
  /** `kind` : « incomplete » (case vide), « clues » (pas assez d'indices), « almost » (1-2 cases fausses),
   *  « wrong », « already » (déjà faite), « unknown ». */
  | { ok: false; kind: "incomplete" | "clues" | "almost" | "wrong" | "already" | "unknown"; thought: string; wrongSlots?: number[] };

/** Valide une phrase entière (jamais case par case : seul le nombre d'erreurs est dit, sans dire où). */
export function checkSentence(index: ContentIndex, r: InquiryRecord, id: Id, words: readonly (string | null)[], world: WorldFacts, attempt = 0): Verdict {
  const content = index.content;
  const d = index.deductions.get(id);
  if (!d || d.kind !== "sentence" || !conditionMet(d.requires, r, world)) return { ok: false, kind: "unknown", thought: content.generic.wrong[0] };
  if (r.deductions.includes(id)) return { ok: false, kind: "already", thought: content.generic.already };
  const slots = parseSentence(d.text).filter((p): p is { slot: number; answers: string[] } => typeof p !== "string");
  if (words.length !== slots.length || words.some((w) => !w)) return { ok: false, kind: "incomplete", thought: "" };
  const bank = wordBank(index, r);
  if (words.some((w) => !bank.includes(w!))) return { ok: false, kind: "wrong", thought: generic(content.generic.wrong, attempt) };
  if (cluesFound(d, r) < d.minClues) return { ok: false, kind: "clues", thought: content.generic.tooFew };
  const wrongSlots = slots.filter((s, i) => !s.answers.includes(words[i]!)).map((s) => s.slot);
  if (wrongSlots.length === 0) return { ok: true, deduction: d };
  // Une pensée précise si une erreur connue est commise.
  for (const e of content.errors) {
    if (e.deduction !== id || !e.word) continue;
    const at = words.findIndex((w, i) => w === e.word && (e.slot === undefined || e.slot === i));
    if (at >= 0 && wrongSlots.includes(slots[at].slot)) return { ok: false, kind: wrongSlots.length <= 2 ? "almost" : "wrong", thought: e.text, wrongSlots };
  }
  if (wrongSlots.length <= 2) return { ok: false, kind: "almost", thought: content.generic.almost, wrongSlots };
  return { ok: false, kind: "wrong", thought: generic(content.generic.wrong, attempt), wrongSlots };
}

// ——— Contradictions ———

const samePair = (p: readonly [Id, Id], a: Id, b: Id) => (p[0] === a && p[1] === b) || (p[0] === b && p[1] === a);

/** Relie deux cartes : contradiction juste, déjà établie, ou pensée d'erreur. */
export function checkContradiction(index: ContentIndex, r: InquiryRecord, a: Id, b: Id, world: WorldFacts, attempt = 0): Verdict {
  const content = index.content;
  if (a === b || !r.cards.includes(a) || !r.cards.includes(b)) return { ok: false, kind: "unknown", thought: generic(content.generic.wrong, attempt) };
  for (const d of content.deductions) {
    if (d.kind !== "contradiction" || !d.pairs.some((p) => samePair(p, a, b))) continue;
    if (r.deductions.includes(d.id)) return { ok: false, kind: "already", thought: content.generic.already };
    if (!conditionMet(d.requires, r, world)) continue;
    return { ok: true, deduction: d };
  }
  for (const e of content.errors) if (e.cards && samePair(e.cards, a, b)) return { ok: false, kind: "wrong", thought: e.text };
  return { ok: false, kind: "wrong", thought: generic(content.generic.wrong, attempt) };
}

function generic(list: readonly string[], attempt: number): string {
  return list.length ? list[Math.abs(attempt) % list.length] : "…";
}

// ——— Déblocages ———

export interface Applied {
  /** Cartes gagnées par le déblocage. */
  cards: Id[];
  /** Pensées à montrer. */
  thoughts: Id[];
  /** Déblocages nouveaux (« type:id »). */
  unlocked: string[];
}

/** Enregistre une déduction réussie et ce qu'elle ouvre. */
export function applyDeduction(index: ContentIndex, r: InquiryRecord, id: Id): Applied {
  const applied: Applied = { cards: [], thoughts: [], unlocked: [] };
  const d = index.deductions.get(id);
  if (!d || !addOnce(r, "deductions", id)) return applied;
  for (const u of d.unlocks) {
    const key = unlockKey(u);
    if (addOnce(r, "unlocked", key)) applied.unlocked.push(key);
    if (u.kind === "card" && addOnce(r, "cards", u.card)) applied.cards.push(u.card);
    if (u.kind === "thought") applied.thoughts.push(u.id);
  }
  return applied;
}

/** Un objet examinable est-il présent dans le monde ? verrouillé ? */
export function examinableState(e: Examinable, r: InquiryRecord, world: WorldFacts): "hidden" | "locked" | "open" {
  if (!conditionMet(e.requires, r, world)) return "hidden";
  if (e.locked && !conditionMet(e.locked.until, r, world) && !r.unlocked.includes(`examinable:${e.id}`)) return "locked";
  return "open";
}

// ——— Tableau ———

/** Déductions visibles au tableau (phrases et contradictions dont la condition est remplie). */
export function visibleDeductions(index: ContentIndex, r: InquiryRecord, world: WorldFacts): Deduction[] {
  return index.content.deductions.filter((d) => {
    if (r.deductions.includes(d.id)) return true;
    if (!conditionMet(d.requires, r, world)) return false;
    // Une phrase apparaît dès qu'un de ses indices est trouvé ; une contradiction, dès qu'une de ses cartes l'est.
    if (d.kind === "sentence") return d.clues.some((c) => r.cards.includes(c));
    return d.pairs.some((p) => r.cards.includes(p[0]) || r.cards.includes(p[1]));
  });
}

// ——— Aide en trois paliers ———

export interface Hint {
  deduction: Deduction;
  /** 1 : orienter, 2 : pointer, 3 : relier. */
  tier: 1 | 2 | 3;
  text: string;
}

/** Déduction que l'aide vise : la première visible et pas encore faite, sinon la première ouverte. */
export function hintTarget(index: ContentIndex, r: InquiryRecord, world: WorldFacts): Deduction | null {
  const open = (d: Deduction) => !r.deductions.includes(d.id) && conditionMet(d.requires, r, world);
  return visibleDeductions(index, r, world).find(open) ?? index.content.deductions.find(open) ?? null;
}

/** Palier suivant pour la déduction visée (le palier monte d'un cran à chaque demande, jusqu'à 3). */
export function takeHint(index: ContentIndex, r: InquiryRecord, world: WorldFacts): Hint | null {
  const d = hintTarget(index, r, world);
  if (!d) return null;
  const tier = Math.min(3, (r.hints[d.id] ?? 0) + 1) as 1 | 2 | 3;
  r.hints[d.id] = tier;
  return { deduction: d, tier, text: d.hints[tier - 1] };
}

/** Le tableau suggère l'aide après 3 erreurs ou 150 s sans progrès (jamais imposée). */
export function hintSuggested(mistakes: number, idleSeconds: number): boolean {
  return mistakes >= 3 || idleSeconds >= 150;
}

export type { Contradiction, Sentence };
