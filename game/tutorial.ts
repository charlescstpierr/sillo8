// Tutoriel léger et aide à l'orientation, sans rendu ni navigateur (testable sous Vitest).
// - Bulles d'aide courtes, une à la fois, adaptées à l'appareil. L'enquête d'abord (se déplacer, examiner
//   une note, relire le carnet) ; le combat plus tard et brièvement, quand un zombie approche la première fois.
// - Les étapes sont des données (TUTORIAL_STEPS) : une nouvelle étape = une entrée avec sa condition
//   d'apparition (`ready`) et son action (`achieved`), plus au besoin un champ dans TutorialObservation.
// - Cible de l'objectif en cours (avec passage par la bonne porte) pour la flèche au sol.
// - Flèche discrète : en mode « auto », seulement après ~45 s sans progrès vers l'objectif courant.
// - Astuce contextuelle après ~3 min sans progrès.
import { DOORS, INTERACTABLES, roomAt, type InteractableDef, type RoomId } from "./level";
import { doorOpen, interactableAvailable } from "./rules";
import { GENERATOR_PARTS, RADIO_PARTS, type KeyValueStore, type SiloState } from "./state";

export type Device = "keyboard" | "gamepad" | "touch";

export const TUTORIAL_KEY = "sillo8-tutorial";

/** Bouton tactile vers lequel pointe la bulle (sur téléphone). */
export type TouchTarget = "stick" | "use" | "journal" | "crouch" | "fire" | "lamp";

/** Ce que le moteur observe à chaque image de jeu. */
export interface TutorialObservation {
  device: Device;
  /** Le joueur se déplace (vitesse notable). */
  moving: boolean;
  /** Touche E sur un objet (note lue, objet ramassé…). */
  interacted: boolean;
  crouched: boolean;
  /** Coup de clé ou tir. */
  struck: boolean;
  /** Éblouissement à la lampe. */
  dazzled: boolean;
  /** Carnet ou sac ouvert. */
  journalOpened: boolean;
  /** Distance à la note non lue la plus proche, en m. */
  noteDistance: number;
  /** Distance au zombie vivant le plus proche, en m. */
  zombieDistance: number;
  /** Notes lues dans la partie. */
  notesRead: number;
}

export const IDLE_OBSERVATION: TutorialObservation = {
  device: "keyboard", moving: false, interacted: false, crouched: false, struck: false, dazzled: false,
  journalOpened: false, noteDistance: Infinity, zombieDistance: Infinity, notesRead: 0,
};

/** Distances (m) qui déclenchent les bulles contextuelles. */
export const TUTORIAL_RANGE = { note: 4.5, zombieNear: 11, zombieClose: 7 };

/** Durées (secondes de jeu). */
export const TUTORIAL_TIMING = {
  /** Pause entre deux bulles. */
  gap: 1.4,
  /** Une bulle d'enquête reste au plus ce temps, puis on passe à la suivante. */
  timeout: 14,
  /** Les bulles de combat sont plus brèves. */
  combatTimeout: 7,
  /** Délai avant la toute première bulle. */
  intro: 1.2,
};

export interface StepDef {
  id: string;
  /** "inquiry" : enquête (bulle normale) ; "combat" : bulle brève. */
  kind: "inquiry" | "combat";
  /** Passe avant les étapes d'enquête quand elle est prête (danger proche). */
  urgent?: boolean;
  /** Touche (en évidence) et texte court, par appareil. */
  texts: Record<Device, [string, string]>;
  target: TouchTarget;
  /** La bulle peut apparaître (`done` : étapes déjà vues). */
  ready(o: TutorialObservation, done: ReadonlySet<string>): boolean;
  /** L'action est faite : la bulle disparaît. */
  achieved(o: TutorialObservation): boolean;
}

/** Étapes, dans l'ordre de priorité à conditions égales. */
export const TUTORIAL_STEPS: readonly StepDef[] = [
  {
    id: "move", kind: "inquiry", target: "stick",
    texts: {
      keyboard: ["ZQSD / WASD", "pour se déplacer. Maj pour courir."],
      gamepad: ["Stick gauche", "pour se déplacer."],
      touch: ["Stick", "glissez le pouce à gauche pour avancer."],
    },
    ready: () => true,
    achieved: (o) => o.moving,
  },
  {
    id: "examine", kind: "inquiry", target: "use",
    texts: {
      keyboard: ["E", "pour examiner : lisez les notes des survivants, ramassez ce qui traîne."],
      gamepad: ["A", "pour examiner : lisez les notes des survivants, ramassez ce qui traîne."],
      touch: ["✋", "pour examiner : lisez les notes, ramassez ce qui traîne."],
    },
    ready: (o, done) => done.has("move") && o.noteDistance <= TUTORIAL_RANGE.note,
    achieved: (o) => o.interacted,
  },
  {
    id: "journal", kind: "inquiry", target: "journal",
    texts: {
      keyboard: ["J", "ouvre le carnet pour relire les indices. Tab : le sac."],
      gamepad: ["Y", "ouvre le carnet pour relire les indices."],
      touch: ["CARNET", "pour relire les indices. SAC pour vos objets."],
    },
    ready: (o, done) => done.has("move") && o.notesRead > 0,
    achieved: (o) => o.journalOpened,
  },
  {
    id: "crouch", kind: "combat", urgent: true, target: "crouch",
    texts: {
      keyboard: ["Ctrl ou C", "pour s'accroupir : un zombie rôde, passez sans bruit."],
      gamepad: ["B", "pour s'accroupir : un zombie rôde, passez sans bruit."],
      touch: ["⤓", "pour s'accroupir et passer sans bruit."],
    },
    ready: (o, done) => done.has("move") && o.zombieDistance <= TUTORIAL_RANGE.zombieNear,
    achieved: (o) => o.crouched,
  },
  {
    id: "strike", kind: "combat", urgent: true, target: "fire",
    texts: {
      keyboard: ["Clic", "frappe à la clé à molette, sans bruit."],
      gamepad: ["RT", "frappe à la clé à molette, sans bruit."],
      touch: ["FRAPPER", "à la clé à molette, sans bruit."],
    },
    ready: (o, done) => done.has("crouch") && o.zombieDistance <= TUTORIAL_RANGE.zombieClose,
    achieved: (o) => o.struck,
  },
  {
    id: "dazzle", kind: "combat", urgent: true, target: "lamp",
    texts: {
      keyboard: ["Clic droit", "éblouit à la lampe : le zombie se fige."],
      gamepad: ["LT", "éblouit à la lampe : le zombie se fige."],
      touch: ["LAMPE", "éblouit : le zombie se fige."],
    },
    ready: (o, done) => done.has("strike") && o.zombieDistance <= TUTORIAL_RANGE.zombieClose,
    achieved: (o) => o.dazzled,
  },
];

export type TutorialStep = string;

export interface Bubble {
  step: TutorialStep;
  /** Touche ou bouton, affiché en évidence (ex. « E », « ZQSD / WASD »). */
  key: string;
  text: string;
  target: TouchTarget;
}

const STEP_BY_ID = new Map(TUTORIAL_STEPS.map((s) => [s.id, s]));

export function bubbleFor(step: TutorialStep, device: Device): Bubble | null {
  const def = STEP_BY_ID.get(step);
  if (!def) return null;
  const [key, text] = def.texts[device];
  return { step, key, text, target: def.target };
}

/** Étapes déjà vues, mémorisées d'une partie à l'autre (les identifiants inconnus sont ignorés). */
export function loadTutorial(store: KeyValueStore | null): TutorialStep[] {
  if (!store) return [];
  try {
    const raw = store.getItem(TUTORIAL_KEY);
    if (!raw || raw.length > 2048) return [];
    const data = JSON.parse(raw) as { done?: unknown };
    if (!Array.isArray(data.done)) return [];
    return [...new Set(data.done.filter((id): id is string => typeof id === "string" && STEP_BY_ID.has(id)))];
  } catch {
    return [];
  }
}

export function saveTutorial(store: KeyValueStore | null, done: Iterable<TutorialStep>): boolean {
  if (!store) return false;
  try {
    store.setItem(TUTORIAL_KEY, JSON.stringify({ done: [...done] }));
    return true;
  } catch {
    return false;
  }
}

/**
 * Suit les étapes : une seule bulle à la fois. Chaque bulle disparaît dès que l'action est faite,
 * ou après un délai ; dans les deux cas l'étape est notée comme vue.
 */
export class TutorialTracker {
  readonly done = new Set<TutorialStep>();
  current: TutorialStep | null = null;
  private shown = 0;
  private gap = TUTORIAL_TIMING.intro;
  private changed = false;

  constructor(done: readonly TutorialStep[] = [], private readonly steps: readonly StepDef[] = TUTORIAL_STEPS) {
    for (const step of done) this.done.add(step);
  }

  get finished(): boolean {
    return this.steps.every((step) => this.done.has(step.id));
  }

  /** Vrai une fois après chaque changement de `done` (pour sauvegarder). */
  takeChanged(): boolean {
    const changed = this.changed;
    this.changed = false;
    return changed;
  }

  /** « Revoir le tutoriel ». */
  reset(): void {
    this.done.clear();
    this.restart();
    this.changed = true;
  }

  /** Nouvelle partie : petite pause avant la première bulle. */
  restart(): void {
    this.current = null;
    this.shown = 0;
    this.gap = TUTORIAL_TIMING.intro;
  }

  complete(step: TutorialStep): void {
    if (!this.done.has(step)) {
      this.done.add(step);
      this.changed = true;
    }
    if (this.current === step) {
      this.current = null;
      this.gap = TUTORIAL_TIMING.gap;
    }
  }

  update(dt: number, o: TutorialObservation): Bubble | null {
    // Une action faite d'elle-même (avant sa bulle) compte aussi : on ne l'explique plus.
    for (const step of this.steps) {
      if (!this.done.has(step.id) && step.achieved(o)) this.complete(step.id);
    }
    if (this.current) {
      this.shown += dt;
      const kind = this.steps.find((s) => s.id === this.current)?.kind;
      if (this.shown >= (kind === "combat" ? TUTORIAL_TIMING.combatTimeout : TUTORIAL_TIMING.timeout)) this.complete(this.current);
    }
    if (!this.current) {
      this.gap = Math.max(0, this.gap - dt);
      if (this.gap > 0) return null;
      const pending = this.steps.filter((s) => !this.done.has(s.id) && s.ready(o, this.done));
      const next = pending.find((s) => s.urgent) ?? pending[0];
      if (!next) return null;
      this.current = next.id;
      this.shown = 0;
    }
    const def = this.steps.find((s) => s.id === this.current)!;
    const [key, text] = def.texts[o.device];
    return { step: def.id, key, text, target: def.target };
  }
}

// ——— Cible de l'objectif en cours ———

export interface ObjectiveTarget {
  /** Point à atteindre (porte de passage si la cible est dans une autre salle). */
  x: number;
  z: number;
  /** Cible finale. */
  goalX: number;
  goalZ: number;
  label: string;
}

const BY_ID = new Map(INTERACTABLES.map((d) => [d.id, d]));
const def = (id: string): InteractableDef => BY_ID.get(id)!;

function roomOf(x: number, z: number): RoomId | null {
  return roomAt(x, z)?.id ?? null;
}

/**
 * Premier point de passage de (x, z) vers (tx, tz) en suivant les portes ouvertes (parcours en largeur
 * sur les salles). Null si la cible est inaccessible ; la cible elle-même si elle est dans la même salle.
 */
export function waypoint(state: SiloState, x: number, z: number, tx: number, tz: number): { x: number; z: number; hops: number } | null {
  const from = roomOf(x, z);
  const to = roomOf(tx, tz);
  if (!from || !to || from === to) return { x: tx, z: tz, hops: 0 };
  const previous = new Map<RoomId, { room: RoomId; door: (typeof DOORS)[number] } | null>([[from, null]]);
  const queue: RoomId[] = [from];
  while (queue.length > 0) {
    const room = queue.shift()!;
    if (room === to) break;
    for (const door of DOORS) {
      if (!doorOpen(door, state) || !door.rooms.includes(room)) continue;
      const other = door.rooms[0] === room ? door.rooms[1] : door.rooms[0];
      if (previous.has(other)) continue;
      previous.set(other, { room, door });
      queue.push(other);
    }
  }
  if (!previous.has(to)) return null;
  let room = to;
  let hops = 0;
  let first = previous.get(room)!;
  while (first.room !== from) {
    hops += 1;
    room = first.room;
    first = previous.get(room)!;
  }
  // Grande ouverture (entre deux zones extérieures) : on vise le point de la brèche le plus proche.
  const door = first.door;
  const half = door.width > 4 ? door.width / 2 - 1 : 0;
  const px = door.axis === "x" ? clamp(x, door.x - half, door.x + half) : door.x;
  const pz = door.axis === "z" ? clamp(z, door.z - half, door.z + half) : door.z;
  return { x: px, z: pz, hops: hops + 1 };
}

/** Ferraille encore à ramasser la plus proche (et accessible). */
function nearestScrap(state: SiloState, x: number, z: number): InteractableDef | null {
  let best: InteractableDef | null = null;
  let bestDistance = Infinity;
  for (const d of INTERACTABLES) {
    if (d.kind !== "components" || !interactableAvailable(d, state)) continue;
    const route = waypoint(state, x, z, d.x, d.z);
    if (!route) continue;
    // Les détours par les portes comptent un peu.
    const distance = Math.hypot(d.x - x, d.z - z) + route.hops * 6;
    if (distance < bestDistance) {
      best = d;
      bestDistance = distance;
    }
  }
  return best;
}

/** Cible finale de l'objectif courant (state.objective()), ou null quand l'étage est terminé. */
export function objectiveGoal(state: SiloState, x: number, z: number): { x: number; z: number; label: string } | null {
  const at = (id: string, label = def(id).name) => ({ x: def(id).x, z: def(id).z, label });
  if (!state.has("entrance_explored")) return { x: 0, z: 25.5, label: "Entrée du silo" };
  if (!state.has("generator_powered")) {
    if (state.components < GENERATOR_PARTS) {
      const scrap = nearestScrap(state, x, z);
      if (scrap) return { x: scrap.x, z: scrap.z, label: "Ferraille" };
    }
    return at("generator");
  }
  if (!state.has("hub_reached")) return { x: 0, z: 0, label: "Hub central" };
  if (!state.has("comms_repaired")) {
    if (state.has("radio_module")) return at("comms");
    if (state.components < RADIO_PARTS) {
      const scrap = nearestScrap(state, x, z);
      if (scrap) return { x: scrap.x, z: scrap.z, label: "Ferraille" };
    }
    return at("workbench");
  }
  if (!state.has("keycard")) {
    if (state.has("secret_revealed")) return at("keycard");
    if (state.has("secret_clue")) return at("secret_wall");
    return at("note_storage", "Note de survivant");
  }
  if (!state.has("floor2")) return at("stairs");
  return null;
}

export function objectiveTarget(state: SiloState, x: number, z: number): ObjectiveTarget | null {
  const goal = objectiveGoal(state, x, z);
  if (!goal) return null;
  const route = waypoint(state, x, z, goal.x, goal.z) ?? { x: goal.x, z: goal.z };
  return { x: route.x, z: route.z, goalX: goal.x, goalZ: goal.z, label: goal.label };
}

// ——— Astuce si le joueur bloque ———

/** Astuce contextuelle pour l'objectif courant. */
export function stallHint(state: SiloState): string {
  if (!state.has("entrance_explored")) return "La porte de sécurité est droit devant, au nord du parking.";
  if (!state.has("generator_powered")) {
    return state.components < GENERATOR_PARTS
      ? "La ferraille se trouve dans les épaves dehors et dans la serre."
      : "La génératrice est derrière la porte de service, à l'ouest de l'entrée.";
  }
  if (!state.has("hub_reached")) return "La sécurité est ouverte : remontez vers le nord jusqu'au hub central.";
  if (!state.has("comms_repaired")) {
    if (state.has("radio_module")) return "La console radio est dans la salle de contrôle, au nord de l'aile est.";
    return state.components < RADIO_PARTS
      ? "Il reste de la ferraille dans la serre, l'atelier, la cafétéria, l'entrepôt et les dortoirs."
      : "L'établi est au fond de l'atelier, dans l'aile est.";
  }
  if (!state.has("keycard")) {
    if (state.has("secret_revealed")) return "La clé d'accès attend dans la pièce cachée, derrière le mur creux.";
    if (state.has("secret_clue")) return "Relisez le carnet : le mur creux est au fond des dortoirs, côté ouest.";
    return "Les survivants ont laissé des notes. Celle de l'entrepôt, aile ouest, parle d'une cachette.";
  }
  if (!state.has("floor2")) return "L'accès à l'étage 2 est au bout du couloir nord du hub.";
  return "";
}

export type ArrowMode = "auto" | "always" | "never";

/** Délais (secondes de jeu) de la flèche (mode auto) et de l'astuce. */
export const GUIDE_TIMING = { arrow: 45, hint: 180, hintDuration: 14 };
/** La flèche se cache quand la cible est à l'écran et plus proche que ceci (m). */
export const GUIDE_NEAR = 7;

/**
 * Surveille l'avancée vers l'objectif courant : tout changement de state.objective() (objectif atteint,
 * ferraille ramassée…) remet les compteurs à zéro.
 */
export class ObjectiveWatch {
  key = "";
  idle = 0;
  hint = "";
  private hintTime = 0;
  private hinted = false;

  reset(state: SiloState): void {
    this.key = state.objective();
    this.idle = 0;
    this.hint = "";
    this.hintTime = 0;
    this.hinted = false;
  }

  update(dt: number, state: SiloState): void {
    const key = state.objective();
    if (key !== this.key) this.reset(state);
    this.idle += dt;
    if (this.hint) {
      this.hintTime -= dt;
      if (this.hintTime <= 0) this.hint = "";
    }
    // Une astuce toutes les ~3 minutes sans progrès.
    if (!this.hinted && this.idle >= GUIDE_TIMING.hint) {
      this.hint = stallHint(state);
      this.hintTime = GUIDE_TIMING.hintDuration;
      this.hinted = true;
    } else if (this.hinted && !this.hint && this.idle >= GUIDE_TIMING.hint * 2) {
      this.idle = GUIDE_TIMING.hint;
      this.hinted = false;
    }
  }

  /** La flèche doit-elle être proposée (avant le test « cible à l'écran et proche ») ? */
  arrowWanted(mode: ArrowMode): boolean {
    if (mode === "never") return false;
    return mode === "always" || this.idle >= GUIDE_TIMING.arrow;
  }
}

/** Flèche affichée : voulue, une cible existe, et la cible n'est pas déjà à l'écran et proche. */
export function arrowVisible(wanted: boolean, distance: number, onScreen: boolean): boolean {
  return wanted && Number.isFinite(distance) && !(onScreen && distance < GUIDE_NEAR);
}

/**
 * Deux points dans la même zone : même salle, ou tous deux dehors. Un zombie derrière un mur
 * ne déclenche pas les bulles de combat.
 */
export function sameArea(x1: number, z1: number, x2: number, z2: number): boolean {
  const a = roomAt(x1, z1);
  const b = roomAt(x2, z2);
  if (!a || !b) return false;
  return a.id === b.id || (Boolean(a.outdoor) && Boolean(b.outdoor));
}

/** Distance au zombie le plus proche dans la même zone que (x, z). */
export function nearestZombie(zombies: readonly { x: number; z: number }[], x: number, z: number): number {
  let best = Infinity;
  for (const c of zombies) if (sameArea(x, z, c.x, c.z)) best = Math.min(best, Math.hypot(c.x - x, c.z - z));
  return best;
}

/** Distance à la note de survivant non lue la plus proche. */
export function nearestUnreadNote(state: SiloState, x: number, z: number): number {
  let best = Infinity;
  for (const d of INTERACTABLES) {
    if (!d.note || state.notes.includes(d.note)) continue;
    best = Math.min(best, Math.hypot(d.x - x, d.z - z) - d.radius);
  }
  return best;
}

/**
 * Le tout, pour le moteur : tutoriel mémorisé, surveillance de l'objectif, cible de la flèche.
 */
export class TutorialDirector {
  readonly tracker: TutorialTracker;
  readonly watch = new ObjectiveWatch();
  bubble: Bubble | null = null;
  target: ObjectiveTarget | null = null;
  arrowMode: ArrowMode = "auto";
  private targetClock = 0;
  private journalOpened = false;

  constructor(private readonly store: KeyValueStore | null) {
    this.tracker = new TutorialTracker(loadTutorial(store));
  }

  /** Nouvelle partie ou chargement. */
  start(state: SiloState): void {
    this.tracker.restart();
    this.watch.reset(state);
    this.bubble = null;
    this.target = null;
    this.targetClock = 0;
  }

  /** « Revoir le tutoriel » : efface les étapes vues. */
  replay(): void {
    this.tracker.reset();
    this.bubble = null;
    this.persist();
  }

  /** Carnet ou sac ouvert (hors simulation) : compté à la prochaine image de jeu. */
  markJournal(): void {
    this.journalOpened = true;
  }

  update(dt: number, state: SiloState, x: number, z: number, o: TutorialObservation): void {
    this.bubble = this.tracker.update(dt, { ...o, journalOpened: o.journalOpened || this.journalOpened });
    this.journalOpened = false;
    if (this.tracker.takeChanged()) this.persist();
    this.watch.update(dt, state);
    // La route ne change pas à chaque image : recalcul 4 fois par seconde.
    this.targetClock -= dt;
    if (this.targetClock <= 0) {
      this.targetClock = 0.25;
      this.target = objectiveTarget(state, x, z);
    }
  }

  get hint(): string {
    return this.watch.hint;
  }

  arrowWanted(): boolean {
    return this.target !== null && this.watch.arrowWanted(this.arrowMode);
  }

  private persist(): void {
    saveTutorial(this.store, [...this.tracker.done]);
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
