// Effets du combat, façon dessin animé et bon marché : clous du lance-clous, impacts, « bonk » de la clé à molette,
// éclair de la lampe. Tout est mis en commun (pools) : aucune allocation par image.
import {
  AdditiveBlending, BufferAttribute, BufferGeometry, ConeGeometry, DoubleSide, Group, IcosahedronGeometry,
  Mesh, MeshBasicMaterial, OctahedronGeometry, PointLight, RingGeometry, CircleGeometry, Vector3, type ColorRepresentation,
} from "three";

export type ImpactKind = "zombie" | "wall";

interface Tracer { mesh: Mesh; material: MeshBasicMaterial; life: number; age: number; from: Vector3; to: Vector3; }
interface Spark { mesh: Mesh; vel: Vector3; life: number; max: number; size: number; }
interface Puff { mesh: Mesh; material: MeshBasicMaterial; life: number; max: number; size: number; }
interface Splat { mesh: Mesh; material: MeshBasicMaterial; life: number; }
interface Ring { mesh: Mesh; material: MeshBasicMaterial; life: number; }

/** Un clou vole vite : trait court qui file du canon à l'impact (m/s), puis s'efface. */
const NAIL_SPEED = 160;
const TRACER_FADE = 0.04;
const NAIL_LENGTH = 1.1;
const RING_LIFE = 0.22;
/** Lampe : portée et demi-angle du cône (mêmes valeurs que le combat). */
export const DAZZLE_CONE = { range: 8, halfAngle: (20 * Math.PI) / 180, life: 0.25 };

/** Quadrilatère plat (plan XZ) de z = 0 à z = 1, dégradé acier de la queue à la pointe. */
function streakGeometry(): BufferGeometry {
  const g = new BufferGeometry();
  g.setAttribute("position", new BufferAttribute(new Float32Array([-0.5, 0, 0, 0.5, 0, 0, -0.5, 0, 1, 0.5, 0, 1]), 3));
  g.setAttribute("color", new BufferAttribute(new Float32Array([0.45, 0.5, 0.55, 0.45, 0.5, 0.55, 1, 1, 1, 1, 1, 1]), 3));
  g.setIndex([0, 2, 1, 1, 2, 3]);
  return g;
}

export class CombatFx {
  readonly root = new Group();
  private tracers: Tracer[] = [];
  private sparks: Spark[] = [];
  private puffs: Puff[] = [];
  private splats: Splat[] = [];
  private rings: Ring[] = [];
  private sparkMaterials: Record<"green" | "dark" | "grey" | "hot" | "white", MeshBasicMaterial>;
  private cone: Mesh;
  private coneMaterial: MeshBasicMaterial;
  private coneLife = 0;
  private light: PointLight;
  private lightLife = 0;
  private low = false;
  private sparkCursor = 0;
  private readonly tmp = new Vector3();

  constructor() {
    this.root.name = "combat-fx";
    const streak = streakGeometry();
    for (let i = 0; i < 6; i++) {
      const material = new MeshBasicMaterial({
        color: "#e8eef2", vertexColors: true, transparent: true, opacity: 0,
        depthWrite: false, toneMapped: false, side: DoubleSide, fog: false,
      });
      const mesh = new Mesh(streak, material);
      mesh.visible = false;
      mesh.renderOrder = 5;
      this.root.add(mesh);
      this.tracers.push({ mesh, material, life: 0, age: 0, from: new Vector3(), to: new Vector3() });
    }
    this.sparkMaterials = {
      green: new MeshBasicMaterial({ color: "#a8e85a", toneMapped: false }),
      dark: new MeshBasicMaterial({ color: "#2e3b1c" }),
      grey: new MeshBasicMaterial({ color: "#a39d90" }),
      hot: new MeshBasicMaterial({ color: "#ffd27a", toneMapped: false }),
      white: new MeshBasicMaterial({ color: "#fff6d8", toneMapped: false }),
    };
    const sparkGeometry = new OctahedronGeometry(1, 0);
    for (let i = 0; i < 40; i++) {
      const mesh = new Mesh(sparkGeometry, this.sparkMaterials.hot);
      mesh.visible = false;
      this.root.add(mesh);
      this.sparks.push({ mesh, vel: new Vector3(), life: 0, max: 1, size: 0.05 });
    }
    const puffGeometry = new IcosahedronGeometry(1, 1);
    for (let i = 0; i < 6; i++) {
      const material = new MeshBasicMaterial({ color: "#a39d90", transparent: true, opacity: 0, depthWrite: false });
      const mesh = new Mesh(puffGeometry, material);
      mesh.visible = false;
      this.root.add(mesh);
      this.puffs.push({ mesh, material, life: 0, max: 1, size: 0.3 });
    }
    const splatGeometry = new CircleGeometry(1, 9);
    splatGeometry.rotateX(-Math.PI / 2);
    for (let i = 0; i < 8; i++) {
      const material = new MeshBasicMaterial({ color: "#26331a", transparent: true, opacity: 0, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
      const mesh = new Mesh(splatGeometry, material);
      mesh.visible = false;
      this.root.add(mesh);
      this.splats.push({ mesh, material, life: 0 });
    }
    // Anneau du « bonk » : cercle vif qui s'élargit face à la caméra (posé à plat, vu de dessus).
    const ringGeometry = new RingGeometry(0.7, 1, 20);
    ringGeometry.rotateX(-Math.PI / 2);
    for (let i = 0; i < 3; i++) {
      const material = new MeshBasicMaterial({ color: "#fff1b0", transparent: true, opacity: 0, depthWrite: false, toneMapped: false, side: DoubleSide, fog: false });
      const mesh = new Mesh(ringGeometry, material);
      mesh.visible = false;
      mesh.renderOrder = 6;
      this.root.add(mesh);
      this.rings.push({ mesh, material, life: 0 });
    }
    // Cône de la lampe : pointe au joueur, ouvert vers l'avant (+Z local), en lumière additive.
    const length = DAZZLE_CONE.range;
    const coneGeometry = new ConeGeometry(Math.tan(DAZZLE_CONE.halfAngle) * length, length, 24, 1, true);
    coneGeometry.translate(0, -length / 2, 0);
    coneGeometry.rotateX(-Math.PI / 2);
    this.coneMaterial = new MeshBasicMaterial({
      color: "#fff3c4", transparent: true, opacity: 0, depthWrite: false, toneMapped: false,
      side: DoubleSide, blending: AdditiveBlending, fog: false,
    });
    this.cone = new Mesh(coneGeometry, this.coneMaterial);
    this.cone.visible = false;
    this.cone.renderOrder = 7;
    this.cone.frustumCulled = false;
    this.root.add(this.cone);
    // Lumière d'éclat toujours présente (intensité nulle au repos) : pas de recompilation des shaders.
    this.light = new PointLight("#ffb15a", 0, 6, 1.8);
    this.root.add(this.light);
  }

  setLowQuality(low: boolean): void {
    this.low = low;
  }

  /** Éclat lumineux bref (bouche du lance-clous, lampe). */
  flash(at: Vector3, color: ColorRepresentation, strength: number, life = 0.07): void {
    this.light.position.copy(at);
    this.light.color.set(color);
    this.light.intensity = strength;
    this.lightLife = life;
  }

  /** Clou en vol : trait fin et court qui file de `from` à `to`. */
  tracer(from: Vector3, to: Vector3): void {
    const t = this.tracers.find((x) => x.life <= 0) ?? this.tracers[0];
    const length = from.distanceTo(to);
    if (length < 0.05) return;
    t.age = 0;
    t.life = Math.max(0, length - NAIL_LENGTH) / NAIL_SPEED + TRACER_FADE;
    t.from.copy(from);
    t.to.copy(to);
    t.mesh.visible = true;
    t.material.opacity = 1;
    this.placeTracer(t);
  }

  impact(x: number, y: number, z: number, kind: ImpactKind, backX = 0, backZ = 0): void {
    const count = this.low ? 4 : 8;
    for (let i = 0; i < count; i++) {
      const material = kind === "zombie" ? (i % 3 === 0 ? this.sparkMaterials.dark : this.sparkMaterials.green)
        : i % 2 === 0 ? this.sparkMaterials.grey : this.sparkMaterials.hot;
      const speed = kind === "wall" ? 2.2 + Math.random() * 2.2 : 1.6 + Math.random() * 2.6;
      // Gerbe orientée vers le tireur, avec de l'éparpillement.
      const angle = Math.random() * Math.PI * 2;
      this.spark(material, x, y, z, backX * speed * 0.8 + Math.cos(angle) * speed * 0.6, 1.2 + Math.random() * 2.4, backZ * speed * 0.8 + Math.sin(angle) * speed * 0.6, kind === "zombie" && i % 3 === 0 ? 0.075 : 0.045);
    }
    const p = this.puffs.find((x) => x.life <= 0) ?? this.puffs[0];
    p.material.color.set(kind === "zombie" ? "#5d7a2c" : "#b9b2a3");
    p.max = p.life = 0.35;
    p.size = kind === "wall" ? 0.32 : 0.4;
    p.mesh.position.set(x, y, z);
    p.mesh.scale.setScalar(p.size * 0.3);
    p.mesh.visible = true;
    if (kind === "zombie") this.splat(x - backX * 0.3, z - backZ * 0.3);
  }

  /** Coup de clé à molette qui porte : anneau d'étoiles et étincelles en couronne. */
  bonk(x: number, y: number, z: number): void {
    const ring = this.rings.find((r) => r.life <= 0) ?? this.rings[0];
    ring.life = RING_LIFE;
    ring.mesh.position.set(x, y, z);
    ring.mesh.scale.setScalar(0.15);
    ring.material.opacity = 1;
    ring.mesh.visible = true;
    const count = this.low ? 5 : 9;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.3;
      const speed = 2.4 + Math.random() * 1.2;
      this.spark(i % 2 === 0 ? this.sparkMaterials.white : this.sparkMaterials.hot, x, y, z, Math.cos(angle) * speed, 1.4 + Math.random(), Math.sin(angle) * speed, 0.05);
    }
  }

  /** Éclat de la lampe : cône lumineux devant le joueur pendant 0,25 s. */
  dazzle(x: number, z: number, yaw: number, height = 1.1): void {
    this.coneLife = DAZZLE_CONE.life;
    this.cone.position.set(x + Math.sin(yaw) * 0.35, height, z + Math.cos(yaw) * 0.35);
    this.cone.rotation.set(0, yaw, 0);
    this.cone.visible = true;
    this.coneMaterial.opacity = 0.55;
    this.tmp.set(x + Math.sin(yaw) * 1.2, height, z + Math.cos(yaw) * 1.2);
    this.flash(this.tmp, "#fff3c4", 6, DAZZLE_CONE.life);
  }

  get dazzleVisible(): boolean {
    return this.cone.visible;
  }

  update(dt: number): void {
    if (this.lightLife > 0) {
      this.lightLife -= dt;
      if (this.lightLife <= 0) this.light.intensity = 0;
      else this.light.intensity *= 0.8;
    }
    for (const t of this.tracers) {
      if (t.life <= 0) continue;
      t.life -= dt;
      t.age += dt;
      if (t.life <= 0) t.mesh.visible = false;
      else this.placeTracer(t);
    }
    for (const s of this.sparks) {
      if (s.life <= 0) continue;
      s.life -= dt;
      if (s.life <= 0) {
        s.mesh.visible = false;
        continue;
      }
      s.vel.y -= 9 * dt;
      s.mesh.position.addScaledVector(s.vel, dt);
      if (s.mesh.position.y < 0.03) {
        s.mesh.position.y = 0.03;
        s.vel.set(s.vel.x * 0.4, Math.abs(s.vel.y) * 0.3, s.vel.z * 0.4);
      }
      s.mesh.scale.setScalar(s.size * (0.3 + 0.7 * (s.life / s.max)));
    }
    for (const p of this.puffs) {
      if (p.life <= 0) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.mesh.visible = false;
        continue;
      }
      const k = 1 - p.life / p.max;
      p.mesh.scale.setScalar(p.size * (0.3 + 0.9 * Math.sqrt(k)));
      p.mesh.position.y += dt * 0.4;
      p.material.opacity = 0.85 * (1 - k);
    }
    for (const s of this.splats) {
      if (s.life <= 0) continue;
      s.life -= dt;
      if (s.life <= 0) s.mesh.visible = false;
      else s.material.opacity = 0.75 * Math.min(1, s.life);
    }
    for (const r of this.rings) {
      if (r.life <= 0) continue;
      r.life -= dt;
      if (r.life <= 0) {
        r.mesh.visible = false;
        continue;
      }
      const k = 1 - r.life / RING_LIFE;
      r.mesh.scale.setScalar(0.15 + 0.5 * Math.sqrt(k));
      r.material.opacity = 1 - k * k;
    }
    if (this.coneLife > 0) {
      this.coneLife -= dt;
      if (this.coneLife <= 0) this.cone.visible = false;
      else this.coneMaterial.opacity = 0.55 * (this.coneLife / DAZZLE_CONE.life);
    }
  }

  private spark(material: MeshBasicMaterial, x: number, y: number, z: number, vx: number, vy: number, vz: number, size: number): void {
    const s = this.sparks[this.sparkCursor];
    this.sparkCursor = (this.sparkCursor + 1) % this.sparks.length;
    s.mesh.material = material;
    s.vel.set(vx, vy, vz);
    s.mesh.position.set(x, y, z);
    s.mesh.rotation.set(Math.random() * 3, Math.random() * 3, 0);
    s.max = s.life = 0.25 + Math.random() * 0.25;
    s.size = size;
    s.mesh.scale.setScalar(size);
    s.mesh.visible = true;
  }

  private splat(x: number, z: number): void {
    const splat = this.splats.find((s) => s.life <= 0) ?? this.splats[0];
    splat.life = 4;
    splat.mesh.position.set(x, 0.025, z);
    splat.mesh.rotation.y = Math.random() * Math.PI;
    splat.mesh.scale.set(0.3 + Math.random() * 0.2, 1, 0.22 + Math.random() * 0.15);
    splat.mesh.visible = true;
  }

  /** Le trait avance avec le temps : la pointe va du canon à l'impact, la queue suit à NAIL_LENGTH. */
  private placeTracer(t: Tracer): void {
    const length = t.from.distanceTo(t.to);
    const head = Math.min(length, NAIL_LENGTH + NAIL_SPEED * t.age);
    const tail = Math.max(0, head - NAIL_LENGTH);
    this.tmp.subVectors(t.to, t.from).divideScalar(length);
    t.mesh.position.copy(t.from).addScaledVector(this.tmp, tail);
    t.mesh.lookAt(this.tmp.multiplyScalar(head).add(t.from));
    t.mesh.scale.set(0.05, 1, Math.max(0.01, head - tail));
    t.material.opacity = Math.min(1, t.life / TRACER_FADE);
  }
}
