// Plan du niveau, collisions et contrôleur de l'opérateur.
import { describe, expect, it } from "vitest";
import { moveCircle, resolveCircle, segmentClear } from "@/game/collision";
import { DOORS, INTERACTABLES, ROOMS, SPAWN, buildWalls, doorBox, roomAt, sectorAt, wallBox } from "@/game/level";
import { PLAYER, PlayerController } from "@/game/player";
import { SPAWN as STATE_SPAWN } from "@/game/state";

const walls = buildWalls().map(wallBox);
const blocked = [...walls, ...DOORS.filter((d) => d.locked).map(doorBox)];

describe("plan", () => {
  it("place le départ dans le refuge, cohérent avec l'état", () => {
    expect(roomAt(SPAWN.x, SPAWN.z)?.id).toBe("refuge");
    expect([SPAWN.x, SPAWN.z]).toEqual([STATE_SPAWN[0], STATE_SPAWN[2]]);
    expect(sectorAt(0, -5)).toBe("01 / DÉCONTAMINATION");
  });

  it("met chaque objet dans une salle, avec un identifiant unique", () => {
    const ids = new Set<string>();
    for (const item of INTERACTABLES) {
      expect(roomAt(item.x, item.z), item.id).not.toBeNull();
      expect(ids.has(item.id)).toBe(false);
      ids.add(item.id);
    }
    for (const id of ["mother", "recharge", "upgrade", "ending"]) expect(roomAt(INTERACTABLES.find((i) => i.id === id)!.x, INTERACTABLES.find((i) => i.id === id)!.z)?.id).toBe("refuge");
    expect(INTERACTABLES.filter((i) => i.kind === "components")).toHaveLength(3);
  });

  it("laisse les portes ouvertes praticables et bloque le sas verrouillé", () => {
    expect(segmentClear(0, 8, 0, -5, blocked)).toBe(true);
    expect(segmentClear(0, -5, 0, -14, blocked)).toBe(false);
    expect(segmentClear(-6, 0, -6, 8, blocked)).toBe(false);
    for (const room of ROOMS) expect(room.x1 - room.x0).toBeGreaterThan(5);
  });
});

describe("collisions", () => {
  it("repousse un cercle hors d'un mur sans le traverser", () => {
    const box = { minX: -1, maxX: 1, minZ: -0.15, maxZ: 0.15 };
    const pushed = resolveCircle(0, 0.3, 0.35, [box]);
    expect(pushed.z).toBeCloseTo(0.5);
    const moved = moveCircle(0, 1, 0, -3, 0.35, [box]);
    expect(moved.z).toBeGreaterThan(0.49);
    const slide = moveCircle(-0.5, 0.6, 1, -0.5, 0.35, [box]);
    expect(slide.x).toBeCloseTo(0.5, 1);
    expect(slide.z).toBeGreaterThan(0.49);
  });
});

describe("opérateur", () => {
  const intent = (x: number, z: number, extra: Partial<{ sprint: boolean; crouch: boolean; aimYaw: number | null }> = {}) => ({ x, z, sprint: false, crouch: false, aimYaw: null, ...extra });

  it("marche, court et s'accroupit à des vitesses distinctes", () => {
    const speeds: Record<string, number> = {};
    for (const [label, extra] of [["walk", {}], ["run", { sprint: true }], ["crouch", { crouch: true }]] as const) {
      const p = new PlayerController(0, 8, 0);
      for (let i = 0; i < 30; i++) p.update(1 / 60, intent(1, 0, extra), []);
      speeds[label] = p.speed;
      expect(p.pose).toBe(label === "crouch" ? "crouch-walk" : label);
    }
    expect(speeds.walk).toBeCloseTo(PLAYER.walkSpeed, 0);
    expect(speeds.run).toBeGreaterThan(speeds.walk);
    expect(speeds.crouch).toBeLessThan(speeds.walk);
  });

  it("se tourne vers la visée indépendamment de la marche", () => {
    const p = new PlayerController(0, 8, 0);
    for (let i = 0; i < 60; i++) p.update(1 / 60, intent(1, 0, { aimYaw: Math.PI }), []);
    expect(Math.abs(p.yaw)).toBeCloseTo(Math.PI, 3);
    expect(p.vx).toBeGreaterThan(3);
  });

  it("reste dans le silo en fonçant dans les murs", () => {
    const p = new PlayerController(SPAWN.x, SPAWN.z, 0);
    for (let i = 0; i < 600; i++) p.update(1 / 60, intent(0, -1, { sprint: true }), blocked);
    expect(roomAt(p.x, p.z)?.id).toBe("decon");
    expect(p.z).toBeGreaterThan(-12);
    for (let i = 0; i < 600; i++) p.update(1 / 60, intent(1, 0, { sprint: true }), blocked);
    expect(p.x).toBeLessThan(8);
  });

  it("tire et recharge au rythme du D9", () => {
    const p = new PlayerController(0, 0, 0);
    let rounds = 2;
    const spend = () => (rounds > 0 ? (rounds--, true) : false);
    expect(p.tryFire(spend)).toBe(true);
    expect(p.tryFire(spend)).toBe(false);
    for (let i = 0; i < 15; i++) p.update(1 / 60, intent(0, 0), []);
    expect(p.tryFire(spend)).toBe(true);
    for (let i = 0; i < 15; i++) p.update(1 / 60, intent(0, 0), []);
    expect(p.tryFire(spend)).toBe(false);
    expect(p.startReload(true)).toBe(true);
    expect(p.startReload(true)).toBe(false);
    for (let i = 0; i < 90; i++) p.update(1 / 60, intent(0, 0), []);
    expect(p.takeReloadCompleted()).toBe(true);
    expect(p.takeReloadCompleted()).toBe(false);
  });
});
