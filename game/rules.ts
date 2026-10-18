// Règles de visibilité des objets et d'ouverture des portes, partagées par le moteur et le rendu.
import type { Door, InteractableDef } from "./level";
import type { SiloState } from "./state";

export function interactableAvailable(def: InteractableDef, state: SiloState): boolean {
  if (def.kind) return !state.collected.includes(def.id);
  switch (def.id) {
    case "security_door": return !state.has("generator_powered");
    case "generator": return !state.has("generator_powered");
    case "workbench": return !state.has("radio_module");
    case "upgrade": return !state.upgraded;
    case "comms": return !state.has("comms_repaired");
    case "keycard": return state.has("secret_revealed") && !state.has("keycard");
    case "device": return !state.has("arc_lock_disabled");
    default: return true;
  }
}

export function doorOpen(door: Door, state: SiloState): boolean {
  switch (door.lock) {
    case "power": return state.has("generator_powered");
    case "key": return state.has("keycard");
    case "secret": return state.has("secret_revealed");
    case "arc": return state.has("arc_lock_disabled");
    default: return true;
  }
}
