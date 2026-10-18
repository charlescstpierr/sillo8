// Règles de visibilité des objets et d'ouverture des portes, partagées par le moteur et le rendu.
import type { Door, InteractableDef } from "./level";
import type { SiloState } from "./state";

export function interactableAvailable(def: InteractableDef, state: SiloState): boolean {
  if (def.kind) return !state.collected.includes(def.id);
  if (def.note) return true;
  switch (def.id) {
    case "security_door": return !state.has("generator_powered");
    case "generator": return !state.has("generator_powered");
    case "workbench": return !state.has("radio_module");
    case "upgrade": return !state.upgraded;
    case "comms": return !state.has("comms_repaired");
    case "secret_wall": return state.has("secret_clue") && !state.has("secret_revealed");
    case "keycard": return state.has("secret_revealed") && !state.has("keycard");
    default: return true;
  }
}

/** Texte d'action affiché sur l'objet visé, selon l'état (ex. borne vide). */
export function actionLabel(def: InteractableDef, state: SiloState): string {
  if (def.id === "recharge" && state.rechargeSpent) return "Vide · se recharge quand vous partez";
  return def.action;
}

export function doorOpen(door: Door, state: SiloState): boolean {
  switch (door.lock) {
    case "power": return state.has("generator_powered");
    case "key": return state.has("keycard");
    case "secret": return state.has("secret_revealed");
    default: return true;
  }
}
