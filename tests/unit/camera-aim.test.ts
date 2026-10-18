// Caméra en plongée et visée : nouveaux tests de la version vue de dessus.
import { describe, expect, it } from "vitest";
import { PerspectiveCamera, Vector3 } from "three";
import { CAMERA, CameraRig, cameraOffset, clampDistance, damp } from "@/game/camera";
import { AIM_HEIGHT, angleDifference, assistTarget, groundPoint, turnTowards, yawTowards } from "@/game/aim";

function rig() {
  const camera = new PerspectiveCamera(CAMERA.fov, 16 / 9, 0.5, 120);
  const r = new CameraRig(camera);
  r.snap(new Vector3(0, 0, 0));
  return { camera, r };
}

describe("caméra", () => {
  it("se place en plongée à environ 55° derrière le joueur", () => {
    const offset = cameraOffset(10);
    const pitch = (Math.atan2(offset.y, offset.z) * 180) / Math.PI;
    expect(pitch).toBeGreaterThan(50);
    expect(pitch).toBeLessThan(62);
    expect(offset.x).toBe(0);
    expect(offset.length()).toBeCloseTo(10);
  });

  it("regarde le joueur et le garde au centre de l'écran", () => {
    const { camera, r } = rig();
    r.snap(new Vector3(3, 0, -4));
    const projected = new Vector3(3, 0, -4).project(camera);
    expect(Math.abs(projected.x)).toBeLessThan(1e-6);
    expect(Math.abs(projected.y)).toBeLessThan(1e-6);
  });

  it("suit le joueur avec un lissage indépendant du nombre d'images", () => {
    const a = rig();
    const b = rig();
    const target = new Vector3(5, 0, 0);
    for (let i = 0; i < 60; i++) a.r.update(1 / 60, target, null);
    for (let i = 0; i < 30; i++) b.r.update(1 / 30, target, null);
    expect(a.r.focus.x).toBeCloseTo(b.r.focus.x, 5);
    expect(a.r.focus.x).toBeGreaterThan(4.9);
    const c = rig();
    c.r.update(1 / 60, target, null);
    expect(c.r.focus.x).toBeGreaterThan(0);
    expect(c.r.focus.x).toBeLessThan(0.5);
  });

  it("anticipe légèrement vers la visée, sans dépasser la limite", () => {
    const { r } = rig();
    for (let i = 0; i < 300; i++) r.update(1 / 60, new Vector3(0, 0, 0), new Vector3(0, AIM_HEIGHT, -40));
    expect(r.focus.z).toBeCloseTo(-CAMERA.lookAhead, 2);
  });

  it("zoome à la molette dans les bornes", () => {
    const { r } = rig();
    r.zoom(-100);
    expect(r.desiredDistance).toBe(CAMERA.minDistance);
    r.zoom(100);
    expect(r.desiredDistance).toBe(CAMERA.maxDistance);
    expect(clampDistance(-5)).toBe(CAMERA.minDistance);
    expect(damp(0, 10, 5, 0)).toBe(0);
  });
});

describe("visée", () => {
  it("projette le curseur sur le plan de tir", () => {
    const { camera, r } = rig();
    r.snap(new Vector3(2, 0, 3));
    const center = groundPoint(camera, 0, 0, AIM_HEIGHT)!;
    expect(center.y).toBeCloseTo(AIM_HEIGHT);
    // Le centre de l'écran vise le sol devant le joueur (la caméra regarde ses pieds).
    expect(center.x).toBeCloseTo(2, 5);
    const up = groundPoint(camera, 0, 0.8, AIM_HEIGHT)!;
    expect(up.z).toBeLessThan(center.z);
    const right = groundPoint(camera, 0.8, 0, AIM_HEIGHT)!;
    expect(right.x).toBeGreaterThan(center.x);
  });

  it("calcule le lacet vers le curseur et tourne progressivement", () => {
    expect(yawTowards(0, 0, 0, 1)).toBeCloseTo(0);
    expect(yawTowards(0, 0, 1, 0)).toBeCloseTo(Math.PI / 2);
    expect(Math.abs(yawTowards(0, 0, 0, -1))).toBeCloseTo(Math.PI);
    expect(angleDifference(3, -3)).toBeCloseTo(2 * Math.PI - 6);
    expect(turnTowards(0, 1, 0.25)).toBeCloseTo(0.25);
    expect(turnTowards(0, 0.1, 0.25)).toBeCloseTo(0.1);
    expect(turnTowards(3.0, -3.0, 0.1)).toBeCloseTo(3.1);
  });

  it("visée assistée : la cible la plus pertinente devant, en ligne de vue", () => {
    const targets = [
      { id: "derrière", x: 0, z: -3 },
      { id: "loin", x: 0.5, z: 10 },
      { id: "proche", x: 1.5, z: 3 },
      { id: "hors-portée", x: 0, z: 30 },
    ];
    expect(assistTarget(0, 0, 0, targets)?.id).toBe("proche");
    expect(assistTarget(0, 0, 0, targets, 11, 75, (t) => t.id !== "proche")?.id).toBe("loin");
    expect(assistTarget(0, 0, Math.PI, targets)?.id).toBe("derrière");
    expect(assistTarget(0, 0, Math.PI / 2, [{ id: "a", x: 0, z: 5 }], 11, 30)).toBeNull();
  });
});
