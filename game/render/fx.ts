// Effets du combat, façon jouet en pâte à modeler et bon marché : clous du lance-clous, impacts, « BONK » de la clé
// à molette, éclair de la lampe, étoiles d'étourdissement, poufs de mort et étiquettes de ramassage.
// Tout est mis en commun (pools) : aucune allocation par image. La qualité basse réduit le nombre de particules.
import {
  AdditiveBlending, BufferAttribute, BufferGeometry, CanvasTexture, ConeGeometry, DoubleSide, Group, IcosahedronGeometry,
  Color, Mesh, MeshBasicMaterial, OctahedronGeometry, PlaneGeometry, PointLight, Points, PointsMaterial, RingGeometry,
  ShaderMaterial, Sprite, SpriteMaterial, Vector3, type ColorRepresentation, type Texture,
} from "three";
import { CAMERA } from "../camera";

export type ImpactKind = "zombie" | "wall";

interface Tracer { core: Mesh; glow: Mesh; coreMat: MeshBasicMaterial; glowMat: MeshBasicMaterial; life: number; length: number; }
interface Spark { mesh: Mesh; vel: Vector3; life: number; max: number; size: number; }
interface Star { mesh: Mesh; material: MeshBasicMaterial; vel: Vector3; life: number; max: number; size: number; spin: number; gravity: number; }
interface Puff { mesh: Mesh; material: MeshBasicMaterial; vel: Vector3; life: number; max: number; size: number; grow: number; opacity: number; }
interface Decal { mesh: Mesh; material: MeshBasicMaterial; life: number; max: number; opacity: number; }
interface Scrap { mesh: Mesh; vel: Vector3; spin: Vector3; life: number; resting: boolean; }
interface Ring { mesh: Mesh; material: MeshBasicMaterial; outline: MeshBasicMaterial; life: number; size: number; }
interface Label { sprite: Sprite; material: SpriteMaterial; canvas: HTMLCanvasElement; texture: CanvasTexture; life: number; max: number; width: number; rise: number; base: Vector3; }
interface Dizzy { root: Group; stars: Mesh[]; swirl: Mesh; id: string; life: number; height: number; }

/** Le clou laisse un trait complet du canon à l'impact pendant 2 à 3 images, qui s'efface. */
const TRACER_LIFE = 0.1;
const RING_LIFE = 0.24;
/** Lampe : portée et demi-angle du cône (mêmes valeurs que le combat). */
export const DAZZLE_CONE = { range: 8, halfAngle: (20 * Math.PI) / 180, life: 0.25 };
/** Flaque de lumière au sol et poussières : elles survivent un peu à l'éclair. */
const POOL_LIFE = 0.5;
const BEAM_OPACITY = 0.45;
const POOL_OPACITY = 0.5;
const MOTE_LIFE = 0.9;
const MOTES = 28;
const LABEL_LIFE = 1.15;
const BONK_LIFE = 0.5;
/** Inclinaison des effets « face caméra » (étoiles, anneau) : plan perpendiculaire à l'axe de la caméra. */
const FACE_TILT = -(CAMERA.pitchDeg * Math.PI) / 180;

/** Pose des couleurs par sommet (RVB 0–1) sur une géométrie. */
function paint(g: BufferGeometry, color: (i: number) => [number, number, number]): BufferGeometry {
  const n = g.getAttribute("position").count;
  const colors = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) colors.set(color(i), i * 3);
  g.setAttribute("color", new BufferAttribute(colors, 3));
  return g;
}

/** Ruban plat (plan XZ) de z = 0 à z = 1 ; couleur de la queue (z = 0) à la pointe (z = 1). */
function streakGeometry(tail: [number, number, number], head: [number, number, number]): BufferGeometry {
  const g = new BufferGeometry();
  g.setAttribute("position", new BufferAttribute(new Float32Array([-0.5, 0, 0, 0.5, 0, 0, -0.5, 0, 1, 0.5, 0, 1]), 3));
  g.setIndex([0, 2, 1, 1, 2, 3]);
  return paint(g, (i) => (i < 2 ? tail : head));
}

/** Étoile plate à `points` branches (plan XY, normale +Z), centre plus clair. */
function starGeometry(points: number, inner: number, center: [number, number, number], edge: [number, number, number]): BufferGeometry {
  const pos = [0, 0, 0];
  const index: number[] = [];
  const n = points * 2;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + Math.PI / 2;
    const r = i % 2 === 0 ? 1 : inner;
    pos.push(Math.cos(a) * r, Math.sin(a) * r, 0);
    index.push(0, 1 + i, 1 + ((i + 1) % n));
  }
  const g = new BufferGeometry();
  g.setAttribute("position", new BufferAttribute(new Float32Array(pos), 3));
  g.setIndex(index);
  return paint(g, (i) => (i === 0 ? center : edge));
}

/** Couronne dentelée de bande dessinée (plan XY) : bord intérieur rond, bord extérieur en pointes. */
function burstGeometry(spikes: number): BufferGeometry {
  const pos: number[] = [];
  const index: number[] = [];
  const n = spikes * 2;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const outer = i % 2 === 0 ? 1 : 0.78;
    pos.push(Math.cos(a) * 0.6, Math.sin(a) * 0.6, 0, Math.cos(a) * outer, Math.sin(a) * outer, 0);
    const j = (i + 1) % n;
    index.push(i * 2, i * 2 + 1, j * 2 + 1, i * 2, j * 2 + 1, j * 2);
  }
  const g = new BufferGeometry();
  g.setAttribute("position", new BufferAttribute(new Float32Array(pos), 3));
  g.setIndex(index);
  return paint(g, (i) => (i % 2 === 0 ? [1, 0.96, 0.8] : [0.96, 0.52, 0.16]));
}

/** Tache de bave verte posée au sol (plan XZ) : bord ondulé et gouttelettes, centre plus clair. */
function gooGeometry(): BufferGeometry {
  const pos: number[] = [];
  const index: number[] = [];
  const colors: number[] = [];
  const blob = (cx: number, cz: number, radius: number, segments: number, wobble: number) => {
    const base = pos.length / 3;
    pos.push(cx, 0, cz);
    colors.push(0.36, 0.45, 0.17);
    for (let i = 0; i < segments; i++) {
      const a = (i / segments) * Math.PI * 2;
      const r = radius * (1 + wobble * (0.6 * Math.sin(a * 3 + 1) + 0.4 * Math.sin(a * 7 + 0.3)));
      pos.push(cx + Math.cos(a) * r, 0, cz + Math.sin(a) * r);
      colors.push(0.2, 0.27, 0.1);
      index.push(base, base + 1 + ((i + 1) % segments), base + 1 + i);
    }
  };
  blob(0, 0, 1, 26, 0.22);
  blob(1.45, 0.35, 0.2, 8, 0);
  blob(-1.25, 0.7, 0.14, 7, 0);
  blob(0.3, -1.4, 0.17, 7, 0);
  const g = new BufferGeometry();
  g.setAttribute("position", new BufferAttribute(new Float32Array(pos), 3));
  g.setAttribute("color", new BufferAttribute(new Float32Array(colors), 3));
  g.setIndex(index);
  return g;
}

/** Ébréchure de mur (plan XY, normale +Z) : étoile irrégulière sombre, bord poussiéreux. */
function chipGeometry(): BufferGeometry {
  const g = starGeometry(5, 0.42, [0.2, 0.19, 0.17], [0.47, 0.44, 0.4]);
  const p = g.getAttribute("position") as BufferAttribute;
  // Branches inégales : la fissure ne doit pas ressembler à une étoile.
  const lengths = [1, 0.6, 0.85, 0.5, 0.95, 0.7, 0.8, 0.55, 1.05, 0.65];
  for (let i = 1; i < p.count; i++) p.setXY(i, p.getX(i) * lengths[i - 1], p.getY(i) * lengths[i - 1]);
  return g;
}

/** Cône de la lampe : pointe au joueur, ouvert vers +Z. */
function beamGeometry(): BufferGeometry {
  const length = DAZZLE_CONE.range;
  const g = new ConeGeometry(Math.tan(DAZZLE_CONE.halfAngle) * length, length, 24, 4, true);
  g.translate(0, -length / 2, 0);
  g.rotateX(-Math.PI / 2);
  return g;
}

/**
 * Faisceau doux (GLSL ES 1.0, WebGL 1 et 2) : s'éteint vers le bout du cône et sur les bords vus de profil
 * (les faces rasantes), pour éviter la silhouette dure d'un cône plein. Mélange additif.
 */
function beamMaterial(): ShaderMaterial {
  return new ShaderMaterial({
    uniforms: { color: { value: new Color("#f2fbff") }, opacity: { value: 0 }, range: { value: DAZZLE_CONE.range } },
    vertexShader: `
      uniform float range;
      varying float vAlong;
      varying vec3 vNormal;
      varying vec3 vView;
      void main() {
        vAlong = clamp(position.z / range, 0.0, 1.0);
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vNormal = normalize(normalMatrix * normal);
        vView = -mv.xyz;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      uniform vec3 color;
      uniform float opacity;
      varying float vAlong;
      varying vec3 vNormal;
      varying vec3 vView;
      void main() {
        float facing = abs(dot(normalize(vNormal), normalize(vView)));
        float fall = (1.0 - vAlong) * (1.0 - vAlong);
        float a = opacity * fall * facing * facing * smoothstep(0.0, 0.08, vAlong);
        gl_FragColor = vec4(color * a, 1.0);
      }`,
    transparent: true, depthWrite: false, side: DoubleSide, blending: AdditiveBlending, toneMapped: false, fog: false,
  });
}

/** Flaque de lumière au sol (plan XZ, éventail vers +Z) : douce sur les bords et au loin. */
function poolGeometry(): BufferGeometry {
  const rows = 6;
  const cols = 10;
  const length = DAZZLE_CONE.range;
  const half = DAZZLE_CONE.halfAngle * 1.05;
  const pos: number[] = [];
  const colors: number[] = [];
  const index: number[] = [];
  for (let r = 0; r <= rows; r++) {
    const t = r / rows;
    const d = 0.2 + t * (length - 0.2);
    for (let c = 0; c <= cols; c++) {
      const s = c / cols;
      const a = -half + s * half * 2;
      pos.push(Math.sin(a) * d, 0, Math.cos(a) * d);
      const edge = Math.sin(s * Math.PI);
      const v = edge * edge * (1 - t) ** 1.6 * Math.min(1, t * 5 + 0.2);
      colors.push(v, v, v);
    }
  }
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const a = r * (cols + 1) + c;
      const b = a + cols + 1;
      index.push(a, b, a + 1, a + 1, b, b + 1);
    }
  }
  const g = new BufferGeometry();
  g.setAttribute("position", new BufferAttribute(new Float32Array(pos), 3));
  g.setAttribute("color", new BufferAttribute(new Float32Array(colors), 3));
  g.setIndex(index);
  return g;
}

/** Point rond et doux pour les poussières (canvas : absent hors navigateur). */
function dotTexture(): Texture | null {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 32;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const g = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.4, "rgba(255,255,255,0.6)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 32, 32);
  return new CanvasTexture(canvas);
}

const SCRAP_COLORS = ["#5f8f8a", "#9c6b3f", "#e2d6bb", "#6b7d3a"];

export class CombatFx {
  readonly root = new Group();
  private tracers: Tracer[] = [];
  private sparks: Spark[] = [];
  private stars: Star[] = [];
  private puffs: Puff[] = [];
  private splats: Decal[] = [];
  private chips: Decal[] = [];
  private scraps: Scrap[] = [];
  private rings: Ring[] = [];
  private labels: Label[] = [];
  private dizzies: Dizzy[] = [];
  private sparkMaterials: Record<"green" | "dark" | "grey" | "hot" | "white" | "brass", MeshBasicMaterial>;
  private cone: Mesh;
  private coneMaterial: ShaderMaterial;
  private coneLife = 0;
  private pool: Mesh;
  private poolMaterial: MeshBasicMaterial;
  private poolLife = 0;
  private motes: Points;
  private moteMaterial: PointsMaterial;
  private motePositions: Float32Array;
  private moteVel: Float32Array;
  private moteLife = 0;
  private light: PointLight;
  private lightLife = 0;
  private low = false;
  private sparkCursor = 0;
  private starCursor = 0;
  private puffCursor = 0;
  private scrapCursor = 0;
  private splatCursor = 0;
  private chipCursor = 0;
  private labelCursor = 0;
  private readonly tmp = new Vector3();

  constructor() {
    this.root.name = "combat-fx";
    // Clous : âme acier → blanc, halo chaud additif plus large.
    const core = streakGeometry([0.42, 0.46, 0.5], [1, 1, 1]);
    const glow = streakGeometry([0.15, 0.08, 0.02], [1, 0.75, 0.4]);
    for (let i = 0; i < 6; i++) {
      const coreMat = new MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0, depthWrite: false, toneMapped: false, side: DoubleSide, fog: false });
      const glowMat = new MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0, depthWrite: false, toneMapped: false, side: DoubleSide, fog: false, blending: AdditiveBlending });
      const c = new Mesh(core, coreMat);
      const g = new Mesh(glow, glowMat);
      c.visible = g.visible = false;
      c.renderOrder = 6;
      g.renderOrder = 5;
      c.frustumCulled = g.frustumCulled = false;
      this.root.add(g, c);
      this.tracers.push({ core: c, glow: g, coreMat, glowMat, life: 0, length: 0 });
    }
    this.sparkMaterials = {
      green: new MeshBasicMaterial({ color: "#7d9a3a", toneMapped: false }),
      dark: new MeshBasicMaterial({ color: "#2e3b1c" }),
      grey: new MeshBasicMaterial({ color: "#a39d90" }),
      hot: new MeshBasicMaterial({ color: "#ffd27a", toneMapped: false }),
      white: new MeshBasicMaterial({ color: "#fff6d8", toneMapped: false }),
      brass: new MeshBasicMaterial({ color: "#c9a24a", toneMapped: false }),
    };
    const sparkGeometry = new OctahedronGeometry(1, 0);
    for (let i = 0; i < 48; i++) {
      const mesh = new Mesh(sparkGeometry, this.sparkMaterials.hot);
      mesh.visible = false;
      this.root.add(mesh);
      this.sparks.push({ mesh, vel: new Vector3(), life: 0, max: 1, size: 0.05 });
    }
    // Étoiles « dessin animé » (coup de clé, ramassage, bouche du lance-clous).
    const starGeo = starGeometry(5, 0.45, [1, 1, 0.92], [1, 0.8, 0.3]);
    for (let i = 0; i < 16; i++) {
      // Au premier plan, comme la couronne : une étoile cachée par le zombie ne sert à rien.
      const material = new MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 1, depthWrite: false, depthTest: false, toneMapped: false, side: DoubleSide, fog: false });
      const mesh = new Mesh(starGeo, material);
      mesh.visible = false;
      mesh.renderOrder = 7;
      this.root.add(mesh);
      this.stars.push({ mesh, material, vel: new Vector3(), life: 0, max: 1, size: 0.1, spin: 0, gravity: 0 });
    }
    const puffGeometry = new IcosahedronGeometry(1, 1);
    for (let i = 0; i < 16; i++) {
      const material = new MeshBasicMaterial({ color: "#a39d90", transparent: true, opacity: 0, depthWrite: false });
      const mesh = new Mesh(puffGeometry, material);
      mesh.visible = false;
      this.root.add(mesh);
      this.puffs.push({ mesh, material, vel: new Vector3(), life: 0, max: 1, size: 0.3, grow: 0.9, opacity: 0.85 });
    }
    const goo = gooGeometry();
    for (let i = 0; i < 10; i++) {
      const material = new MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
      const mesh = new Mesh(goo, material);
      mesh.visible = false;
      mesh.renderOrder = 1;
      this.root.add(mesh);
      this.splats.push({ mesh, material, life: 0, max: 1, opacity: 0.9 });
    }
    const chip = chipGeometry();
    for (let i = 0; i < 10; i++) {
      const material = new MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, side: DoubleSide });
      const mesh = new Mesh(chip, material);
      mesh.visible = false;
      this.root.add(mesh);
      this.chips.push({ mesh, material, life: 0, max: 1, opacity: 0.9 });
    }
    // Lambeaux de vêtement (mort d'un zombie) : petits carrés qui virevoltent puis restent au sol.
    const scrapGeometry = new PlaneGeometry(1, 0.7);
    const scrapMaterials = SCRAP_COLORS.map((color) => new MeshBasicMaterial({ color, side: DoubleSide, transparent: true }));
    for (let i = 0; i < 12; i++) {
      const mesh = new Mesh(scrapGeometry, scrapMaterials[i % scrapMaterials.length]);
      mesh.visible = false;
      this.root.add(mesh);
      this.scraps.push({ mesh, vel: new Vector3(), spin: new Vector3(), life: 0, resting: false });
    }
    // Couronne du « BONK » : dentelée, face caméra.
    const burst = burstGeometry(10);
    for (let i = 0; i < 3; i++) {
      // Toujours au premier plan : le zombie touché ne doit pas cacher le « BONK ».
      const material = new MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0, depthWrite: false, depthTest: false, toneMapped: false, side: DoubleSide, fog: false });
      const mesh = new Mesh(burst, material);
      mesh.visible = false;
      mesh.renderOrder = 9;
      // Contour brun foncé (même forme, un peu plus grande, derrière) : trait de bande dessinée.
      const outline = new MeshBasicMaterial({ color: "#3d2414", transparent: true, opacity: 0, depthWrite: false, depthTest: false, side: DoubleSide, fog: false });
      const back = new Mesh(burst, outline);
      back.scale.setScalar(1.12);
      back.renderOrder = 8;
      mesh.add(back);
      this.root.add(mesh);
      this.rings.push({ mesh, material, outline, life: 0, size: 1 });
    }
    // Lampe : cône lumineux additif + flaque au sol + poussières en suspension.
    this.coneMaterial = beamMaterial();
    this.cone = new Mesh(beamGeometry(), this.coneMaterial);
    this.cone.visible = false;
    this.cone.renderOrder = 7;
    this.cone.frustumCulled = false;
    this.root.add(this.cone);
    this.poolMaterial = new MeshBasicMaterial({
      color: "#e6f9ff", vertexColors: true, transparent: true, opacity: 0, depthWrite: false, toneMapped: false,
      blending: AdditiveBlending, fog: false, polygonOffset: true, polygonOffsetFactor: -1,
    });
    this.pool = new Mesh(poolGeometry(), this.poolMaterial);
    this.pool.visible = false;
    this.pool.renderOrder = 2;
    this.pool.frustumCulled = false;
    this.root.add(this.pool);
    this.motePositions = new Float32Array(MOTES * 3);
    this.moteVel = new Float32Array(MOTES * 3);
    const moteGeometry = new BufferGeometry();
    moteGeometry.setAttribute("position", new BufferAttribute(this.motePositions, 3));
    this.moteMaterial = new PointsMaterial({
      color: "#fff9e8", size: 0.14, sizeAttenuation: true, transparent: true, opacity: 0, depthWrite: false,
      toneMapped: false, blending: AdditiveBlending, fog: false, map: dotTexture(),
    });
    this.motes = new Points(moteGeometry, this.moteMaterial);
    this.motes.visible = false;
    this.motes.frustumCulled = false;
    this.motes.renderOrder = 8;
    this.root.add(this.motes);
    // Étoiles qui tournent au-dessus d'un zombie ébloui + petite spirale.
    const dizzyStar = starGeometry(5, 0.45, [1, 1, 0.85], [1, 0.84, 0.3]);
    const swirlGeometry = new RingGeometry(0.26, 0.31, 20, 1, 0, Math.PI * 1.4);
    swirlGeometry.rotateX(-Math.PI / 2);
    const starMaterial = new MeshBasicMaterial({ vertexColors: true, depthWrite: false, toneMapped: false, side: DoubleSide, fog: false, transparent: true });
    const swirlMaterial = new MeshBasicMaterial({ color: "#c8f4ff", depthWrite: false, toneMapped: false, side: DoubleSide, fog: false, transparent: true, opacity: 0.85 });
    for (let i = 0; i < 6; i++) {
      const root = new Group();
      root.visible = false;
      const stars: Mesh[] = [];
      for (let j = 0; j < 3; j++) {
        const star = new Mesh(dizzyStar, starMaterial);
        star.scale.setScalar(0.12);
        star.renderOrder = 8;
        root.add(star);
        stars.push(star);
      }
      const swirl = new Mesh(swirlGeometry, swirlMaterial);
      swirl.renderOrder = 8;
      root.add(swirl);
      this.root.add(root);
      this.dizzies.push({ root, stars, swirl, id: "", life: 0, height: 1.8 });
    }
    // Étiquettes en papier (« +1 ⚙ », « BONK ! ») : le canvas n'existe que dans le navigateur.
    if (typeof document !== "undefined") {
      for (let i = 0; i < 5; i++) {
        const canvas = document.createElement("canvas");
        canvas.width = 256;
        canvas.height = 96;
        const texture = new CanvasTexture(canvas);
        const material = new SpriteMaterial({ map: texture, transparent: true, depthTest: false, depthWrite: false, toneMapped: false, fog: false });
        const sprite = new Sprite(material);
        sprite.visible = false;
        sprite.renderOrder = 20;
        this.root.add(sprite);
        this.labels.push({ sprite, material, canvas, texture, life: 0, max: 1, width: 1, rise: 0, base: new Vector3() });
      }
    }
    // Lumière d'éclat toujours présente (intensité nulle au repos) : pas de recompilation des shaders.
    this.light = new PointLight("#ffb15a", 0, 6, 1.8);
    this.root.add(this.light);
  }

  setLowQuality(low: boolean): void {
    this.low = low;
  }

  /** Nombre de particules selon la qualité. */
  private count(high: number): number {
    return this.low ? Math.max(1, Math.ceil(high / 2)) : high;
  }

  /** Éclat lumineux bref (bouche du lance-clous, lampe). */
  flash(at: Vector3, color: ColorRepresentation, strength: number, life = 0.07): void {
    this.light.position.copy(at);
    this.light.color.set(color);
    this.light.intensity = strength;
    this.lightLife = life;
  }

  /** Clou : trait complet du canon à l'impact, visible 2 à 3 images puis effacé. */
  tracer(from: Vector3, to: Vector3): void {
    let t = this.tracers[0];
    for (const x of this.tracers) if (x.life < t.life) t = x;
    const length = from.distanceTo(to);
    if (length < 0.05) return;
    t.life = TRACER_LIFE;
    t.length = length;
    t.core.position.copy(from);
    t.core.lookAt(to);
    t.glow.position.copy(t.core.position);
    t.glow.quaternion.copy(t.core.quaternion);
    t.core.visible = t.glow.visible = true;
    this.placeTracer(t);
  }

  /** Bouche du lance-clous : étoile blanche, bouffée de fumée et bout de bande de clous éjecté à droite. */
  muzzle(at: Vector3, dirX: number, dirZ: number): void {
    this.star(at.x, at.y, at.z, 0, 0, 0, 0.22, 0.06, 0);
    this.puff(at.x + dirX * 0.15, at.y, at.z + dirZ * 0.15, "#efe7d6", 0.13, 0.28, 0.6, dirX * 1.3, 0.35, dirZ * 1.3);
    // Droite du bricoleur : (−dirZ, dirX) tourné… côté −X local = (−cos yaw, sin yaw) = (−dirZ, dirX).
    const side = 1.6 + Math.random() * 0.8;
    this.spark(this.sparkMaterials.brass, at.x, at.y + 0.05, at.z, -dirZ * side - dirX * 0.4, 2.2 + Math.random(), dirX * side - dirZ * 0.4, 0.035, 0.6);
  }

  /** Impact d'un clou ou d'un coup : gerbe orientée vers (backX, backZ) — la normale du mur ou le tireur. */
  impact(x: number, y: number, z: number, kind: ImpactKind, backX = 0, backZ = 0): void {
    const count = this.count(8);
    for (let i = 0; i < count; i++) {
      const material = kind === "zombie" ? (i % 3 === 0 ? this.sparkMaterials.dark : this.sparkMaterials.green)
        : i % 2 === 0 ? this.sparkMaterials.grey : this.sparkMaterials.hot;
      const speed = kind === "wall" ? 2.2 + Math.random() * 2.2 : 1.6 + Math.random() * 2.6;
      const angle = Math.random() * Math.PI * 2;
      this.spark(material, x, y, z, backX * speed * 0.8 + Math.cos(angle) * speed * 0.6, 1.2 + Math.random() * 2.4, backZ * speed * 0.8 + Math.sin(angle) * speed * 0.6, kind === "zombie" && i % 3 === 0 ? 0.075 : 0.045);
    }
    if (kind === "wall") {
      // Poussière grise qui s'échappe du mur, ébréchure qui reste quelques secondes.
      this.puff(x + backX * 0.1, y, z + backZ * 0.1, "#bdb6a7", 0.28, 0.5, 0.75, backX * 0.8, 0.3, backZ * 0.8);
      if (!this.low) this.puff(x + backX * 0.2, y - 0.15, z + backZ * 0.2, "#d3ccbc", 0.18, 0.6, 0.6, backX * 0.5, -0.2, backZ * 0.5);
      this.chip(x + backX * 0.012, y + (Math.random() - 0.5) * 0.2, z + backZ * 0.012, backX, backZ);
    } else {
      this.puff(x, y, z, "#6d8a33", 0.3, 0.35, 0.8, backX * 0.5, 0.4, backZ * 0.5);
      this.splat(x - backX * 0.35, z - backZ * 0.35, 0.28 + Math.random() * 0.12);
    }
  }

  /** Coup de clé à molette qui porte : couronne de BD, étoiles, étincelles en étoile et « BONK ! ». */
  bonk(x: number, y: number, z: number): void {
    let ring = this.rings[0];
    for (const r of this.rings) if (r.life < ring.life) ring = r;
    ring.life = RING_LIFE;
    ring.size = 0.75 + Math.random() * 0.1;
    ring.mesh.position.set(x, y, z);
    ring.mesh.rotation.set(FACE_TILT, 0, Math.random() * Math.PI);
    ring.mesh.scale.setScalar(0.1);
    ring.material.opacity = ring.outline.opacity = 1;
    ring.mesh.visible = true;
    const count = this.count(10);
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.3;
      const speed = 2.6 + Math.random() * 1.4;
      this.spark(i % 2 === 0 ? this.sparkMaterials.white : this.sparkMaterials.hot, x, y, z, Math.cos(angle) * speed, 1.4 + Math.random(), Math.sin(angle) * speed, 0.05);
    }
    const stars = this.count(5);
    for (let i = 0; i < stars; i++) {
      const angle = (i / stars) * Math.PI * 2 + Math.random() * 0.5;
      const speed = 1.8 + Math.random() * 0.8;
      this.star(x, y + 0.1, z, Math.cos(angle) * speed, 2 + Math.random() * 1.2, Math.sin(angle) * speed, 0.11 + Math.random() * 0.05, 0.45, 7);
    }
    this.label(x, y + 0.6, z, "BONK !", "#c44a1c", BONK_LIFE, 0.95);
  }

  /** Mort d'un zombie : pouf de poussière au sol, quelques lambeaux et gouttes vertes. */
  death(x: number, z: number): void {
    const puffs = this.count(6);
    for (let i = 0; i < puffs; i++) {
      const a = (i / puffs) * Math.PI * 2 + Math.random() * 0.4;
      const r = 0.2 + Math.random() * 0.15;
      this.puff(x + Math.cos(a) * r, 0.25 + Math.random() * 0.3, z + Math.sin(a) * r, i % 2 ? "#f1e8d4" : "#d9ccb0",
        0.35 + Math.random() * 0.15, 0.7 + Math.random() * 0.2, 1.3, Math.cos(a) * 1.4, 0.6 + Math.random() * 0.5, Math.sin(a) * 1.4);
    }
    const scraps = this.count(6);
    for (let i = 0; i < scraps; i++) {
      const s = this.scraps[this.scrapCursor];
      this.scrapCursor = (this.scrapCursor + 1) % this.scraps.length;
      const a = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 1.6;
      s.vel.set(Math.cos(a) * speed, 2.6 + Math.random() * 1.6, Math.sin(a) * speed);
      s.spin.set((Math.random() - 0.5) * 14, (Math.random() - 0.5) * 10, (Math.random() - 0.5) * 14);
      s.mesh.position.set(x, 0.8, z);
      s.mesh.rotation.set(Math.random() * 3, Math.random() * 3, 0);
      s.mesh.scale.setScalar(0.12 + Math.random() * 0.08);
      (s.mesh.material as MeshBasicMaterial).opacity = 1;
      s.life = 2.2 + Math.random() * 0.6;
      s.resting = false;
      s.mesh.visible = true;
    }
    for (let i = 0; i < this.count(4); i++) {
      const a = Math.random() * Math.PI * 2;
      this.spark(i % 2 ? this.sparkMaterials.dark : this.sparkMaterials.green, x, 0.7, z, Math.cos(a) * 2, 2 + Math.random() * 1.5, Math.sin(a) * 2, 0.06);
    }
    this.splat(x, z, 0.5);
  }

  /** Objet ramassé : petites étoiles qui montent et étiquette de papier « +1 … ». */
  pickup(x: number, z: number, text: string): void {
    const count = this.count(6);
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      this.star(x + Math.cos(a) * 0.2, 0.5, z + Math.sin(a) * 0.2, Math.cos(a) * 0.9, 2.2 + Math.random() * 0.8, Math.sin(a) * 0.9, 0.07 + Math.random() * 0.04, 0.6, 3);
    }
    for (let i = 0; i < this.count(4); i++) {
      const a = Math.random() * Math.PI * 2;
      this.spark(this.sparkMaterials.white, x, 0.4, z, Math.cos(a) * 1.2, 2.5 + Math.random(), Math.sin(a) * 1.2, 0.035);
    }
    this.label(x, 1.4, z, text, "#4a3622", LABEL_LIFE, 1.5);
  }

  /** Éclat de la lampe : cône blanc-cyan doux, flaque au sol et poussières qui scintillent. */
  dazzle(x: number, z: number, yaw: number, height = 1.1): void {
    const sx = Math.sin(yaw);
    const cz = Math.cos(yaw);
    this.coneLife = DAZZLE_CONE.life;
    this.cone.position.set(x + sx * 0.35, height, z + cz * 0.35);
    this.cone.rotation.set(0, yaw, 0);
    this.cone.visible = true;
    this.coneMaterial.uniforms.opacity.value = BEAM_OPACITY;
    this.poolLife = POOL_LIFE;
    this.pool.position.set(x + sx * 0.35, 0.03, z + cz * 0.35);
    this.pool.rotation.set(0, yaw, 0);
    this.pool.visible = true;
    // Poussières réparties dans le cône, qui dérivent doucement.
    const n = this.low ? 10 : MOTES;
    const p = this.motePositions;
    for (let i = 0; i < MOTES; i++) {
      const d = 0.8 + Math.random() * (DAZZLE_CONE.range - 1.5);
      const a = yaw + (Math.random() * 2 - 1) * DAZZLE_CONE.halfAngle * 0.9;
      const k = i < n ? 1 : 0;
      p[i * 3] = x + Math.sin(a) * d;
      p[i * 3 + 1] = k ? 0.2 + Math.random() * 1.5 : -50;
      p[i * 3 + 2] = z + Math.cos(a) * d;
      this.moteVel[i * 3] = (Math.random() - 0.5) * 0.3;
      this.moteVel[i * 3 + 1] = 0.05 + Math.random() * 0.2;
      this.moteVel[i * 3 + 2] = (Math.random() - 0.5) * 0.3;
    }
    (this.motes.geometry.getAttribute("position") as BufferAttribute).needsUpdate = true;
    this.moteLife = MOTE_LIFE;
    this.motes.visible = true;
    this.tmp.set(x + sx * 1.6, height, z + cz * 1.6);
    this.flash(this.tmp, "#e8fbff", 2.5, DAZZLE_CONE.life);
  }

  /** Étoiles d'étourdissement au-dessus d'un zombie (`id`) pendant `duration` s ; suivies par `follow`. */
  stun(id: string, x: number, z: number, height: number, duration: number): void {
    let slot = this.dizzies.find((d) => d.id === id && d.life > 0);
    if (!slot) {
      slot = this.dizzies[0];
      for (const d of this.dizzies) if (d.life < slot.life) slot = d;
    }
    slot.id = id;
    slot.life = Math.max(slot.life, duration);
    slot.height = height;
    slot.root.position.set(x, height, z);
    slot.root.visible = true;
  }

  /** Identifiant suivi par l'emplacement `i` des étoiles (vide si libre), pour que le combat les replace. */
  dizzyId(i: number): string {
    const d = this.dizzies[i];
    return d && d.life > 0 ? d.id : "";
  }

  get dizzyCount(): number {
    return this.dizzies.length;
  }

  /** Replace les étoiles de l'emplacement `i` (zombie qui recule), ou les éteint (`x` NaN : zombie disparu). */
  follow(i: number, x: number, z: number): void {
    const d = this.dizzies[i];
    if (Number.isNaN(x)) {
      d.life = 0;
      d.root.visible = false;
      return;
    }
    d.root.position.x = x;
    d.root.position.z = z;
  }

  get dazzleVisible(): boolean {
    return this.cone.visible;
  }

  /** Effets actifs (tests). */
  get active(): { sparks: number; stars: number; puffs: number; splats: number; chips: number; scraps: number; labels: number; dizzy: number; tracers: number } {
    const n = (list: { life: number }[]) => list.reduce((sum, x) => sum + (x.life > 0 ? 1 : 0), 0);
    return {
      sparks: n(this.sparks), stars: n(this.stars), puffs: n(this.puffs), splats: n(this.splats), chips: n(this.chips),
      scraps: n(this.scraps), labels: n(this.labels), dizzy: n(this.dizzies), tracers: n(this.tracers),
    };
  }

  update(dt: number): void {
    if (this.lightLife > 0) {
      this.lightLife -= dt;
      if (this.lightLife <= 0) this.light.intensity = 0;
      else this.light.intensity *= Math.exp(-12 * dt);
    }
    for (const t of this.tracers) {
      if (t.life <= 0) continue;
      t.life -= dt;
      if (t.life <= 0) t.core.visible = t.glow.visible = false;
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
      s.mesh.rotation.x += dt * 9;
      s.mesh.scale.setScalar(s.size * (0.3 + 0.7 * (s.life / s.max)));
    }
    for (const s of this.stars) {
      if (s.life <= 0) continue;
      s.life -= dt;
      if (s.life <= 0) {
        s.mesh.visible = false;
        continue;
      }
      s.vel.y -= s.gravity * dt;
      s.vel.x *= Math.exp(-3 * dt);
      s.vel.z *= Math.exp(-3 * dt);
      s.mesh.position.addScaledVector(s.vel, dt);
      s.mesh.rotation.z += s.spin * dt;
      const k = s.life / s.max;
      // Pop : grossit vite, puis rétrécit en fin de vie.
      s.mesh.scale.setScalar(s.size * Math.min(1, (1 - k) * 8) * (0.4 + 0.6 * Math.min(1, k * 2.5)));
      s.material.opacity = Math.min(1, k * 3);
    }
    for (const p of this.puffs) {
      if (p.life <= 0) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.mesh.visible = false;
        continue;
      }
      const k = 1 - p.life / p.max;
      p.vel.multiplyScalar(Math.exp(-4 * dt));
      p.mesh.position.addScaledVector(p.vel, dt);
      p.mesh.scale.setScalar(p.size * (0.3 + p.grow * Math.sqrt(k)));
      p.material.opacity = p.opacity * (1 - k);
    }
    this.fadeDecals(this.splats, dt);
    this.fadeDecals(this.chips, dt);
    for (const s of this.scraps) {
      if (s.life <= 0) continue;
      s.life -= dt;
      if (s.life <= 0) {
        s.mesh.visible = false;
        continue;
      }
      if (!s.resting) {
        // Chute de feuille : gravité freinée, rotation, puis à plat au sol.
        s.vel.y -= 7 * dt;
        s.vel.multiplyScalar(Math.exp(-1.5 * dt));
        s.mesh.position.addScaledVector(s.vel, dt);
        s.mesh.rotation.x += s.spin.x * dt;
        s.mesh.rotation.y += s.spin.y * dt;
        s.mesh.rotation.z += s.spin.z * dt;
        if (s.mesh.position.y < 0.03) {
          s.mesh.position.y = 0.03;
          s.mesh.rotation.set(-Math.PI / 2, 0, s.mesh.rotation.z);
          s.resting = true;
        }
      }
      (s.mesh.material as MeshBasicMaterial).opacity = Math.min(1, s.life / 0.6);
    }
    for (const r of this.rings) {
      if (r.life <= 0) continue;
      r.life -= dt;
      if (r.life <= 0) {
        r.mesh.visible = false;
        continue;
      }
      const k = 1 - r.life / RING_LIFE;
      r.mesh.scale.setScalar(r.size * (0.25 + 0.75 * Math.sqrt(k)));
      r.mesh.rotation.z += dt * 2;
      r.material.opacity = r.outline.opacity = 1 - k * k * k;
    }
    for (const l of this.labels) {
      if (l.life <= 0) continue;
      l.life -= dt;
      if (l.life <= 0) {
        l.sprite.visible = false;
        continue;
      }
      const age = l.max - l.life;
      // Pop élastique, montée qui ralentit, fondu final.
      const pop = age < 0.18 ? 0.6 + 0.55 * Math.sin((age / 0.18) * Math.PI * 0.75) : 1;
      l.sprite.position.copy(l.base);
      l.sprite.position.y += l.rise * (1 - Math.exp(-3 * age));
      l.sprite.scale.set(l.width * pop, l.width * 0.375 * pop, 1);
      l.material.opacity = Math.min(1, l.life / 0.3);
    }
    if (this.coneLife > 0) {
      this.coneLife -= dt;
      if (this.coneLife <= 0) this.cone.visible = false;
      else {
        const k = this.coneLife / DAZZLE_CONE.life;
        this.coneMaterial.uniforms.opacity.value = BEAM_OPACITY * k;
        // Pulsation blanc → cyan.
        (this.coneMaterial.uniforms.color.value as Color).setRGB(0.8 + 0.2 * k, 0.97, 1);
      }
    }
    if (this.poolLife > 0) {
      this.poolLife -= dt;
      if (this.poolLife <= 0) this.pool.visible = false;
      else {
        const k = this.poolLife / POOL_LIFE;
        this.poolMaterial.opacity = POOL_OPACITY * k * k;
        this.poolMaterial.color.setRGB(0.8 + 0.2 * k, 0.96, 1);
      }
    }
    if (this.moteLife > 0) {
      this.moteLife -= dt;
      if (this.moteLife <= 0) this.motes.visible = false;
      else {
        const p = this.motePositions;
        for (let i = 0; i < p.length; i++) p[i] += this.moteVel[i] * dt;
        (this.motes.geometry.getAttribute("position") as BufferAttribute).needsUpdate = true;
        const k = this.moteLife / MOTE_LIFE;
        this.moteMaterial.opacity = Math.min(1, k * 2.2) * (0.75 + 0.25 * Math.sin(this.moteLife * 40));
      }
    }
    for (const d of this.dizzies) {
      if (d.life <= 0) continue;
      d.life -= dt;
      if (d.life <= 0) {
        d.root.visible = false;
        continue;
      }
      const spin = d.life * 7;
      for (let j = 0; j < d.stars.length; j++) {
        const a = spin + (j / d.stars.length) * Math.PI * 2;
        const star = d.stars[j];
        star.position.set(Math.cos(a) * 0.32, Math.sin(a * 2 + j) * 0.04, Math.sin(a) * 0.32);
        star.rotation.set(FACE_TILT, 0, -spin * 1.5 + j);
      }
      d.swirl.rotation.y = -spin * 1.3;
      d.root.position.y = d.height + Math.sin(d.life * 9) * 0.03;
      d.root.scale.setScalar(Math.min(1, d.life * 4));
    }
  }

  private fadeDecals(list: Decal[], dt: number): void {
    for (const d of list) {
      if (d.life <= 0) continue;
      d.life -= dt;
      if (d.life <= 0) d.mesh.visible = false;
      else d.material.opacity = d.opacity * Math.min(1, d.life / 1.2, (d.max - d.life) * 20);
    }
  }

  private spark(material: MeshBasicMaterial, x: number, y: number, z: number, vx: number, vy: number, vz: number, size: number, life = 0.25 + Math.random() * 0.25): void {
    const s = this.sparks[this.sparkCursor];
    this.sparkCursor = (this.sparkCursor + 1) % this.sparks.length;
    s.mesh.material = material;
    s.vel.set(vx, vy, vz);
    s.mesh.position.set(x, y, z);
    s.mesh.rotation.set(Math.random() * 3, Math.random() * 3, 0);
    s.max = s.life = life;
    s.size = size;
    s.mesh.scale.setScalar(size);
    s.mesh.visible = true;
  }

  private star(x: number, y: number, z: number, vx: number, vy: number, vz: number, size: number, life: number, gravity: number): void {
    const s = this.stars[this.starCursor];
    this.starCursor = (this.starCursor + 1) % this.stars.length;
    s.vel.set(vx, vy, vz);
    s.mesh.position.set(x, y, z);
    s.mesh.rotation.set(FACE_TILT, 0, Math.random() * Math.PI);
    s.spin = (Math.random() < 0.5 ? -1 : 1) * (5 + Math.random() * 5);
    s.max = s.life = life;
    s.size = size;
    s.gravity = gravity;
    s.mesh.scale.setScalar(size * 0.2);
    s.material.opacity = 1;
    s.mesh.visible = true;
  }

  private puff(x: number, y: number, z: number, color: ColorRepresentation, size: number, life: number, grow: number, vx: number, vy: number, vz: number): void {
    const p = this.puffs[this.puffCursor];
    this.puffCursor = (this.puffCursor + 1) % this.puffs.length;
    p.material.color.set(color);
    p.max = p.life = life;
    p.size = size;
    p.grow = grow;
    p.opacity = 0.85;
    p.vel.set(vx, vy, vz);
    p.mesh.position.set(x, y, z);
    p.mesh.scale.setScalar(size * 0.3);
    p.mesh.visible = true;
  }

  private splat(x: number, z: number, size: number): void {
    const s = this.splats[this.splatCursor];
    this.splatCursor = (this.splatCursor + 1) % this.splats.length;
    s.max = s.life = 6;
    s.opacity = 0.92;
    s.mesh.position.set(x, 0.025 + this.splatCursor * 0.0005, z);
    s.mesh.rotation.y = Math.random() * Math.PI * 2;
    s.mesh.scale.set(size * (0.9 + Math.random() * 0.3), 1, size * (0.75 + Math.random() * 0.25));
    s.mesh.visible = true;
  }

  private chip(x: number, y: number, z: number, nx: number, nz: number): void {
    const c = this.chips[this.chipCursor];
    this.chipCursor = (this.chipCursor + 1) % this.chips.length;
    c.max = c.life = 5;
    c.opacity = 0.9;
    c.mesh.position.set(x, y, z);
    c.mesh.lookAt(x + nx, y, z + nz);
    c.mesh.rotateZ(Math.random() * Math.PI * 2);
    c.mesh.scale.setScalar(0.15 + Math.random() * 0.06);
    c.mesh.visible = true;
  }

  /** Étiquette en papier qui monte : redessinée seulement à l'apparition (événement, pas chaque image). */
  private label(x: number, y: number, z: number, text: string, ink: string, life: number, width: number): void {
    if (this.labels.length === 0) return;
    const l = this.labels[this.labelCursor];
    this.labelCursor = (this.labelCursor + 1) % this.labels.length;
    const ctx = l.canvas.getContext("2d");
    if (!ctx) return;
    const w = l.canvas.width;
    const h = l.canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.rotate((Math.random() - 0.5) * 0.12);
    ctx.font = '700 40px Grandstander, "Comic Sans MS", system-ui, sans-serif';
    const textWidth = Math.min(w - 28, ctx.measureText(text).width + 34);
    // Bout de papier crème, ombre portée brune, bord légèrement irrégulier.
    ctx.fillStyle = "rgba(60,40,20,0.35)";
    this.paper(ctx, -textWidth / 2 + 3, -30 + 4, textWidth, 60);
    ctx.fillStyle = "#f6ecd2";
    this.paper(ctx, -textWidth / 2, -30, textWidth, 60);
    ctx.strokeStyle = "#8a6a4a";
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.fillStyle = ink;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, 0, 2, w - 40);
    ctx.restore();
    l.texture.needsUpdate = true;
    l.base.set(x, y, z);
    l.life = l.max = life;
    l.rise = life > 0.8 ? 0.9 : 0.35;
    l.width = width;
    l.sprite.position.copy(l.base);
    l.sprite.scale.set(width * 0.6, width * 0.225, 1);
    l.material.opacity = 1;
    l.sprite.visible = true;
  }

  private paper(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
    const r = 10;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y + 2);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w - 2, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h - 2);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x + 2, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
    ctx.fill();
  }

  /** Le trait couvre tout le trajet ; il s'amincit et s'efface en TRACER_LIFE. */
  private placeTracer(t: Tracer): void {
    const k = Math.max(0, t.life / TRACER_LIFE);
    t.core.scale.set(0.035 + 0.035 * k, 1, t.length);
    t.glow.scale.set(0.12 + 0.14 * k, 1, t.length);
    t.coreMat.opacity = Math.min(1, k * 1.6);
    t.glowMat.opacity = 0.55 * k;
  }
}
