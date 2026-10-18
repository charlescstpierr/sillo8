// Lampe UV : cône violet au sol, frontale teintée, et traces invisibles qui luisent dans le cône
// (traînées de mordu, empreintes, tampon invisible ; « rien » au seuil : un cercle pointillé).
// Chaque morceau de trace ne s'allume que s'il est dans le cône, comme avec une vraie lumière noire.
import {
  AdditiveBlending, CanvasTexture, CircleGeometry, DoubleSide, Group, Mesh, MeshBasicMaterial, PlaneGeometry,
  SRGBColorSpace, Texture, type SpotLight,
} from "three";
import { UV, inCone, tracePoints } from "../investigation/geometry";
import type { UvTrace } from "../investigation/types";

const VIOLET = "#a77bff";
const GLOW = "#a368ff";

export interface UvFrame {
  on: boolean;
  x: number;
  z: number;
  yaw: number;
  /** Traces déjà vues (elles restent un peu plus lumineuses). */
  seen: readonly string[];
  /** Frontale à teinter en violet (null : lampe blanche). */
  headlamp: SpotLight | null;
}

interface Piece { mesh: Mesh; x: number; z: number; base: number; level: number }

function canvasTexture(key: string, w: number, h: number, draw: (g: CanvasRenderingContext2D, w: number, h: number) => void): Texture {
  if (typeof document === "undefined") return new Texture();
  const cached = CACHE.get(key);
  if (cached) return cached;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const g = canvas.getContext("2d");
  if (g) draw(g, w, h);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  CACHE.set(key, texture);
  return texture;
}
const CACHE = new Map<string, Texture>();

/** Tache luisante aux bords irréguliers (bave de mordu, style dessin animé). */
function slimeTexture(): Texture {
  return canvasTexture("uv-slime", 128, 128, (g, w, h) => {
    const grad = g.createRadialGradient(w / 2, h / 2, 4, w / 2, h / 2, w / 2);
    grad.addColorStop(0, "rgba(255,255,255,1)");
    grad.addColorStop(0.45, "rgba(235,215,255,0.85)");
    grad.addColorStop(1, "rgba(200,160,255,0)");
    g.fillStyle = grad;
    g.beginPath();
    for (let i = 0; i <= 18; i++) {
      const a = (i / 18) * Math.PI * 2;
      const r = w * (0.36 + 0.1 * Math.sin(i * 2.7) + 0.05 * Math.cos(i * 5.1));
      const px = w / 2 + Math.cos(a) * r;
      const py = h / 2 + Math.sin(a) * r;
      if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
    }
    g.fill();
  });
}

function printTexture(): Texture {
  return canvasTexture("uv-print", 64, 128, (g, w, h) => {
    g.fillStyle = "rgba(255,255,255,0.95)";
    g.beginPath();
    g.ellipse(w / 2, h * 0.36, w * 0.3, h * 0.26, 0, 0, Math.PI * 2);
    g.fill();
    g.beginPath();
    g.ellipse(w / 2, h * 0.8, w * 0.22, h * 0.14, 0, 0, Math.PI * 2);
    g.fill();
  });
}

function ringTexture(): Texture {
  return canvasTexture("uv-ring", 256, 256, (g, w, h) => {
    g.strokeStyle = "rgba(255,255,255,0.95)";
    g.lineWidth = 9;
    g.setLineDash([22, 16]);
    g.beginPath();
    g.arc(w / 2, h / 2, w * 0.42, 0, Math.PI * 2);
    g.stroke();
  });
}

function stampTexture(text: string): Texture {
  return canvasTexture(`uv-stamp:${text}`, 512, 160, (g, w, h) => {
    g.strokeStyle = "rgba(255,255,255,0.95)";
    g.fillStyle = "rgba(255,255,255,0.95)";
    g.lineWidth = 10;
    g.strokeRect(14, 14, w - 28, h - 28);
    g.font = `bold ${Math.floor(h * 0.42)}px 'Special Elite', 'Courier New', monospace`;
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(text, w / 2, h / 2 + 4);
  });
}

function coneTexture(): Texture {
  return canvasTexture("uv-cone", 256, 256, (g, w, h) => {
    const grad = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    grad.addColorStop(0, "rgba(255,255,255,0.9)");
    grad.addColorStop(0.7, "rgba(255,255,255,0.45)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);
  });
}

/** Matériau luisant : couleur pleine (pas additive, sinon elle blanchit sur un sol clair), sans éclairage. */
function glowMaterial(map: Texture, color = GLOW): MeshBasicMaterial {
  return new MeshBasicMaterial({ map, color, transparent: true, opacity: 0, depthWrite: false, side: DoubleSide });
}

const PLANE = new PlaneGeometry(1, 1);

export class UvView {
  readonly root = new Group();
  private readonly cone: Mesh;
  private readonly coneMaterial: MeshBasicMaterial;
  private readonly pieces = new Map<string, Piece[]>();
  private power = 0;

  constructor(traces: readonly UvTrace[]) {
    this.root.name = "uv";
    this.coneMaterial = new MeshBasicMaterial({ map: coneTexture(), color: VIOLET, transparent: true, opacity: 0, depthWrite: false, blending: AdditiveBlending });
    const fan = new CircleGeometry(UV.range, 24, -Math.PI / 2 - UV.halfAngle, UV.halfAngle * 2);
    this.cone = new Mesh(fan, this.coneMaterial);
    this.cone.rotation.x = -Math.PI / 2;
    const holder = new Group();
    holder.add(this.cone);
    holder.position.y = 0.035;
    holder.name = "uv-cone";
    this.cone.renderOrder = 2;
    this.root.add(holder);
    for (const trace of traces) this.pieces.set(trace.id, this.build(trace));
  }

  private build(trace: UvTrace): Piece[] {
    const pieces: Piece[] = [];
    const shape = trace.shape;
    const flat = (map: Texture, x: number, z: number, w: number, d: number, rot: number, base = 1) => {
      const m = new Mesh(PLANE, glowMaterial(map));
      m.rotation.set(-Math.PI / 2, 0, rot);
      m.position.set(x, 0.045, z);
      m.scale.set(w, d, 1);
      m.renderOrder = 3;
      m.visible = false;
      this.root.add(m);
      pieces.push({ mesh: m, x, z, base, level: 0 });
    };
    switch (shape.kind) {
      case "trail": {
        const width = shape.width ?? 0.55;
        tracePoints(shape).forEach(([x, z], i) => {
          const wobble = Math.sin(i * 2.3) * 0.12;
          flat(slimeTexture(), x + wobble * 0.5, z - wobble * 0.4, width * (0.8 + 0.35 * Math.abs(Math.sin(i * 1.7))), width * (0.7 + 0.3 * Math.abs(Math.cos(i * 1.3))), i * 0.9);
          // Gouttes à côté de la traînée.
          if (i % 3 === 1) flat(slimeTexture(), x + Math.cos(i) * width * 0.75, z + Math.sin(i) * width * 0.75, 0.16, 0.16, 0, 0.8);
        });
        break;
      }
      case "prints": {
        const pts = tracePoints(shape);
        pts.forEach(([x, z], i) => {
          const next = pts[Math.min(i + 1, pts.length - 1)];
          const dir = Math.atan2(next[0] - x, next[1] - z);
          const side = i % 2 ? 0.12 : -0.12;
          flat(printTexture(), x + Math.cos(dir) * side, z - Math.sin(dir) * side, 0.16, 0.3, dir + Math.PI);
        });
        break;
      }
      case "none":
        flat(ringTexture(), shape.x, shape.z, shape.radius * 2, shape.radius * 2, 0, 0.55);
        break;
      case "stamp": {
        const m = new Mesh(PLANE, glowMaterial(stampTexture(shape.text), "#b27dff"));
        m.position.set(shape.x + Math.sin(shape.yaw) * 0.03, shape.y, shape.z + Math.cos(shape.yaw) * 0.03);
        m.rotation.y = shape.yaw;
        m.scale.set(0.62, 0.2, 1);
        m.renderOrder = 3;
        m.visible = false;
        this.root.add(m);
        pieces.push({ mesh: m, x: shape.x, z: shape.z, base: 1, level: 0 });
        break;
      }
    }
    return pieces;
  }

  /** Une image : cône, teinte de la frontale, pièces de traces allumées dans le cône. */
  update(dt: number, frame: UvFrame): void {
    const target = frame.on ? 1 : 0;
    this.power += (target - this.power) * Math.min(1, dt * 8);
    if (Math.abs(this.power - target) < 0.01) this.power = target;
    const holder = this.cone.parent!;
    holder.visible = this.power > 0.01;
    holder.position.x = frame.x;
    holder.position.z = frame.z;
    holder.rotation.y = frame.yaw;
    this.coneMaterial.opacity = 0.2 * this.power;
    // Couleur seulement : l'ambiance (atmosphere.ts) réécrit l'intensité de la frontale à chaque image.
    if (frame.headlamp && frame.on) frame.headlamp.color.set(VIOLET);
    for (const [id, pieces] of this.pieces) {
      const boost = frame.seen.includes(id) ? 1 : 0.9;
      for (const p of pieces) {
        const want = this.power > 0.05 && inCone(frame.x, frame.z, frame.yaw, p.x, p.z) ? 1 : 0;
        p.level += (want - p.level) * Math.min(1, dt * (want ? 5 : 3));
        if (p.level < 0.01) p.level = 0;
        const material = p.mesh.material as MeshBasicMaterial;
        material.opacity = p.level * p.base * boost * this.power;
        p.mesh.visible = material.opacity > 0.01;
      }
    }
  }

  /** Niveau d'éclairage d'une trace (0 → 1), pour les tests. */
  level(id: string): number {
    const pieces = this.pieces.get(id) ?? [];
    return pieces.reduce((m, p) => Math.max(m, p.level), 0);
  }
}
