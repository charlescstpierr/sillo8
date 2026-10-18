// Armes (D9, ARC-3), verrou électrique et SCAN ÉCHO, avec une horde et un monde factices.
import { describe, expect, it } from "vitest";
import { Group, Scene } from "three";
import { ARC_LOCK_RADIUS, Combat, SCAN, WEAPONS, type CombatInput } from "@/game/combat";
import { rayDistance, type Box } from "@/game/collision";
import { INTERACTABLES, SECRET } from "@/game/level";
import { PlayerController } from "@/game/player";
import { SiloState } from "@/game/state";
import type { Horde, RayHit } from "@/game/types";
import type { WorldView, InteractableView } from "@/game/render/world";
import type { OperatorRig } from "@/game/render/operator";

interface FakeZombie { id: string; x: number; z: number; hp: number; stun: number; }

function fakeHorde(zombies: FakeZombie[]) {
  const noises: [number, number, number][] = [];
  const horde: Horde = {
    root: new Group(),
    update() {},
    hearNoise(x, z, r) { noises.push([x, z, r]); },
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
  return { horde, noises };
}

const DEVICE = INTERACTABLES.find((i) => i.id === "device")!;
const KEY_DEF = INTERACTABLES.find((i) => i.id === "keycard")!;

function setup(options: { x?: number; z?: number; yaw?: number; zombies?: FakeZombie[]; colliders?: Box[]; items?: typeof INTERACTABLES } = {}) {
  const state = new SiloState();
  const player = new PlayerController(options.x ?? 0, options.z ?? 0, options.yaw ?? 0);
  const { horde } = fakeHorde(options.zombies ?? []);
  const interactables = new Map<string, InteractableView>();
  for (const def of options.items ?? []) interactables.set(def.id, { def, group: new Group(), tooltipHeight: 1.4 } as unknown as InteractableView);
  const world = { colliders: options.colliders ?? [], interactables } as unknown as WorldView;
  const notices: string[] = [];
  const noises: [number, number, number][] = [];
  const combat = new Combat({
    scene: new Scene(),
    state,
    player,
    operator: { gun: new Group() } as unknown as OperatorRig,
    horde,
    world,
    notify: (t) => notices.push(t),
    noise: (x, z, r) => noises.push([x, z, r]),
    visuals: false,
  });
  return { state, player, combat, notices, noises, world };
}

const idle: CombatInput = { firing: false, arc: false, scan: false, weapon1: false, weapon2: false };
const input = (patch: Partial<CombatInput>): CombatInput => ({ ...idle, ...patch });

/** Avance joueur + combat de `dt`, comme le moteur. */
function step(s: ReturnType<typeof setup>, dt: number, patch: Partial<CombatInput> = {}) {
  s.player.update(dt, { x: 0, z: 0, sprint: false, crouch: false, aimYaw: null }, []);
  s.combat.update(dt, input(patch));
}

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

describe("D9", () => {
  it("dépense une balle par tir et respecte la cadence", () => {
    const s = setup();
    step(s, 0.016, { firing: true });
    expect(s.state.ammo).toBe(11);
    expect(s.noises).toEqual([[0, 0, WEAPONS.d9.noise]]);
    step(s, 0.1, { firing: true });
    expect(s.state.ammo).toBe(11);
    step(s, 0.15, { firing: true });
    expect(s.state.ammo).toBe(10);
    // Tir automatique : 1 s de gâchette ≈ 4 balles de plus.
    for (let i = 0; i < 60; i++) step(s, 1 / 60, { firing: true });
    expect(s.state.ammo).toBeGreaterThanOrEqual(5);
    expect(s.state.ammo).toBeLessThanOrEqual(6);
  });

  it("signale le chargeur vide sans répéter le message à chaque image", () => {
    const s = setup();
    s.state.ammo = 0;
    for (let i = 0; i < 30; i++) step(s, 1 / 60, { firing: true });
    expect(s.notices.filter((n) => n.startsWith("Chargeur vide"))).toHaveLength(1);
  });

  it("touche le zombie le plus proche, pas celui caché derrière un mur", () => {
    const near: FakeZombie = { id: "near", x: 0, z: 6, hp: 100, stun: 0 };
    const far: FakeZombie = { id: "far", x: 0, z: 10, hp: 100, stun: 0 };
    const s = setup({ zombies: [far, near] });
    step(s, 0.016, { firing: true });
    expect(near.hp).toBe(100 - WEAPONS.d9.damage);
    expect(far.hp).toBe(100);
    expect(near.stun).toBe(0);

    const hidden: FakeZombie = { id: "hidden", x: 0, z: 8, hp: 100, stun: 0 };
    const w = setup({ zombies: [hidden], colliders: [{ minX: -2, maxX: 2, minZ: 4, maxZ: 4.3 }] });
    step(w, 0.016, { firing: true });
    expect(hidden.hp).toBe(100);
    expect(w.state.ammo).toBe(11);
  });

  it("ne touche que dans la direction du lacet", () => {
    const side: FakeZombie = { id: "side", x: 5, z: 0, hp: 100, stun: 0 };
    const s = setup({ zombies: [side], yaw: Math.PI / 2 });
    step(s, 0.016, { firing: true });
    expect(side.hp).toBe(100 - WEAPONS.d9.damage);
  });
});

describe("ARC-3", () => {
  it("coûte 12 énergie, étourdit et électrocute", () => {
    const zb: FakeZombie = { id: "z", x: 0, z: 5, hp: 100, stun: 0 };
    const s = setup({ zombies: [zb] });
    step(s, 0.016, { arc: true });
    expect(s.state.energy).toBe(100 - WEAPONS.arc.energy);
    expect(zb.hp).toBe(100 - WEAPONS.arc.damage);
    expect(zb.stun).toBe(WEAPONS.arc.stun);
    expect(s.notices).toContain("ÉLECTROCUTÉ");
    expect(s.noises.at(-1)).toEqual([0, 0, WEAPONS.arc.noise]);
    expect(s.player.shotTime).toBeGreaterThan(0);
    expect(s.player.cooldown).toBeCloseTo(WEAPONS.arc.cooldown, 2);
    expect(s.state.ammo).toBe(12);
  });

  it("ne porte pas au-delà de 22 m", () => {
    const zb: FakeZombie = { id: "z", x: 0, z: 30, hp: 100, stun: 0 };
    const s = setup({ zombies: [zb] });
    step(s, 0.016, { arc: true });
    expect(zb.hp).toBe(100);
  });

  it("échoue sans énergie", () => {
    const zb: FakeZombie = { id: "z", x: 0, z: 5, hp: 100, stun: 0 };
    const s = setup({ zombies: [zb] });
    s.state.energy = 5;
    step(s, 0.016, { arc: true });
    expect(zb.hp).toBe(100);
    expect(s.state.energy).toBe(5);
    expect(s.notices).toContain("Énergie insuffisante · borne de recharge ou cellule");
    expect(s.noises).toHaveLength(0);
  });

  it("tire en continu à sa propre cadence quand elle est l'arme en main", () => {
    const s = setup();
    step(s, 0.016, { weapon2: true });
    expect(s.combat.weapon).toBe(1);
    for (let i = 0; i < 60; i++) step(s, 1 / 60, { firing: true });
    // 1 s à 0,52 s de cadence : 2 décharges, aucune balle.
    expect(s.state.energy).toBe(100 - 2 * WEAPONS.arc.energy);
    expect(s.state.ammo).toBe(12);
  });

  it("garde une pression faite pendant la cadence du D9", () => {
    const s = setup();
    step(s, 0.016, { firing: true });
    step(s, 0.016, { arc: true });
    expect(s.state.energy).toBe(100);
    for (let i = 0; i < 15; i++) step(s, 1 / 60);
    expect(s.state.energy).toBe(100 - WEAPONS.arc.energy);
  });

  it("met le verrou électrique hors tension", () => {
    // Boîtier à 6 m droit devant, avec sa boîte de collision.
    const box = { minX: DEVICE.x - DEVICE.radius, maxX: DEVICE.x + DEVICE.radius, minZ: DEVICE.z - DEVICE.radius * 0.8, maxZ: DEVICE.z + DEVICE.radius * 0.8 };
    const s = setup({ x: DEVICE.x + 0.5, z: DEVICE.z + 6, yaw: Math.PI, items: [DEVICE], colliders: [box] });
    expect(ARC_LOCK_RADIUS).toBeGreaterThan(0.5);
    step(s, 0.016, { arc: true });
    expect(s.state.facts).toContain("arc_lock_disabled");
    expect(s.state.memory).toContain("Le verrou ARC a été désactivé.");
    expect(s.notices).toContain("Verrou électrique hors tension.");
  });

  it("le D9 ne coupe pas le verrou, et un mur arrête la décharge avant le boîtier", () => {
    const d9 = setup({ x: DEVICE.x, z: DEVICE.z + 6, yaw: Math.PI, items: [DEVICE] });
    step(d9, 0.016, { firing: true });
    expect(d9.state.facts).not.toContain("arc_lock_disabled");

    const wall = { minX: DEVICE.x - 3, maxX: DEVICE.x + 3, minZ: DEVICE.z + 2, maxZ: DEVICE.z + 2.3 };
    const s = setup({ x: DEVICE.x, z: DEVICE.z + 6, yaw: Math.PI, items: [DEVICE], colliders: [wall] });
    step(s, 0.016, { arc: true });
    expect(s.state.facts).not.toContain("arc_lock_disabled");
    expect(s.state.energy).toBe(100 - WEAPONS.arc.energy);

    const wide = setup({ x: DEVICE.x + 1.5, z: DEVICE.z + 6, yaw: Math.PI, items: [DEVICE] });
    step(wide, 0.016, { arc: true });
    expect(wide.state.facts).not.toContain("arc_lock_disabled");
  });
});

describe("SCAN ÉCHO", () => {
  it("coûte 20 énergie, émet un bruit de 24 m et respecte sa cadence", () => {
    const s = setup();
    step(s, 0.016, { scan: true });
    expect(s.state.energy).toBe(100 - SCAN.energy);
    expect(s.noises).toEqual([[0, 0, 24]]);
    expect(s.notices).toContain("SCAN ÉCHO · signatures révélées");
    step(s, 1, { scan: true });
    expect(s.state.energy).toBe(80);
    step(s, 1.6, { scan: true });
    expect(s.state.energy).toBe(60);
  });

  it("échoue sans énergie", () => {
    const s = setup();
    s.state.energy = 19;
    step(s, 0.016, { scan: true });
    expect(s.state.energy).toBe(19);
    expect(s.notices).toEqual(["SCAN ÉCHO requiert 20 énergie · borne de recharge ou cellule"]);
    expect(s.noises).toHaveLength(0);
  });

  it("révèle la pièce cachée seulement à 18 m ou moins", () => {
    const far = setup({ x: SECRET.x + 18.5, z: SECRET.z });
    step(far, 0.016, { scan: true });
    expect(far.state.facts).not.toContain("secret_revealed");

    const near = setup({ x: SECRET.x + 17.5, z: SECRET.z });
    step(near, 0.016, { scan: true });
    expect(near.state.facts).toContain("secret_revealed");
    expect(near.notices).toContain("ÉCHO : un mur creux derrière les dortoirs. Une pièce cachée s'ouvre.");
  });

  it("marque objets et zombies proches pendant 5 s, et suit les zombies", () => {
    const px = KEY_DEF.x + 5;
    const pz = KEY_DEF.z;
    const close: FakeZombie = { id: "close", x: px + 3, z: pz + 3, hp: 100, stun: 0 };
    const distant: FakeZombie = { id: "distant", x: px, z: pz + 25, hp: 100, stun: 0 };
    // Le verrou électrique (infirmerie) est hors de portée.
    const s2 = setup({ x: px, z: pz, zombies: [close, distant], items: [KEY_DEF, DEVICE] });
    step(s2, 0.016, { scan: true });
    expect([...s2.combat.markedItems]).toEqual(["keycard"]);
    expect([...s2.combat.markedZombies]).toEqual(["close"]);
    close.hp = 0;
    step(s2, 0.1);
    expect(s2.combat.markedZombies.size).toBe(0);
    for (let i = 0; i < 6; i++) step(s2, 1);
    expect(s2.combat.markerTime).toBe(0);
    expect(s2.combat.markedItems.size).toBe(0);
  });
});

describe("armes", () => {
  it("bascule entre D9 et ARC-3 avec un message", () => {
    const s = setup();
    step(s, 0.016, { weapon2: true });
    expect(s.combat.weapon).toBe(1);
    expect(s.notices.at(-1)).toBe("ARC-3 · INDUCTION");
    step(s, 0.016, { weapon2: true });
    expect(s.notices).toHaveLength(1);
    step(s, 0.016, { weapon1: true });
    expect(s.combat.weapon).toBe(0);
    expect(s.notices.at(-1)).toBe("D9 · SERVICE");
  });
});
