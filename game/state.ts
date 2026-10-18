// État d'une partie de SILLO 8 : ressources du bricoleur, carnet de notes, objectifs de l'étage 1, sauvegarde.
// Ressources : ferraille (`components`), clous (`ammo` dans le lance-clous, `reserve` dans la sacoche),
// charge des piles de la lampe (`energy`), piles de rechange (`cells`), bandages, trousses, conserves.

export type Character = string;
export type Ending = string;

/** Faits de progression de l'étage 1, dans l'ordre des objectifs. */
export const FACT_IDS = [
  "entrance_explored",
  "generator_powered",
  "hub_reached",
  "radio_module",
  "comms_repaired",
  "secret_clue",
  "secret_revealed",
  "keycard",
  "floor2",
  "arc_lock_disabled",
] as const;
export type FactId = (typeof FACT_IDS)[number];

/** Pièces nécessaires pour relancer la génératrice, et pour fabriquer le module radio. */
export const GENERATOR_PARTS = 3;
export const RADIO_PARTS = 2;
export const UPGRADE_PARTS = 3;
/** Contenance du lance-clous, et clous fabriqués avec une ferraille. */
export const NAIL_CAPACITY = 16;
export const NAILS_PER_SCRAP = 16;
export const HEAL = { bandage: 30, medkit: 60, can: 15 } as const;
/** Charge rendue par une pile de rechange. */
export const CELL_CHARGE = 40;

/** Nombre d'objectifs accomplis (0 → 5), compatible avec l'ancien « phase ». */
export const Phase = { START: 0, COMPLETE: 5 } as const;

export const SAVE_LIMIT = 65536;
export const SAVE_KEY = "sillo8-save";
export const SPAWN: [number, number, number] = [0, 0, 41];

export interface Objective {
  title: string;
  steps: { label: string; done: boolean }[];
}

export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

type Listener = () => void;

export class SiloState {
  health = 100;
  energy = 100;
  ammo = NAIL_CAPACITY;
  reserve = 16;
  components = 0;
  medkits = 0;
  bandages = 2;
  cans = 1;
  cells = 1;
  notes: string[] = [];
  upgraded = false;
  ending: Ending = "";
  collected: string[] = [];
  defeated: string[] = [];
  facts: string[] = [];
  memory: string[] = [];
  playerPosition: [number, number, number] = [...SPAWN];
  playerYaw = Math.PI;
  elapsed = 0;
  relations: Record<string, number> = {};

  private listeners = new Set<Listener>();

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Remet une partie neuve en place, en gardant les abonnés. */
  reset(): void {
    const fresh = new SiloState();
    const listeners = this.listeners;
    Object.assign(this, fresh);
    this.listeners = listeners;
    this.changed();
  }

  private changed(): void {
    for (const listener of this.listeners) listener();
  }

  has(fact: FactId): boolean {
    return this.facts.includes(fact);
  }

  /** Nombre d'objectifs accomplis. */
  get phase(): number {
    return this.objectiveChecklist().steps.filter((s) => s.done).length;
  }

  changeTrust(character: string, delta: number): boolean {
    if (!(character in this.relations) || (delta !== -1 && delta !== 1)) return false;
    this.relations[character] = clamp(this.relations[character] + delta, -5, 5);
    this.changed();
    return true;
  }

  spendEnergy(amount: number): boolean {
    if (!Number.isFinite(amount) || amount < 0 || amount > this.energy) return false;
    this.energy -= amount;
    this.changed();
    return true;
  }

  damage(amount: number): void {
    if (!Number.isFinite(amount) || amount <= 0) return;
    this.health = Math.max(0, this.health - amount);
    this.changed();
  }

  /** Soigne avec le meilleur objet adapté : bandage pour une égratignure, trousse sinon. */
  heal(): boolean {
    if (this.health >= 100 || this.health <= 0) return false;
    if (this.bandages > 0 && (this.health > 55 || this.medkits === 0)) return this.useBandage();
    return this.useMedkit();
  }

  useBandage(): boolean {
    if (this.bandages <= 0 || this.health >= 100 || this.health <= 0) return false;
    this.bandages -= 1;
    this.health = Math.min(100, this.health + HEAL.bandage);
    this.changed();
    return true;
  }

  useMedkit(): boolean {
    if (this.medkits <= 0 || this.health >= 100 || this.health <= 0) return false;
    this.medkits -= 1;
    this.health = Math.min(100, this.health + HEAL.medkit);
    this.changed();
    return true;
  }

  eatCan(): boolean {
    if (this.cans <= 0 || this.health >= 100 || this.health <= 0) return false;
    this.cans -= 1;
    this.health = Math.min(100, this.health + HEAL.can);
    this.changed();
    return true;
  }

  /** Pile de rechange dans la lampe. */
  useCell(): boolean {
    if (this.cells <= 0 || this.energy >= this.maxEnergy()) return false;
    this.cells -= 1;
    this.energy = Math.min(this.maxEnergy(), this.energy + CELL_CHARGE);
    this.changed();
    return true;
  }

  /** Atelier : une ferraille donne une poignée de clous. */
  craftNails(): boolean {
    if (this.components < 1 || this.reserve + NAILS_PER_SCRAP > 999) return false;
    this.components -= 1;
    this.reserve += NAILS_PER_SCRAP;
    this.changed();
    return true;
  }

  /** Lit une note de survivant ; `clue` débloque le mur creux des dortoirs. */
  readNote(id: string, clue = false): boolean {
    if (!validId(id)) return false;
    const fresh = !this.notes.includes(id);
    if (fresh && this.notes.length < 64) this.notes.push(id);
    if (clue) this.grant("secret_clue", "Une note parle d'un mur creux derrière les dortoirs.");
    if (fresh) this.changed();
    return fresh;
  }

  collect(id: string, kind: string, amount = 1): boolean {
    if (!validId(id) || this.collected.includes(id) || this.collected.length >= 256 || amount <= 0 || amount > 100) return false;
    switch (kind) {
      case "components":
        if (this.components + amount > 999) return false;
        this.components += amount;
        break;
      case "ammo":
        if (this.reserve + amount > 999) return false;
        this.reserve += amount;
        break;
      case "medkit":
      case "medkits":
        if (this.medkits + amount > 99) return false;
        this.medkits += amount;
        break;
      case "bandage":
        if (this.bandages + amount > 99) return false;
        this.bandages += amount;
        break;
      case "can":
        if (this.cans + amount > 99) return false;
        this.cans += amount;
        break;
      case "cell":
      case "cells":
        if (this.cells + amount > 99) return false;
        this.cells += amount;
        break;
      default:
        return false;
    }
    this.collected.push(id);
    this.changed();
    return true;
  }

  // ——— Objectifs de l'étage 1 ———

  exploreEntrance(): boolean {
    return this.grant("entrance_explored", "Le joueur a exploré l'entrée du silo.");
  }

  powerGenerator(): boolean {
    if (this.has("generator_powered") || this.components < GENERATOR_PARTS) return false;
    this.components -= GENERATOR_PARTS;
    return this.grant("generator_powered", "La génératrice tourne. Les portes de sécurité sont alimentées.");
  }

  reachHub(): boolean {
    if (!this.has("generator_powered")) return false;
    return this.grant("hub_reached", "Le joueur a atteint le hub central.");
  }

  craftRadioModule(): boolean {
    if (this.has("radio_module") || this.components < RADIO_PARTS) return false;
    this.components -= RADIO_PARTS;
    return this.grant("radio_module", "Un module radio a été fabriqué à l'atelier.");
  }

  repairComms(): boolean {
    if (this.has("comms_repaired") || !this.has("radio_module")) return false;
    return this.grant("comms_repaired", "La communication est rétablie depuis la salle de contrôle.");
  }

  /** Pousse le mur creux des dortoirs : il faut avoir lu l'indice. */
  openSecretWall(): boolean {
    if (!this.has("secret_clue")) return false;
    return this.grant("secret_revealed", "Le mur creux des dortoirs a cédé sur une pièce cachée.");
  }

  takeKeycard(): boolean {
    if (!this.has("secret_revealed")) return false;
    return this.grant("keycard", "Le joueur a récupéré la clé d'accès de l'étage 2.");
  }

  reachFloor2(): boolean {
    if (!this.has("keycard")) return false;
    return this.grant("floor2", "Le joueur a ouvert l'accès à l'étage 2.");
  }

  private grant(fact: FactId, memory: string): boolean {
    if (this.has(fact)) return false;
    this.facts.push(fact);
    this.remember(memory);
    this.changed();
    return true;
  }

  upgrade(): boolean {
    if (this.upgraded || this.components < UPGRADE_PARTS) return false;
    this.components -= UPGRADE_PARTS;
    this.upgraded = true;
    this.remember("La batterie a été améliorée à l'atelier.");
    this.changed();
    return true;
  }

  recharge(): void {
    this.energy = this.maxEnergy();
    this.changed();
  }

  maxEnergy(): number {
    return this.upgraded ? 150 : 100;
  }

  /** Un clou tiré. */
  fireRound(): boolean {
    if (this.ammo <= 0) return false;
    this.ammo -= 1;
    this.changed();
    return true;
  }

  reloadRounds(capacity = NAIL_CAPACITY): number {
    if (capacity <= 0 || capacity > NAIL_CAPACITY) return 0;
    const loaded = Math.min(Math.max(capacity - this.ammo, 0), this.reserve);
    this.ammo += loaded;
    this.reserve -= loaded;
    if (loaded > 0) this.changed();
    return loaded;
  }

  markDefeated(id: string): void {
    if (validId(id) && !this.defeated.includes(id) && this.defeated.length < 128) {
      this.defeated.push(id);
      this.changed();
    }
  }

  remember(event: string): void {
    const bounded = event.trim().slice(0, 240);
    if (!bounded || (this.memory.length > 0 && this.memory[this.memory.length - 1] === bounded)) return;
    this.memory.push(bounded);
    if (this.memory.length > 32) this.memory.shift();
    this.changed();
  }

  addFact(id: string): void {
    if ((FACT_IDS as readonly string[]).includes(id) && !this.facts.includes(id)) {
      this.facts.push(id);
      this.changed();
    }
  }

  /** Prochaine chose à faire, en une phrase. */
  objective(): string {
    if (!this.has("entrance_explored")) return "Explorer l'entrée du silo.";
    if (!this.has("generator_powered")) return `Alimenter la génératrice · ${Math.min(this.components, GENERATOR_PARTS)}/${GENERATOR_PARTS} pièces.`;
    if (!this.has("hub_reached")) return "Passer la sécurité et atteindre le hub central.";
    if (!this.has("comms_repaired")) return this.has("radio_module") ? "Installer le module radio dans la salle de contrôle." : `Fabriquer un module radio à l'atelier · ${Math.min(this.components, RADIO_PARTS)}/${RADIO_PARTS} pièces.`;
    if (!this.has("keycard")) return this.has("secret_revealed") ? "Récupérer la clé d'accès dans la pièce cachée." : this.has("secret_clue") ? "Trouver le mur creux derrière les dortoirs." : "Trouver la clé d'accès. Lisez les notes des survivants.";
    if (!this.has("floor2")) return "Ouvrir l'accès à l'étage 2.";
    return "Étage 1 terminé.";
  }

  /** Panneau « OBJECTIFS INITIAUX (ÉTAGE 1) ». */
  objectiveChecklist(): Objective {
    return {
      title: this.objective(),
      steps: [
        { label: "Explorer l'entrée", done: this.has("entrance_explored") },
        { label: "Trouver un moyen d'alimenter la génératrice", done: this.has("generator_powered") },
        { label: "Accéder au hub central", done: this.has("hub_reached") },
        { label: "Réparer la communication", done: this.has("comms_repaired") },
        { label: "Obtenir une clé d'accès pour l'étage 2", done: this.has("keycard") },
      ],
    };
  }

  saveGame(store: KeyValueStore, key = SAVE_KEY): "ok" | "invalid" | "write_failed" {
    const data = this.snapshot();
    if (!validSnapshot(data as unknown as Record<string, unknown>)) return "invalid";
    try {
      store.setItem(key, JSON.stringify(data));
      return "ok";
    } catch {
      return "write_failed";
    }
  }

  loadGame(store: KeyValueStore, key = SAVE_KEY): "ok" | "missing" | "corrupt" {
    let raw: string | null;
    try {
      raw = store.getItem(key);
    } catch {
      return "missing";
    }
    if (raw === null) return "missing";
    if (raw.length > SAVE_LIMIT) return "corrupt";
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return "corrupt";
    }
    if (!isRecord(parsed) || !validSnapshot(parsed)) return "corrupt";
    const data = parsed as unknown as Snapshot;
    this.health = data.health;
    this.energy = data.energy;
    this.ammo = data.ammo;
    this.reserve = data.reserve;
    this.components = data.components;
    this.medkits = data.medkits;
    this.bandages = data.bandages;
    this.cans = data.cans;
    this.cells = data.cells;
    this.notes = [...data.notes];
    this.upgraded = data.upgraded;
    this.collected = [...data.collected];
    this.defeated = [...data.defeated];
    this.facts = [...data.facts];
    this.memory = [...data.memory];
    this.playerPosition = [data.player_position[0], data.player_position[1], data.player_position[2]];
    this.playerYaw = data.player_yaw;
    this.elapsed = data.elapsed;
    this.ending = "";
    this.changed();
    return "ok";
  }

  snapshot(): Snapshot {
    return {
      game: "sillo8",
      schema: 2,
      health: this.health,
      energy: this.energy,
      ammo: this.ammo,
      reserve: this.reserve,
      components: this.components,
      medkits: this.medkits,
      bandages: this.bandages,
      cans: this.cans,
      cells: this.cells,
      notes: [...this.notes],
      upgraded: this.upgraded,
      collected: [...this.collected],
      defeated: [...this.defeated],
      facts: [...this.facts],
      memory: [...this.memory],
      player_position: [...this.playerPosition],
      player_yaw: this.playerYaw,
      elapsed: this.elapsed,
    };
  }
}

export interface Snapshot {
  game: string;
  schema: number;
  health: number;
  energy: number;
  ammo: number;
  reserve: number;
  components: number;
  medkits: number;
  bandages: number;
  cans: number;
  cells: number;
  notes: string[];
  upgraded: boolean;
  collected: string[];
  defeated: string[];
  facts: string[];
  memory: string[];
  player_position: number[];
  player_yaw: number;
  elapsed: number;
}

const SNAPSHOT_KEYS = Object.keys(new SiloState().snapshot());

/** Chaque fait n'est possible qu'après celui dont il dépend. */
const REQUIRES: Partial<Record<FactId, FactId>> = {
  hub_reached: "generator_powered",
  comms_repaired: "radio_module",
  secret_revealed: "secret_clue",
  keycard: "secret_revealed",
  floor2: "keycard",
};

export function validSnapshot(data: Record<string, unknown>): boolean {
  if (Object.keys(data).length !== SNAPSHOT_KEYS.length) return false;
  for (const key of SNAPSHOT_KEYS) if (!(key in data)) return false;
  const d = data as Record<string, any>;
  if (d.game !== "sillo8" || !num(d.schema, 2, 2) || typeof d.upgraded !== "boolean") return false;
  for (const key of ["ammo", "reserve", "components", "medkits", "bandages", "cans", "cells"]) {
    if (!num(d[key], 0, 999) || !Number.isInteger(d[key])) return false;
  }
  if (d.ammo > NAIL_CAPACITY || d.medkits > 99 || d.bandages > 99 || d.cans > 99 || d.cells > 99) return false;
  if (!strings(d.notes, 64, 80, true)) return false;
  if (!num(d.health, 0, 100) || !num(d.energy, 0, d.upgraded ? 150 : 100)) return false;
  if (!num(d.elapsed, 0, 31536000) || !num(d.player_yaw, -100000, 100000)) return false;
  if (!Array.isArray(d.player_position) || d.player_position.length !== 3) return false;
  for (const coord of d.player_position) if (!num(coord, -10000, 10000)) return false;
  if (!strings(d.collected, 256, 80, true) || !strings(d.defeated, 128, 80, true)) return false;
  if (!strings(d.facts, FACT_IDS.length, 80, true) || !strings(d.memory, 32, 240, false)) return false;
  for (const fact of d.facts) if (!(FACT_IDS as readonly string[]).includes(fact)) return false;
  for (const [fact, required] of Object.entries(REQUIRES)) {
    if (d.facts.includes(fact) && !d.facts.includes(required)) return false;
  }
  return true;
}

function num(value: unknown, minimum: number, maximum: number): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= minimum && value <= maximum;
}

function validId(value: string): boolean {
  return value.length > 0 && value.length <= 80;
}

function strings(value: unknown, maximum: number, lengthLimit: number, unique: boolean): boolean {
  if (!Array.isArray(value) || value.length > maximum) return false;
  const seen = new Set<string>();
  for (const item of value) {
    if (typeof item !== "string" || item.length === 0 || item.length > lengthLimit) return false;
    if (unique && seen.has(item)) return false;
    seen.add(item);
  }
  return true;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
