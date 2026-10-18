// Pont entre la boucle de jeu et l'interface React (useSyncExternalStore), mis à jour ~10 fois par seconde.
import type { Device } from "./input";
import type { Objective } from "./state";
import type { Bubble } from "./tutorial";

export interface HudSnapshot {
  sector: string;
  objective: Objective;
  health: number;
  /** Charge de la lampe (0 → maxEnergy : 100, 150 après amélioration). */
  energy: number;
  maxEnergy: number;
  /** Clous dans le lance-clous (chargeur de NAIL_CAPACITY) et dans la sacoche. */
  ammo: number;
  reserve: number;
  /** Ferraille. */
  components: number;
  medkits: number;
  bandages: number;
  cans: number;
  /** Piles de rechange pour la lampe. */
  cells: number;
  /** Notes de survivants lues (carnet). */
  notesCount: number;
  /** 0 = clé à molette, 1 = lance-clous. */
  weapon: 0 | 1;
  /** Rechargement du lance-clous en cours. */
  reloading: boolean;
  /** Vrai quand la lampe peut éblouir (charge suffisante et cadence écoulée). */
  lightReady: boolean;
  /** Vrai pendant un court instant après une sauvegarde automatique. */
  autosaved: boolean;
  notice: string;
  noticeId: number;
  prompt: { name: string; action: string } | null;
  /** Bulle d'aide du tutoriel en cours, ou null. */
  tutorial: Bubble | null;
  /** Astuce quand l'objectif n'avance plus depuis longtemps ("" sinon). */
  hint: string;
  device: Device;
  paused: boolean;
  fps: number;
  showPerf: boolean;
}

export class HudStore {
  private snapshot: HudSnapshot;
  private listeners = new Set<() => void>();

  constructor(initial: HudSnapshot) {
    this.snapshot = initial;
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  get = (): HudSnapshot => this.snapshot;

  set(next: HudSnapshot): void {
    if (shallowEqual(this.snapshot, next)) return;
    this.snapshot = next;
    for (const listener of this.listeners) listener();
  }
}

function shallowEqual(a: HudSnapshot, b: HudSnapshot): boolean {
  for (const key of Object.keys(a) as (keyof HudSnapshot)[]) {
    const va = a[key];
    const vb = b[key];
    if (va === vb) continue;
    if (typeof va === "object" && typeof vb === "object" && JSON.stringify(va) === JSON.stringify(vb)) continue;
    return false;
  }
  return true;
}
