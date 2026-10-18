// Conversations écrites, pilotées par des données (remplace l'IA de dialogue de SILO 9).
// Un dialogue d'enquête doit être exact : chaque réplique est écrite à l'avance, le jeu ne dit ni plus
// ni moins que prévu. Ce module est pur (sans React ni rendu) ; l'interface est ui/DialogueSheet.tsx.
//
// Écrire une conversation (ex. Cuisine, l'opératrice de nuit) :
//
//   registerConversation({
//     id: "cuisine_porte",
//     speaker: { id: "cuisine", name: "CUISINE", title: "DERRIÈRE LA PORTE", portrait: "survivor" },
//     start: "debut",
//     nodes: {
//       debut: {
//         lines: [
//           { who: "speaker", text: "C'est-tu toi qui as laissé rentrer les zombies ?" },
//           { who: "lou", text: "Non. J'arrive à peine.", when: { not: { fact: "cuisine_vu" } } },
//         ],
//         effects: [{ flag: "cuisine_vu" }],
//         choices: [
//           { text: "Je cherche une clé.", next: "cle", effects: [{ trust: "cuisine", delta: -1 }] },
//           { text: "Vous êtes blessé ?", next: "blesse", when: { fact: "generator_powered" } },
//           { text: "Je reviendrai." },                 // sans `next` : la conversation se termine
//         ],
//       },
//       ...
//     },
//   });
//
// Conditions (`when`) : { fact } (objectif atteint ou fait posé par une conversation), { note } (note lue),
// { trust: "cuisine", min: 2 } ou { trust, max }, et { all: [...] }, { any: [...] }, { not: {...} }.
// Enquête (state.ext.investigation) : { card } (carte obtenue), { deduction } (X8, C5…), { unlocked } (« dialogue:… »,
// « fact:… »). Sacoche : { item: "bandages", min: 1 }.
// Effets (`effects`) : { flag } / { unflag } (faits de conversation), { trust, delta } (confiance −5 → 5),
// { remember } (mémoire de la partie), { item, delta } (donner ou recevoir un objet), { gesture } (geste de
// confiance nommé, appliqué par game/content/people.ts : marches, plafonds, « Cuisine a remarqué. »).
// Tout est sauvegardé (state.flags, state.relations, state.ext).
// Texte : « {nom} » est remplacé par le nom que l'interlocuteur donne à Lou (« l'étranger », « le bricoleur », « Lou »).
// Le moteur ouvre une conversation avec engine.openConversation(id).
import type { SiloState } from "./state";
import { recordOf } from "./investigation/record";

/** Portrait dessiné dans ui/Portraits.tsx. */
export type PortraitId = "radio" | "survivor" | "hero" | "cuisine" | "operatrice";

/** Objets de la sacoche qu'une conversation peut donner ou recevoir. */
export type ItemKind = "bandages" | "cells" | "cans" | "medkits" | "reserve";
const ITEM_MAX: Record<ItemKind, number> = { bandages: 99, cells: 99, cans: 99, medkits: 99, reserve: 999 };

export interface Speaker {
  /** Identifiant de l'interlocuteur (aussi la clé de sa confiance dans state.relations). */
  id: string;
  /** Nom affiché (titre de la feuille). */
  name: string;
  /** Rôle court, sur l'étiquette (ex. « À LA RADIO », « DERRIÈRE LA PORTE »). */
  title: string;
  portrait: PortraitId;
}

export type Condition =
  | { fact: string }
  | { note: string }
  | { trust: string; min?: number; max?: number }
  | { card: string }
  | { deduction: string }
  | { unlocked: string }
  | { item: ItemKind; min: number }
  | { all: Condition[] }
  | { any: Condition[] }
  | { not: Condition };

export type Effect =
  | { flag: string }
  | { unflag: string }
  | { trust: string; delta: number }
  | { remember: string }
  | { item: ItemKind; delta: number }
  | { gesture: string };

/** Ce que la feuille montre de l'interlocuteur, selon la confiance (sans jauge : le nom, le corps, la porte). */
export interface SpeakerStatus {
  /** Étiquette (« SUR LA CHAÎNE », « DEHORS », « À L'INTERPHONE »). */
  title?: string;
  /** Comment il appelle Lou (« l'étranger »…). */
  calls?: string;
  /** Ce que fait son corps (« Couperet levé. Il recule. »). */
  gesture?: string;
  /** Humeur du portrait (ui/Portraits.tsx). */
  mood?: string;
}

/**
 * Branchements fournis par le contenu (game/content/people.ts), pour garder ce module sans dépendance :
 * le nom donné à Lou, l'état visible d'un interlocuteur, et l'application d'un geste de confiance.
 */
export const conversationHooks: {
  name?: (speaker: string, state: SiloState) => string;
  status?: (speaker: string, state: SiloState) => SpeakerStatus;
  gesture?: (id: string, state: SiloState) => void;
} = {};

/** Remplace « {nom} » par le nom que l'interlocuteur donne à Lou ; « {Nom} » avec majuscule. */
export function fillText(text: string, speaker: string, state: SiloState): string {
  if (!text.includes("{")) return text;
  const name = conversationHooks.name?.(speaker, state) ?? "l'étranger";
  return text.replaceAll("{nom}", name).replaceAll("{Nom}", name.charAt(0).toUpperCase() + name.slice(1));
}

export function speakerStatus(speaker: string, state: SiloState): SpeakerStatus {
  return conversationHooks.status?.(speaker, state) ?? {};
}

function adjustItem(state: SiloState, kind: ItemKind, delta: number): boolean {
  const next = state[kind] + delta;
  if (!Number.isInteger(delta) || next < 0 || next > ITEM_MAX[kind]) return false;
  state[kind] = next;
  state.markChanged();
  return true;
}

export interface Line {
  /** "speaker" : l'interlocuteur ; "lou" : le héros ; "narration" : didascalie (« [grésillement] »). */
  who: "speaker" | "lou" | "narration";
  text: string;
  when?: Condition;
}

export interface Choice {
  /** Réponse de Lou, telle qu'elle s'affiche sur le bouton. */
  text: string;
  /** Nœud suivant ; absent : la conversation se termine. */
  next?: string;
  when?: Condition;
  effects?: Effect[];
}

export interface ConversationNode {
  lines: Line[];
  /** Effets appliqués en arrivant sur le nœud. */
  effects?: Effect[];
  /** Réponses proposées ; aucune réponse visible : un bouton « Terminer » ferme la conversation. */
  choices?: Choice[];
}

export interface Conversation {
  id: string;
  speaker: Speaker;
  start: string;
  nodes: Record<string, ConversationNode>;
}

/** Conversations connues du jeu, par identifiant. Le contenu s'enregistre avec registerConversation. */
export const CONVERSATIONS: Record<string, Conversation> = {};

export function registerConversation(conversation: Conversation): void {
  const problem = checkConversation(conversation);
  if (problem) throw new Error(`Conversation « ${conversation.id} » : ${problem}`);
  CONVERSATIONS[conversation.id] = conversation;
}

/** Vérifie qu'une conversation est bien formée (nœuds existants, effets bornés). Rend le problème, ou "". */
export function checkConversation(c: Conversation): string {
  if (!/^[a-z][a-z0-9_]*$/.test(c.id)) return "identifiant invalide";
  if (!/^[a-z][a-z0-9_]{0,39}$/.test(c.speaker.id)) return "interlocuteur invalide";
  if (!c.nodes[c.start]) return `nœud de départ « ${c.start} » absent`;
  for (const [id, node] of Object.entries(c.nodes)) {
    for (const choice of node.choices ?? []) {
      if (choice.next !== undefined && !c.nodes[choice.next]) return `nœud « ${choice.next} » absent (depuis « ${id} »)`;
    }
    for (const effect of [...(node.effects ?? []), ...(node.choices ?? []).flatMap((ch) => ch.effects ?? [])]) {
      if ("trust" in effect && (!Number.isInteger(effect.delta) || Math.abs(effect.delta) > 5 || effect.delta === 0)) return `confiance hors bornes dans « ${id} »`;
      if ("item" in effect && (!Number.isInteger(effect.delta) || effect.delta === 0 || Math.abs(effect.delta) > 32)) return `objet hors bornes dans « ${id} »`;
      if ("flag" in effect && !/^[a-z][a-z0-9_.-]{0,79}$/.test(effect.flag)) return `fait invalide « ${effect.flag} » dans « ${id} »`;
    }
    for (const line of node.lines) if (!line.text.trim()) return `réplique vide dans « ${id} »`;
  }
  return "";
}

export function conditionMet(when: Condition | undefined, state: SiloState): boolean {
  if (!when) return true;
  if ("fact" in when) return state.knows(when.fact);
  if ("note" in when) return state.notes.includes(when.note);
  if ("trust" in when) {
    const value = state.relations[when.trust] ?? 0;
    return value >= (when.min ?? -Infinity) && value <= (when.max ?? Infinity);
  }
  // L'enquête pose aussi ses cartes (« card.<id> ») et ses déductions en minuscules (« x9 ») dans state.flags.
  if ("card" in when) return recordOf(state).cards.includes(when.card) || state.knows(`card.${when.card}`);
  if ("deduction" in when) {
    const r = recordOf(state);
    return r.deductions.includes(when.deduction) || r.deductions.includes(when.deduction.toLowerCase()) || state.knows(when.deduction.toLowerCase());
  }
  if ("unlocked" in when) return recordOf(state).unlocked.includes(when.unlocked);
  if ("item" in when) return state[when.item] >= when.min;
  if ("all" in when) return when.all.every((c) => conditionMet(c, state));
  if ("any" in when) return when.any.some((c) => conditionMet(c, state));
  return !conditionMet(when.not, state);
}

export function applyEffects(effects: readonly Effect[] | undefined, state: SiloState): void {
  for (const effect of effects ?? []) {
    if ("flag" in effect) state.setFlag(effect.flag, true);
    else if ("unflag" in effect) state.setFlag(effect.unflag, false);
    else if ("trust" in effect) state.changeTrust(effect.trust, effect.delta);
    else if ("item" in effect) adjustItem(state, effect.item, effect.delta);
    else if ("gesture" in effect) conversationHooks.gesture?.(effect.gesture, state);
    else state.remember(effect.remember);
  }
}

/** Ce que la feuille affiche à un instant : répliques visibles et réponses possibles. */
export interface ConversationView {
  node: string;
  lines: Line[];
  choices: { index: number; text: string }[];
  /** Vrai quand il n'y a plus rien à répondre. */
  done: boolean;
}

/**
 * Déroulé d'une conversation sur un état de partie. `enter` applique les effets du nœud ;
 * `choose` applique ceux de la réponse puis passe au nœud suivant (ou termine).
 */
export class ConversationRun {
  node: string;
  ended = false;

  constructor(readonly conversation: Conversation, readonly state: SiloState) {
    this.node = conversation.start;
    applyEffects(conversation.nodes[this.node].effects, state);
  }

  view(): ConversationView {
    const node = this.conversation.nodes[this.node];
    const who = this.conversation.speaker.id;
    const lines = node.lines.filter((l) => conditionMet(l.when, this.state)).map((l) => ({ ...l, text: fillText(l.text, who, this.state) }));
    const choices = this.ended ? [] : (node.choices ?? [])
      .map((choice, index) => ({ choice, index }))
      .filter(({ choice }) => conditionMet(choice.when, this.state))
      .map(({ choice, index }) => ({ index, text: fillText(choice.text, who, this.state) }));
    return { node: this.node, lines, choices, done: this.ended || choices.length === 0 };
  }

  /** Choisit la réponse d'indice `index` (indice dans node.choices). Rend la réponse jouée, ou null. */
  choose(index: number): Choice | null {
    if (this.ended) return null;
    const choice = this.conversation.nodes[this.node].choices?.[index];
    if (!choice || !conditionMet(choice.when, this.state)) return null;
    applyEffects(choice.effects, this.state);
    if (choice.next === undefined) {
      this.ended = true;
    } else {
      this.node = choice.next;
      applyEffects(this.conversation.nodes[this.node].effects, this.state);
    }
    return choice;
  }
}
