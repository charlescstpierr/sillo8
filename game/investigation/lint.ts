// Vérificateur d'enquête : repère les oublis du contenu (identifiant inconnu, mot impossible à gagner,
// phrase sans assez d'indices…). Les tests unitaires l'appliquent à chaque étage ; un agent de contenu
// peut l'appeler pour vérifier son travail (`npx vitest run tests/unit/investigation.test.ts`).
import { NOTES } from "../notes";
import { ROOMS } from "../level";
import { parseSentence } from "./logic";
import type { Condition, InvestigationContent, Trigger } from "./types";

export function lintContent(c: InvestigationContent): string[] {
  const problems: string[] = [];
  const ids = (list: { id: string }[], what: string) => {
    const seen = new Set<string>();
    for (const item of list) {
      if (!/^[A-Za-z0-9_]{1,40}$/.test(item.id)) problems.push(`${what} : identifiant invalide « ${item.id} »`);
      if (seen.has(item.id)) problems.push(`${what} : identifiant en double « ${item.id} »`);
      seen.add(item.id);
    }
    return seen;
  };
  const cards = ids(c.cards, "carte");
  const questions = ids(c.questions, "question");
  const examinables = ids(c.examinables, "objet");
  const thoughts = ids(c.thoughts, "pensée");
  const traces = ids(c.traces, "trace");
  ids(c.events, "événement");
  const deductions = ids(c.deductions, "déduction");
  const rooms = new Set<string>(ROOMS.map((r) => r.id));

  const card = (id: string | undefined, where: string) => { if (id && !cards.has(id)) problems.push(`${where} : carte inconnue « ${id} »`); };
  const thought = (id: string | undefined, where: string) => { if (id && !thoughts.has(id)) problems.push(`${where} : pensée inconnue « ${id} »`); };
  const cond = (k: Condition | undefined, where: string) => {
    for (const id of [...(k?.cards ?? []), ...(k?.anyCards ?? [])]) card(id, where);
    for (const id of k?.deductions ?? []) if (!deductions.has(id)) problems.push(`${where} : déduction inconnue « ${id} »`);
    for (const id of k?.traces ?? []) if (!traces.has(id)) problems.push(`${where} : trace inconnue « ${id} »`);
  };
  const trigger = (t: Trigger, where: string) => {
    if (t.on === "enter" && !rooms.has(t.room)) problems.push(`${where} : pièce inconnue « ${t.room} »`);
    if ((t.on === "examine" || t.on === "reveal") && !examinables.has(t.examinable)) problems.push(`${where} : objet inconnu « ${t.examinable} »`);
    if (t.on === "uv" && !traces.has(t.trace)) problems.push(`${where} : trace inconnue « ${t.trace} »`);
    if (t.on === "card") card(t.card, where);
    if (t.on === "deduction" && !deductions.has(t.deduction)) problems.push(`${where} : déduction inconnue « ${t.deduction} »`);
  };

  for (const k of c.cards) {
    if (!questions.has(k.question)) problems.push(`carte ${k.id} : question inconnue « ${k.question} »`);
    if (!rooms.has(k.room)) problems.push(`carte ${k.id} : pièce inconnue « ${k.room} »`);
    if (k.text.split("\n").length > 5) problems.push(`carte ${k.id} : plus de 5 lignes`);
    if (k.note && (!NOTES[k.note] || NOTES[k.note].text !== k.text)) problems.push(`carte ${k.id} : le texte doit reprendre la note canon « ${k.note} » mot pour mot`);
  }
  for (const e of c.examinables) {
    card(e.card, `objet ${e.id}`);
    cond(e.requires, `objet ${e.id}`);
    cond(e.locked?.until, `objet ${e.id}`);
    e.closeup.details?.forEach((d, i) => {
      card(d.card, `objet ${e.id} détail ${i}`);
      thought(d.thought, `objet ${e.id} détail ${i}`);
      if (d.reveal.by === "loupe" && d.reveal.face === "back" && !e.closeup.back) problems.push(`objet ${e.id} : loupe sur un verso absent`);
    });
  }
  for (const t of c.thoughts) {
    trigger(t.trigger, `pensée ${t.id}`);
    thought(t.then, `pensée ${t.id}`);
    card(t.card, `pensée ${t.id}`);
    cond(t.requires, `pensée ${t.id}`);
    if (t.text !== undefined && t.text.trim() === "") problems.push(`pensée ${t.id} : texte vide (pour un silence, retirer « text »)`);
  }
  for (const t of c.traces) { card(t.card, `trace ${t.id}`); thought(t.thought, `trace ${t.id}`); cond(t.requires, `trace ${t.id}`); }
  for (const e of c.events) {
    trigger(e.trigger, `événement ${e.id}`);
    cond(e.requires, `événement ${e.id}`);
    for (const a of e.actions) if (a.do === "thought") thought(a.thought, `événement ${e.id}`);
  }

  // Mots gagnables : ceux des cartes et des déblocages.
  const words = new Set<string>();
  for (const k of c.cards) for (const w of k.words ?? []) words.add(w);
  for (const d of c.deductions) for (const u of d.unlocks) if (u.kind === "word") words.add(u.word);

  for (const d of c.deductions) {
    if (!questions.has(d.question)) problems.push(`déduction ${d.id} : question inconnue « ${d.question} »`);
    cond(d.requires, `déduction ${d.id}`);
    if (d.hints.length !== 3 || d.hints.some((h) => !h.trim())) problems.push(`déduction ${d.id} : il faut 3 paliers d'aide`);
    for (const u of d.unlocks) {
      if (u.kind === "card") card(u.card, `déduction ${d.id}`);
      if (u.kind === "examinable" && !examinables.has(u.id)) problems.push(`déduction ${d.id} : objet inconnu « ${u.id} »`);
      if (u.kind === "thought") thought(u.id, `déduction ${d.id}`);
    }
    if (d.kind === "contradiction") {
      if (d.pairs.length === 0) problems.push(`déduction ${d.id} : aucune paire`);
      for (const [a, b] of d.pairs) { card(a, `déduction ${d.id}`); card(b, `déduction ${d.id}`); if (a === b) problems.push(`déduction ${d.id} : paire d'une carte avec elle-même`); }
    } else {
      for (const id of d.clues) card(id, `déduction ${d.id}`);
      if (d.minClues < 3) problems.push(`déduction ${d.id} : au moins 3 indices requis`);
      if (d.clues.length < d.minClues) problems.push(`déduction ${d.id} : moins d'indices que minClues`);
      const clueRooms = new Set(d.clues.map((id) => c.cards.find((k) => k.id === id)?.room));
      if (clueRooms.size < 2) problems.push(`déduction ${d.id} : indices dans une seule pièce`);
      const slots = parseSentence(d.text).filter((p) => typeof p !== "string");
      if (slots.length < 2) problems.push(`déduction ${d.id} : une phrase à trous a au moins 2 cases`);
      for (const s of slots) if (typeof s !== "string" && !s.answers.some((a) => words.has(a))) problems.push(`déduction ${d.id} : aucune réponse gagnable pour la case ${s.slot} (${s.answers.join(" | ")})`);
    }
  }
  for (const e of c.errors) {
    if (e.cards) { card(e.cards[0], "erreur"); card(e.cards[1], "erreur"); }
    if (e.deduction && !deductions.has(e.deduction)) problems.push(`erreur : déduction inconnue « ${e.deduction} »`);
    if (e.word && !words.has(e.word)) problems.push(`erreur : mot jamais gagnable « ${e.word} »`);
  }
  if (c.generic.wrong.length === 0) problems.push("pensées génériques : liste vide");
  return problems;
}
