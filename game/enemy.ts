// Zombies : implémentation à venir (sous-agent « zombies »). Ce module expose createHorde().
import { Group } from "three";
import type { Horde } from "./types";
import type { SiloState } from "./state";

export function createHorde(state: SiloState): Horde {
  void state;
  const root = new Group();
  return {
    root,
    update() {},
    hearNoise() {},
    aimCandidates: () => [],
    raycast: () => null,
    damage() {},
    sync() {},
    setLowQuality() {},
  };
}
