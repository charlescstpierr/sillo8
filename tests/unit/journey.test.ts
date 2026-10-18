// L'étage 1 joué de bout en bout, sans rendu : le bricoleur marche entre les vrais murs et les portes
// (verrouillées tant que l'état ne les ouvre pas), ramasse, lit, pousse, bricole, puis prend l'escalier.
import { describe, expect, it } from "vitest";
import type { Box } from "@/game/collision";
import { DOORS, INTERACTABLES, SPAWN, buildWalls, doorBox, roomAt, wallBox, type InteractableDef } from "@/game/level";
import { PlayerController } from "@/game/player";
import { RECHARGE_SPENT, checkTriggers, interactWith, type ProgressEffects } from "@/game/progress";
import { actionLabel, doorOpen, interactableAvailable } from "@/game/rules";
import { SiloState } from "@/game/state";

const walls = buildWalls().map(wallBox);
/** Distance d'approche du moteur (REACH) en plus du rayon de l'objet. */
const REACH = 1.1;

/** Colliders comme world.refresh : murs, portes fermées, objets massifs encore présents. */
function colliders(state: SiloState): Box[] {
  const boxes = [...walls, ...DOORS.filter((d) => !doorOpen(d, state)).map(doorBox)];
  for (const def of INTERACTABLES) {
    if ((def.solid ?? !def.kind) && interactableAvailable(def, state)) {
      boxes.push({ minX: def.x - def.radius, maxX: def.x + def.radius, minZ: def.z - def.radius * 0.8, maxZ: def.z + def.radius * 0.8 });
    }
  }
  return boxes;
}

function journey() {
  const state = new SiloState();
  const player = new PlayerController(SPAWN.x, SPAWN.z, SPAWN.yaw);
  const log: string[] = [];
  const opened: string[] = [];
  let floor2 = false;
  const fx: ProgressEffects = {
    notify: (text) => log.push(text),
    shudder: () => log.push("<tremblement>"),
    showNote: (id) => opened.push(id),
    floor2: () => { floor2 = true; },
  };

  /** Marche vers (x, z) en ligne droite ; vrai si le point est atteint (à 0,2 m) en moins de 30 s. */
  function walkTo(x: number, z: number): boolean {
    for (let frame = 0; frame < 30 * 60; frame++) {
      const dx = x - player.x;
      const dz = z - player.z;
      const distance = Math.hypot(dx, dz);
      if (distance < 0.2) return true;
      const scale = Math.min(1, distance / 0.6) / distance;
      player.update(1 / 60, { x: dx * scale, z: dz * scale, sprint: true, crouch: false, aimYaw: null }, colliders(state));
      for (const message of checkTriggers(state, player.x, player.z)) log.push(message);
    }
    return false;
  }

  function path(...points: [number, number][]): void {
    for (const [x, z] of points) expect(walkTo(x, z), `vers ${x}, ${z} depuis ${player.x.toFixed(2)}, ${player.z.toFixed(2)}`).toBe(true);
  }

  /** E sur un objet : il doit être disponible et à portée, comme dans le moteur. */
  function use(id: string): boolean {
    const def = INTERACTABLES.find((d) => d.id === id) as InteractableDef;
    expect(interactableAvailable(def, state), `${id} disponible`).toBe(true);
    expect(Math.hypot(def.x - player.x, def.z - player.z) - def.radius, `${id} à portée`).toBeLessThanOrEqual(REACH);
    return interactWith(def, state, fx);
  }

  /** Vrai si l'on peut marcher de (ax, az) à (bx, bz) sans buter (essai sur un joueur fantôme). */
  function passable(ax: number, az: number, bx: number, bz: number): boolean {
    const ghost = new PlayerController(ax, az, 0);
    for (let frame = 0; frame < 20 * 60; frame++) {
      const dx = bx - ghost.x;
      const dz = bz - ghost.z;
      const distance = Math.hypot(dx, dz);
      if (distance < 0.2) return true;
      ghost.update(1 / 60, { x: dx / distance, z: dz / distance, sprint: true, crouch: false, aimYaw: null }, colliders(state));
    }
    return false;
  }

  return { state, player, log, opened, path, use, passable, get floor2() { return floor2; } };
}

describe("étage 1 de bout en bout", () => {
  it("de l'entrée à l'escalier de l'étage 2", () => {
    const j = journey();
    const { state, path, use, passable, log } = j;

    // Entrée : l'objectif se coche en approchant de la porte de sécurité, qui reste close.
    path([0, 30]);
    expect(state.has("entrance_explored")).toBe(true);
    expect(log.at(-1)).toContain("génératrice");
    expect(passable(0, 25, 0, 18)).toBe(false);
    path([0, 24.2]);
    expect(use("security_door")).toBe(false);

    // Trois ferrailles dehors (entrée puis zone extérieure par le large passage).
    path([-6, 35]);
    expect(use("part_0")).toBe(true);
    path([10, 35], [24.5, 35]);
    expect(use("part_1")).toBe(true);
    path([40.5, 28.5]);
    expect(use("part_2")).toBe(true);
    expect(state.components).toBe(3);

    // Génératrice par la porte de service à l'ouest de l'entrée.
    path([14, 33], [-9, 27], [-13, 27], [-19.8, 26]);
    expect(passable(-20, 21.5, -20, 18)).toBe(false); // porte de la cafétéria sans courant
    expect(use("generator")).toBe(true);
    expect(state.has("generator_powered")).toBe(true);
    expect(log).toContain("<tremblement>");
    expect(state.components).toBe(0);

    // Le courant ouvre la sécurité : on rejoint le hub.
    expect(passable(0, 25, 0, 18)).toBe(true);
    path([-13, 27], [-9, 27], [0, 25], [0, 15], [0, 2]);
    expect(state.has("hub_reached")).toBe(true);
    expect(log.at(-1)).toContain("HUB CENTRAL");

    // Entrepôt : la note de Lila donne l'indice du mur creux.
    expect(interactableAvailable(INTERACTABLES.find((d) => d.id === "secret_wall")!, state)).toBe(false);
    path([-5, 0], [-9, 0], [-13, 0], [-28.6, -3.6]);
    use("note_storage");
    expect(j.opened).toEqual(["note_storage"]);
    expect(state.notes).toEqual(["note_storage"]);
    expect(state.has("secret_clue")).toBe(true);
    path([-24, -2]);
    expect(use("part_5")).toBe(true);

    // Dortoirs : le mur creux cède, la pièce cachée s'ouvre.
    path([-13, 0], [-9, 0], [-9, -13], [-13, -13], [-16, -16.6]);
    expect(use("part_7")).toBe(true);
    path([-30.2, -14]);
    expect(passable(-30.2, -14, -34.2, -14)).toBe(false);
    expect(use("secret_wall")).toBe(true);
    expect(state.has("secret_revealed")).toBe(true);
    expect(passable(-30.2, -14, -34.2, -14)).toBe(true);
    path([-34.2, -14]);
    expect(use("keycard")).toBe(true);
    expect(state.has("keycard")).toBe(true);

    // Atelier : module radio (2 ferrailles), par le hub et l'infirmerie.
    expect(state.components).toBe(2);
    path([-30, -14], [-13, -13], [-9, -13], [-9, 0], [0, 0], [8.5, 0], [12, 0], [24, 0], [29, -4.3]);
    expect(use("workbench")).toBe(true);
    expect(state.has("radio_module")).toBe(true);

    // Salle de contrôle : la console radio.
    path([24, 0], [12, 0], [8.5, 0], [8.5, -10], [18, -17.7]);
    expect(use("comms")).toBe(true);
    expect(state.has("comms_repaired")).toBe(true);
    expect(state.objectiveChecklist().steps.every((s) => s.done)).toBe(true);

    // Escalier : la clé ouvre la porte nord, puis l'accès à l'étage 2.
    path([8.5, -10], [8.5, 0], [0, 0], [0, -10]);
    expect(passable(0, -12, 0, -16)).toBe(true);
    path([0, -16], [0, -17.4]);
    expect(roomAt(j.player.x, j.player.z)?.id).toBe("stairs");
    expect(use("stairs")).toBe(true);
    expect(j.floor2).toBe(true);
    expect(state.has("floor2")).toBe(true);
    expect(state.objective()).toBe("Étage 1 terminé.");
  });

  it("sans la clé, la porte de l'escalier reste close", () => {
    const j = journey();
    j.state.collect("p", "components", 3);
    j.state.exploreEntrance();
    j.state.powerGenerator();
    expect(j.passable(0, -10, 0, -16)).toBe(false);
    j.state.readNote("note_storage", true);
    j.state.openSecretWall();
    j.state.takeKeycard();
    expect(j.passable(0, -10, 0, -16)).toBe(true);
  });
});

describe("objets de l'atelier et ressources", () => {
  const def = (id: string) => INTERACTABLES.find((d) => d.id === id)!;
  function effects() {
    const log: string[] = [];
    const fx: ProgressEffects = { notify: (t) => log.push(t), shudder: () => log.push("<tremblement>"), showNote: () => {}, floor2: () => {} };
    return { log, fx };
  }

  it("presse à clous, banc de batteries, borne de recharge", () => {
    const s = new SiloState();
    const { log, fx } = effects();
    expect(interactWith(def("nail_press"), s, fx)).toBe(false);
    expect(log.at(-1)).toBe("La presse demande une ferraille.");
    // La ferraille gardée pour la génératrice (3) et la radio (2) est refusée, avec un message clair.
    s.collect("p", "components", 4);
    expect(interactWith(def("nail_press"), s, fx)).toBe(false);
    expect(log.at(-1)).toBe("Ferraille réservée : 3 pour la génératrice et 2 pour le module radio. Aucune de libre pour l'instant.");
    s.collect("q", "components", 3);
    expect(interactWith(def("upgrade"), s, fx)).toBe(false);
    expect(log.at(-1)).toBe("Ferraille réservée : 3 pour la génératrice et 2 pour le module radio. Seulement 2 de libre, il en faut 3.");
    s.collect("r", "components", 2);
    expect(s.powerGenerator() && s.craftRadioModule()).toBe(true);
    expect(s.components).toBe(4);
    expect(interactWith(def("nail_press"), s, fx)).toBe(true);
    expect(log.at(-1)).toBe("Presse à clous : +16 clous · réserve 32.");
    expect(interactWith(def("upgrade"), s, fx)).toBe(true);
    expect(log.at(-1)).toBe("Lampe améliorée : charge 150.");
    expect(interactableAvailable(def("upgrade"), s)).toBe(false);
  });

  it("borne de recharge : une charge par visite, réarmée en quittant le poste de sécurité", () => {
    const s = new SiloState();
    const { log, fx } = effects();
    // Lampe pleine : la borne n'est pas gaspillée.
    expect(interactWith(def("recharge"), s, fx)).toBe(false);
    expect(log.at(-1)).toContain("déjà pleine");
    expect(s.rechargeSpent).toBe(false);
    s.spendEnergy(60);
    checkTriggers(s, 3.6, 12);
    expect(interactWith(def("recharge"), s, fx)).toBe(true);
    expect(s.energy).toBe(100);
    expect(log.at(-1)).toContain("Lampe rechargée");
    expect(actionLabel(def("recharge"), s)).toContain("Vide");
    // Deuxième essai pendant la même visite : refusé, avec l'explication.
    s.spendEnergy(60);
    expect(interactWith(def("recharge"), s, fx)).toBe(false);
    expect(log.at(-1)).toBe(RECHARGE_SPENT);
    checkTriggers(s, 0, 18); // toujours au poste de sécurité
    expect(s.rechargeSpent).toBe(true);
    // On sort (hub) puis on revient : réarmée.
    checkTriggers(s, 0, 2);
    expect(s.rechargeSpent).toBe(false);
    expect(actionLabel(def("recharge"), s)).toBe(def("recharge").action);
    checkTriggers(s, 3.6, 12);
    expect(interactWith(def("recharge"), s, fx)).toBe(true);
    expect(s.energy).toBe(100);
  });

  it("ramasse chaque ressource une seule fois, avec un message", () => {
    const s = new SiloState();
    const { log, fx } = effects();
    expect(interactWith(def("ammo_1"), s, fx)).toBe(true);
    expect(log.at(-1)).toBe("+16 clous · réserve 32.");
    expect(interactWith(def("med_1"), s, fx)).toBe(true);
    expect(log.at(-1)).toBe("Bandage récupéré.");
    expect(interactWith(def("can_1"), s, fx)).toBe(true);
    expect(interactWith(def("cell_1"), s, fx)).toBe(true);
    expect([s.bandages, s.cans, s.cells]).toEqual([3, 2, 2]);
    expect(interactableAvailable(def("can_1"), s)).toBe(false);
  });

  it("une note relue n'est comptée qu'une fois", () => {
    const s = new SiloState();
    const { log, fx } = effects();
    expect(interactWith(def("note_infirmary"), s, fx)).toBe(true);
    expect(log.at(-1)).toBe("Note ajoutée au carnet.");
    expect(interactWith(def("note_infirmary"), s, fx)).toBe(false);
    expect(s.notes).toEqual(["note_infirmary"]);
    expect(s.has("secret_clue")).toBe(false);
  });
});
