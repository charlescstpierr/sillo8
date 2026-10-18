// Règles de visibilité des objets et des portes, partagées par le moteur et le rendu (port de SiloWorld.refresh).
import type { Door, InteractableDef } from "./level";
import { Phase, type SiloState } from "./state";

export function interactableAvailable(def: InteractableDef, state: SiloState): boolean {
  if (def.kind) return !state.collected.includes(def.id);
  if (def.id === "relay") return state.phase >= Phase.RELAY_FOUND;
  if (def.id === "core") return state.phase < Phase.CORE_RECOVERED;
  if (def.id === "device") return !state.facts.includes("arc_lock_disabled");
  return true;
}

export function doorOpen(door: Door, state: SiloState): boolean {
  if (door.lock === "gate") return state.phase >= Phase.POWER_RESTORED;
  if (door.lock === "arc") return state.facts.includes("arc_lock_disabled");
  return true;
}
