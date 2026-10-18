// Plan de SILLO 8 (étage 1), collisions et contrôleur de l'opérateur.
import { describe, expect, it } from "vitest";
import { moveCircle, resolveCircle, segmentClear } from "@/game/collision";
import { DOORS, ENEMIES, INTERACTABLES, ROOMS, SPAWN, buildWalls, doorBox, roomAt, sectorAt, wallBox } from "@/game/level";
import { PLAYER, PlayerController } from "@/game/player";
import { SiloState, SPAWN as STATE_SPAWN } from "@/game/state";
import { doorOpen } from "@/game/rules";

const walls = buildWalls();
const wallBoxes = walls.map(wallBox);
function blockedBy(state: SiloState) {
  return [...wallBoxes, ...DOORS.filter((d) => !doorOpen(d, state)).map(doorBox)];
}

describe("plan", () => {
  it("place le départ dehors, devant l'entrée, cohérent avec l'état", () => {
    expect(roomAt(SPAWN.x, SPAWN.z)?.id).toBe("plaza");
    expect([SPAWN.x, SPAWN.z]).toEqual([STATE_SPAWN[0], STATE_SPAWN[2]]);
    expect(sectorAt(0, 0)).toBe("HUB CENTRAL");
  });

  it("met chaque objet et chaque zombie dans une salle", () => {
    const ids = new Set<string>();
    for (const item of INTERACTABLES) {
      expect(roomAt(item.x, item.z), item.id).not.toBeNull();
      expect(ids.has(item.id)).toBe(false);
      ids.add(item.id);
    }
    for (const enemy of ENEMIES) for (const [x, z] of enemy.patrol) expect(roomAt(x, z)?.id, enemy.id).toBe(roomAt(enemy.x, enemy.z)?.id);
    // 3 pièces accessibles avant d'avoir le courant (dehors et serre).
    const outside = INTERACTABLES.filter((i) => i.kind === "components" && ["plaza", "exterior", "greenhouse", "generator"].includes(roomAt(i.x, i.z)!.id));
    expect(outside.length).toBeGreaterThanOrEqual(3);
  });

  it("relie chaque porte à deux salles voisines", () => {
    for (const door of DOORS) {
      const [a, b] = door.rooms;
      const offset = door.axis === "x" ? [0, 0.5] : [0.5, 0];
      const sides = [roomAt(door.x - offset[0], door.z - offset[1])?.id, roomAt(door.x + offset[0], door.z + offset[1])?.id];
      expect(sides.sort(), door.id).toEqual([a, b].sort());
    }
  });

  it("garde l'intérieur fermé tant que la génératrice est éteinte", () => {
    const off = new SiloState();
    expect(segmentClear(0, 30, 0, 0, blockedBy(off))).toBe(false);
    const on = new SiloState();
    on.collect("p", "components", 3);
    on.exploreEntrance();
    on.powerGenerator();
    expect(segmentClear(0, 30, 0, 0, blockedBy(on))).toBe(true);
    expect(segmentClear(0, 0, 0, -18, blockedBy(on))).toBe(false);
  });

  it("borde l'extérieur de rochers et l'intérieur de murs", () => {
    expect(walls.some((w) => w.outdoor)).toBe(true);
    expect(walls.filter((w) => w.outdoor).every((w) => w.z0 >= 22 || w.z1 >= 22)).toBe(true);
    expect(ROOMS.filter((r) => r.outdoor).map((r) => r.id).sort()).toEqual(["exterior", "plaza"]);
  });
});

describe("collisions", () => {
  it("repousse un cercle hors d'un mur sans le traverser", () => {
    const box = { minX: -1, maxX: 1, minZ: -0.15, maxZ: 0.15 };
    expect(resolveCircle(0, 0.3, 0.35, [box]).z).toBeCloseTo(0.5);
    expect(moveCircle(0, 1, 0, -3, 0.35, [box]).z).toBeGreaterThan(0.49);
    const slide = moveCircle(-0.5, 0.6, 1, -0.5, 0.35, [box]);
    expect(slide.x).toBeCloseTo(0.5, 1);
  });
});

describe("opérateur", () => {
  const intent = (x: number, z: number, extra: Partial<{ sprint: boolean; crouch: boolean; aimYaw: number | null }> = {}) => ({ x, z, sprint: false, crouch: false, aimYaw: null, ...extra });

  it("marche, court et s'accroupit à des vitesses distinctes", () => {
    const speeds: Record<string, number> = {};
    for (const [label, extra] of [["walk", {}], ["run", { sprint: true }], ["crouch", { crouch: true }]] as const) {
      const p = new PlayerController(0, 30, 0);
      for (let i = 0; i < 30; i++) p.update(1 / 60, intent(1, 0, extra), []);
      speeds[label] = p.speed;
      expect(p.pose).toBe(label === "crouch" ? "crouch-walk" : label);
    }
    expect(speeds.walk).toBeCloseTo(PLAYER.walkSpeed, 0);
    expect(speeds.run).toBeGreaterThan(speeds.walk);
    expect(speeds.crouch).toBeLessThan(speeds.walk);
  });

  it("se tourne vers la visée indépendamment de la marche", () => {
    const p = new PlayerController(0, 30, 0);
    for (let i = 0; i < 60; i++) p.update(1 / 60, intent(1, 0, { aimYaw: Math.PI }), []);
    expect(Math.abs(p.yaw)).toBeCloseTo(Math.PI, 3);
    expect(p.vx).toBeGreaterThan(3);
  });

  it("bute sur la porte de sécurité sans courant", () => {
    const p = new PlayerController(SPAWN.x, SPAWN.z, 0);
    for (let i = 0; i < 600; i++) p.update(1 / 60, intent(0, -1, { sprint: true }), blockedBy(new SiloState()));
    expect(roomAt(p.x, p.z)?.id).toBe("plaza");
    expect(p.z).toBeGreaterThan(22);
  });

  it("tire et recharge au rythme du lance-clous", () => {
    const p = new PlayerController(0, 0, 0);
    let rounds = 2;
    const spend = () => (rounds > 0 ? (rounds--, true) : false);
    expect(p.tryFire(spend)).toBe(true);
    expect(p.tryFire(spend)).toBe(false);
    for (let i = 0; i < 15; i++) p.update(1 / 60, intent(0, 0), []);
    expect(p.tryFire(spend)).toBe(true);
    expect(p.startReload(true)).toBe(true);
    for (let i = 0; i < 90; i++) p.update(1 / 60, intent(0, 0), []);
    expect(p.takeReloadCompleted()).toBe(true);
  });
});
