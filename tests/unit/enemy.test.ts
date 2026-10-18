// Zombies : patrouille, ouïe, vue, mêlée, recul du rampant, ARC-3, mort, rayon, navigation par les portes, sommeil.
import { describe, expect, it } from "vitest";
import { createHorde, firstDoor, roomIndexAt, ZOMBIE, type ZombieHorde } from "@/game/enemy";
import { DOORS, ROOMS, buildWalls, doorBox, wallBox } from "@/game/level";
import type { Box } from "@/game/collision";
import type { HordeContext } from "@/game/types";
import { SiloState } from "@/game/state";

const walls = buildWalls().map(wallBox);

interface Setup {
  state: SiloState;
  horde: ZombieHorde;
  ctx: HordeContext;
  damage: number[];
}

/** Horde sans visuels ; `open` décide des portes verrouillées (fermées par défaut). */
function setup(player: { x: number; z: number }, open: (id: string) => boolean = (id) => !DOORS.find((d) => d.id === id)!.lock, extra: Box[] = []): Setup {
  const state = new SiloState();
  const horde = createHorde(state, { visuals: false });
  const damage: number[] = [];
  const colliders = [...walls, ...DOORS.filter((d) => !open(d.id)).map(doorBox), ...extra];
  const ctx: HordeContext = {
    player: { x: player.x, z: player.z, crouched: false, alive: true },
    colliders,
    doorOpen: open,
    damagePlayer: (amount) => damage.push(amount),
    dormant: false,
  };
  return { state, horde, ctx, damage };
}

function run(s: Setup, seconds: number, dt = 0.05): void {
  for (let t = 0; t < seconds - 1e-9; t += dt) s.horde.update(dt, s.ctx);
}

const FAR = { x: 0, z: 9 };

describe("zombies", () => {
  it("parcourt sa patrouille", () => {
    const s = setup(FAR);
    const w = s.horde.get("walker_1")!;
    const visited = new Set<number>();
    for (let i = 0; i < 400; i++) {
      run(s, 0.05);
      visited.add(w.patrolIndex);
    }
    expect(w.mode).toBe("patrol");
    expect(visited.size).toBe(3);
  });

  it("enquête sur un bruit dans le rayon, les rampants entendent plus loin", () => {
    const s = setup(FAR);
    s.horde.hearNoise(3, -12, 7);
    expect(s.horde.get("walker_1")!.mode).toBe("patrol");
    s.horde.hearNoise(3, -12, 11.5);
    const w = s.horde.get("walker_1")!;
    expect(w.mode).toBe("investigate");
    expect([w.destX, w.destZ]).toEqual([3, -12]);
    // crawler_1 à 15.3 m : hors du rayon 11.5, dans le rayon 11.5 × 1.4
    expect(s.horde.get("crawler_1")!.mode).toBe("investigate");
    run(s, 2);
    expect(w.z).toBeGreaterThan(-20);
    run(s, 8);
    expect(["return", "patrol"]).toContain(w.mode);
  });

  it("poursuit à vue, pas à travers un mur", () => {
    const wall: Box = { minX: 0.5, maxX: 5.5, minZ: -18.2, maxZ: -17.8 };
    const blocked = setup({ x: 3, z: -17.5 }, undefined, [wall]);
    run(blocked, 0.5);
    expect(blocked.horde.get("walker_1")!.mode).not.toBe("chase");
    const clear = setup({ x: 3, z: -17.5 });
    run(clear, 0.3);
    expect(clear.horde.get("walker_1")!.mode).toBe("chase");
  });

  it("voit moins loin un joueur accroupi", () => {
    // Le joueur est à 12.4 m, devant le marcheur, vu par la porte de la décontamination.
    const facing = Math.atan2(-3, 12);
    const w0 = setup({ x: 0, z: -8 });
    const standing = w0.horde.get("walker_1")!;
    standing.yaw = facing;
    run(w0, 0.1);
    expect(standing.mode).toBe("chase");
    const c = setup({ x: 0, z: -8 });
    c.ctx.player.crouched = true;
    c.horde.get("walker_1")!.yaw = facing;
    run(c, 0.1);
    expect(c.horde.get("walker_1")!.mode).not.toBe("chase");
  });

  it("mord au contact avec un temps de recharge", () => {
    const s = setup({ x: 3, z: -19 });
    run(s, 0.2);
    expect(s.damage).toEqual([ZOMBIE.walker.damage]);
    run(s, 1.2);
    expect(s.damage).toHaveLength(1);
    run(s, 0.6);
    expect(s.damage).toHaveLength(2);
    s.ctx.player.alive = false;
    run(s, 4);
    expect(s.damage).toHaveLength(2);
  });

  it("le rampant bondit puis recule", () => {
    const s = setup({ x: -5, z: -24 });
    const c = s.horde.get("crawler_1")!;
    run(s, 0.1);
    expect(s.damage).toEqual([ZOMBIE.crawler.damage]);
    expect(c.mode).toBe("retreat");
    const before = Math.hypot(c.x + 5, c.z + 24);
    run(s, 0.6);
    expect(Math.hypot(c.x + 5, c.z + 24)).toBeGreaterThan(before + 1.5);
    run(s, 0.8);
    expect(c.mode).not.toBe("retreat");
  });

  it("l'ARC-3 fige le zombie", () => {
    const s = setup({ x: 3, z: -14 });
    const w = s.horde.get("walker_1")!;
    s.horde.damage("walker_1", 1, 2);
    const [x, z] = [w.x, w.z];
    run(s, 1.8);
    expect([w.x, w.z]).toEqual([x, z]);
    expect(s.damage).toHaveLength(0);
    run(s, 1);
    expect(Math.hypot(w.x - x, w.z - z)).toBeGreaterThan(0.3);
  });

  it("meurt à 0 PV, quitte la visée, et sync le retire ou le remet", () => {
    const s = setup(FAR);
    s.horde.damage("crawler_1", 20, 0);
    expect(s.state.defeated).toEqual([]);
    expect(s.horde.get("crawler_1")!.mode).toBe("investigate");
    s.horde.damage("crawler_1", 20, 0);
    expect(s.state.defeated).toEqual(["crawler_1"]);
    expect(s.horde.aimCandidates().map((c) => c.id)).not.toContain("crawler_1");
    expect(s.horde.raycast(-5, -15, 0, -1, 30)).toBeNull();
    const saved = new SiloState();
    saved.defeated = ["walker_2"];
    s.horde.sync(saved);
    expect(s.horde.get("crawler_1")!.alive).toBe(true);
    expect(s.horde.get("walker_2")!.alive).toBe(false);
    expect(s.horde.aimCandidates()).toHaveLength(5);
  });

  it("le rayon touche le zombie le plus proche", () => {
    const s = setup(FAR);
    const len = Math.hypot(16, 10);
    const hit = s.horde.raycast(11, -15, -16 / len, -10 / len, 40)!;
    expect(hit.id).toBe("walker_1");
    expect(hit.distance).toBeCloseTo(Math.hypot(8, 5) - ZOMBIE.walker.hitRadius, 5);
    expect(s.horde.raycast(11, -15, 16 / len, 10 / len, 40)).toBeNull();
    expect(s.horde.raycast(3, -10, 0, -1, 5)).toBeNull();
  });

  it("passe par une porte ouverte, jamais par la porte du cœur fermée", () => {
    const rooms = (id: string) => ROOMS.findIndex((r) => r.id === id);
    expect(firstDoor(rooms("maintenance"), rooms("core"), () => true)).toBe(DOORS.findIndex((d) => d.id === "maintenance_archives"));
    expect(firstDoor(rooms("archives"), rooms("antechamber"), (id) => id !== "archives_antechamber")).toBe(-1);

    // Le rampant contourne le mur pour entrer dans le local technique par sa porte.
    const s = setup(FAR);
    const c = s.horde.get("crawler_1")!;
    for (let i = 0; i < 4; i++) {
      s.horde.hearNoise(13, -25, 20);
      run(s, 3);
    }
    expect(roomIndexAt(c.x, c.z)).toBe(rooms("technique"));

    // Porte du cœur fermée : le marcheur des archives reste de son côté.
    const closed = setup({ x: 0, z: -52 });
    const w = closed.horde.get("walker_2")!;
    for (let i = 0; i < 3; i++) {
      closed.horde.hearNoise(0, -52, 20);
      run(closed, 3);
    }
    expect(w.z).toBeGreaterThan(-48);
    const open = setup({ x: 3, z: -53 }, () => true);
    const w2 = open.horde.get("walker_2")!;
    for (let i = 0; i < 4; i++) {
      open.horde.hearNoise(3, -53, 20);
      run(open, 3);
    }
    expect(w2.z).toBeLessThan(-48.5);
  });

  it("s'endort à la fin N-7 : plus d'attaque ni de cible", () => {
    const s = setup({ x: 3, z: -19 });
    s.ctx.dormant = true;
    run(s, 3);
    expect(s.damage).toHaveLength(0);
    expect(s.horde.aimCandidates()).toHaveLength(0);
    s.horde.hearNoise(3, -19, 30);
    expect(s.horde.get("walker_1")!.mode).toBe("patrol");
  });

  it("construit et anime les visuels hors navigateur", () => {
    const state = new SiloState();
    const horde = createHorde(state);
    expect(horde.root.children.length).toBe(6);
    const ctx: HordeContext = { player: { x: 3, z: -18, crouched: false, alive: true }, colliders: walls, doorOpen: () => true, damagePlayer: () => {}, dormant: false };
    horde.setLowQuality(true);
    for (let i = 0; i < 30; i++) horde.update(0.05, ctx);
    horde.damage("walker_1", 100, 0);
    for (let i = 0; i < 60; i++) horde.update(0.05, ctx);
    expect(horde.get("walker_1")!.rig!.root.visible).toBe(false);
  });
});
