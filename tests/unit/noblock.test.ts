// Parcours sans blocage : quoi que fasse le joueur (les pires choix compris : clous et lampe d'abord,
// borne vidée, objets pris dans n'importe quel ordre), il peut toujours finir l'étage 1.
// Modèle sans rendu : les pièces atteignables suivent les portes ouvertes (rules.ts), les objets sont
// utilisés par interactWith comme dans le jeu.
import { describe, expect, it } from "vitest";
import { DOORS, INTERACTABLES, roomAt, type InteractableDef, type RoomId } from "@/game/level";
import { checkTriggers, interactWith, type ProgressEffects } from "@/game/progress";
import { doorOpen, interactableAvailable } from "@/game/rules";
import { GENERATOR_PARTS, RADIO_PARTS, SiloState, UPGRADE_PARTS } from "@/game/state";

const fx: ProgressEffects = { notify: () => {}, shudder: () => {}, showNote: () => {}, floor2: () => {} };
/** Ce qui dépense de la ferraille hors objectifs. */
const SPENDERS = new Set(["nail_press", "upgrade"]);

function reachableRooms(state: SiloState): Set<RoomId> {
  const seen = new Set<RoomId>(["plaza"]);
  const queue: RoomId[] = ["plaza"];
  while (queue.length) {
    const room = queue.shift()!;
    for (const door of DOORS) {
      if (!door.rooms.includes(room) || !doorOpen(door, state)) continue;
      const other = door.rooms[0] === room ? door.rooms[1] : door.rooms[0];
      if (!seen.has(other)) {
        seen.add(other);
        queue.push(other);
      }
    }
  }
  return seen;
}

/** Objets utilisables : disponibles, dans une pièce atteignable. */
function usable(state: SiloState): InteractableDef[] {
  const rooms = reachableRooms(state);
  return INTERACTABLES.filter((def) => {
    const room = roomAt(def.x, def.z);
    return room !== null && rooms.has(room.id) && interactableAvailable(def, state);
  });
}

/**
 * Étage fini pour de bon : les 5 objectifs (radio comprise, même si l'escalier ne l'exige pas) et la descente.
 * Rater la radio ferait rater la fin prévue (la voix, le signal) : c'est aussi un blocage.
 */
function finished(state: SiloState): boolean {
  return state.has("floor2") && state.objectiveChecklist().steps.every((s) => s.done);
}

/** Simule « aller » près d'un objet : déclencheurs de déplacement (entrée, hub, borne réarmée). */
function walkTo(state: SiloState, def: InteractableDef): void {
  checkTriggers(state, 0, 27); // devant la porte de sécurité
  if (state.has("generator_powered")) checkTriggers(state, 0, 0); // hub
  checkTriggers(state, def.x, def.z);
}

/** Joueur appliqué : n'utilise que ce qui fait avancer (ni presse, ni banc). Vrai s'il atteint l'étage 2. */
function canFinish(from: SiloState): boolean {
  const state = new SiloState();
  expect(state.loadText(from.saveText()!)).toBe("ok");
  for (let round = 0; round < 80 && !finished(state); round++) {
    let changed = false;
    for (const def of usable(state)) {
      if (SPENDERS.has(def.id) || def.id === "recharge") continue;
      walkTo(state, def);
      if (interactWith(def, state, fx)) changed = true;
      if (finished(state)) break;
    }
    if (!changed) break;
  }
  return finished(state);
}

/** Générateur pseudo-aléatoire reproductible. */
function rng(seed: number): () => number {
  let x = seed * 2654435761 + 1;
  return () => {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    return ((x >>> 0) % 100000) / 100000;
  };
}

describe("parcours sans blocage", () => {
  it("l'étage contient assez de ferraille pour les objectifs, même la lampe améliorée", () => {
    const scrap = INTERACTABLES.filter((d) => d.kind === "components").reduce((n, d) => n + (d.amount ?? 1), 0);
    expect(scrap).toBeGreaterThanOrEqual(GENERATOR_PARTS + RADIO_PARTS + UPGRADE_PARTS);
  });

  // Deux pires joueurs : celui qui fabrique des clous avec chaque ferraille, et celui qui améliore la lampe d'abord.
  for (const order of [["nail_press", "upgrade"], ["upgrade"]]) {
    it(`pire cas : ${order[0] === "upgrade" ? "lampe améliorée" : "clous fabriqués"} dès que possible`, () => {
      const state = new SiloState();
      const spend = (d: InteractableDef) => order.indexOf(d.id);
      for (let round = 0; round < 120; round++) {
        // Dépenser d'abord, tout le temps, puis faire une seule autre chose (ramasser, lire, réparer…).
        for (let i = 0; i < 20; i++) {
          const spender = usable(state).filter((d) => order.includes(d.id)).sort((a, b) => spend(a) - spend(b)).find((d) => interactWith(d, state, fx));
          if (!spender) break;
        }
        expect(canFinish(state), `bloqué au tour ${round} : ${state.objective()}`).toBe(true);
        const next = usable(state).find((d) => !SPENDERS.has(d.id) && d.id !== "recharge" && !(d.id === "stairs" && state.has("floor2")) && (walkTo(state, d), interactWith(d, state, fx)));
        if (!next) break;
      }
      expect(finished(state), `${state.objective()} · ferraille ${state.components}`).toBe(true);
      // Les dépenses ont bien eu lieu, avec toute la ferraille libre.
      if (order[0] === "upgrade") expect(state.upgraded).toBe(true);
      else expect(state.reserve).toBeGreaterThanOrEqual(16 + 3 * 16);
      expect(state.collected.filter((id) => id.startsWith("part_"))).toHaveLength(8);
    });
  }

  it("300 parties au hasard, borne et dépenses comprises : jamais bloqué", () => {
    for (let seed = 1; seed <= 300; seed++) {
      const random = rng(seed);
      const state = new SiloState();
      for (let step = 0; step < 70 && !finished(state); step++) {
        const options = usable(state);
        // Les dépenses sont tirées plus souvent que le reste : on cherche le pire.
        const spenders = options.filter((d) => SPENDERS.has(d.id));
        const def = spenders.length && random() < 0.5 ? spenders[Math.floor(random() * spenders.length)] : options[Math.floor(random() * options.length)];
        if (def.id === "recharge") state.spendEnergy(Math.min(state.energy, 50));
        walkTo(state, def);
        interactWith(def, state, fx);
        if (step % 7 === 0) expect(canFinish(state), `partie ${seed}, étape ${step} : ${state.objective()}`).toBe(true);
      }
      expect(canFinish(state), `partie ${seed} en fin de course : ${state.objective()}`).toBe(true);
    }
  });

  it("aucune porte ne se referme : une pièce atteinte le reste", () => {
    const state = new SiloState();
    let before = reachableRooms(state);
    for (let round = 0; round < 80 && !finished(state); round++) {
      const def = usable(state).find((d) => !SPENDERS.has(d.id) && d.id !== "recharge" && !(d.id === "stairs" && state.has("floor2")) && (walkTo(state, d), interactWith(d, state, fx)));
      if (!def) break;
      const after = reachableRooms(state);
      for (const room of before) expect(after.has(room), room).toBe(true);
      before = after;
    }
    expect(before.size).toBe(17);
  });
});
