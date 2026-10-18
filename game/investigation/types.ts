// Modèle de données de l'enquête (tableau, gros plans, pensées, lampe UV, événements, déductions).
// Tout le contenu d'un étage est un objet `InvestigationContent` (voir content/floor1.ts) : un agent de
// contenu ajoute des cartes, objets, traces, pensées et déductions SANS toucher au code.
//
// Règles d'écriture (docs/HISTOIRE_PROPOSITION.md, docs/MEFIANCE_SURVIVANTS.md) :
// - les textes viennent mot pour mot des documents d'histoire ; 5 lignes au plus par carte ;
// - les pensées de Lou peuvent se taire (bulle « … », champ `text` absent), jamais mentir au joueur ;
// - une erreur au tableau ne punit jamais : elle donne une pensée ;
// - chaque phrase à trous obligatoire demande au moins 3 indices (`minClues` ≥ 3) ;
// - l'aide a trois paliers : orienter, pointer, relier ; jamais la phrase complète.
import type { RoomId } from "../level";

/** Identifiant court (lettres, chiffres, « _ »), ≤ 40 caractères. Reprendre ceux des documents (a15, c1, X1, C1…). */
export type Id = string;

/** Point du plan, en mètres : [x, z] (le nord est −Z). */
export type Point = [number, number];

// ——— Conditions ———

/** Toutes les listes données doivent être satisfaites (ET). Une condition vide est toujours vraie. */
export interface Condition {
  /** Cartes obtenues. */
  cards?: Id[];
  /** Au moins une de ces cartes. */
  anyCards?: Id[];
  /** Déductions faites (contradictions ou phrases). */
  deductions?: Id[];
  /** Traces UV vues. */
  traces?: Id[];
  /** Déblocages obtenus, sous la forme « type:id » (ex. « examinable:okafor_drawer »). */
  unlocked?: string[];
  /**
   * Faits de progression de l'étage (FACT_IDS de game/state.ts, ex. « generator_powered »), ou faits posés par
   * les conversations (state.flags, ex. « m1 »).
   */
  facts?: string[];
  /** Au moins un de ces faits. */
  anyFacts?: string[];
}

// ——— Cartes du carnet ———

export type CardIcon = "note" | "poster" | "photo" | "object" | "trace" | "audio" | "chalk";

/** Une carte d'indice : ce que le carnet range au tableau d'enquête. */
export interface Card {
  id: Id;
  /** Titre court, affiché sur la carte. */
  title: string;
  /** Texte court (≤ 5 lignes), mot pour mot. */
  text: string;
  /** Provenance : signature, objet, trace (« Sgt. Bérard, poste d'entrée », « Lampe UV »…). */
  source: string;
  /** Pièce où on la trouve (plan et tri). */
  room: RoomId;
  icon: CardIcon;
  /** Question ouverte sous laquelle la carte est rangée au tableau (Question.id). */
  question: Id;
  /** Mots que la carte ajoute à la banque des phrases à trous (ex. « la porte de service »). */
  words?: string[];
  /**
   * Note canon de game/notes.ts dont la lecture donne aussi cette carte (même texte, mot pour mot).
   * Ex. `note: "note_generator"`.
   */
  note?: string;
  /** Illustration facultative : nom d'un dessin du registre `ui/inquiry/art.tsx`. */
  image?: string;
  /**
   * Vrai : obtenir la carte pose aussi le fait `card.<id>` (state.flags), lisible par les conversations
   * (ex. « Si Lou porte la lanterne de Lila »).
   */
  flag?: boolean;
}

/** Question ouverte du tableau : les cartes y sont rangées. */
export interface Question {
  id: Id;
  title: string;
  /** Couche de l'enquête (1 à 3), pour l'ordre d'affichage. */
  layer: number;
  /** Indice dormant (colonne « Questions sans réponse »), qui ne se résout pas à cet étage. */
  dormant?: boolean;
  /** La question apparaît quand… (par défaut : dès qu'une de ses cartes est connue). */
  requires?: Condition;
}

// ——— Objets examinables et gros plans ———

/** Forme de l'objet dans le décor (rendu game/render/uv.ts → marqueurs d'enquête). */
export type MarkerShape = "poster" | "photo" | "step" | "drawer" | "sheet" | "plaque" | "bolts" | "lantern" | "levers" | "terminal" | "locker" | "lamp";

export interface WorldMarker {
  shape: MarkerShape;
  /** Orientation (radians, autour de Y). 0 : la face regarde vers +Z (le sud, le bas de l'écran). */
  yaw?: number;
  /** Hauteur de pose (m) pour les affiches et plaques. */
  y?: number;
  /** Mot écrit sur l'affiche ou la plaque, lisible de loin. */
  label?: string;
}

/** Une face du gros plan : un dessin du registre et/ou quelques lignes de texte. */
export interface Face {
  /** Nom d'un dessin du registre `ui/inquiry/art.tsx` (« inauguration », « threshold », « sheet »…). */
  art?: string;
  /** Lignes écrites sur la face (document), mot pour mot. */
  lines?: string[];
}

/**
 * Comment le détail caché se révèle :
 * - `angle` : en tournant l'objet ; l'angle absolu (en degrés) sur l'axe choisi doit rester entre `min` et `max`
 *   (yaw 180 = verso ; pitch 60 = lumière rasante) ;
 * - `loupe` : en promenant la loupe sur un point de la face (coordonnées 0 → 1 depuis le coin haut gauche).
 */
export type Reveal =
  | { by: "angle"; axis: "yaw" | "pitch"; min: number; max: number }
  | { by: "loupe"; face: "front" | "back"; x: number; y: number; radius: number };

export interface HiddenDetail {
  reveal: Reveal;
  /** Ce que le joueur découvre (phrase affichée sous l'objet), mot pour mot. */
  text: string;
  /** Carte gagnée. */
  card?: Id;
  /** Pensée déclenchée. */
  thought?: Id;
  /** Consigne affichée tant que le détail est caché (« Retournez la photo »). */
  cue: string;
}

export interface Closeup {
  /** Ce qu'on voit au premier regard (doc § 12 a). */
  glance: string;
  front: Face;
  back?: Face;
  /** Proportions de l'objet à l'écran (largeur / hauteur). */
  aspect: number;
  /** Détails cachés (un ou plusieurs), révélés en tournant ou à la loupe. */
  details?: HiddenDetail[];
}

export interface Examinable {
  id: Id;
  /** Nom dans l'infobulle. */
  name: string;
  /** Verbe de l'infobulle (« Examiner », « Lire », « Ouvrir »). */
  action: string;
  room: RoomId;
  x: number;
  z: number;
  /** Rayon d'approche (m). */
  radius: number;
  marker: WorldMarker;
  closeup: Closeup;
  /** Carte gagnée dès l'ouverture du gros plan (document lisible tout de suite). */
  card?: Id;
  /** L'objet n'existe dans le monde qu'à cette condition. */
  requires?: Condition;
  /** Visible mais verrouillé tant que la condition n'est pas remplie ; `message` s'affiche en avis. */
  locked?: { until: Condition; message: string };
  /**
   * Objet porté par un mordu (identifiant de ENEMIES, game/level.ts) : examinable seulement quand ce mordu est figé
   * par la lampe (de loin, rayon `radius`) ou abattu (l'objet reste au sol, là où il est tombé). Si le mordu n'existe
   * pas dans le monde, l'objet reste posé à (x, z).
   */
  carrier?: Id;
  /** Objet de la sacoche de Lou : pas dans le monde, examiné depuis le sac. */
  carried?: boolean;
  /** Énigme jouée dans le gros plan (Puzzle.id). */
  puzzle?: Id;
}

// ——— Énigmes ———

/**
 * Énigme pilotée par des données, jouée dans le gros plan d'un objet :
 * - `letters` : cadenas à molettes de lettres (`answer` : le mot, une molette par lettre) ;
 * - `password` : clavier à lettres (`answer` : le mot) ;
 * - `levers` : leviers à abaisser dans l'ordre (`options` : étiquettes, `answer` : ordre attendu).
 * Les accents et la casse ne comptent pas.
 */
export interface Puzzle {
  id: Id;
  kind: "letters" | "password" | "levers";
  /** Consigne affichée au-dessus de l'énigme. */
  prompt: string;
  answer: string[];
  /** Leviers : étiquettes, dans l'ordre d'affichage. */
  options?: string[];
  /** Pensée de Lou pour une mauvaise réponse quelconque. */
  error: string;
  /** Mauvaises réponses prévues, avec leur pensée (ex. GUETTEUR). */
  wrongs?: { answer: string; text: string }[];
  /** Ce qui se passe en cas d'erreur (bruit du disjoncteur…), en plus de la pensée. */
  onError?: EventAction[];
  /** Ce qui se passe à la réussite (avis, sons). */
  onSolve?: EventAction[];
  /** Ce que l'énigme ouvre (cartes, faits…). Le fait `puzzle_<id>` est toujours posé dans state.flags. */
  unlocks: Unlock[];
  /** Objets donnés à la réussite (piles, trousse…). */
  items?: { kind: "cell" | "medkit" | "bandage" | "can" | "ammo"; amount: number }[];
  /** Ligne affichée une fois l'énigme résolue. */
  solved: string;
}

// ——— Pensées de Lou ———

export type Trigger =
  /** Entrer dans une pièce. */
  | { on: "enter"; room: RoomId }
  /** S'approcher d'un point. */
  | { on: "near"; x: number; z: number; radius: number }
  /** Ouvrir le gros plan d'un objet. */
  | { on: "examine"; examinable: Id }
  /** Révéler le détail caché d'un objet. */
  | { on: "reveal"; examinable: Id }
  /** Voir une trace à la lampe UV. */
  | { on: "uv"; trace: Id }
  /** Obtenir une carte. */
  | { on: "card"; card: Id }
  /** Réussir une déduction. */
  | { on: "deduction"; deduction: Id }
  /** Un fait devient vrai (objectif, fait de conversation, énigme résolue « puzzle_<id> »). */
  | { on: "fact"; fact: string }
  /** S'approcher d'un mordu vivant (identifiant de ENEMIES). */
  | { on: "nearEnemy"; enemy: Id; radius: number }
  /** Une phrase à trous est prête : visible, avec assez d'indices (« Défi au joueur »). */
  | { on: "ready"; deduction: Id }
  /** Seulement appelée par une autre pensée (`then`) ou un événement. */
  | { on: "chain" };

export interface Thought {
  id: Id;
  /**
   * Ce que pense Lou. ABSENT = Lou se tait : la bulle montre « … ».
   * Règle : une pensée peut se taire, jamais mentir au joueur.
   */
  text?: string;
  trigger: Trigger;
  requires?: Condition;
  /** Pensée enchaînée juste après. */
  then?: Id;
  /** Carte gagnée quand la pensée vient (ex. la craie sur la porte, remarquée en passant). */
  card?: Id;
}

// ——— Décor d'enquête ———

/**
 * Petit élément de décor nécessaire à l'enquête, en attendant le décor définitif (game/render/sectors) :
 * armoire déplacée, raclures, craie sur une porte.
 */
export type Prop =
  | { id: Id; kind: "cabinet"; x: number; z: number; yaw: number }
  | { id: Id; kind: "scrapes"; x: number; z: number; yaw: number }
  | { id: Id; kind: "chalk"; x: number; z: number; y: number; yaw: number; text: string };

// ——— Lampe UV ———

export type TraceShape =
  /** Traînée luisante (bave de mordu) le long d'un trajet. */
  | { kind: "trail"; points: Point[]; width?: number }
  /** Empreintes (pas) le long d'un trajet. */
  | { kind: "prints"; points: Point[] }
  /** Tampon invisible sur un mur ou un papier. */
  | { kind: "stamp"; x: number; z: number; y: number; text: string; yaw: number }
  /** Rien ne luit : la lampe montre l'absence de trace (un cercle pointillé). */
  | { kind: "none"; x: number; z: number; radius: number };

export interface UvTrace {
  id: Id;
  room: RoomId;
  shape: TraceShape;
  /** Ce qui est révélé (doc § 12 c, colonne « Révélé »). */
  text: string;
  /** Carte gagnée en la voyant. */
  card?: Id;
  thought?: Id;
  requires?: Condition;
}

// ——— Événements étranges ———

export type EventAction =
  /** Lueur au loin (couleur CSS), quelques secondes. */
  | { do: "light"; x: number; z: number; y?: number; color: string; duration: number; delay?: number }
  /** Bruit nommé de game/audio.ts (`audio.cue`), placé ou lointain. */
  | { do: "sound"; cue: string; x?: number; z?: number; delay?: number }
  /** Silhouette sombre qui passe au loin. */
  | { do: "silhouette"; x: number; z: number; toX: number; toZ: number; duration: number; delay?: number }
  /** Ligne affichée en avis (paroles à la radio, sous-titre). */
  | { do: "notice"; text: string; delay?: number }
  | { do: "thought"; thought: Id; delay?: number }
  /** Carte donnée (paroles entendues, enregistrement). */
  | { do: "card"; card: Id; delay?: number }
  /** Bruit qui attire les mordus du rayon (disjoncteur…). */
  | { do: "noise"; x: number; z: number; radius: number; delay?: number };

export interface StrangeEvent {
  id: Id;
  trigger: Trigger;
  requires?: Condition;
  actions: EventAction[];
}

// ——— Déductions ———

/** Ce qu'une déduction ouvre. */
export type Unlock =
  /** Fait d'enquête (lu par d'autres systèmes : dialogues, fin d'étage). */
  | { kind: "fact"; id: Id }
  /** Mot ajouté à la banque. */
  | { kind: "word"; word: string }
  /** Carte donnée directement. */
  | { kind: "card"; card: Id }
  /** Objet examinable déverrouillé (tiroir, casier, armoire). */
  | { kind: "examinable"; id: Id }
  /** Porte de game/level.ts (verrou « inquiry »). */
  | { kind: "door"; id: Id }
  /** Sujet de dialogue rendu disponible. */
  | { kind: "dialogue"; id: Id }
  /** Pensée de Lou. */
  | { kind: "thought"; id: Id };

/** Les trois paliers de l'aide : orienter, pointer, relier. */
export type Hints = [orient: string, point: string, link: string];

interface DeductionBase {
  id: Id;
  /** Libellé court (tableau, aide). */
  title: string;
  /** Question du tableau où la déduction s'affiche. */
  question: Id;
  /** La déduction (contradiction) ou phrase n'apparaît qu'à cette condition. */
  requires?: Condition;
  unlocks: Unlock[];
  hints: Hints;
}

/** « Ça ne colle pas » : relier deux cartes. */
export interface Contradiction extends DeductionBase {
  kind: "contradiction";
  /** Paires acceptées (dans n'importe quel ordre). */
  pairs: [Id, Id][];
  /** La conclusion affichée sur le fil rouge. */
  text: string;
}

/**
 * Phrase à trous : les réponses sont entre crochets dans `text`, variantes séparées par « | ».
 * Ex. « Le premier est sorti de [la chambre 1], à [l'infirmerie]. »
 */
export interface Sentence extends DeductionBase {
  kind: "sentence";
  text: string;
  /** Cartes qui soutiennent la phrase (fair-play : dans au moins deux pièces). */
  clues: Id[];
  /** Nombre minimal de ces cartes avant de pouvoir valider (≥ 3). */
  minClues: number;
}

export type Deduction = Contradiction | Sentence;

/** Pensée précise quand le joueur se trompe d'une certaine façon (une erreur ne punit jamais). */
export interface ErrorThought {
  /** Contradiction : cette paire de cartes (n'importe quel ordre). */
  cards?: [Id, Id];
  /** Phrase à trous : cette phrase… */
  deduction?: Id;
  /** …avec ce mot dans une case (n'importe laquelle, ou la case `slot`, comptée depuis 0). */
  word?: string;
  slot?: number;
  text: string;
}

/** Pensées génériques du tableau. */
export interface GenericThoughts {
  /** Deux cartes qui ne se contredisent pas (au hasard). */
  wrong: string[];
  /** Une ou deux cases fausses. */
  almost: string;
  /** Pas assez d'indices pour valider la phrase. */
  tooFew: string;
  /** Contradiction déjà établie. */
  already: string;
}

/** Tout le contenu d'enquête d'un étage. */
export interface InvestigationContent {
  floor: number;
  questions: Question[];
  cards: Card[];
  examinables: Examinable[];
  thoughts: Thought[];
  traces: UvTrace[];
  events: StrangeEvent[];
  deductions: Deduction[];
  errors: ErrorThought[];
  generic: GenericThoughts;
  props: Prop[];
  puzzles: Puzzle[];
}
