// Port de scripts/run_state.gd (SILO 9 : La Descente). Mêmes règles, même schéma de sauvegarde.

export const Phase = { ARRIVAL: 0, RELAY_FOUND: 1, POWER_RESTORED: 2, CORE_RECOVERED: 3, COMPLETE: 4 } as const;
export type PhaseId = (typeof Phase)[keyof typeof Phase];
export type Character = "mother" | "n7";
export type Ending = "" | Character;

export const FACT_IDS = ["relay_location", "power_restored", "core_recovered", "surface_signal", "n7_autonomy", "mother_directive", "ending_mother", "ending_n7", "arc_lock_disabled"] as const;
export type FactId = (typeof FACT_IDS)[number];
export const SAVE_LIMIT = 65536;
export const SAVE_KEY = "silo9-save";
export const SPAWN: [number, number, number] = [0, 0, 9.2];

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
  ammo = 12;
  reserve = 48;
  components = 0;
  medkits = 2;
  cells = 2;
  upgraded = false;
  phase: number = Phase.ARRIVAL;
  ending: Ending = "";
  collected: string[] = [];
  defeated: string[] = [];
  facts: string[] = [];
  memory: string[] = [];
  playerPosition: [number, number, number] = [...SPAWN];
  playerYaw = Math.PI;
  elapsed = 0;
  relations: Record<Character, number> = { mother: 0, n7: 0 };

  private listeners = new Set<Listener>();

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Remet une partie neuve en place (nouvelle descente), en gardant les abonnés. */
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

  changeTrust(character: string, delta: number): boolean {
    if (!(character === "mother" || character === "n7") || (delta !== -1 && delta !== 1)) return false;
    this.relations[character] = clamp(this.relations[character] + delta, -5, 5);
    this.remember(`Relation avec ${character} : ${delta === 1 ? "confiance renforcée" : "méfiance accrue"}.`);
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

  heal(): boolean {
    if (this.medkits <= 0 || this.health >= 100 || this.health <= 0) return false;
    this.medkits -= 1;
    this.health = Math.min(100, this.health + 45);
    this.changed();
    return true;
  }

  useCell(): boolean {
    if (this.cells <= 0 || this.energy >= this.maxEnergy()) return false;
    this.cells -= 1;
    this.energy = Math.min(this.maxEnergy(), this.energy + 60);
    this.changed();
    return true;
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

  discoverRelay(): boolean {
    if (this.phase !== Phase.ARRIVAL) return false;
    this.phase = Phase.RELAY_FOUND;
    this.addFact("relay_location");
    this.remember("SCAN ÉCHO a révélé l'accès au relais.");
    this.changed();
    return true;
  }

  repairRelay(): boolean {
    if (this.phase !== Phase.RELAY_FOUND || this.components < 3) return false;
    this.components -= 3;
    this.phase = Phase.POWER_RESTORED;
    this.addFact("power_restored");
    this.remember("Le joueur a réparé le relais.");
    this.changed();
    return true;
  }

  recoverCore(): boolean {
    if (this.phase !== Phase.POWER_RESTORED) return false;
    this.phase = Phase.CORE_RECOVERED;
    this.addFact("core_recovered");
    this.remember("Le joueur transporte le noyau de contrôle.");
    this.changed();
    return true;
  }

  chooseEnding(choice: string): boolean {
    if (this.phase !== Phase.CORE_RECOVERED || !(choice === "mother" || choice === "n7")) return false;
    this.ending = choice;
    this.phase = Phase.COMPLETE;
    this.addFact("ending_" + choice);
    this.remember("Le noyau a été confié à " + (choice === "mother" ? "MÈRE." : "N-7."));
    this.changed();
    return true;
  }

  upgrade(): boolean {
    if (this.upgraded || this.components < 3) return false;
    this.components -= 3;
    this.upgraded = true;
    this.remember("La batterie de l'ascenseur a été améliorée.");
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

  fireRound(): boolean {
    if (this.ammo <= 0) return false;
    this.ammo -= 1;
    this.changed();
    return true;
  }

  reloadRounds(capacity = 12): number {
    if (capacity <= 0 || capacity > 12) return 0;
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

  objective(): string {
    switch (this.phase) {
      case Phase.ARRIVAL: return "Explorer la maintenance. SCAN ÉCHO révèle l'accès au relais.";
      case Phase.RELAY_FOUND: return "Récupérer 3 composants et réparer le relais.";
      case Phase.POWER_RESTORED: return "Rejoindre le cœur et récupérer le noyau de contrôle.";
      case Phase.CORE_RECOVERED: return "Revenir à l'ascenseur. Choisir à qui confier le noyau.";
      default: return "Mission terminée — " + (this.ending === "mother" ? "protection de MÈRE." : "autonomie de N-7.");
    }
  }

  /** Panneau d'objectifs à cocher, dérivé de objective() et de la phase. */
  objectiveChecklist(): Objective {
    const p = this.phase;
    const steps = [
      { label: "Révéler le relais au SCAN ÉCHO", done: p >= Phase.RELAY_FOUND },
      { label: `Réparer le relais · ${Math.min(this.components, 3)}/3 composants`, done: p >= Phase.POWER_RESTORED },
      { label: "Extraire le noyau du cœur", done: p >= Phase.CORE_RECOVERED },
      { label: "Confier le noyau depuis l'ascenseur", done: p >= Phase.COMPLETE },
    ];
    if (p >= Phase.POWER_RESTORED) steps[1].label = "Réparer le relais";
    return { title: this.objective(), steps };
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
    this.cells = data.cells;
    this.upgraded = data.upgraded;
    this.phase = data.phase;
    this.ending = data.ending as Ending;
    this.collected = [...data.collected];
    this.defeated = [...data.defeated];
    this.facts = [...data.facts];
    this.memory = [...data.memory];
    this.playerPosition = [data.player_position[0], data.player_position[1], data.player_position[2]];
    this.playerYaw = data.player_yaw;
    this.elapsed = data.elapsed;
    this.relations = { mother: data.relations.mother, n7: data.relations.n7 };
    this.changed();
    return "ok";
  }

  snapshot(): Snapshot {
    return {
      schema: 2,
      relations: { ...this.relations },
      health: this.health,
      energy: this.energy,
      ammo: this.ammo,
      reserve: this.reserve,
      components: this.components,
      medkits: this.medkits,
      cells: this.cells,
      upgraded: this.upgraded,
      phase: this.phase,
      ending: this.ending,
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
  schema: number;
  relations: Record<Character, number>;
  health: number;
  energy: number;
  ammo: number;
  reserve: number;
  components: number;
  medkits: number;
  cells: number;
  upgraded: boolean;
  phase: number;
  ending: string;
  collected: string[];
  defeated: string[];
  facts: string[];
  memory: string[];
  player_position: number[];
  player_yaw: number;
  elapsed: number;
}

const SNAPSHOT_KEYS = Object.keys(new SiloState().snapshot());

export function validSnapshot(data: Record<string, unknown>): boolean {
  if (Object.keys(data).length !== SNAPSHOT_KEYS.length) return false;
  for (const key of SNAPSHOT_KEYS) if (!(key in data)) return false;
  const d = data as Record<string, any>;
  if (!num(d.schema, 2, 2) || typeof d.upgraded !== "boolean" || typeof d.ending !== "string") return false;
  if (!isRecord(d.relations) || Object.keys(d.relations).length !== 2) return false;
  for (const character of ["mother", "n7"]) {
    if (!num(d.relations[character], -5, 5) || !Number.isInteger(d.relations[character])) return false;
  }
  for (const key of ["ammo", "reserve", "components", "medkits", "cells", "phase"]) {
    if (!num(d[key], 0, 999) || !Number.isInteger(d[key])) return false;
  }
  if (d.ammo > 12 || d.medkits > 99 || d.cells > 99 || d.phase > 4) return false;
  if (!num(d.health, 0, 100) || !num(d.energy, 0, d.upgraded ? 150 : 100)) return false;
  if (!num(d.elapsed, 0, 31536000) || !num(d.player_yaw, -100000, 100000)) return false;
  if (!Array.isArray(d.player_position) || d.player_position.length !== 3) return false;
  for (const coord of d.player_position) if (!num(coord, -10000, 10000)) return false;
  if (!strings(d.collected, 256, 80, true) || !strings(d.defeated, 128, 80, true)) return false;
  if (!strings(d.facts, FACT_IDS.length, 80, true) || !strings(d.memory, 32, 240, false)) return false;
  for (const fact of d.facts) if (!(FACT_IDS as readonly string[]).includes(fact)) return false;
  const progression = ["relay_location", "power_restored", "core_recovered"];
  for (let i = 0; i < progression.length; i++) {
    if (d.facts.includes(progression[i]) !== d.phase >= i + 1) return false;
  }
  if (d.phase === Phase.COMPLETE) {
    if (!(d.ending === "mother" || d.ending === "n7") || !d.facts.includes("ending_" + d.ending)) return false;
  } else if (d.ending !== "") return false;
  for (const choice of ["mother", "n7"]) {
    if (d.facts.includes("ending_" + choice) !== (d.ending === choice)) return false;
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
