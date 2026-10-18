// Pont entre la boucle de jeu et l'interface React (useSyncExternalStore), mis à jour ~10 fois par seconde.
import type { Device } from "./input";
import type { Objective } from "./state";

export interface HudSnapshot {
  sector: string;
  objective: Objective;
  health: number;
  energy: number;
  maxEnergy: number;
  ammo: number;
  reserve: number;
  components: number;
  medkits: number;
  cells: number;
  /** 0 = D9, 1 = ARC-3. */
  weapon: 0 | 1;
  reloading: boolean;
  notice: string;
  noticeId: number;
  prompt: { name: string; action: string } | null;
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
