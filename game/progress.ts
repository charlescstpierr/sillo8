// Progression de l'étage 1, sans rendu : ce que fait la touche E sur chaque objet, et les objectifs
// déclenchés en se déplaçant. Le moteur fournit les effets (messages, tremblement, fiches).
import { ENTRANCE_TRIGGER, roomAt, type InteractableDef, type InteractableKind } from "./level";
import { NOTES } from "./notes";
import { GENERATOR_PARTS, NAILS_PER_SCRAP, RADIO_PARTS, UPGRADE_PARTS, type SiloState } from "./state";

export interface ProgressEffects {
  notify(text: string): void;
  /** Le décor tremble et les lampes vacillent (génératrice, mur creux). */
  shudder(): void;
  /** Ouvre la fiche de lecture d'une note. */
  showNote(id: string): void;
  /** Fin de l'étage 1 : l'accès à l'étage 2 est ouvert. */
  floor2(): void;
}

const PICKUP: Record<Exclude<InteractableKind, "components" | "ammo">, string> = {
  cell: "Pile de rechange récupérée.",
  medkit: "Trousse de soins récupérée.",
  bandage: "Bandage récupéré.",
  can: "Conserve récupérée.",
};

/** Action de la touche E sur un objet disponible. Vrai si l'état a changé. */
export function interactWith(def: InteractableDef, s: SiloState, fx: ProgressEffects): boolean {
  if (def.kind) {
    const amount = def.amount ?? 1;
    if (!s.collect(def.id, def.kind, amount)) {
      fx.notify("Sacoche pleine.");
      return false;
    }
    if (def.kind === "components") fx.notify(`Ferraille récupérée · ${s.components} en poche.`);
    else if (def.kind === "ammo") fx.notify(`+${amount} clous · réserve ${s.reserve}.`);
    else fx.notify(PICKUP[def.kind]);
    return true;
  }
  if (def.note) {
    const note = NOTES[def.note];
    if (!note) return false;
    const hadClue = s.has("secret_clue");
    const fresh = s.readNote(note.id, note.clue ?? false);
    fx.showNote(note.id);
    if (!hadClue && s.has("secret_clue")) fx.notify("Nouvel indice noté au carnet : un mur creux au fond des dortoirs.");
    else if (fresh) fx.notify("Note ajoutée au carnet.");
    return fresh;
  }
  switch (def.id) {
    case "security_door":
      fx.notify("Hors tension. Relancez la génératrice : porte de service à l'ouest de l'entrée.");
      return false;
    case "generator":
      if (s.powerGenerator()) {
        fx.shudder();
        fx.notify("La génératrice tousse… puis tourne. Les portes de sécurité s'ouvrent.");
        return true;
      }
      fx.notify(`Il manque des pièces : ${Math.min(s.components, GENERATOR_PARTS)}/${GENERATOR_PARTS} ferrailles. Fouillez dehors.`);
      return false;
    case "workbench":
      if (s.craftRadioModule()) {
        fx.notify("Module radio bricolé. Direction la salle de contrôle.");
        return true;
      }
      fx.notify(`L'établi demande ${RADIO_PARTS} ferrailles (${s.components} en poche).`);
      return false;
    case "nail_press":
      if (s.craftNails()) {
        fx.notify(`Presse à clous : +${NAILS_PER_SCRAP} clous · réserve ${s.reserve}.`);
        return true;
      }
      fx.notify(s.components < 1 ? "La presse demande une ferraille." : "Sacoche pleine de clous.");
      return false;
    case "upgrade":
      if (s.upgrade()) {
        fx.notify("Lampe améliorée : charge 150.");
        return true;
      }
      fx.notify(`Le banc demande ${UPGRADE_PARTS} ferrailles (${s.components} en poche).`);
      return false;
    case "comms":
      if (s.repairComms()) {
        fx.notify("Communication rétablie. Une voix grésille… quelque part plus bas.");
        return true;
      }
      fx.notify("La console radio est muette. Il faut un module radio : établi de l'atelier.");
      return false;
    case "secret_wall":
      if (s.openSecretWall()) {
        fx.shudder();
        fx.notify("Le mur creux cède sous l'épaule. Une pièce cachée !");
        return true;
      }
      fx.notify("Un mur comme les autres.");
      return false;
    case "keycard":
      if (s.takeKeycard()) {
        fx.notify("Clé d'accès de l'étage 2 récupérée.");
        return true;
      }
      return false;
    case "stairs":
      if (s.reachFloor2() || s.has("floor2")) {
        fx.floor2();
        return true;
      }
      fx.notify("Accès verrouillé. Il faut une clé d'accès.");
      return false;
    case "recharge":
      s.recharge();
      fx.notify("Lampe rechargée.");
      return true;
    default:
      return false;
  }
}

/** Objectifs déclenchés en se déplaçant (entrée, hub), et pièces visitées pour le plan. Retourne les messages à afficher. */
export function checkTriggers(s: SiloState, x: number, z: number): string[] {
  const messages: string[] = [];
  const room = roomAt(x, z);
  if (room) s.visitRoom(room.id);
  if (!s.has("entrance_explored") && Math.hypot(x - ENTRANCE_TRIGGER.x, z - ENTRANCE_TRIGGER.z) < ENTRANCE_TRIGGER.radius && s.exploreEntrance()) {
    messages.push("La porte de sécurité est morte. Plus de courant. La génératrice doit être à l'ouest.");
  }
  if (!s.has("hub_reached") && room?.id === "hub" && s.reachHub()) {
    messages.push("HUB CENTRAL. Toutes les ailes partent d'ici. La console radio est en salle de contrôle.");
  }
  return messages;
}
