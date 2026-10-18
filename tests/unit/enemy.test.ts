// Zombies sur le plan de l'étage 1 : patrouille, ouïe, vue, morsure, recul du rampant, étourdissement, mort, rayon,
// navigation par les portes (portes verrouillées, large passage extérieur), zones hors salle, sommeil.
import { describe, expect, it } from "vitest";
import { createHorde, firstDoor, roomIndexAt, ZOMBIE, type ZombieHorde } from "@/game/enemy";
import { DOORS, ENEMIES, ROOMS, buildWalls, doorBox, wallBox } from "@/game/level";
import type { Box } from "@/game/collision";
import type { HordeContext } from "@/game/types";
import { SiloState } from "@/game/state";

const walls = buildWalls().map(wallBox);
const room = (id: string) => ROOMS.findIndex((r) => r.id === id);

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

/** Joueur dans l'escalier, derrière la porte à clé : hors de vue de tous, à moins de 45 m de l'aile ouest. */
const FAR = { x: 0, z: -18 };

describe("zombies", () => {
  it("parcourt sa patrouille", () => {
    const s = setup(FAR);
    const w = s.horde.get("walker_storage")!;
    const visited = new Set<number>();
    for (let i = 0; i < 400; i++) {
      run(s, 0.05);
      visited.add(w.patrolIndex);
    }
    expect(w.mode).toBe("patrol");
    expect(visited.size).toBe(3);
    expect(roomIndexAt(w.x, w.z)).toBe(room("storage"));
  });

  it("enquête sur un bruit dans le rayon, les rampants entendent plus loin", () => {
    const s = setup(FAR);
    const w = s.horde.get("walker_storage")!;
    const c = s.horde.get("crawler_cafe")!;
    s.horde.hearNoise(-20, 5, 5);
    expect([w.mode, c.mode]).toEqual(["patrol", "patrol"]);
    // Marcheur à 6 m, rampant à 7,3 m : hors du rayon 6,5 m, mais dans 6,5 × 1,4.
    s.horde.hearNoise(-20, 5, 6.5);
    expect(w.mode).toBe("investigate");
    expect([w.destX, w.destZ]).toEqual([-20, 5]);
    expect(c.mode).toBe("investigate");
    run(s, 2);
    expect(w.z).toBeGreaterThan(0);
    run(s, 8);
    expect(["return", "patrol"]).toContain(w.mode);
  });

  it("poursuit à vue, pas à travers un mur", () => {
    const wall: Box = { minX: -19.2, maxX: -18.8, minZ: -3, maxZ: 1 };
    const blocked = setup({ x: -17.5, z: -1 }, undefined, [wall]);
    run(blocked, 0.5);
    expect(blocked.horde.get("walker_storage")!.mode).not.toBe("chase");
    const clear = setup({ x: -17.5, z: -1 });
    run(clear, 0.3);
    expect(clear.horde.get("walker_storage")!.mode).toBe("chase");
  });

  it("voit moins loin un joueur accroupi", () => {
    // Le joueur est à 12,5 m, devant le marcheur, au fond de l'entrepôt.
    const facing = Math.atan2(-11, 6);
    const w0 = setup({ x: -31, z: 5 });
    const standing = w0.horde.get("walker_storage")!;
    standing.yaw = facing;
    run(w0, 0.2);
    expect(standing.mode).toBe("chase");
    const c = setup({ x: -31, z: 5 });
    c.ctx.player.crouched = true;
    c.horde.get("walker_storage")!.yaw = facing;
    run(c, 0.2);
    expect(c.horde.get("walker_storage")!.mode).not.toBe("chase");
  });

  it("mord au contact avec un temps de recharge", () => {
    const s = setup({ x: -19, z: -1 });
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
    const s = setup({ x: -21, z: 12 });
    const c = s.horde.get("crawler_cafe")!;
    run(s, 0.2);
    expect(s.damage).toEqual([ZOMBIE.crawler.damage]);
    expect(c.mode).toBe("retreat");
    const before = Math.hypot(c.x + 21, c.z - 12);
    run(s, 0.6);
    expect(Math.hypot(c.x + 21, c.z - 12)).toBeGreaterThan(before + 1.5);
    run(s, 0.8);
    expect(c.mode).not.toBe("retreat");
  });

  it("un zombie étourdi (lampe) ne bouge ni ne mord", () => {
    const s = setup({ x: -14, z: -1 });
    const w = s.horde.get("walker_storage")!;
    run(s, 0.05);
    s.horde.damage("walker_storage", 0, 1.8);
    expect(w.health).toBe(ZOMBIE.walker.health);
    const [x, z] = [w.x, w.z];
    run(s, 1.7);
    expect([w.x, w.z]).toEqual([x, z]);
    expect(s.damage).toHaveLength(0);
    run(s, 1);
    expect(Math.hypot(w.x - x, w.z - z)).toBeGreaterThan(0.3);
  });

  it("meurt à 0 PV, quitte la visée, et sync le retire ou le remet", () => {
    const s = setup(FAR);
    s.horde.damage("crawler_cafe", 20, 0);
    expect(s.state.defeated).toEqual([]);
    expect(s.horde.get("crawler_cafe")!.mode).toBe("investigate");
    s.horde.damage("crawler_cafe", 20, 0);
    expect(s.state.defeated).toEqual(["crawler_cafe"]);
    expect(s.horde.aimCandidates().map((c) => c.id)).not.toContain("crawler_cafe");
    expect(s.horde.raycast(-22, 16, 0, -1, 10)).toBeNull();
    const saved = new SiloState();
    saved.defeated = ["walker_dorms"];
    s.horde.sync(saved);
    expect(s.horde.get("crawler_cafe")!.alive).toBe(true);
    expect(s.horde.get("walker_dorms")!.alive).toBe(false);
    expect(s.horde.aimCandidates()).toHaveLength(ENEMIES.length - 1);
  });

  it("le rayon touche le zombie le plus proche", () => {
    const s = setup(FAR);
    const hit = s.horde.raycast(-14, -1, -1, 0, 40)!;
    expect(hit.id).toBe("walker_storage");
    expect(hit.distance).toBeCloseTo(6 - ZOMBIE.walker.hitRadius, 5);
    expect(s.horde.raycast(-14, -1, 1, 0, 40)).toBeNull();
    expect(s.horde.raycast(-14, -1, -1, 0, 5)).toBeNull();
  });

  it("calcule le chemin par les portes ouvertes seulement", () => {
    expect(firstDoor(room("storage"), room("stairs"), () => true)).toBe(DOORS.findIndex((d) => d.id === "west_storage"));
    expect(firstDoor(room("north"), room("stairs"), (id) => id !== "north_stairs")).toBe(-1);
    expect(firstDoor(room("plaza"), room("greenhouse"), () => true)).toBe(DOORS.findIndex((d) => d.id === "plaza_exterior"));
    expect(firstDoor(-1, room("hub"), () => true)).toBe(-1);
  });

  it("passe une porte étroite même en arrivant de biais", () => {
    // Le rampant de la cafétéria rejoint le couloir ouest par sa porte.
    const s = setup(FAR);
    const c = s.horde.get("crawler_cafe")!;
    for (let i = 0; i < 4; i++) {
      s.horde.hearNoise(-9, 5, 20);
      run(s, 3);
    }
    expect(roomIndexAt(c.x, c.z)).toBe(room("west"));
    // Marcheur placé de biais, à 3 m du milieu de la porte de l'entrepôt.
    const t = setup(FAR);
    const w = t.horde.get("walker_storage")!;
    w.x = -12.5;
    w.z = 3;
    for (let i = 0; i < 3; i++) {
      t.horde.hearNoise(-9, 3, 20);
      run(t, 3);
    }
    expect(roomIndexAt(w.x, w.z)).toBe(room("west"));
  });

  it("sort d'une embrasure sans se coincer contre le montant", () => {
    // Marcheur à peine entré dans le couloir ouest par la porte de la cafétéria, appelé vers les dortoirs.
    const s = setup(FAR);
    const w = s.horde.get("walker_dorms")!;
    w.x = -10.9;
    w.z = 12.4;
    s.horde.hearNoise(-20, -12, 50);
    run(s, 3);
    expect(w.z).toBeLessThan(9);
  });

  it("reste derrière une porte verrouillée, la franchit une fois ouverte", () => {
    const closed = setup({ x: -20, z: 16 });
    const w = closed.horde.get("walker_gen")!;
    for (let i = 0; i < 3; i++) {
      closed.horde.hearNoise(-20, 16, 20);
      run(closed, 3);
    }
    expect(w.z).toBeGreaterThan(20);
    expect(Number.isFinite(w.x) && Number.isFinite(w.z)).toBe(true);
    const open = setup({ x: -20, z: 16 }, () => true);
    const w2 = open.horde.get("walker_gen")!;
    for (let i = 0; i < 4; i++) {
      open.horde.hearNoise(-20, 16, 20);
      run(open, 3);
    }
    expect(w2.z).toBeLessThan(19.5);
  });

  it("traverse le large passage entre la zone extérieure et l'entrée", () => {
    const s = setup({ x: 2, z: 34 });
    const w = s.horde.get("walker_ext")!;
    for (let i = 0; i < 6 && roomIndexAt(w.x, w.z) !== room("plaza"); i++) {
      s.horde.hearNoise(2, 34, 40);
      run(s, 4);
    }
    expect(roomIndexAt(w.x, w.z)).toBe(room("plaza"));
  });

  it("ne se bloque pas hors de toute salle (interstice entre deux murs)", () => {
    expect(roomIndexAt(6, 10)).toBe(-1);
    const s = setup({ x: 0, z: 0 }, () => true);
    const w = s.horde.get("walker_serre")!;
    w.x = 6;
    w.z = 10;
    w.room = -1;
    s.horde.hearNoise(0, 0, 40);
    run(s, 5);
    expect(Number.isFinite(w.x) && Number.isFinite(w.z)).toBe(true);
    // Les murs le retiennent : il reste dans l'interstice.
    expect(w.x).toBeGreaterThan(5);
    expect(w.x).toBeLessThan(7);
  });

  it("s'endort : plus d'attaque ni de cible", () => {
    const s = setup({ x: -19, z: -1 });
    s.ctx.dormant = true;
    run(s, 3);
    expect(s.damage).toHaveLength(0);
    expect(s.horde.aimCandidates()).toHaveLength(0);
    s.horde.hearNoise(-19, -1, 30);
    expect(s.horde.get("walker_storage")!.mode).toBe("patrol");
  });

  it("construit et anime les visuels hors navigateur", () => {
    const state = new SiloState();
    const horde = createHorde(state);
    expect(horde.root.children.length).toBe(ENEMIES.length);
    const ctx: HordeContext = { player: { x: -18, z: -1, crouched: false, alive: true }, colliders: walls, doorOpen: () => true, damagePlayer: () => {}, dormant: false };
    horde.setLowQuality(true);
    for (let i = 0; i < 30; i++) horde.update(0.05, ctx);
    horde.damage("walker_storage", 100, 0);
    for (let i = 0; i < 60; i++) horde.update(0.05, ctx);
    expect(horde.get("walker_storage")!.rig!.root.visible).toBe(false);
  });
});
