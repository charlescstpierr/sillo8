// Armes du bricoleur : clé à molette, lance-clous, lampe qui éblouit, changement d'arme. Horde et monde factices.
import { describe, expect, it } from "vitest";
import { Group, Scene } from "three";
import { Combat, LAMP, NAIL, WRENCH, type CombatInput } from "@/game/combat";
import { rayDistance, type Box } from "@/game/collision";
import { NAILGUN, PlayerController } from "@/game/player";
import { NAIL_CAPACITY, SiloState } from "@/game/state";
import type { Horde, RayHit } from "@/game/types";

interface FakeZombie { id: string; x: number; z: number; hp: number; stun: number; }

function fakeHorde(zombies: FakeZombie[]) {
  const horde: Horde = {
    root: new Group(),
    update() {},
    hearNoise() {},
    aimCandidates: () => zombies.filter((z) => z.hp > 0).map(({ id, x, z }) => ({ id, x, z })),
    raycast(x, z, dx, dz, max): RayHit | null {
      let best: RayHit | null = null;
      for (const zb of zombies) {
        if (zb.hp <= 0) continue;
        const along = (zb.x - x) * dx + (zb.z - z) * dz;
        const across = Math.abs((zb.x - x) * dz - (zb.z - z) * dx);
        if (along < 0 || across > 0.45) continue;
        const d = along - Math.sqrt(0.45 * 0.45 - across * across);
        if (d <= max && (!best || d < best.distance)) best = { id: zb.id, distance: d, x: x + dx * d, z: z + dz * d };
      }
      return best;
    },
    damage(id, amount, stun) {
      const zb = zombies.find((z) => z.id === id)!;
      zb.hp -= amount;
      zb.stun = Math.max(zb.stun, stun);
    },
    sync() {},
    setLowQuality() {},
  };
  return horde;
}

function setup(options: { x?: number; z?: number; yaw?: number; zombies?: FakeZombie[]; colliders?: Box[] } = {}) {
  const state = new SiloState();
  const player = new PlayerController(options.x ?? 0, options.z ?? 0, options.yaw ?? 0);
  const notices: string[] = [];
  const noises: [number, number, number][] = [];
  const scene = new Scene();
  const combat = new Combat({
    scene,
    state,
    player,
    horde: fakeHorde(options.zombies ?? []),
    world: { colliders: options.colliders ?? [] },
    notify: (t) => notices.push(t),
    noise: (x, z, r) => noises.push([x, z, r]),
  });
  return { state, player, combat, notices, noises, scene };
}

const idle: CombatInput = { firing: false, light: false, swap: false, weapon1: false, weapon2: false };

/** Avance joueur + combat de `dt`, comme le moteur. */
function step(s: ReturnType<typeof setup>, dt: number, patch: Partial<CombatInput> = {}) {
  s.player.update(dt, { x: 0, z: 0, sprint: false, crouch: false, aimYaw: null }, []);
  s.combat.update(dt, { ...idle, ...patch });
}

const zombie = (id: string, x: number, z: number): FakeZombie => ({ id, x, z, hp: 100, stun: 0 });

describe("rayDistance", () => {
  const box: Box = { minX: -1, maxX: 1, minZ: 4, maxZ: 5 };
  it("mesure la distance au premier mur et plafonne au maximum", () => {
    expect(rayDistance(0, 0, 0, 1, 70, [box])).toBeCloseTo(4);
    expect(rayDistance(0, 0, 0, -1, 70, [box])).toBe(70);
    expect(rayDistance(0, 0, 0, 1, 3, [box])).toBe(3);
    expect(rayDistance(3, 0, 0, 1, 70, [box])).toBe(70);
    expect(rayDistance(0, 4.5, 0, 1, 70, [box])).toBe(70);
    const d = Math.SQRT1_2;
    expect(rayDistance(-4, 0, d, d, 70, [box])).toBeCloseTo(4 * Math.SQRT2);
  });
});

describe("clé à molette", () => {
  it("est l'arme de départ et touche tous les zombies de l'arc", () => {
    const front = zombie("front", 0, 1.2);
    const left = zombie("left", Math.sin(0.5) * 1.5, Math.cos(0.5) * 1.5); // ≈ 29° : dans l'arc
    const s = setup({ zombies: [front, left] });
    expect(s.combat.weapon).toBe(0);
    step(s, 0.016, { firing: true });
    expect(front.hp).toBe(100 - WRENCH.damage);
    expect(left.hp).toBe(100 - WRENCH.damage);
    expect(front.stun).toBe(WRENCH.stun);
    expect(s.noises).toEqual([[0, 0, WRENCH.noise]]);
    expect(s.combat.swingTime).toBeCloseTo(WRENCH.swing, 5);
    // Aucun clou dépensé.
    expect(s.state.ammo).toBe(NAIL_CAPACITY);
  });

  it("ne touche ni derrière, ni hors de l'arc, ni trop loin, ni à travers un mur", () => {
    const behind = zombie("behind", 0, -1);
    const wide = zombie("wide", Math.sin(0.8) * 1.4, Math.cos(0.8) * 1.4); // ≈ 46°
    const far = zombie("far", 0, 1.9);
    const s = setup({ zombies: [behind, wide, far] });
    step(s, 0.016, { firing: true });
    expect([behind.hp, wide.hp, far.hp]).toEqual([100, 100, 100]);
    // Le coup part quand même (bruit, animation).
    expect(s.noises).toHaveLength(1);
    expect(s.combat.swingTime).toBeGreaterThan(0);

    const hidden = zombie("hidden", 0, 1.4);
    const w = setup({ zombies: [hidden], colliders: [{ minX: -1, maxX: 1, minZ: 0.6, maxZ: 0.8 }] });
    step(w, 0.016, { firing: true });
    expect(hidden.hp).toBe(100);
  });

  it("respecte sa cadence de 0,5 s et l'animation dure 0,32 s", () => {
    const target = zombie("t", 0, 1);
    const s = setup({ zombies: [target] });
    step(s, 0.016, { firing: true });
    for (let i = 0; i < 20; i++) step(s, 1 / 60, { firing: true }); // 0,33 s
    expect(target.hp).toBe(100 - WRENCH.damage);
    expect(s.combat.swingTime).toBe(0);
    for (let i = 0; i < 12; i++) step(s, 1 / 60, { firing: true }); // 0,53 s
    expect(target.hp).toBe(100 - 2 * WRENCH.damage);
  });
});

describe("lance-clous", () => {
  it("dépense un clou par tir, à 0,16 s de cadence", () => {
    const s = setup();
    step(s, 0.016, { weapon2: true });
    step(s, 0.016, { firing: true });
    expect(s.state.ammo).toBe(NAIL_CAPACITY - 1);
    expect(s.noises).toEqual([[0, 0, NAIL.noise]]);
    step(s, 0.1, { firing: true });
    expect(s.state.ammo).toBe(NAIL_CAPACITY - 1);
    step(s, 0.08, { firing: true });
    expect(s.state.ammo).toBe(NAIL_CAPACITY - 2);
    // Tir automatique : 1 s de gâchette ≈ 6 clous de plus.
    for (let i = 0; i < 60; i++) step(s, 1 / 60, { firing: true });
    expect(NAIL_CAPACITY - 2 - s.state.ammo).toBeGreaterThanOrEqual(5);
    expect(NAIL_CAPACITY - 2 - s.state.ammo).toBeLessThanOrEqual(7);
  });

  it("touche le zombie le plus proche, pas celui caché derrière un mur, ni au-delà de 16 m", () => {
    const near = zombie("near", 0, 6);
    const far = zombie("far", 0, 10);
    const s = setup({ zombies: [far, near] });
    s.combat.select(1);
    step(s, 0.016, { firing: true });
    expect(near.hp).toBe(100 - NAIL.damage);
    expect(far.hp).toBe(100);
    expect(near.stun).toBe(0);

    const hidden = zombie("hidden", 0, 8);
    const w = setup({ zombies: [hidden], colliders: [{ minX: -2, maxX: 2, minZ: 4, maxZ: 4.3 }] });
    w.combat.select(1);
    step(w, 0.016, { firing: true });
    expect(hidden.hp).toBe(100);
    expect(w.state.ammo).toBe(NAIL_CAPACITY - 1);

    const distant = zombie("distant", 0, 17);
    const d = setup({ zombies: [distant] });
    d.combat.select(1);
    step(d, 0.016, { firing: true });
    expect(distant.hp).toBe(100);
  });

  it("vise dans la direction du lacet", () => {
    const side = zombie("side", 5, 0);
    const s = setup({ zombies: [side], yaw: Math.PI / 2 });
    s.combat.select(1);
    step(s, 0.016, { firing: true });
    expect(side.hp).toBe(100 - NAIL.damage);
  });

  it("ne tire pas pendant le rechargement, recharge 16 clous en 1,1 s", () => {
    const s = setup();
    s.combat.select(1);
    s.state.ammo = 3;
    expect(s.player.startReload(true)).toBe(true);
    step(s, 0.016, { firing: true });
    expect(s.state.ammo).toBe(3);
    let done = false;
    for (let i = 0; i < 70 && !done; i++) {
      step(s, 1 / 60);
      done = s.player.takeReloadCompleted();
    }
    expect(done).toBe(true);
    expect(NAILGUN.reloadDuration).toBe(1.1);
    expect(s.state.reloadRounds(NAILGUN.capacity)).toBe(NAIL_CAPACITY - 3);
    expect([s.state.ammo, s.state.reserve]).toEqual([NAIL_CAPACITY, 16 - (NAIL_CAPACITY - 3)]);
  });

  it("signale la sacoche vide sans répéter le message à chaque image", () => {
    const s = setup();
    s.combat.select(1);
    s.state.ammo = 0;
    s.state.reserve = 0;
    for (let i = 0; i < 30; i++) step(s, 1 / 60, { firing: true });
    expect(s.notices.filter((n) => n.startsWith("Plus de clous"))).toHaveLength(1);
    expect(s.noises).toHaveLength(0);
  });
});

describe("lampe", () => {
  it("coûte 15 de charge, fige 1,8 s sans dégâts ni bruit", () => {
    const zb = zombie("z", 0, 5);
    const s = setup({ zombies: [zb] });
    step(s, 0.016, { light: true });
    expect(s.state.energy).toBe(100 - LAMP.energy);
    expect(zb.hp).toBe(100);
    expect(zb.stun).toBe(LAMP.stun);
    expect(s.noises).toHaveLength(0);
    expect(s.combat.dazzleTime).toBeGreaterThan(0.2);
    expect(s.combat.fx.dazzleVisible).toBe(true);
    for (let i = 0; i < 20; i++) step(s, 1 / 60);
    expect(s.combat.dazzleTime).toBe(0);
    expect(s.combat.fx.dazzleVisible).toBe(false);
  });

  it("n'éblouit que dans le cône de 40°, à 8 m, et en ligne de vue", () => {
    const inCone = zombie("in", Math.sin(0.3) * 6, Math.cos(0.3) * 6); // ≈ 17°
    const outCone = zombie("out", Math.sin(0.45) * 4, Math.cos(0.45) * 4); // ≈ 26°
    const far = zombie("far", 0, 8.5);
    const behind = zombie("behind", 0, -2);
    const s = setup({ zombies: [inCone, outCone, far, behind] });
    step(s, 0.016, { light: true });
    expect(inCone.stun).toBe(LAMP.stun);
    expect([outCone.stun, far.stun, behind.stun]).toEqual([0, 0, 0]);

    const hidden = zombie("hidden", 0, 5);
    const w = setup({ zombies: [hidden], colliders: [{ minX: -2, maxX: 2, minZ: 2, maxZ: 2.3 }] });
    step(w, 0.016, { light: true });
    expect(hidden.stun).toBe(0);
    expect(w.state.energy).toBe(100 - LAMP.energy);
  });

  it("respecte sa cadence de 1,2 s, quelle que soit l'arme en main", () => {
    const s = setup();
    s.combat.select(1);
    step(s, 0.016, { light: true });
    step(s, 0.5, { light: true });
    expect(s.state.energy).toBe(100 - LAMP.energy);
    step(s, 0.75, { light: true });
    expect(s.state.energy).toBe(100 - 2 * LAMP.energy);
    // La lampe ne dépense pas de clous.
    expect(s.state.ammo).toBe(NAIL_CAPACITY);
  });

  it("échoue sans charge, avec un message", () => {
    const zb = zombie("z", 0, 5);
    const s = setup({ zombies: [zb] });
    s.state.energy = 14;
    step(s, 0.016, { light: true });
    expect(zb.stun).toBe(0);
    expect(s.state.energy).toBe(14);
    expect(s.notices).toEqual(["Pas assez de charge · pile ou borne de recharge"]);
    expect(s.combat.dazzleTime).toBe(0);
  });
});

describe("changement d'arme", () => {
  it("bascule avec 1 / 2 et ⇄, avec un message, et abandonne un rechargement", () => {
    const s = setup();
    step(s, 0.016, { weapon2: true });
    expect(s.combat.weapon).toBe(1);
    expect(s.notices.at(-1)).toBe("Lance-clous");
    step(s, 0.016, { weapon2: true });
    expect(s.notices).toHaveLength(1);
    step(s, 0.016, { weapon1: true });
    expect(s.combat.weapon).toBe(0);
    expect(s.notices.at(-1)).toBe("Clé à molette");
    step(s, 0.016, { swap: true });
    expect(s.combat.weapon).toBe(1);
    s.state.ammo = 2;
    s.player.startReload(true);
    step(s, 0.016, { swap: true });
    expect(s.combat.weapon).toBe(0);
    expect(s.player.reloading).toBe(false);
    for (let i = 0; i < 90; i++) step(s, 1 / 60);
    expect(s.player.takeReloadCompleted()).toBe(false);
  });

  it("le coup de clé ne part pas avec le lance-clous en main, et inversement", () => {
    const zb = zombie("z", 0, 1);
    const s = setup({ zombies: [zb] });
    s.combat.select(1);
    step(s, 0.016, { firing: true });
    expect(s.combat.swingTime).toBe(0);
    expect(s.state.ammo).toBe(NAIL_CAPACITY - 1);
    expect(zb.hp).toBe(100 - NAIL.damage);
  });
});
