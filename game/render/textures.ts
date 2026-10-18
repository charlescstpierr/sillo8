// Textures procédurales (canvas) : couleurs plates + quelques décals simples, dessinés une fois.
// Déterministes (graine fixe) pour des captures reproductibles.
import { CanvasTexture, ClampToEdgeWrapping, RepeatWrapping, SRGBColorSpace, type Texture } from "three";
import { PALETTE } from "./palette";

export function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const cache = new Map<string, Texture>();

function make(key: string, width: number, height: number, draw: (g: CanvasRenderingContext2D, w: number, h: number) => void, repeat = true): Texture {
  const cached = cache.get(key);
  if (cached) return cached;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const g = canvas.getContext("2d")!;
  draw(g, width, height);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.wrapS = texture.wrapT = repeat ? RepeatWrapping : ClampToEdgeWrapping;
  texture.anisotropy = 4;
  cache.set(key, texture);
  return texture;
}

function crack(g: CanvasRenderingContext2D, r: () => number, x: number, y: number, length: number, color: string, width = 2) {
  g.strokeStyle = color;
  g.lineWidth = width;
  g.lineCap = "round";
  g.beginPath();
  g.moveTo(x, y);
  let angle = r() * Math.PI * 2;
  for (let i = 0; i < 6; i++) {
    angle += (r() - 0.5) * 1.2;
    x += Math.cos(angle) * (length / 6);
    y += Math.sin(angle) * (length / 6);
    g.lineTo(x, y);
    if (r() < 0.3) {
      g.moveTo(x, y);
      g.lineTo(x + Math.cos(angle + 1) * length * 0.15, y + Math.sin(angle + 1) * length * 0.15);
      g.moveTo(x, y);
    }
  }
  g.stroke();
}

/** Carrelage terrazzo fissuré (décontamination). 1 texture = 2 × 2 m. */
export function tilesTexture(): Texture {
  return make("tiles", 512, 512, (g, w, h) => {
    const r = rng(7);
    g.fillStyle = PALETTE.tile;
    g.fillRect(0, 0, w, h);
    const cell = w / 4;
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
      const shade = 0.94 + r() * 0.08;
      g.fillStyle = `rgba(${Math.round(220 * shade)}, ${Math.round(213 * shade)}, ${Math.round(191 * shade)}, 1)`;
      g.fillRect(i * cell + 2, j * cell + 2, cell - 4, cell - 4);
    }
    for (let k = 0; k < 900; k++) {
      const colors = ["#9b9583", "#7f8a7a", "#b7ad93", "#5f6a60", "#c29a6a"];
      g.fillStyle = colors[Math.floor(r() * colors.length)];
      g.globalAlpha = 0.55;
      const s = 1 + r() * 3.5;
      g.beginPath();
      g.ellipse(r() * w, r() * h, s, s * (0.5 + r() * 0.5), r() * Math.PI, 0, Math.PI * 2);
      g.fill();
    }
    g.globalAlpha = 1;
    g.strokeStyle = "#a69f88";
    g.lineWidth = 3;
    for (let i = 0; i <= 4; i++) {
      g.beginPath(); g.moveTo(i * cell, 0); g.lineTo(i * cell, h); g.stroke();
      g.beginPath(); g.moveTo(0, i * cell); g.lineTo(w, i * cell); g.stroke();
    }
    for (let k = 0; k < 5; k++) crack(g, r, r() * w, r() * h, 120 + r() * 80, "rgba(60,50,40,0.6)");
    for (let k = 0; k < 12; k++) {
      const x = r() * w, y = r() * h, rad = 20 + r() * 50;
      const grad = g.createRadialGradient(x, y, 0, x, y, rad);
      grad.addColorStop(0, "rgba(70,58,40,0.18)");
      grad.addColorStop(1, "rgba(70,58,40,0)");
      g.fillStyle = grad;
      g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
    // Carreaux fendus en diagonale
    g.strokeStyle = "rgba(60,50,40,0.5)";
    g.lineWidth = 2;
    for (let k = 0; k < 4; k++) {
      const i = Math.floor(r() * 4), j = Math.floor(r() * 4);
      g.beginPath(); g.moveTo(i * cell + 4, j * cell + r() * cell); g.lineTo((i + 1) * cell - 4, j * cell + r() * cell); g.stroke();
    }
  });
}

/** Plaques d'acier de la cabine d'ascenseur, rivets et usure. 1 texture = 2 × 2 m. */
export function liftTexture(): Texture {
  return make("lift", 512, 512, (g, w, h) => {
    const r = rng(11);
    g.fillStyle = PALETTE.liftFloor;
    g.fillRect(0, 0, w, h);
    const plate = w / 2;
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
      g.fillStyle = r() > 0.5 ? "#96a1a2" : "#879294";
      g.fillRect(i * plate + 3, j * plate + 3, plate - 6, plate - 6);
      g.fillStyle = "#6c777a";
      for (const [x, y] of [[14, 14], [plate - 14, 14], [14, plate - 14], [plate - 14, plate - 14]]) {
        g.beginPath(); g.arc(i * plate + x, j * plate + y, 5, 0, Math.PI * 2); g.fill();
      }
      // Motif antidérapant
      g.strokeStyle = "rgba(70,80,84,0.45)";
      g.lineWidth = 4;
      for (let k = 0; k < 18; k++) {
        const x = i * plate + 30 + r() * (plate - 60);
        const y = j * plate + 30 + r() * (plate - 60);
        const a = k % 2 ? Math.PI / 4 : -Math.PI / 4;
        g.beginPath(); g.moveTo(x - Math.cos(a) * 10, y - Math.sin(a) * 10); g.lineTo(x + Math.cos(a) * 10, y + Math.sin(a) * 10); g.stroke();
      }
    }
    g.fillStyle = "rgba(60,50,40,0.12)";
    for (let k = 0; k < 6; k++) {
      g.beginPath(); g.ellipse(r() * w, r() * h, 20 + r() * 40, 10 + r() * 20, r() * 3, 0, Math.PI * 2); g.fill();
    }
  });
}

/** Béton gris-vert taché pour les murs. */
export function concreteTexture(): Texture {
  return make("concrete", 256, 256, (g, w, h) => {
    const r = rng(3);
    g.fillStyle = PALETTE.concrete;
    g.fillRect(0, 0, w, h);
    for (let k = 0; k < 40; k++) {
      g.fillStyle = r() > 0.5 ? "rgba(255,255,240,0.06)" : "rgba(40,50,40,0.07)";
      g.beginPath(); g.ellipse(r() * w, r() * h, 8 + r() * 30, 6 + r() * 20, r() * 3, 0, Math.PI * 2); g.fill();
    }
    // Coulures de rouille
    for (let k = 0; k < 4; k++) {
      const x = r() * w;
      const grad = g.createLinearGradient(x, 0, x, h * 0.8);
      grad.addColorStop(0, "rgba(168,86,46,0.45)");
      grad.addColorStop(1, "rgba(168,86,46,0)");
      g.fillStyle = grad;
      g.fillRect(x, 0, 3 + r() * 6, h * 0.8);
    }
    for (let k = 0; k < 2; k++) crack(g, r, r() * w, r() * h, 70, "rgba(50,55,45,0.5)", 1.5);
  });
}

/** Bandes de sécurité jaunes et noires. */
export function hazardTexture(): Texture {
  return make("hazard", 128, 32, (g, w, h) => {
    g.fillStyle = PALETTE.yellow;
    g.fillRect(0, 0, w, h);
    g.fillStyle = PALETTE.stripeDark;
    for (let x = -h; x < w + h; x += 32) {
      g.beginPath(); g.moveTo(x, h); g.lineTo(x + 16, h); g.lineTo(x + 16 + h, 0); g.lineTo(x + h, 0); g.closePath(); g.fill();
    }
  });
}

/** Tache organique à bords irréguliers (mousse, flaque, brûlure, rouille). */
export function blobTexture(kind: "moss" | "puddle" | "scorch" | "rust" | "shadow"): Texture {
  return make("blob-" + kind, 256, 256, (g, w, h) => {
    const r = rng(kind.length * 17);
    const colors: Record<string, [string, string]> = {
      moss: ["rgba(111,154,60,0.95)", "rgba(140,193,82,0.9)"],
      puddle: ["rgba(70,110,118,0.75)", "rgba(150,200,205,0.55)"],
      scorch: ["rgba(30,22,18,0.8)", "rgba(60,45,35,0.45)"],
      rust: ["rgba(168,86,46,0.75)", "rgba(201,119,63,0.5)"],
      shadow: ["rgba(20,15,10,0.55)", "rgba(20,15,10,0)"],
    };
    const [inner, outer] = colors[kind];
    if (kind === "shadow") {
      const grad = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
      grad.addColorStop(0, inner);
      grad.addColorStop(1, outer);
      g.fillStyle = grad;
      g.fillRect(0, 0, w, h);
      return;
    }
    for (let k = 0; k < 14; k++) {
      g.fillStyle = k % 3 === 0 ? outer : inner;
      const radius = 30 + r() * 50;
      const angle = r() * Math.PI * 2;
      const dist = r() * 55;
      g.beginPath();
      g.arc(w / 2 + Math.cos(angle) * dist, h / 2 + Math.sin(angle) * dist, radius * (kind === "puddle" ? 0.9 : 0.7), 0, Math.PI * 2);
      g.fill();
    }
    if (kind === "moss") {
      g.fillStyle = "rgba(240,235,200,0.9)";
      for (let k = 0; k < 9; k++) { g.beginPath(); g.arc(70 + r() * 116, 70 + r() * 116, 3, 0, Math.PI * 2); g.fill(); }
    }
    if (kind === "puddle") {
      g.strokeStyle = "rgba(230,245,240,0.6)";
      g.lineWidth = 3;
      g.beginPath(); g.arc(w * 0.42, h * 0.45, 26, 3.6, 4.6); g.stroke();
    }
  }, false);
}

/** Touffe d'herbe en découpe alpha, posée sur deux plans croisés. */
export function grassTexture(): Texture {
  return make("grass", 128, 128, (g, w, h) => {
    const r = rng(5);
    for (let k = 0; k < 14; k++) {
      const base = w / 2 + (r() - 0.5) * 50;
      const tipX = base + (r() - 0.5) * 60;
      const tipY = 8 + r() * 40;
      g.fillStyle = k % 2 ? PALETTE.grass : PALETTE.leaf;
      g.beginPath();
      g.moveTo(base - 6, h);
      g.quadraticCurveTo(base - 2, (h + tipY) / 2, tipX, tipY);
      g.quadraticCurveTo(base + 4, (h + tipY) / 2, base + 6, h);
      g.closePath();
      g.fill();
    }
    g.fillStyle = "#f6f1df";
    for (let k = 0; k < 3; k++) { g.beginPath(); g.arc(30 + r() * 68, 20 + r() * 40, 5, 0, Math.PI * 2); g.fill(); }
  }, false);
}

/** Panneau peint au pochoir (secteurs, consignes). */
export function signTexture(text: string, options: { bg?: string; fg?: string; font?: string; width?: number; height?: number; border?: string } = {}): Texture {
  const width = options.width ?? 512;
  const height = options.height ?? 128;
  return make("sign:" + JSON.stringify([text, options]), width, height, (g, w, h) => {
    g.fillStyle = options.bg ?? PALETTE.paper;
    g.fillRect(0, 0, w, h);
    if (options.border) {
      g.strokeStyle = options.border;
      g.lineWidth = 8;
      g.strokeRect(6, 6, w - 12, h - 12);
    }
    g.fillStyle = options.fg ?? PALETTE.outline;
    const lines = text.split("\n");
    const size = Math.min(h / (lines.length * 1.25), (w * 1.6) / Math.max(...lines.map((l) => l.length)));
    g.font = `${Math.floor(size)}px ${options.font ?? "'Special Elite', monospace"}`;
    g.textAlign = "center";
    g.textBaseline = "middle";
    lines.forEach((line, i) => g.fillText(line, w / 2, h / 2 + (i - (lines.length - 1) / 2) * size * 1.15));
    // Usure
    const r = rng(text.length);
    g.globalCompositeOperation = "destination-out";
    for (let k = 0; k < 40; k++) { g.globalAlpha = 0.3; g.beginPath(); g.arc(r() * w, r() * h, 1 + r() * 4, 0, Math.PI * 2); g.fill(); }
    g.globalAlpha = 1;
    g.globalCompositeOperation = "source-over";
  }, false);
}

/** Dessin d'enfant scotché au mur : un soleil, un arbre et une maison. Indice que la surface vit. */
export function drawingTexture(): Texture {
  return make("drawing", 256, 200, (g, w, h) => {
    g.fillStyle = "#f7f1e1";
    g.fillRect(0, 0, w, h);
    g.lineWidth = 6;
    g.lineCap = "round";
    g.strokeStyle = "#f2b53a";
    g.beginPath(); g.arc(200, 50, 24, 0, Math.PI * 2); g.stroke();
    for (let a = 0; a < 8; a++) {
      g.beginPath(); g.moveTo(200 + Math.cos(a) * 32, 50 + Math.sin(a) * 32); g.lineTo(200 + Math.cos(a) * 44, 50 + Math.sin(a) * 44); g.stroke();
    }
    g.strokeStyle = "#5e9b3a";
    g.beginPath(); g.moveTo(10, 170); g.quadraticCurveTo(130, 150, 246, 172); g.stroke();
    g.strokeStyle = "#7a4a2a";
    g.beginPath(); g.moveTo(60, 168); g.lineTo(60, 110); g.stroke();
    g.fillStyle = "#6fae45";
    g.beginPath(); g.arc(60, 95, 28, 0, Math.PI * 2); g.fill();
    g.strokeStyle = "#c85a4a";
    g.strokeRect(110, 110, 50, 50);
    g.beginPath(); g.moveTo(104, 112); g.lineTo(135, 82); g.lineTo(166, 112); g.stroke();
    g.fillStyle = "#3a2a1c";
    g.font = "22px 'Patrick Hand', cursive";
    g.fillText("DEHORS", 14, 34);
  }, false);
}

/** Petite texture ronde et douce pour les grains de poussière. */
export function dustTexture(): Texture {
  return make("dust", 32, 32, (g, w, h) => {
    const grad = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    grad.addColorStop(0, "rgba(255,244,214,1)");
    grad.addColorStop(1, "rgba(255,244,214,0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);
  }, false);
}

/** Cône de lumière vertical, pour les faisceaux poussiéreux. */
export function beamTexture(): Texture {
  return make("beam", 64, 128, (g, w, h) => {
    const grad = g.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, "rgba(255,236,190,0.0)");
    grad.addColorStop(0.15, "rgba(255,236,190,0.55)");
    grad.addColorStop(1, "rgba(255,236,190,0.0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);
    const side = g.createLinearGradient(0, 0, w, 0);
    side.addColorStop(0, "rgba(0,0,0,1)");
    side.addColorStop(0.5, "rgba(0,0,0,0)");
    side.addColorStop(1, "rgba(0,0,0,1)");
    g.globalCompositeOperation = "destination-out";
    g.fillStyle = side;
    g.fillRect(0, 0, w, h);
  }, false);
}

/** Dégradé sombre au pied des murs : fausse occlusion ambiante, salissures. */
export function grimeTexture(): Texture {
  return make("grime", 64, 64, (g, w, h) => {
    const grad = g.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, "rgba(30,24,16,0.55)");
    grad.addColorStop(1, "rgba(30,24,16,0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);
  });
}

/** Carreau manquant : terre sombre, éclats de carrelage. */
export function holeTexture(): Texture {
  return make("hole", 128, 128, (g, w, h) => {
    const r = rng(77);
    g.fillStyle = "rgba(0,0,0,0)";
    g.fillRect(0, 0, w, h);
    g.fillStyle = "#4a3a2a";
    g.beginPath();
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2;
      const rad = 40 + r() * 20;
      g.lineTo(w / 2 + Math.cos(a) * rad, h / 2 + Math.sin(a) * rad);
    }
    g.closePath();
    g.fill();
    g.fillStyle = "#3a2c20";
    for (let k = 0; k < 20; k++) { g.beginPath(); g.arc(30 + r() * 68, 30 + r() * 68, 2 + r() * 4, 0, Math.PI * 2); g.fill(); }
  }, false);
}

/** Grande fissure en découpe alpha, posée au sol ou sur un mur. */
export function crackTexture(seed = 1): Texture {
  return make("crack-" + seed, 256, 256, (g, w, h) => {
    const r = rng(seed * 13);
    g.clearRect(0, 0, w, h);
    for (let k = 0; k < 3; k++) crack(g, r, w * 0.5 + (r() - 0.5) * 40, h * 0.5 + (r() - 0.5) * 40, 160, "rgba(40,30,22,0.85)", 3 - k * 0.8);
  }, false);
}

/** Grande salissure irrégulière (suie, boue, poussière). */
export function dirtTexture(seed = 1): Texture {
  return make("dirt-" + seed, 256, 256, (g, w, h) => {
    const r = rng(seed * 29);
    g.clearRect(0, 0, w, h);
    for (let k = 0; k < 40; k++) {
      const x = w / 2 + (r() - 0.5) * w * 0.6;
      const y = h / 2 + (r() - 0.5) * h * 0.6;
      const radius = 10 + r() * 45;
      const grad = g.createRadialGradient(x, y, 0, x, y, radius);
      grad.addColorStop(0, `rgba(${50 + r() * 30},${40 + r() * 20},${28},0.22)`);
      grad.addColorStop(1, "rgba(50,40,28,0)");
      g.fillStyle = grad;
      g.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    }
  }, false);
}

/** Feuille de papier froissée, pour les détritus. */
export function paperTexture(seed = 1): Texture {
  return make("paper-" + seed, 64, 80, (g, w, h) => {
    const r = rng(seed * 5);
    g.fillStyle = r() > 0.5 ? "#efe6cc" : "#e2d7b8";
    g.beginPath();
    g.moveTo(4, 6); g.lineTo(w - 6, 2); g.lineTo(w - 2, h - 8); g.lineTo(6, h - 3);
    g.closePath();
    g.fill();
    g.strokeStyle = "rgba(60,50,40,0.45)";
    g.lineWidth = 2;
    for (let y = 16; y < h - 12; y += 9) { g.beginPath(); g.moveTo(10, y); g.lineTo(w - 12 - r() * 16, y + 1); g.stroke(); }
  }, false);
}

/** Inscription bombée à la peinture (graffiti de survivants). */
export function sprayTexture(text: string, color: string): Texture {
  return make("spray:" + text + color, 512, 160, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    const lines = text.split("\n");
    const size = Math.min(h / (lines.length * 1.1), (w * 1.5) / Math.max(...lines.map((l) => l.length)));
    g.font = `${Math.floor(size)}px 'Patrick Hand', cursive`;
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillStyle = color;
    g.shadowColor = color;
    g.shadowBlur = 6;
    lines.forEach((line, i) => g.fillText(line, w / 2, h / 2 + (i - (lines.length - 1) / 2) * size));
    // Coulures
    g.shadowBlur = 0;
    const r = rng(text.length * 3);
    for (let k = 0; k < 8; k++) g.fillRect(40 + r() * (w - 80), h / 2 + size * 0.3, 2, 8 + r() * 26);
  }, false);
}

/** Dalle de béton brut fissurée (maintenance, cœur). 1 texture = 2 × 2 m. */
export function concreteFloorTexture(): Texture {
  return make("concrete-floor", 512, 512, (g, w, h) => {
    const r = rng(19);
    g.fillStyle = "#9c9a8c";
    g.fillRect(0, 0, w, h);
    for (let k = 0; k < 60; k++) {
      const x = r() * w, y = r() * h, rad = 10 + r() * 60;
      const grad = g.createRadialGradient(x, y, 0, x, y, rad);
      grad.addColorStop(0, r() > 0.5 ? "rgba(255,250,235,0.08)" : "rgba(50,45,35,0.12)");
      grad.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = grad;
      g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
    g.strokeStyle = "rgba(60,55,45,0.5)";
    g.lineWidth = 3;
    g.strokeRect(0, 0, w, h);
    for (let k = 0; k < 4; k++) crack(g, r, r() * w, r() * h, 140, "rgba(50,45,35,0.55)");
  });
}

/** Caillebotis métallique (conduites, local technique). 1 texture = 1 × 1 m. */
export function grateTexture(): Texture {
  return make("grate", 256, 256, (g, w, h) => {
    g.fillStyle = "#2a2f30";
    g.fillRect(0, 0, w, h);
    g.fillStyle = "#7d8a8c";
    for (let i = 0; i < 8; i++) {
      g.fillRect(i * 32 + 3, 0, 6, h);
      g.fillRect(0, i * 32 + 3, w, 6);
    }
    g.fillStyle = "rgba(168,86,46,0.35)";
    const r = rng(23);
    for (let k = 0; k < 6; k++) { g.beginPath(); g.arc(r() * w, r() * h, 10 + r() * 25, 0, Math.PI * 2); g.fill(); }
  });
}

/** Terre battue, gravier et touffes sombres (extérieur, serre). 1 texture = 2 × 2 m. */
export function dirtGroundTexture(): Texture {
  return make("dirt-ground", 512, 512, (g, w, h) => {
    const r = rng(41);
    g.fillStyle = "#a08a64";
    g.fillRect(0, 0, w, h);
    for (let k = 0; k < 70; k++) {
      const x = r() * w, y = r() * h, rad = 15 + r() * 60;
      const grad = g.createRadialGradient(x, y, 0, x, y, rad);
      grad.addColorStop(0, r() > 0.5 ? "rgba(120,100,70,0.35)" : "rgba(170,150,110,0.3)");
      grad.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = grad;
      g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
    for (let k = 0; k < 500; k++) {
      g.fillStyle = r() > 0.5 ? "rgba(80,66,45,0.5)" : "rgba(200,185,150,0.45)";
      g.beginPath(); g.arc(r() * w, r() * h, 1 + r() * 2.5, 0, Math.PI * 2); g.fill();
    }
    for (let k = 0; k < 30; k++) {
      g.fillStyle = r() > 0.5 ? "rgba(96,130,60,0.55)" : "rgba(120,155,70,0.5)";
      g.beginPath(); g.ellipse(r() * w, r() * h, 6 + r() * 14, 4 + r() * 8, r() * 3, 0, Math.PI * 2); g.fill();
    }
  });
}

// ——— Extérieur (entrée et zone extérieure) ———

/** Sentier de terre tassée, bords fondus, ornières et cailloux. Le sentier court le long de V. */
export function extTrailTexture(): Texture {
  return make("ext-trail", 256, 512, (g, w, h) => {
    const r = rng(83);
    // Bande claire aux bords fondus (alpha), répétable en V.
    const grad = g.createLinearGradient(0, 0, w, 0);
    grad.addColorStop(0, "rgba(196,170,124,0)");
    grad.addColorStop(0.2, "rgba(196,170,124,0.75)");
    grad.addColorStop(0.5, "rgba(206,182,136,0.9)");
    grad.addColorStop(0.8, "rgba(196,170,124,0.75)");
    grad.addColorStop(1, "rgba(196,170,124,0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);
    // Ornières sombres.
    for (const x of [w * 0.34, w * 0.66]) {
      g.strokeStyle = "rgba(110,86,58,0.3)";
      g.lineWidth = 14;
      g.beginPath();
      g.moveTo(x, 0);
      for (let y = 0; y <= h; y += 32) g.lineTo(x + Math.sin((y / h) * Math.PI * 2) * 5, y);
      g.stroke();
    }
    for (let k = 0; k < 160; k++) {
      g.fillStyle = r() > 0.5 ? "rgba(120,98,70,0.55)" : "rgba(232,214,176,0.6)";
      g.beginPath(); g.arc(w * 0.18 + r() * w * 0.64, r() * h, 1.5 + r() * 3, 0, Math.PI * 2); g.fill();
    }
  });
}

/** Halo lumineux doux (flaque de lumière au sol, en mélange additif). */
export function extHaloTexture(): Texture {
  return make("ext-halo", 128, 128, (g, w, h) => {
    const grad = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    grad.addColorStop(0, "rgba(255,255,255,0.9)");
    grad.addColorStop(0.45, "rgba(255,255,255,0.35)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);
  }, false);
}

/** Touffe de fleurs sauvages en découpe alpha (tiges + corolles pastel). */
export function extFlowersTexture(seed = 1): Texture {
  return make("ext-flowers-" + seed, 128, 128, (g, w, h) => {
    const r = rng(60 + seed);
    const petals = [["#e9dcc0", "#d8a43a"], ["#e58a6a", "#f6d38a"], ["#b9a6dc", "#f4ecd6"], ["#f2c230", "#7a4a2a"]];
    for (let k = 0; k < 9; k++) {
      const base = w / 2 + (r() - 0.5) * 60;
      const tipX = base + (r() - 0.5) * 40;
      const tipY = 22 + r() * 50;
      g.strokeStyle = k % 2 ? "#6b7550" : "#556045";
      g.lineWidth = 4;
      g.beginPath(); g.moveTo(base, h); g.quadraticCurveTo(base, (h + tipY) / 2, tipX, tipY); g.stroke();
      g.fillStyle = "#6b7550";
      g.beginPath(); g.ellipse(base + 8, h - 18 - r() * 20, 9, 4, -0.6, 0, Math.PI * 2); g.fill();
      const [petal, heart] = petals[(seed + k) % petals.length];
      g.fillStyle = petal;
      for (let p = 0; p < 5; p++) {
        const a = (p / 5) * Math.PI * 2;
        g.beginPath(); g.arc(tipX + Math.cos(a) * 6, tipY + Math.sin(a) * 6, 5.5, 0, Math.PI * 2); g.fill();
      }
      g.fillStyle = heart;
      g.beginPath(); g.arc(tipX, tipY, 4, 0, Math.PI * 2); g.fill();
    }
  }, false);
}

/** Plaque de tôle rouillée, lettres pochoir crème (ou rétroéclairées), rivets et coulures. */
export function extRustPlateTexture(text: string, lit = false): Texture {
  return make("ext-plate:" + text + ":" + lit, 512, 160, (g, w, h) => {
    const r = rng(text.length * 13 + 5);
    g.fillStyle = "#6a4528";
    g.fillRect(0, 0, w, h);
    for (let k = 0; k < 26; k++) {
      const x = r() * w, y = r() * h, rad = 10 + r() * 40;
      const grad = g.createRadialGradient(x, y, 0, x, y, rad);
      grad.addColorStop(0, r() > 0.4 ? "rgba(168,86,46,0.7)" : "rgba(201,119,63,0.55)");
      grad.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = grad;
      g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
    g.strokeStyle = "#3b2c22";
    g.lineWidth = 10;
    g.strokeRect(5, 5, w - 10, h - 10);
    g.fillStyle = "#c9a77a";
    for (const [x, y] of [[22, 22], [w - 22, 22], [22, h - 22], [w - 22, h - 22]]) { g.beginPath(); g.arc(x, y, 7, 0, Math.PI * 2); g.fill(); }
    g.font = `bold ${Math.floor(h * 0.62)}px 'Special Elite', monospace`;
    g.textAlign = "center";
    g.textBaseline = "middle";
    if (lit) {
      g.shadowColor = "#ffb347";
      g.shadowBlur = 26;
      g.fillStyle = "#ffe2a6";
    } else g.fillStyle = "#e9dcc0";
    g.fillText(text, w / 2, h / 2 + 4);
    g.shadowBlur = 0;
    // Coulures de rouille sous les lettres.
    for (let k = 0; k < 14; k++) {
      const x = 60 + r() * (w - 120);
      const grad = g.createLinearGradient(0, h * 0.6, 0, h);
      grad.addColorStop(0, "rgba(168,86,46,0.6)");
      grad.addColorStop(1, "rgba(168,86,46,0)");
      g.fillStyle = grad;
      g.fillRect(x, h * 0.6, 3 + r() * 4, h * 0.4);
    }
  }, false);
}

// ——— Zone centre (sécurité, hub, accès étage 2) ———

/** Anneaux concentriques peints au sol du hub central : disque sombre usé, liserés ocre, joints rayonnants. */
export function centerRingTexture(): Texture {
  return make("center-ring", 1024, 1024, (g, w, h) => {
    const r = rng(808);
    const cx = w / 2, cy = h / 2;
    g.clearRect(0, 0, w, h);
    const ring = (radius: number, width: number, color: string) => {
      g.strokeStyle = color; g.lineWidth = width;
      g.beginPath(); g.arc(cx, cy, radius, 0, Math.PI * 2); g.stroke();
    };
    // Disque de béton ciré, plus sombre vers l'extérieur.
    const disc = g.createRadialGradient(cx, cy, 120, cx, cy, 500);
    disc.addColorStop(0, "rgba(120,112,92,0.55)");
    disc.addColorStop(1, "rgba(70,64,52,0.75)");
    g.fillStyle = disc;
    g.beginPath(); g.arc(cx, cy, 500, 0, Math.PI * 2); g.fill();
    // Joints rayonnants entre les dalles.
    g.strokeStyle = "rgba(40,34,26,0.45)"; g.lineWidth = 4;
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      g.beginPath(); g.moveTo(cx + Math.cos(a) * 200, cy + Math.sin(a) * 200); g.lineTo(cx + Math.cos(a) * 470, cy + Math.sin(a) * 470); g.stroke();
    }
    ring(496, 16, "rgba(216,164,58,0.9)");
    ring(470, 6, "rgba(40,34,26,0.6)");
    // Pointillés de sécurité.
    g.setLineDash([26, 22]);
    ring(440, 14, "rgba(233,220,192,0.7)");
    g.setLineDash([]);
    ring(330, 10, "rgba(216,164,58,0.75)");
    ring(205, 22, "rgba(40,34,26,0.55)");
    // Usure : la peinture s'écaille.
    g.globalCompositeOperation = "destination-out";
    for (let k = 0; k < 260; k++) {
      g.globalAlpha = 0.2 + r() * 0.5;
      g.beginPath(); g.ellipse(r() * w, r() * h, 4 + r() * 22, 3 + r() * 10, r() * 3, 0, Math.PI * 2); g.fill();
    }
    g.globalAlpha = 1;
    g.globalCompositeOperation = "source-over";
  }, false);
}

/** Emblème du silo : silo stylisé et grand « 8 » sur médaillon moutarde. */
export function centerEmblemTexture(): Texture {
  return make("center-emblem", 512, 512, (g, w, h) => {
    const cx = w / 2, cy = h / 2;
    g.clearRect(0, 0, w, h);
    g.fillStyle = "#e9dcc0";
    g.beginPath(); g.arc(cx, cy, 248, 0, Math.PI * 2); g.fill();
    g.fillStyle = "#d8a43a";
    g.beginPath(); g.arc(cx, cy, 222, 0, Math.PI * 2); g.fill();
    g.strokeStyle = "#3a332c"; g.lineWidth = 10;
    g.beginPath(); g.arc(cx, cy, 200, 0, Math.PI * 2); g.stroke();
    // Silo : dôme + fût, et le 8 au milieu.
    g.fillStyle = "#3a332c";
    g.beginPath();
    g.moveTo(cx - 100, cy + 150); g.lineTo(cx - 100, cy - 60);
    g.arc(cx, cy - 60, 100, Math.PI, 0);
    g.lineTo(cx + 100, cy + 150); g.closePath(); g.fill();
    g.fillRect(cx - 150, cy + 140, 300, 22);
    g.fillStyle = "#e9dcc0";
    g.font = "bold 230px 'Special Elite', monospace";
    g.textAlign = "center"; g.textBaseline = "middle";
    g.fillText("8", cx, cy + 30);
    const r = rng(88);
    g.globalCompositeOperation = "destination-out";
    for (let k = 0; k < 90; k++) { g.globalAlpha = 0.35; g.beginPath(); g.arc(r() * w, r() * h, 2 + r() * 7, 0, Math.PI * 2); g.fill(); }
    g.globalAlpha = 1;
    g.globalCompositeOperation = "source-over";
  }, false);
}

/** Panneau directionnel en bois peint, flèche dessinée (gauche, droite, haut, bas). */
export function centerArrowTexture(text: string, dir: "left" | "right" | "up" | "down", bg = "#d8a43a", fg = "#3a332c"): Texture {
  return make("center-arrow:" + text + dir + bg, 512, 160, (g, w, h) => {
    g.fillStyle = bg;
    g.fillRect(0, 0, w, h);
    g.strokeStyle = fg; g.lineWidth = 8;
    g.strokeRect(6, 6, w - 12, h - 12);
    const ax = dir === "right" ? w - 70 : 70;
    g.fillStyle = fg;
    g.save();
    g.translate(ax, h / 2);
    g.rotate({ left: Math.PI, right: 0, up: -Math.PI / 2, down: Math.PI / 2 }[dir]);
    g.beginPath();
    g.moveTo(40, 0); g.lineTo(0, -34); g.lineTo(0, -14); g.lineTo(-40, -14); g.lineTo(-40, 14); g.lineTo(0, 14); g.lineTo(0, 34);
    g.closePath(); g.fill();
    g.restore();
    const lines = text.split("\n");
    const size = Math.min((h - 30) / (lines.length * 1.1), (360 * 1.7) / Math.max(...lines.map((l) => l.length)));
    g.font = `${Math.floor(size)}px 'Special Elite', monospace`;
    g.textAlign = "center"; g.textBaseline = "middle";
    const tx = dir === "right" ? (w - 130) / 2 + 6 : (w + 130) / 2 - 6;
    lines.forEach((line, i) => g.fillText(line, tx, h / 2 + (i - (lines.length - 1) / 2) * size * 1.05));
    const r = rng(text.length * 7);
    g.globalCompositeOperation = "destination-out";
    for (let k = 0; k < 50; k++) { g.globalAlpha = 0.3; g.beginPath(); g.arc(r() * w, r() * h, 1 + r() * 5, 0, Math.PI * 2); g.fill(); }
    g.globalAlpha = 1;
    g.globalCompositeOperation = "source-over";
  }, false);
}

/** Mot manuscrit de survivant : papier crème, ruban adhésif, écriture penchée. */
export function centerNoteTexture(text: string, seed = 1): Texture {
  return make("center-note:" + text + seed, 192, 224, (g, w, h) => {
    const r = rng(seed * 31);
    g.clearRect(0, 0, w, h);
    g.fillStyle = ["#f4ecd6", "#efe0b8", "#e9dcc0", "#f2d9a8"][seed % 4];
    g.beginPath(); g.moveTo(8, 14); g.lineTo(w - 10, 8); g.lineTo(w - 6, h - 10); g.lineTo(12, h - 6); g.closePath(); g.fill();
    g.fillStyle = "rgba(255,240,200,0.75)";
    g.save(); g.translate(w / 2, 14); g.rotate((r() - 0.5) * 0.4); g.fillRect(-30, -9, 60, 18); g.restore();
    g.fillStyle = seed % 3 === 0 ? "#8a3a2a" : "#3a332c";
    const lines = text.split("\n");
    const size = Math.min(40, (w * 1.8) / Math.max(...lines.map((l) => l.length)));
    g.font = `${Math.floor(size)}px 'Patrick Hand', cursive`;
    g.textAlign = "center"; g.textBaseline = "middle";
    g.save(); g.translate(w / 2, h / 2 + 8); g.rotate((r() - 0.5) * 0.12);
    lines.forEach((line, i) => g.fillText(line, 0, (i - (lines.length - 1) / 2) * size * 1.15));
    g.restore();
  }, false);
}

/** Cadenas peint (pictogramme du poste de sécurité). */
export function centerPadlockTexture(): Texture {
  return make("center-padlock", 128, 128, (g, w) => {
    g.clearRect(0, 0, w, w);
    g.fillStyle = "#3a332c";
    g.beginPath(); g.arc(w / 2, w / 2, 62, 0, Math.PI * 2); g.fill();
    g.strokeStyle = "#e9dcc0"; g.lineWidth = 10;
    g.beginPath(); g.moveTo(w / 2 - 20, 62); g.lineTo(w / 2 - 20, 50); g.arc(w / 2, 50, 20, Math.PI, 0); g.lineTo(w / 2 + 20, 62); g.stroke();
    g.fillStyle = "#e9dcc0";
    g.fillRect(w / 2 - 30, 60, 60, 44);
    g.fillStyle = "#3a332c";
    g.beginPath(); g.arc(w / 2, 78, 7, 0, Math.PI * 2); g.fill();
    g.fillRect(w / 2 - 3, 80, 6, 14);
  }, false);
}

/** Écran de caméra de surveillance : image verdâtre, lignes de balayage, libellé. */
export function centerMonitorTexture(label: string, seed = 1): Texture {
  return make("center-monitor:" + label + seed, 256, 192, (g, w, h) => {
    const r = rng(seed * 17);
    g.fillStyle = "#1d3a34";
    g.fillRect(0, 0, w, h);
    g.fillStyle = "rgba(159,240,226,0.25)";
    g.beginPath(); g.moveTo(40, h); g.lineTo(100, 70); g.lineTo(156, 70); g.lineTo(216, h); g.closePath(); g.fill();
    g.fillStyle = "rgba(159,240,226,0.4)";
    for (let k = 0; k < 4; k++) g.fillRect(20 + r() * 200, 40 + r() * 120, 10 + r() * 30, 6 + r() * 20);
    g.fillStyle = "rgba(0,0,0,0.25)";
    for (let y = 0; y < h; y += 4) g.fillRect(0, y, w, 2);
    g.fillStyle = "#9ff0e2";
    g.font = "24px 'Special Elite', monospace";
    g.fillText(label, 12, 28);
    g.fillStyle = "#ff5a36";
    g.beginPath(); g.arc(w - 22, 20, 7, 0, Math.PI * 2); g.fill();
  }, false);
}
