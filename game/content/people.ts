// Les personnes de l'étage 1 : les 5 mordus identifiés, les deux survivants (Cuisine, l'opératrice de nuit), la
// confiance sans jauge, les moments clés M1 à M7 et la fin de l'étage selon ce qui a été découvert.
// Sources : docs/MEFIANCE_SURVIVANTS.md (§ 5 à 11) et docs/HISTOIRE_PROPOSITION.md (§ 7, 15, 21). Module pur, sans
// rendu ni navigateur (testé dans tests/unit/people.test.ts) ; le déroulé en jeu est dans people_director.ts, les
// répliques dans people_talk.ts, le rendu dans game/render/survivor.ts.
//
// Sauvegarde (docs/SAUVEGARDES.md) : rien au premier niveau.
// - state.relations.cuisine : la marche de Cuisine, −1 (hostile) · 0 (méfiant, départ) · 1 (prudent) · 2 (confiant) ;
// - state.relations.operatrice : son visage, 0 (masque) · 1 (sur la défensive) · 2 (honteuse) · 3 (vraie) ;
// - state.flags : faits de conversation (« cuisine_menti_generatrice », « m6_elle »…) et scènes jouées (« m1 » … « m7 », identifiants partagés avec game/investigation/content/links.ts) ;
// - state.ext.people : { v: 1, steps, noticed } (gestes déjà comptés, rappels « Cuisine a remarqué. » déjà montrés).
//
// Identifiants partagés avec l'enquête (contrat : game/investigation/content/links.ts) :
// - écrits par les conversations dans state.flags : scènes « m1 » … « m7 », « cook_testimony » (récit de Cuisine),
//   « operator_stuck » (« Je suis restée coincée ») ; en plus, record.unlocked reçoit « scene:M1 » … et
//   « fact:lou_accuse » ;
// - lus : déductions « x1 »… « x10 », « c1 »… « c5 » (state.flags, ou record.deductions), « accused_cleared »,
//   « operator_defensive », « case_solved », « circuit_controle » / « puzzle_shed » (énigme 2), cartes « card.<id> » ;
// - les 5 mordus porteurs d'indices sont ceux de ENEMIES (game/level.ts) ; leurs objets s'examinent par l'enquête
//   (champ `carrier`), quand le mordu est figé ou abattu.
import type { SiloState } from "../state";
import { addOnce, recordOf } from "../investigation/record";
import { CONTENT } from "../investigation/world";

// ——— Lecture de l'enquête ———

/**
 * Une déduction est faite : l'enquête pose son identifiant en minuscules dans state.flags (« x9 », « c5 » ;
 * game/investigation/content/links.ts), ou on la trouve dans record.deductions, ou en déblocage « fact:<id> ».
 */
export function deduced(state: SiloState, id: string): boolean {
  const r = recordOf(state);
  return state.knows(id.toLowerCase()) || r.deductions.includes(id) || r.deductions.includes(id.toLowerCase()) || r.unlocked.includes(`fact:${id}`);
}

export function hasCard(state: SiloState, id: string): boolean {
  return recordOf(state).cards.includes(id) || state.knows(`card.${id}`);
}

/** Lou est disculpé : C5 validée au tableau (« Personne n'est entré par la porte de service… »). */
export const exonerated = (state: SiloState) => deduced(state, "C5") || state.knows("accused_cleared");
/** L'affaire de la chambre 1 est résolue : C4 (l'accusation juste). */
export const caseSolved = (state: SiloState) => deduced(state, "C4") || state.knows("case_solved");

/** L'énigme 2 (leviers) existe-t-elle déjà dans le contenu ? Sinon, le courant de la génératrice suffit. */
const CONTROL_PUZZLE = [...CONTENT.deductions, ...(CONTENT.puzzles ?? [])].some((d) => d.unlocks.some((u) => u.kind === "fact" && u.id === "circuit_controle"));

/**
 * Le circuit CONTRÔLE est rallumé (énigme 2) : l'interphone de l'opératrice remarche. Supposition : l'énigme 2
 * pose le fait « circuit_controle » (state.flags ou déblocage « fact:circuit_controle ») ; tant qu'elle n'existe pas
 * dans le contenu, la relance de la génératrice suffit.
 */
export function controlPowered(state: SiloState): boolean {
  if (state.knows("circuit_controle") || state.knows("puzzle_shed") || recordOf(state).unlocked.includes("fact:circuit_controle")) return true;
  return !CONTROL_PUZZLE && state.has("generator_powered");
}

// ——— Mémoire des personnes (state.ext.people) ———

export const PEOPLE_KEY = "people";

export interface PeopleRecord {
  v: 1;
  /** Gestes de confiance déjà comptés (chacun une seule fois). */
  steps: string[];
  /** Rappels « Cuisine a remarqué. » déjà montrés (4 au plus). */
  noticed: number;
}

function readPeople(raw: unknown): PeopleRecord | null {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return null;
  const r = raw as Partial<PeopleRecord>;
  if (r.v !== 1 || !Array.isArray(r.steps) || !r.steps.every((s) => typeof s === "string" && s.length <= 40)) return null;
  return { v: 1, steps: r.steps.slice(0, 64), noticed: Number.isInteger(r.noticed) ? Math.max(0, Math.min(4, r.noticed!)) : 0 };
}

export function peopleRecord(state: SiloState): PeopleRecord {
  return state.getExt(PEOPLE_KEY, readPeople, () => ({ v: 1, steps: [], noticed: 0 }));
}

function savePeople(state: SiloState, r: PeopleRecord): void {
  state.setExt(PEOPLE_KEY, r);
}

// ——— Scènes ———

export type MomentId = "M1" | "M2" | "M3" | "M4" | "M5" | "M6" | "M7";
export const MOMENTS: readonly MomentId[] = ["M1", "M2", "M3", "M4", "M5", "M6", "M7"];

export const sceneFlag = (m: MomentId) => m.toLowerCase();
export const played = (state: SiloState, m: MomentId) => state.knows(sceneFlag(m));

/** Marque une scène jouée : fait de conversation, et déblocage « scene:Mx » lisible par l'enquête. */
export function markScene(state: SiloState, m: MomentId): boolean {
  if (played(state, m)) return false;
  state.setFlag(sceneFlag(m));
  unlockForInquiry(state, `scene:${m}`);
  return true;
}

/** Ajoute un déblocage « type:id » à l'enquête (record.unlocked), pour ses conditions `unlocked`. */
export function unlockForInquiry(state: SiloState, key: string): void {
  if (addOnce(recordOf(state), "unlocked", key)) state.markChanged();
}

// ——— Cuisine : quatre marches, sans jauge ———

export const COOK = "cuisine";
export const OPERATOR = "operatrice";

export type CookLevel = -1 | 0 | 1 | 2;
export const COOK_LEVEL = { hostile: -1, wary: 0, careful: 1, trusting: 2 } as const;

export function cookLevel(state: SiloState): CookLevel {
  return Math.max(-1, Math.min(2, state.relations[COOK] ?? 0)) as CookLevel;
}

/** Le nom que Cuisine donne à Lou : « l'étranger » → « le bricoleur » → « Lou ». */
export function cookName(state: SiloState): string {
  const level = cookLevel(state);
  return level >= 2 ? "Lou" : level === 1 ? "le bricoleur" : "l'étranger";
}

/** Ce que montre Cuisine, marche par marche (MEFIANCE_SURVIVANTS § 7) : porte, arme, geste, ce qu'il partage. */
export const COOK_STANCE: Record<CookLevel, { title: string; door: string; weapon: string; gesture: string; shares: string; mood: string }> = {
  [-1]: { title: "PORTE FERMÉE", door: "Fermée. Il parle à travers ; les objets passent par la fente.", weapon: "Couperet levé.", gesture: "Il recule. Il éteint sa lampe.", shares: "Rien de gratuit : échange seulement.", mood: "hostile" },
  0: { title: "SUR LA CHAÎNE", door: "Entrebâillée, sur la chaîne.", weapon: "Couperet baissé, à la main.", gesture: "Il te regarde les mains.", shares: "Des infos sur lui.", mood: "wary" },
  1: { title: "PORTE OUVERTE", door: "Ouverte : tu peux entrer.", weapon: "Couperet posé sur le comptoir.", gesture: "Il s'assoit.", shares: "Son témoignage, des échanges justes.", mood: "careful" },
  2: { title: "DEHORS", door: "Il sort de la chambre froide.", weapon: "Couperet rangé.", gesture: "Il te tourne le dos pour fouiller une étagère.", shares: "La clé de sa réserve, son secret.", mood: "trusting" },
};

// ——— L'opératrice : un masque, puis la vérité ———

export type OperatorMood = "mask" | "defensive" | "ashamed" | "true";
const OPERATOR_MOODS: readonly OperatorMood[] = ["mask", "defensive", "ashamed", "true"];

/** Son visage, d'après les faits (MEFIANCE_SURVIVANTS § 7, « deux visages »). */
export function operatorMood(state: SiloState): OperatorMood {
  if (state.knows("operatrice_aveu")) return "true";
  if (caseSolved(state)) return "ashamed";
  if (deduced(state, "X9") || deduced(state, "X6") || state.knows("operator_defensive") || exonerated(state)) return "defensive";
  return "mask";
}

/** Comment elle appelle Lou en face : « mon garçon », un silence, puis enfin « Lou ». */
export function operatorName(state: SiloState): string {
  const mood = operatorMood(state);
  return mood === "true" ? "Lou" : mood === "ashamed" ? "…" : "mon garçon";
}

export const OPERATOR_STANCE: Record<OperatorMood, { title: string; gesture: string }> = {
  mask: { title: "À L'INTERPHONE", gesture: "Voix douce. Elle tourne son alliance. Lueur verte sous la porte." },
  defensive: { title: "À L'INTERPHONE", gesture: "Lampe éteinte. Réponses courtes ; elle change de sujet." },
  ashamed: { title: "LOCAL TECHNIQUE", gesture: "Elle pose sa lampe verte sur la console." },
  true: { title: "LOCAL TECHNIQUE", gesture: "Elle ouvre le loquet elle-même." },
};

/** Garde state.relations.operatrice au rang de son visage (0 → 3). */
export function syncOperator(state: SiloState): boolean {
  const target = OPERATOR_MOODS.indexOf(operatorMood(state));
  const current = state.relations[OPERATOR] ?? 0;
  if (current === target) return false;
  return state.changeTrust(OPERATOR, target - current);
}

// ——— Les gestes : ce qui fait monter ou baisser la confiance ———

export type GestureKind = "gift" | "truth" | "clue" | "word" | "rescue" | "respect" | "proof" | "fault";

export interface Gesture {
  delta: 1 | -1;
  kind: GestureKind;
  /** Gros geste : « Cuisine a remarqué. » (4 fois au plus dans l'étage). */
  noticed?: boolean;
  /** Ce que dit Cuisine quand le geste se fait hors d'une conversation (avis en bas d'écran). */
  line?: string;
}

/**
 * Gestes de Cuisine (MEFIANCE_SURVIVANTS § 7). Chacun compte une seule fois. Une clé fait monter d'une marche,
 * un faux pas descendre d'une marche. Les cadeaux ne dépassent jamais « prudent » ; « confiant » demande la preuve
 * (C5). Pas de marche sous « hostile ».
 */
export const GESTURES: Record<string, Gesture> = {
  // Monter
  don_bandage: { delta: 1, kind: "gift" },
  don_pile: { delta: 1, kind: "gift" },
  don_conserve: { delta: 1, kind: "gift" },
  verite_entree: { delta: 1, kind: "truth" },
  verite_promesse: { delta: 1, kind: "truth" },
  indice_comptage: { delta: 1, kind: "clue" },
  indice_seuil: { delta: 1, kind: "clue" },
  indice_lila2: { delta: 1, kind: "clue" },
  parole_tenue: { delta: 1, kind: "word", noticed: true, line: "Tu l'as fermée ? Pour vrai ? …Bon." },
  sauvetage: { delta: 1, kind: "rescue", noticed: true },
  respect_secret: { delta: 1, kind: "respect" },
  preuve: { delta: 1, kind: "proof", noticed: true },
  // Baisser
  annonce_m2: { delta: -1, kind: "fault" },
  mensonge_demasque: { delta: -1, kind: "fault", noticed: true },
  fouille: { delta: -1, kind: "fault", line: "Touche pas à ça. Ça, c'est à moi." },
  vacarme: { delta: -1, kind: "fault", noticed: true, line: "Arrête ton vacarme ! Tu vas toutes nous les ramener !" },
  promesse_trahie: { delta: -1, kind: "fault", noticed: true, line: "T'avais dit que tu la fermerais, la porte." },
  fuite: { delta: -1, kind: "fault", noticed: true, line: "Je le savais." },
  refus_sacoche: { delta: -1, kind: "fault" },
  nier: { delta: -1, kind: "fault", noticed: true },
};

/** Plafond de la confiance de Cuisine pour un geste : cadeaux → prudent ; sans preuve → prudent ; sinon confiant. */
export function cookCeiling(state: SiloState, kind: GestureKind): CookLevel {
  if (kind === "proof") return 2;
  if (kind === "gift") return 1;
  return exonerated(state) ? 2 : 1;
}

export interface GestureResult {
  id: string;
  /** Marches réellement franchies (0 si plafond ou plancher). */
  moved: number;
  noticed: boolean;
  line?: string;
}

/** Avis à montrer (« Cuisine a remarqué. », répliques) : le directeur les vide à chaque image. */
export const peopleNotices: string[] = [];

/** Applique un geste de confiance une seule fois. Rend ce qui s'est passé, ou null s'il était déjà compté. */
export function applyGesture(state: SiloState, id: string): GestureResult | null {
  const g = GESTURES[id];
  if (!g) return null;
  const r = peopleRecord(state);
  if (r.steps.includes(id)) return null;
  const before = cookLevel(state);
  const target = g.kind === "proof" ? 2 : g.delta > 0 ? Math.min(before + 1, Math.max(before, cookCeiling(state, g.kind))) : Math.max(-1, before - 1);
  const moved = target - before;
  // La valeur stockée reste dans les 4 marches (une ancienne valeur hors bornes est ramenée).
  const stored = state.relations[COOK] ?? 0;
  if (moved !== 0 && stored !== target) state.changeTrust(COOK, target - stored);
  const noticed = Boolean(g.noticed) && moved !== 0 && r.noticed < 4;
  savePeople(state, { v: 1, steps: [...r.steps, id], noticed: r.noticed + (noticed ? 1 : 0) });
  if (noticed) peopleNotices.push("Cuisine a remarqué.");
  return { id, moved, noticed, line: g.line };
}

export function gestureDone(state: SiloState, id: string): boolean {
  return peopleRecord(state).steps.includes(id);
}

// ——— Moments clés : quand ils se déclenchent ———

export interface Where {
  /** Pièce où se tient Lou (game/level.ts), ou null. */
  room: string | null;
}

/**
 * Le moment `m` peut-il commencer ? (Les conditions de lieu fines — Cuisine arrivée à la cafétéria pour M4,
 * l'interlocuteur à qui l'on parle pour M1, M5, M6 — sont tenues par le directeur.)
 * - M1 : on frappe à la chambre froide, après la relance de la génératrice ;
 * - M2 : le circuit CONTRÔLE est rallumé (énigme 2), une fois Cuisine rencontré ou la salle de contrôle atteinte,
 *   hors de la cafétéria ;
 * - M3 : Lou repasse au hub après M1 et M2 ;
 * - M4 : juste après M3 (le commis, s'il est encore debout) ;
 * - M5 : C5 validée, on parle à Cuisine ;
 * - M6 : C4 validée, on parle à l'opératrice ;
 * - M7 : clé de l'étage 2 en main, au couloir nord.
 */
export function momentReady(m: MomentId, state: SiloState, where: Where): boolean {
  if (played(state, m)) return false;
  switch (m) {
    case "M1": return state.has("generator_powered");
    case "M2": return controlPowered(state) && (played(state, "M1") || where.room === "control" || where.room === "east") && where.room !== "cafeteria";
    case "M3": return played(state, "M1") && played(state, "M2") && where.room === "hub";
    case "M4": return played(state, "M3");
    case "M5": return played(state, "M1") && exonerated(state);
    case "M6": return played(state, "M2") && caseSolved(state);
    case "M7": return state.has("keycard") && (where.room === "north" || where.room === "stairs");
  }
}

/** Ce que Cuisine dit à Lou au départ (M7), selon sa marche ; null s'il ne l'a jamais rencontré. */
export function farewell(state: SiloState): { kind: "peaches" | "interphone" | "silence"; line: string } | null {
  if (!played(state, "M1")) return null;
  const level = cookLevel(state);
  if (level >= 2) return { kind: "peaches", line: "Reviens pas mordu, Lou. J'ai pas assez de pêches pour deux." };
  if (level === 1) return { kind: "interphone", line: "Bonne chance, le bricoleur." };
  return { kind: "silence", line: "Bon débarras, l'étranger." };
}

// ——— Fin de l'étage 1 ———

export interface FloorEnding {
  stamp: string;
  /** Lignes, dans l'ordre : résumé, radio, départ, texte canon, ligne finale. */
  lines: string[];
}

/** Texte canon de la fin de l'étage 1 (mot pour mot). */
export const CANON_ENDING = [
  "La clé glisse dans le lecteur. L'escalier de service s'ouvre sur le noir.",
  "Quelque part plus bas, le signal radio répond encore. L'étage 2 vous attend… bientôt.",
];

/** Ce que l'opératrice dit de Lou à ceux d'en bas (MEFIANCE_SURVIVANTS § 11). */
export function radioMessage(state: SiloState): string {
  const told = state.knows("m6_elle") || state.knows("m6_lou");
  if (caseSolved(state) && exonerated(state) && told) {
    return "« Il y a un garçon avec nous. Il s'appelle Lou. Il n'y est pour rien. C'est moi qui ai ouvert. »";
  }
  if (exonerated(state) && !state.knows("m6_secret")) return "« Un bricoleur est passé. Il n'y est pour rien. »";
  return "« Un étranger est entré par la porte de service… et ils se sont remis à marcher. »";
}

/**
 * La fin de l'étage 1, selon ce qui a été découvert et la confiance (HISTOIRE_PROPOSITION § 21). Décision de
 * l'auteur : on peut descendre sans avoir résolu l'affaire ; la fin le dit, sans punir.
 */
export function floorEnding(state: SiloState): FloorEnding {
  const lines: string[] = [];
  const solved = caseSolved(state);
  if (solved) lines.push("Marceau était le premier. Ils ont menti pour le cacher. Et c'est elle qui a ouvert.");
  if (state.has("comms_repaired")) {
    lines.push("À la radio, la voix d'Okafor : « Ne descendez pas. Lila, tu n'es jamais arrivée. »");
    if (played(state, "M2")) {
      lines.push("Puis des bips tapés à la main. L'opératrice traduit, lettre par lettre : « V… I… E… N… S. » Ça vient de plus bas que l'étage 2.");
      lines.push(`Derrière toi, elle parle à ceux d'en bas : ${radioMessage(state)}`);
    } else {
      lines.push("Puis des bips tapés à la main, que personne n'est là pour traduire. Ça vient de plus bas que l'étage 2.");
    }
  }
  const bye = farewell(state);
  if (bye?.kind === "peaches") lines.push(`Cuisine est là, une boîte de pêches à la main : « ${bye.line} »`);
  else if (bye?.kind === "interphone") lines.push(`À l'interphone, la voix de Cuisine : « ${bye.line} »`);
  else if (bye) lines.push(`Derrière toi, Cuisine grommelle : « ${bye.line} »`);
  lines.push(...CANON_ENDING);
  lines.push(solved
    ? "Derrière toi, à la radio, une voix commence enfin à raconter."
    : "Une question te suit dans l'escalier : qui a ouvert la chambre 1 ?");
  if (!exonerated(state) && played(state, "M3")) lines.push("Là-haut, on t'appelle encore « l'étranger ». Tu pourras remonter le leur prouver.");
  return { stamp: "ÉTAGE 1 TERMINÉ", lines };
}
