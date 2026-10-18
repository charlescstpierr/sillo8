// Effets du combat, façon dessin animé et bon marché : traçantes du D9, éclairs de l'ARC-3, impacts,
// onde au sol du SCAN ÉCHO et marqueurs d'écho. Tout est mis en commun (pools) : aucune allocation par image.
import {
  AdditiveBlending, BufferAttribute, BufferGeometry, CanvasTexture, Color, DoubleSide, Group, IcosahedronGeometry,
  Mesh, MeshBasicMaterial, NormalBlending, OctahedronGeometry, PlaneGeometry, PointLight, ShaderMaterial, SRGBColorSpace, Sprite,
  SpriteMaterial, CircleGeometry, Vector3, type ColorRepresentation, type Texture,
} from "three";

export type ImpactKind = "zombie" | "wall" | "arc";
export type MarkerKind = "item" | "zombie";

export const SCAN_COLOR = "#6de0ce";
const ARC_COLOR = "#5ff3ff";
const MARKER_LIFE = 5;
const WAVE_GROW = 0.9;
const WAVE_FADE = 0.55;

interface Tracer { mesh: Mesh; material: MeshBasicMaterial; life: number; }
interface Bolt { glow: Mesh; core: Mesh; life: number; jitter: number; from: Vector3; to: Vector3; }
interface Spark { mesh: Mesh; vel: Vector3; life: number; max: number; size: number; }
interface Puff { mesh: Mesh; material: MeshBasicMaterial; life: number; max: number; size: number; }
interface Splat { mesh: Mesh; material: MeshBasicMaterial; life: number; }
interface Marker { sprite: Sprite; material: SpriteMaterial; life: number; base: number; seed: number; }

const BOLT_SEGMENTS = 18;
const TRACER_LIFE = 0.08;
const BOLT_LIFE = 0.16;

/** Quadrilatère plat (plan XZ) de z = 0 à z = 1, dégradé de la queue (sombre) à la tête (vive). */
function streakGeometry(): BufferGeometry {
  const g = new BufferGeometry();
  g.setAttribute("position", new BufferAttribute(new Float32Array([-0.5, 0, 0, 0.5, 0, 0, -0.5, 0, 1, 0.5, 0, 1]), 3));
  g.setAttribute("color", new BufferAttribute(new Float32Array([1, 0.55, 0.2, 1, 0.55, 0.2, 1, 1, 0.85, 1, 1, 0.85]), 3));
  g.setIndex([0, 2, 1, 1, 2, 3]);
  return g;
}

/** Ruban en zigzag : deux sommets par point, régénérés à chaque sursaut de l'éclair. */
function ribbonGeometry(): BufferGeometry {
  const g = new BufferGeometry();
  const points = BOLT_SEGMENTS + 1;
  g.setAttribute("position", new BufferAttribute(new Float32Array(points * 2 * 3), 3));
  const index: number[] = [];
  for (let i = 0; i < BOLT_SEGMENTS; i++) {
    const a = i * 2;
    index.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
  }
  g.setIndex(index);
  return g;
}

/** Onde du scan : anneau vif + traîne douce, calculés dans le plan (WebGL1/2). */
function waveMaterial(maxRadius: number): ShaderMaterial {
  return new ShaderMaterial({
    uniforms: {
      uRadius: { value: 0 },
      uMax: { value: maxRadius },
      uFade: { value: 0 },
      uColor: { value: new Color(SCAN_COLOR) },
    },
    vertexShader: /* glsl */ `
      varying vec2 vPos;
      void main() {
        vPos = position.xz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform float uRadius;
      uniform float uMax;
      uniform float uFade;
      uniform vec3 uColor;
      varying vec2 vPos;
      void main() {
        float d = length(vPos);
        float edge = uRadius - d;
        float front = 1.0 - smoothstep(0.0, 0.45, abs(edge));
        float trail = edge > 0.0 ? exp(-edge * 0.22) * (0.3 + 0.12 * sin(d * 4.0 - uRadius * 2.0)) : 0.0;
        float a = (front + trail) * uFade * (1.0 - smoothstep(uMax - 1.2, uMax, d));
        vec3 color = mix(uColor, vec3(1.0), front * 0.3);
        gl_FragColor = vec4(color, clamp(a, 0.0, 1.0));
      }`,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    side: DoubleSide,
  });
}

/** Marqueurs d'écho dessinés au trait (pas de dépendance aux glyphes de la police). */
function markerTexture(kind: MarkerKind): Texture {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const g = canvas.getContext("2d")!;
  const c = size / 2;
  const color = kind === "item" ? "#59ffff" : "#ff7a45";
  const halo = g.createRadialGradient(c, c, 4, c, c, c);
  halo.addColorStop(0, kind === "item" ? "rgba(89,255,255,0.45)" : "rgba(255,110,60,0.45)");
  halo.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = halo;
  g.fillRect(0, 0, size, size);
  g.lineJoin = "round";
  g.beginPath();
  if (kind === "item") {
    g.moveTo(c, 18); g.lineTo(size - 22, c); g.lineTo(c, size - 18); g.lineTo(22, c); g.closePath();
  } else {
    g.moveTo(c, 16); g.lineTo(size - 16, size - 24); g.lineTo(16, size - 24); g.closePath();
  }
  g.strokeStyle = "#1b1712";
  g.lineWidth = 16;
  g.stroke();
  g.strokeStyle = color;
  g.lineWidth = 8;
  g.stroke();
  if (kind === "item") {
    g.fillStyle = color;
    g.beginPath();
    g.arc(c, c, 8, 0, Math.PI * 2);
    g.fill();
  } else {
    g.fillStyle = "rgba(255,122,69,0.35)";
    g.fill();
    g.fillStyle = "#1b1712";
    g.fillRect(c - 7, 44, 14, 40);
    g.fillRect(c - 7, 90, 14, 12);
    g.fillStyle = "#ffe3c8";
    g.fillRect(c - 4, 47, 8, 34);
    g.fillRect(c - 4, 93, 8, 6);
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

export class CombatFx {
  readonly root = new Group();
  private tracers: Tracer[] = [];
  private bolts: Bolt[] = [];
  private sparks: Spark[] = [];
  private puffs: Puff[] = [];
  private splats: Splat[] = [];
  private markers = new Map<string, Marker>();
  private markerTextures: Partial<Record<MarkerKind, Texture>> = {};
  private sparkMaterials: Record<"green" | "dark" | "grey" | "hot" | "cyan", MeshBasicMaterial>;
  private wave: Mesh;
  private waveUniforms: ShaderMaterial["uniforms"];
  private waveTime = -1;
  private light: PointLight;
  private lightLife = 0;
  private low = false;
  private sparkCursor = 0;
  private time = 0;
  private readonly tmp = new Vector3();
  private readonly side = new Vector3();

  /** `canvas` : faux hors navigateur (tests), les marqueurs ne sont alors pas dessinés. */
  constructor(private canvas: boolean, scanRadius: number) {
    this.root.name = "combat-fx";
    const streak = streakGeometry();
    for (let i = 0; i < 6; i++) {
      const material = new MeshBasicMaterial({
        color: "#ffd25e", vertexColors: true, transparent: true, opacity: 0,
        depthWrite: false, toneMapped: false, side: DoubleSide, fog: false,
      });
      const mesh = new Mesh(streak, material);
      mesh.visible = false;
      mesh.renderOrder = 5;
      this.root.add(mesh);
      this.tracers.push({ mesh, material, life: 0 });
    }
    // Trait de dessin animé : corps cyan opaque, cœur blanc (lisible aussi sur un sol clair).
    const glow = new MeshBasicMaterial({ color: "#22c8e8", transparent: true, opacity: 0.9, depthWrite: false, toneMapped: false, side: DoubleSide, fog: false });
    const core = new MeshBasicMaterial({ color: "#f2ffff", depthWrite: false, toneMapped: false, side: DoubleSide, fog: false });
    for (let i = 0; i < 2; i++) {
      const g = new Mesh(ribbonGeometry(), glow);
      const c = new Mesh(ribbonGeometry(), core);
      g.visible = c.visible = false;
      g.frustumCulled = c.frustumCulled = false;
      g.renderOrder = 5;
      c.renderOrder = 6;
      this.root.add(g, c);
      this.bolts.push({ glow: g, core: c, life: 0, jitter: 0, from: new Vector3(), to: new Vector3() });
    }
    this.sparkMaterials = {
      green: new MeshBasicMaterial({ color: "#a8e85a", toneMapped: false }),
      dark: new MeshBasicMaterial({ color: "#2e3b1c" }),
      grey: new MeshBasicMaterial({ color: "#a39d90" }),
      hot: new MeshBasicMaterial({ color: "#ffd27a", toneMapped: false }),
      cyan: new MeshBasicMaterial({ color: ARC_COLOR, toneMapped: false }),
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
    const waveGeometry = new PlaneGeometry((scanRadius + 1) * 2, (scanRadius + 1) * 2);
    waveGeometry.rotateX(-Math.PI / 2);
    const waveMat = waveMaterial(scanRadius);
    this.waveUniforms = waveMat.uniforms;
    this.wave = new Mesh(waveGeometry, waveMat);
    this.wave.visible = false;
    this.wave.renderOrder = 2;
    this.wave.frustumCulled = false;
    this.root.add(this.wave);
    // Lumière d'éclat toujours présente (intensité nulle au repos) : pas de recompilation des shaders.
    this.light = new PointLight("#ffb15a", 0, 6, 1.8);
    this.root.add(this.light);
  }

  setLowQuality(low: boolean): void {
    this.low = low;
  }

  /** Éclat lumineux bref au bout du canon. */
  flash(at: Vector3, color: ColorRepresentation, strength: number): void {
    this.light.position.copy(at);
    this.light.color.set(color);
    this.light.intensity = strength;
    this.lightLife = 0.07;
  }

  tracer(from: Vector3, to: Vector3): void {
    const t = this.tracers.find((x) => x.life <= 0) ?? this.tracers[0];
    const length = from.distanceTo(to);
    if (length < 0.05) return;
    t.life = TRACER_LIFE;
    t.mesh.visible = true;
    t.mesh.position.copy(from);
    t.mesh.lookAt(to);
    t.mesh.scale.set(0.09, 1, length);
    t.material.opacity = 1;
  }

  bolt(from: Vector3, to: Vector3): void {
    const b = this.bolts.find((x) => x.life <= 0) ?? this.bolts[0];
    b.life = BOLT_LIFE;
    b.jitter = 0;
    b.from.copy(from);
    b.to.copy(to);
    b.glow.visible = b.core.visible = true;
    this.shapeBolt(b);
  }

  impact(x: number, y: number, z: number, kind: ImpactKind, backX = 0, backZ = 0): void {
    const count = this.low ? 4 : kind === "arc" ? 10 : 8;
    for (let i = 0; i < count; i++) {
      const s = this.sparks[this.sparkCursor];
      this.sparkCursor = (this.sparkCursor + 1) % this.sparks.length;
      const material = kind === "arc" ? this.sparkMaterials.cyan
        : kind === "zombie" ? (i % 3 === 0 ? this.sparkMaterials.dark : this.sparkMaterials.green)
        : i % 2 === 0 ? this.sparkMaterials.grey : this.sparkMaterials.hot;
      s.mesh.material = material;
      const speed = kind === "wall" ? 2.2 + Math.random() * 2.2 : 1.6 + Math.random() * 2.6;
      // Gerbe orientée vers le tireur, avec de l'éparpillement.
      const angle = Math.random() * Math.PI * 2;
      s.vel.set(backX * speed * 0.8 + Math.cos(angle) * speed * 0.6, 1.2 + Math.random() * 2.4, backZ * speed * 0.8 + Math.sin(angle) * speed * 0.6);
      s.mesh.position.set(x, y, z);
      s.mesh.rotation.set(Math.random() * 3, Math.random() * 3, 0);
      s.max = s.life = 0.25 + Math.random() * 0.25;
      s.size = kind === "zombie" && i % 3 === 0 ? 0.075 : 0.045;
      s.mesh.scale.setScalar(s.size);
      s.mesh.visible = true;
    }
    const p = this.puffs.find((x) => x.life <= 0) ?? this.puffs[0];
    p.material.color.set(kind === "arc" ? ARC_COLOR : kind === "zombie" ? "#5d7a2c" : "#b9b2a3");
    p.material.blending = kind === "arc" ? AdditiveBlending : NormalBlending;
    p.max = p.life = kind === "arc" ? 0.22 : 0.35;
    p.size = kind === "wall" ? 0.32 : 0.4;
    p.mesh.position.set(x, y, z);
    p.mesh.scale.setScalar(p.size * 0.3);
    p.mesh.visible = true;
    if (kind === "zombie") {
      const splat = this.splats.find((x) => x.life <= 0) ?? this.splats[0];
      splat.life = 4;
      splat.mesh.position.set(x - backX * 0.3, 0.025, z - backZ * 0.3);
      splat.mesh.rotation.y = Math.random() * Math.PI;
      splat.mesh.scale.set(0.3 + Math.random() * 0.2, 1, 0.22 + Math.random() * 0.15);
      splat.mesh.visible = true;
    }
  }

  scanWave(x: number, z: number): void {
    this.waveTime = 0;
    this.wave.position.set(x, 0.03, z);
    this.wave.visible = true;
  }

  get waveActive(): boolean {
    return this.waveTime >= 0;
  }

  /** Affiche (ou relance) un marqueur d'écho. Sans canvas (tests), ne fait rien. */
  mark(key: string, kind: MarkerKind, x: number, y: number, z: number): void {
    if (!this.canvas) return;
    let marker = this.markers.get(key);
    if (!marker) {
      const texture = (this.markerTextures[kind] ??= markerTexture(kind));
      const material = new SpriteMaterial({ map: texture, depthTest: false, depthWrite: false, transparent: true, toneMapped: false, fog: false });
      const sprite = new Sprite(material);
      sprite.renderOrder = 999;
      this.root.add(sprite);
      marker = { sprite, material, life: 0, base: y, seed: Math.random() * 6 };
      this.markers.set(key, marker);
    }
    marker.life = MARKER_LIFE;
    marker.base = y;
    marker.sprite.position.set(x, y, z);
    marker.sprite.visible = true;
  }

  moveMarker(key: string, x: number, z: number): void {
    const marker = this.markers.get(key);
    if (marker) marker.sprite.position.set(x, marker.sprite.position.y, z);
  }

  hideMarker(key: string): void {
    const marker = this.markers.get(key);
    if (marker) {
      marker.life = 0;
      marker.sprite.visible = false;
    }
  }

  update(dt: number): void {
    this.time += dt;
    if (this.lightLife > 0) {
      this.lightLife -= dt;
      if (this.lightLife <= 0) this.light.intensity = 0;
      else this.light.intensity *= 0.75;
    }
    for (const t of this.tracers) {
      if (t.life <= 0) continue;
      t.life -= dt;
      if (t.life <= 0) t.mesh.visible = false;
      else t.material.opacity = t.life / TRACER_LIFE;
    }
    for (const b of this.bolts) {
      if (b.life <= 0) continue;
      b.life -= dt;
      if (b.life <= 0) {
        b.glow.visible = b.core.visible = false;
        continue;
      }
      // L'éclair sursaute : nouveau tracé toutes les 30 ms.
      b.jitter += dt;
      if (b.jitter > 0.03) {
        b.jitter = 0;
        this.shapeBolt(b);
      }
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
    if (this.waveTime >= 0) {
      this.waveTime += dt;
      const u = this.waveUniforms;
      const grow = Math.min(1, this.waveTime / WAVE_GROW);
      u.uRadius.value = u.uMax.value * (1 - Math.pow(1 - grow, 1.6));
      const fade = this.waveTime < WAVE_GROW ? 1 : 1 - (this.waveTime - WAVE_GROW) / WAVE_FADE;
      u.uFade.value = Math.max(0, fade) * Math.min(1, this.waveTime * 8);
      if (this.waveTime > WAVE_GROW + WAVE_FADE) {
        this.waveTime = -1;
        this.wave.visible = false;
      }
    }
    for (const m of this.markers.values()) {
      if (m.life <= 0) continue;
      m.life -= dt;
      if (m.life <= 0) {
        m.sprite.visible = false;
        continue;
      }
      const age = MARKER_LIFE - m.life;
      const pop = age < 0.25 ? 0.4 + 0.6 * Math.sin((age / 0.25) * Math.PI * 0.5) * 1.15 : 1;
      m.sprite.scale.setScalar(0.72 * pop);
      m.sprite.position.y = m.base + Math.sin(this.time * 3 + m.seed) * 0.08;
      m.material.opacity = Math.min(1, m.life / 0.8);
    }
  }

  /** Recalcule le zigzag d'un éclair (sans allocation). */
  private shapeBolt(b: Bolt): void {
    const { from, to } = b;
    const dx = to.x - from.x;
    const dz = to.z - from.z;
    const length = Math.max(Math.hypot(dx, dz), 1e-4);
    this.side.set(-dz / length, 0, dx / length);
    const amplitude = Math.min(0.45, 0.1 + length * 0.035);
    const glow = b.glow.geometry.getAttribute("position") as BufferAttribute;
    const core = b.core.geometry.getAttribute("position") as BufferAttribute;
    for (let i = 0; i <= BOLT_SEGMENTS; i++) {
      const t = i / BOLT_SEGMENTS;
      const taper = Math.sin(t * Math.PI);
      // Zigzag franc : le signe alterne, l'amplitude varie.
      const offset = i === 0 || i === BOLT_SEGMENTS ? 0 : (i % 2 === 0 ? 1 : -1) * (0.3 + Math.random() * 0.7) * amplitude * (0.35 + taper);
      this.tmp.lerpVectors(from, to, t).addScaledVector(this.side, offset);
      this.tmp.y += (Math.random() - 0.5) * 0.08 * taper;
      const wg = 0.075 * (0.6 + taper * 0.6);
      const wc = 0.025 * (0.6 + taper * 0.6);
      glow.setXYZ(i * 2, this.tmp.x - this.side.x * wg, this.tmp.y, this.tmp.z - this.side.z * wg);
      glow.setXYZ(i * 2 + 1, this.tmp.x + this.side.x * wg, this.tmp.y, this.tmp.z + this.side.z * wg);
      core.setXYZ(i * 2, this.tmp.x - this.side.x * wc, this.tmp.y + 0.01, this.tmp.z - this.side.z * wc);
      core.setXYZ(i * 2 + 1, this.tmp.x + this.side.x * wc, this.tmp.y + 0.01, this.tmp.z + this.side.z * wc);
    }
    glow.needsUpdate = true;
    core.needsUpdate = true;
  }
}
