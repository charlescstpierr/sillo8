// Son de SILLO 8, entièrement synthétisé (Web Audio, aucun fichier) : effets cartoon, ambiance de chaque zone,
// petits bruits mystérieux lointains, musique générative (game/music.ts) et vibration.
// Un seul AudioContext, créé ou repris au premier geste (contrainte iOS / Android).
// Sans Web Audio (tests Node) : chaque méthode est un no-op sans erreur.
import type { GameEvent } from "./events";
import {
  approach, busLevels, clamp01, computeTension, DEFAULT_SOUND, distanceGain, footstepGain, heartbeatLevel,
  MYSTERY_CUES, nextMysteryDelay, panFor, zoneAmbience,
  type BedLayer, type MixMode, type SoundSettings, type Threat,
} from "./mix";
import { Music } from "./music";
import { COMFORT, SCARY_SOUNDS } from "./comfort";
import { midiToHz, noiseBuffer, Voice, VoicePool } from "./synth";

/** Ce que le moteur donne au son à chaque image. */
export interface AudioFrame {
  mode: MixMode;
  /** Position du joueur (auditeur). */
  x: number;
  z: number;
  /** Salle (id de ROOMS) ou null. */
  room: string | null;
  /** La génératrice tourne (bourdonnement électrique). */
  powered: boolean;
  threats: readonly Threat[];
  health: number;
  /** Marceau, le mordu muet, est tout près : la musique se coupe en fondu (game/sound.ts, mix.ts hushed). */
  hush?: boolean;
}

export interface PlayOptions {
  /** Position dans le monde : volume selon la distance, gauche/droite selon l'écart. */
  x?: number;
  z?: number;
  /** Multiplicateur de volume. */
  gain?: number;
  pan?: number;
  /** Variante (ex. 1 = ferraille pour « pickup »). */
  variant?: number;
  /** Sol sous les pieds, pour les pas. */
  floor?: string;
  /** Intensité 0 → 1 (grognement en poursuite, indice important…). */
  intensity?: number;
  /** Son lointain : étouffé et plus d'écho. */
  far?: boolean;
}

interface Resolved {
  variant: number;
  floor: string;
  intensity: number;
  distance: number;
}

type Recipe = (v: Voice, t: number, d: AudioNode, o: Resolved) => void;

/**
 * Ce que l'interface apprend d'un son demandé (sous-titres des sons), même quand le son est coupé ou que
 * Web Audio est indisponible : nom, côté (−1 gauche → 1 droite), distance (m) et options d'origine.
 */
export interface HeardSound {
  name: string;
  pan: number;
  distance: number;
  /** Placé dans le monde (x, z donnés). */
  placed: boolean;
  far: boolean;
  intensity: number;
}
export type SoundListener = (sound: HeardSound) => void;

interface SoundDef {
  recipe: Recipe;
  gain: number;
  bus: "sfx" | "amb";
  echo?: number;
  /** Écart minimal entre deux déclenchements (s). */
  gap?: number;
  /** Joué même quand toutes les voix sont prises. */
  priority?: boolean;
}

const rnd = (a: number, b: number) => a + Math.random() * (b - a);

// ——— Recettes ———

const SOUNDS: Record<string, SoundDef> = {
  step: {
    gain: 0.32, bus: "sfx", gap: 0.08,
    recipe(v, t, d, o) {
      const k = rnd(0.85, 1.15);
      switch (o.floor) {
        case "dirt":
          v.noise({ start: t, dur: 0.08, peak: 0.55, filter: "lowpass", freq: 700 * k, dest: d });
          v.tone({ freq: 80 * k, freqEnd: 50, start: t, dur: 0.06, peak: 0.3, dest: d });
          break;
        case "tiles":
          v.noise({ start: t, dur: 0.04, peak: 0.4, filter: "bandpass", freq: 2400 * k, q: 1.5, dest: d });
          v.tone({ freq: 140 * k, freqEnd: 90, start: t, dur: 0.05, peak: 0.25, dest: d });
          break;
        case "metal":
        case "grate":
          v.noise({ start: t, dur: 0.05, peak: 0.35, filter: "bandpass", freq: 1800 * k, q: 2, dest: d });
          v.tone({ type: "triangle", freq: (o.floor === "grate" ? 880 : 620) * k, start: t, dur: 0.12, peak: 0.06, dest: d });
          break;
        default:
          v.noise({ start: t, dur: 0.05, peak: 0.4, filter: "bandpass", freq: 1100 * k, q: 1, dest: d });
          v.tone({ freq: 100 * k, freqEnd: 60, start: t, dur: 0.05, peak: 0.25, dest: d });
      }
    },
  },
  swing: {
    gain: 0.3, bus: "sfx", gap: 0.1,
    recipe(v, t, d) {
      v.noise({ start: t, dur: 0.2, peak: 0.5, attack: 0.08, filter: "bandpass", freq: 500, freqEnd: 1800, q: 2, dest: d });
    },
  },
  bonk: {
    gain: 0.5, bus: "sfx", gap: 0.05,
    recipe(v, t, d, o) {
      const k = rnd(0.92, 1.08);
      v.tone({ freq: 620 * k, freqEnd: 190, start: t, dur: 0.2, peak: 0.9, dest: d });
      v.tone({ type: "triangle", freq: 1240 * k, freqEnd: 380, start: t, dur: 0.12, peak: 0.25, dest: d });
      v.noise({ start: t, dur: 0.03, peak: 0.4, filter: "highpass", freq: 2500, dest: d });
      v.tone({ freq: 95, freqEnd: 60, start: t, dur: 0.12, peak: 0.5 + 0.2 * o.intensity, dest: d });
    },
  },
  nail: {
    gain: 0.38, bus: "sfx", gap: 0.04,
    recipe(v, t, d) {
      v.noise({ start: t, dur: 0.035, peak: 0.8, filter: "highpass", freq: 2800, dest: d });
      v.noise({ start: t + 0.02, dur: 0.07, peak: 0.5, filter: "bandpass", freq: 900, q: 1.2, dest: d });
      v.tone({ type: "square", freq: 1500, freqEnd: 500, start: t, dur: 0.03, peak: 0.12, dest: d });
      v.tone({ freq: 3100 * rnd(0.97, 1.03), start: t, dur: 0.15, peak: 0.08, dest: d });
      v.tone({ freq: 4350, start: t, dur: 0.1, peak: 0.05, dest: d });
    },
  },
  reload: {
    gain: 0.35, bus: "sfx", gap: 0.3,
    recipe(v, t, d) {
      v.noise({ start: t, dur: 0.02, peak: 0.6, filter: "bandpass", freq: 3000, q: 3, dest: d });
      v.noise({ start: t + 0.12, dur: 0.02, peak: 0.6, filter: "bandpass", freq: 2600, q: 3, dest: d });
      v.tone({ type: "square", freq: 700, start: t + 0.12, dur: 0.02, peak: 0.08, dest: d });
      v.noise({ start: t + 0.4, dur: 0.22, peak: 0.3, attack: 0.05, filter: "bandpass", freq: 900, freqEnd: 1700, q: 2, dest: d });
    },
  },
  reload_done: {
    gain: 0.4, bus: "sfx", gap: 0.2,
    recipe(v, t, d) {
      v.noise({ start: t, dur: 0.025, peak: 0.7, filter: "bandpass", freq: 2600, q: 3, dest: d });
      v.tone({ type: "triangle", freq: 900, freqEnd: 700, start: t, dur: 0.05, peak: 0.2, dest: d });
      v.noise({ start: t + 0.07, dur: 0.03, peak: 0.6, filter: "bandpass", freq: 1400, q: 2, dest: d });
      v.tone({ type: "triangle", freq: 600, start: t + 0.07, dur: 0.06, peak: 0.2, dest: d });
    },
  },
  lamp: {
    gain: 0.32, bus: "sfx", gap: 0.2,
    recipe(v, t, d) {
      v.noise({ start: t, dur: 0.012, peak: 0.6, filter: "highpass", freq: 4000, dest: d });
      v.tone({ freq: 2600, start: t, dur: 0.02, peak: 0.2, dest: d });
      v.tone({ freq: 2200, freqEnd: 700, start: t + 0.01, dur: 0.12, peak: 0.12, dest: d });
      const buzz = v.node(v.ctx.createBiquadFilter());
      buzz.type = "bandpass";
      buzz.frequency.value = 1100;
      buzz.Q.value = 1.5;
      buzz.connect(d);
      v.tone({ type: "sawtooth", freq: 118, start: t + 0.02, dur: 0.45, peak: 0.3, attack: 0.03, vibrato: [31, 5], dest: buzz });
      v.tone({ type: "sawtooth", freq: 236, start: t + 0.02, dur: 0.4, peak: 0.1, attack: 0.03, dest: buzz });
    },
  },
  swap: {
    gain: 0.22, bus: "sfx", gap: 0.08,
    recipe(v, t, d) {
      v.noise({ start: t, dur: 0.03, peak: 0.5, filter: "bandpass", freq: 2000, q: 2, dest: d });
      v.tone({ type: "triangle", freq: 500, start: t, dur: 0.04, peak: 0.2, dest: d });
    },
  },
  growl: {
    gain: 0.26, bus: "sfx", echo: 0.15, gap: 0.45,
    recipe(v, t, d, o) {
      const base = rnd(78, 108);
      const dur = rnd(0.8, 1.3);
      const formant = v.node(v.ctx.createBiquadFilter());
      formant.type = "bandpass";
      formant.frequency.value = rnd(420, 620);
      formant.Q.value = 2.5;
      const muffle = v.node(v.ctx.createBiquadFilter());
      muffle.type = "lowpass";
      muffle.frequency.value = Math.max(380, 1500 - o.distance * 60);
      formant.connect(muffle);
      muffle.connect(d);
      v.tone({ type: "sawtooth", freq: base * 1.25, freqEnd: base * 0.8, start: t, dur, peak: 0.7 + 0.3 * o.intensity, attack: 0.15, vibrato: [rnd(6, 9), base * 0.06], dest: formant });
      v.noise({ start: t, dur, peak: 0.18, attack: 0.2, filter: "bandpass", freq: 600, q: 1, dest: muffle });
    },
  },
  zombie_hit: {
    gain: 0.32, bus: "sfx", gap: 0.05,
    recipe(v, t, d) {
      v.tone({ freq: 260, freqEnd: 120, start: t, dur: 0.12, peak: 0.7, dest: d });
      v.noise({ start: t, dur: 0.08, peak: 0.6, filter: "lowpass", freq: 900, dest: d });
      v.tone({ type: "sawtooth", freq: 170, freqEnd: 120, start: t + 0.02, dur: 0.16, peak: 0.12, dest: d });
    },
  },
  zombie_fall: {
    gain: 0.4, bus: "sfx", gap: 0.1,
    recipe(v, t, d) {
      v.tone({ type: "triangle", freq: 380, freqEnd: 90, start: t, dur: 0.45, peak: 0.4, attack: 0.02, dest: d });
      v.tone({ freq: 75, freqEnd: 38, start: t + 0.42, dur: 0.3, peak: 0.9, dest: d });
      v.noise({ start: t + 0.42, dur: 0.2, peak: 0.6, filter: "lowpass", freq: 350, dest: d });
    },
  },
  player_hurt: {
    gain: 0.45, bus: "sfx", gap: 0.15, priority: true,
    recipe(v, t, d) {
      v.tone({ type: "triangle", freq: 320, freqEnd: 150, start: t, dur: 0.16, peak: 0.5, dest: d });
      v.tone({ freq: 140, freqEnd: 70, start: t, dur: 0.15, peak: 0.8, dest: d });
      v.noise({ start: t, dur: 0.08, peak: 0.5, filter: "bandpass", freq: 1200, q: 0.8, dest: d });
    },
  },
  heal: {
    gain: 0.22, bus: "sfx", gap: 0.2,
    recipe(v, t, d) {
      v.tone({ freq: 660, start: t, dur: 0.25, peak: 0.3, dest: d });
      v.tone({ freq: 880, start: t + 0.09, dur: 0.3, peak: 0.3, dest: d });
    },
  },
  pickup: {
    gain: 0.28, bus: "sfx", gap: 0.08, priority: true,
    recipe(v, t, d, o) {
      if (o.variant === 1) {
        // Ferraille : clonk métallique, puis petit « bling ».
        v.noise({ start: t, dur: 0.03, peak: 0.5, filter: "bandpass", freq: 2500, q: 2, dest: d });
        v.tone({ freq: 430, start: t, dur: 0.4, peak: 0.3, dest: d });
        v.tone({ freq: 1170, start: t, dur: 0.3, peak: 0.2, dest: d });
        v.tone({ freq: 1880, start: t, dur: 0.2, peak: 0.15, dest: d });
        v.tone({ type: "triangle", freq: 1568, start: t + 0.1, dur: 0.25, peak: 0.35, dest: d });
        return;
      }
      v.tone({ type: "triangle", freq: 1318, start: t, dur: 0.12, peak: 0.5, dest: d });
      v.tone({ type: "triangle", freq: 1976, start: t + 0.07, dur: 0.25, peak: 0.5, dest: d });
      v.tone({ freq: 3950, start: t + 0.07, dur: 0.1, peak: 0.1, dest: d });
    },
  },
  paper: {
    gain: 0.4, bus: "sfx", gap: 0.2,
    recipe(v, t, d) {
      for (let i = 0; i < 7; i++) {
        v.noise({ start: t + i * 0.045 + rnd(0, 0.02), dur: rnd(0.03, 0.07), peak: rnd(0.3, 0.7), filter: "bandpass", freq: rnd(2500, 5500), q: 0.8, dest: d });
      }
      v.noise({ start: t, dur: 0.35, peak: 0.1, attack: 0.05, filter: "highpass", freq: 5000, dest: d });
    },
  },
  sheet: {
    gain: 0.16, bus: "sfx", gap: 0.15,
    recipe(v, t, d) {
      for (let i = 0; i < 3; i++) v.noise({ start: t + i * 0.04, dur: 0.04, peak: 0.5, filter: "bandpass", freq: rnd(2500, 4500), q: 0.8, dest: d });
    },
  },
  discovery: {
    // Lecture d'une note : arpège de boîte à musique en ré mineur (7e majeure) qui intrigue, nappe grave qui gonfle.
    gain: 0.3, bus: "sfx", echo: 0.45, gap: 0.5, priority: true,
    recipe(v, t, d, o) {
      const notes = o.intensity >= 1 ? [62, 65, 69, 73, 76] : [62, 65, 69, 73];
      notes.forEach((n, i) => {
        const f = midiToHz(n + 12);
        v.tone({ freq: f, start: t + i * 0.11, dur: 1.8, peak: 0.45, attack: 0.004, dest: d });
        v.tone({ freq: f * 2.01, start: t + i * 0.11, dur: 0.6, peak: 0.12, attack: 0.002, dest: d });
      });
      v.tone({ type: "triangle", freq: midiToHz(50), start: t, dur: 2.4, peak: 0.35, attack: 0.6, dest: d });
      v.tone({ type: "triangle", freq: midiToHz(57), start: t + 0.1, dur: 2.2, peak: 0.25, attack: 0.6, dest: d });
      v.noise({ start: t + 0.2, dur: 1.2, peak: 0.05, attack: 0.4, filter: "highpass", freq: 6000, dest: d });
    },
  },
  door_open: {
    gain: 0.4, bus: "sfx", echo: 0.2, gap: 0.2,
    recipe(v, t, d) {
      v.noise({ start: t, dur: 0.5, peak: 0.3, attack: 0.02, filter: "highpass", freq: 2500, dest: d });
      const motor = v.node(v.ctx.createBiquadFilter());
      motor.type = "lowpass";
      motor.frequency.value = 400;
      motor.connect(d);
      v.tone({ type: "sawtooth", freq: 70, freqEnd: 110, start: t, dur: 0.7, peak: 0.35, attack: 0.1, dest: motor });
      v.tone({ freq: 90, freqEnd: 50, start: t + 0.7, dur: 0.2, peak: 0.8, dest: d });
      v.noise({ start: t + 0.7, dur: 0.1, peak: 0.5, filter: "lowpass", freq: 500, dest: d });
    },
  },
  locked: {
    gain: 0.4, bus: "sfx", gap: 0.3,
    recipe(v, t, d) {
      for (const s of [0, 0.16]) {
        v.tone({ type: "triangle", freq: 130, freqEnd: 90, start: t + s, dur: 0.12, peak: 0.7, dest: d });
        v.noise({ start: t + s, dur: 0.06, peak: 0.5, filter: "lowpass", freq: 800, dest: d });
      }
      v.tone({ type: "square", freq: 150, start: t + 0.32, dur: 0.18, peak: 0.06, dest: d });
    },
  },
  denied: {
    gain: 0.28, bus: "sfx", gap: 0.3,
    recipe(v, t, d) {
      v.tone({ type: "triangle", freq: 220, freqEnd: 180, start: t, dur: 0.12, peak: 0.4, dest: d });
      v.tone({ type: "triangle", freq: 165, freqEnd: 130, start: t + 0.12, dur: 0.16, peak: 0.4, dest: d });
    },
  },
  craft: {
    gain: 0.35, bus: "sfx", gap: 0.3, priority: true,
    recipe(v, t, d) {
      for (let i = 0; i < 7; i++) v.noise({ start: t + i * 0.05, dur: 0.015, peak: 0.7, filter: "bandpass", freq: 3000, q: 4, dest: d });
      v.tone({ freq: 520, start: t + 0.4, dur: 0.35, peak: 0.3, dest: d });
      v.tone({ freq: 1390, start: t + 0.4, dur: 0.25, peak: 0.2, dest: d });
      v.tone({ type: "triangle", freq: 1046, start: t + 0.5, dur: 0.4, peak: 0.3, dest: d });
    },
  },
  wall_break: {
    gain: 0.5, bus: "sfx", echo: 0.4, gap: 0.5, priority: true,
    recipe(v, t, d) {
      v.noise({ start: t, dur: 1.0, peak: 0.8, attack: 0.02, filter: "lowpass", freq: 600, freqEnd: 200, dest: d });
      v.tone({ freq: 60, freqEnd: 35, start: t, dur: 0.6, peak: 0.8, dest: d });
      for (let i = 0; i < 6; i++) v.noise({ start: t + 0.15 + rnd(0, 0.7), dur: 0.05, peak: 0.4, filter: "bandpass", freq: rnd(900, 1800), q: 1, dest: d });
    },
  },
  objective: {
    gain: 0.24, bus: "sfx", echo: 0.2, gap: 0.6, priority: true,
    recipe(v, t, d) {
      [72, 76, 79, 84].forEach((n, i) => {
        const last = i === 3;
        v.tone({ type: "triangle", freq: midiToHz(n), start: t + i * 0.1, dur: last ? 0.8 : 0.3, peak: 0.5, dest: d });
        v.tone({ freq: midiToHz(n - 12), start: t + i * 0.1, dur: last ? 0.8 : 0.3, peak: 0.2, dest: d });
      });
      v.tone({ freq: midiToHz(96), start: t + 0.32, dur: 0.3, peak: 0.08, dest: d });
    },
  },
  generator: {
    gain: 0.5, bus: "sfx", echo: 0.25, gap: 2, priority: true,
    recipe(v, t, d) {
      for (const s of [0, 0.35, 0.62, 0.84]) {
        v.noise({ start: t + s, dur: 0.18, peak: 0.9, filter: "lowpass", freq: 260, q: 2, dest: d });
        v.tone({ freq: 55, freqEnd: 40, start: t + s, dur: 0.18, peak: 0.6, dest: d });
      }
      const low = v.node(v.ctx.createBiquadFilter());
      low.type = "lowpass";
      low.frequency.value = 220;
      low.connect(d);
      v.tone({ type: "sawtooth", freq: 30, freqEnd: 50, start: t + 1, dur: 2.6, peak: 0.6, attack: 0.5, vibrato: [9, 3], dest: low });
      v.tone({ freq: 120, start: t + 1.1, dur: 2.5, peak: 0.2, attack: 1.2, dest: d });
    },
  },
  autosave: {
    gain: 0.04, bus: "sfx", gap: 1,
    recipe(v, t, d) {
      v.tone({ freq: 1320, start: t, dur: 0.07, peak: 0.5, dest: d });
      v.tone({ freq: 1760, start: t + 0.06, dur: 0.1, peak: 0.4, dest: d });
    },
  },
  death: {
    gain: 0.35, bus: "sfx", gap: 1, priority: true,
    recipe(v, t, d) {
      const soft = v.node(v.ctx.createBiquadFilter());
      soft.type = "lowpass";
      soft.frequency.value = 1500;
      soft.connect(d);
      [67, 66, 65].forEach((n, i) => v.tone({ type: "triangle", freq: midiToHz(n), start: t + 0.1 + i * 0.4, dur: 0.38, peak: 0.5, attack: 0.03, dest: soft }));
      v.tone({ type: "triangle", freq: midiToHz(64), start: t + 1.3, dur: 1.3, peak: 0.5, attack: 0.03, vibrato: [5, 6], dest: soft });
      v.tone({ freq: 70, freqEnd: 35, start: t, dur: 0.5, peak: 0.7, dest: d });
    },
  },
  ui: {
    gain: 0.15, bus: "sfx", gap: 0.05,
    recipe(v, t, d) {
      v.noise({ start: t, dur: 0.02, peak: 0.4, filter: "bandpass", freq: 3000, q: 2, dest: d });
    },
  },

  // ——— Ambiance (bruits ponctuels des lieux) ———
  drip: {
    gain: 0.12, bus: "amb", echo: 0.5, gap: 0.2,
    recipe(v, t, d) {
      const f = rnd(900, 1500);
      v.tone({ freq: f, freqEnd: f * 1.8, start: t, dur: 0.06, peak: 0.6, attack: 0.002, dest: d });
      if (Math.random() < 0.4) v.tone({ freq: f * 1.1, freqEnd: f * 2, start: t + 0.3, dur: 0.05, peak: 0.3, attack: 0.002, dest: d });
    },
  },
  pipe_creak: {
    gain: 0.12, bus: "amb", echo: 0.5, gap: 1,
    recipe(v, t, d) {
      const f = rnd(55, 85);
      const res = v.node(v.ctx.createBiquadFilter());
      res.type = "bandpass";
      res.frequency.value = rnd(380, 520);
      res.Q.value = 9;
      res.connect(d);
      v.tone({ type: "sawtooth", freq: f, freqEnd: f * 1.15, start: t, dur: 1.4, peak: 0.6, attack: 0.4, vibrato: [3, 2], dest: res });
    },
  },
  creak: {
    gain: 0.08, bus: "amb", echo: 0.3, gap: 1,
    recipe(v, t, d) {
      const f = rnd(180, 260);
      const res = v.node(v.ctx.createBiquadFilter());
      res.type = "bandpass";
      res.frequency.value = 900;
      res.Q.value = 6;
      res.connect(d);
      v.tone({ type: "sawtooth", freq: f, freqEnd: f * 0.85, start: t, dur: 0.7, peak: 0.5, attack: 0.1, vibrato: [22, 25], dest: res });
    },
  },
  clock_tick: {
    gain: 0.06, bus: "amb", echo: 0.2, gap: 4,
    recipe(v, t, d) {
      for (let i = 0; i < 4; i++) {
        v.noise({ start: t + i, dur: 0.015, peak: 0.6, filter: "highpass", freq: 3500, dest: d });
        v.tone({ type: "triangle", freq: i % 2 ? 1700 : 2000, start: t + i, dur: 0.02, peak: 0.2, dest: d });
      }
    },
  },
  electric_buzz: {
    gain: 0.05, bus: "amb", gap: 1,
    recipe(v, t, d) {
      const band = v.node(v.ctx.createBiquadFilter());
      band.type = "bandpass";
      band.frequency.value = 1800;
      band.Q.value = 2;
      band.connect(d);
      v.tone({ type: "square", freq: 100, start: t, dur: 0.5, peak: 0.4, attack: 0.02, vibrato: [40, 20], dest: band });
      v.tone({ type: "square", freq: 100, start: t + 0.6, dur: 0.2, peak: 0.2, attack: 0.01, dest: band });
    },
  },
  wind_gust: {
    gain: 0.12, bus: "amb", gap: 2,
    recipe(v, t, d) {
      v.noise({ start: t, dur: 2.6, peak: 0.7, attack: 1.1, filter: "bandpass", freq: 350, freqEnd: 900, q: 0.7, dest: d });
    },
  },
  leaves: {
    gain: 0.06, bus: "amb", gap: 1,
    recipe(v, t, d) {
      v.noise({ start: t, dur: 1, peak: 0.4, attack: 0.3, filter: "highpass", freq: 3500, dest: d });
    },
  },

  // ——— Mystère : bruits inexpliqués, lointains ———
  distant_steps: {
    gain: 0.22, bus: "amb", echo: 0.6, gap: 3,
    recipe(v, t, d) {
      const n = 4 + Math.floor(Math.random() * 3);
      for (let i = 0; i < n; i++) {
        const s = t + i * rnd(0.5, 0.6);
        v.noise({ start: s, dur: 0.07, peak: 0.6 * (1 - i / (n + 2)), filter: "lowpass", freq: 500, dest: d });
        v.tone({ freq: 70, freqEnd: 45, start: s, dur: 0.07, peak: 0.5 * (1 - i / (n + 2)), dest: d });
      }
    },
  },
  door_slam: {
    gain: 0.28, bus: "amb", echo: 0.8, gap: 3,
    recipe(v, t, d) {
      v.noise({ start: t, dur: 0.35, peak: 0.9, attack: 0.005, filter: "lowpass", freq: 500, dest: d });
      v.tone({ freq: 70, freqEnd: 35, start: t, dur: 0.4, peak: 0.9, dest: d });
    },
  },
  radio_static: {
    gain: 0.16, bus: "amb", echo: 0.4, gap: 2,
    recipe(v, t, d) {
      v.noise({ start: t, dur: 1.6, peak: 0.5, attack: 0.05, filter: "bandpass", freq: 1800, q: 0.7, dest: d });
      const voice = v.node(v.ctx.createBiquadFilter());
      voice.type = "bandpass";
      voice.frequency.value = 1000;
      voice.Q.value = 4;
      voice.connect(d);
      for (let i = 0; i < 8; i++) {
        v.tone({ type: "square", freq: rnd(260, 520), start: t + rnd(0.2, 1.35), dur: rnd(0.06, 0.14), peak: 0.25, attack: 0.01, dest: voice });
      }
      v.tone({ freq: 1800, freqEnd: 1000, start: t + 1.5, dur: 0.1, peak: 0.2, dest: d });
    },
  },
  metal_clang: {
    gain: 0.15, bus: "amb", echo: 0.8, gap: 3,
    recipe(v, t, d) {
      v.noise({ start: t, dur: 0.02, peak: 0.6, filter: "highpass", freq: 2000, dest: d });
      [[410, 1.8, 0.5], [1093, 1.2, 0.3], [1789, 0.8, 0.2], [2610, 0.5, 0.1]].forEach(([f, dur, peak]) => v.tone({ freq: f, start: t, dur, peak, attack: 0.002, dest: d }));
    },
  },
  distant_knock: {
    gain: 0.2, bus: "amb", echo: 0.6, gap: 3,
    recipe(v, t, d) {
      for (let i = 0; i < 3; i++) {
        v.tone({ freq: 140, freqEnd: 110, start: t + i * 0.28, dur: 0.09, peak: 0.8, dest: d });
        v.noise({ start: t + i * 0.28, dur: 0.04, peak: 0.5, filter: "bandpass", freq: 700, q: 1, dest: d });
      }
    },
  },
  // Signal tapé à la main à la radio (enquête, d11) : V · I · E · N · S en morse, un peu irrégulier.
  morse: {
    gain: 0.12, bus: "amb", echo: 0.3, gap: 6,
    recipe(v, t, d) {
      const dot = 0.09;
      let at = t;
      for (const letter of ["...-", "..", ".", "-.", "..."]) {
        for (const mark of letter) {
          const dur = mark === "-" ? dot * 3 : dot;
          v.tone({ type: "square", freq: 820, start: at, dur, peak: 0.35, attack: 0.005, dest: d });
          at += dur + dot * rnd(0.9, 1.3);
        }
        at += dot * 3;
      }
    },
  },
};

/** Noms de tous les sons jouables (effets, ambiance, mystère). */
export const SOUND_NAMES = Object.keys(SOUNDS);

const MYSTERY = new Set<string>(MYSTERY_CUES);
const BED_SCALE: Record<BedLayer, number> = { wind: 0.22, hum: 0.06, rumble: 0.35, room: 0.07 };

type Ctor = new () => AudioContext;

function audioContextClass(): Ctor | null {
  if (typeof globalThis === "undefined") return null;
  const g = globalThis as unknown as { AudioContext?: Ctor; webkitAudioContext?: Ctor };
  return g.AudioContext ?? g.webkitAudioContext ?? null;
}

export interface AudioDebug {
  supported: boolean;
  state: string;
  started: boolean;
  voices: number;
  musicNotes: number;
  /** Musique coupée par Marceau : 0 (jouée) → 1 (coupée). */
  hush: number;
  tension: number;
  heartbeat: number;
  room: string | null;
  mode: MixMode;
  settings: SoundSettings;
  /** Sons demandés (même sans Web Audio), par nom. */
  requested: Record<string, number>;
  /** Sons réellement programmés. */
  played: Record<string, number>;
  dropped: number;
  /** Recettes qui ont levé une erreur (doit rester à 0). */
  failed: number;
  names: string[];
}

export class GameAudio {
  readonly supported: boolean;
  settings: SoundSettings = { ...DEFAULT_SOUND };
  ctx: AudioContext | null = null;
  tension = 0;
  heartbeat = 0;
  /** Coupure de la musique quand Marceau approche : 0 → 1, en fondu (sortie ~1 s, retour plus lent). */
  hush = 0;
  readonly requested: Record<string, number> = {};
  readonly played: Record<string, number> = {};
  dropped = 0;
  failed = 0;

  private master: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private sfxBus: GainNode | null = null;
  private ambBus: GainNode | null = null;
  private echoIn: DelayNode | null = null;
  private music: Music | null = null;
  private beds: Partial<Record<BedLayer, GainNode>> = {};
  private persistent: AudioNode[] = [];
  private readonly pool = new VoicePool(18);
  private listenerX = 0;
  private listenerZ = 0;
  private mode: MixMode = "menu";
  private hidden = false;
  private room: string | null = null;
  private powered = false;
  private health = 100;
  private mixClock = 0;
  private mysteryClock = 40;
  private last = new Map<string, number>();
  private detach: (() => void)[] = [];
  private listeners: SoundListener[] = [];

  constructor(options: { attach?: boolean } = {}) {
    this.supported = audioContextClass() !== null;
    if (options.attach !== false && typeof window !== "undefined" && typeof document !== "undefined") this.attach();
  }

  /** Écoute le premier geste (création / reprise du contexte) et l'onglet caché. */
  private attach(): void {
    const unlock = () => { this.unlock(); };
    const events = ["pointerdown", "touchend", "keydown", "mousedown"] as const;
    for (const name of events) window.addEventListener(name, unlock, { capture: true, passive: true });
    const visibility = () => this.setHidden(document.visibilityState === "hidden");
    document.addEventListener("visibilitychange", visibility);
    this.hidden = document.visibilityState === "hidden";
    this.detach.push(() => {
      for (const name of events) window.removeEventListener(name, unlock, { capture: true });
      document.removeEventListener("visibilitychange", visibility);
    });
  }

  get started(): boolean {
    return this.ctx !== null;
  }

  /** Crée ou reprend l'AudioContext ; à appeler depuis un geste de l'utilisateur. */
  unlock(): boolean {
    if (!this.supported || this.hidden) return false;
    try {
      if (!this.ctx) {
        const C = audioContextClass()!;
        this.ctx = new C();
        this.build(this.ctx);
      }
      if (this.ctx.state !== "running") void this.ctx.resume().catch(() => undefined);
      return true;
    } catch {
      this.ctx = null;
      return false;
    }
  }

  private build(ctx: AudioContext): void {
    const keep = <T extends AudioNode>(n: T): T => { this.persistent.push(n); return n; };
    const comp = keep(ctx.createDynamicsCompressor());
    comp.threshold.value = -16;
    comp.ratio.value = 4;
    comp.connect(ctx.destination);
    this.master = keep(ctx.createGain());
    this.master.gain.value = 0;
    this.master.connect(comp);
    this.musicBus = keep(ctx.createGain());
    this.sfxBus = keep(ctx.createGain());
    this.ambBus = keep(ctx.createGain());
    for (const bus of [this.musicBus, this.sfxBus, this.ambBus]) {
      bus.gain.value = 0;
      bus.connect(this.master);
    }
    // Écho partagé (couloirs) pour l'ambiance et les sons lointains.
    this.echoIn = keep(ctx.createDelay(1));
    this.echoIn.delayTime.value = 0.31;
    const fb = keep(ctx.createGain());
    fb.gain.value = 0.36;
    const tone = keep(ctx.createBiquadFilter());
    tone.type = "lowpass";
    tone.frequency.value = 1500;
    this.echoIn.connect(tone);
    tone.connect(fb);
    fb.connect(this.echoIn);
    tone.connect(this.ambBus);
    this.music = new Music(ctx, this.musicBus);
    this.buildBeds(ctx, keep);
    // iOS : un tampon muet joué dans le geste « déverrouille » la sortie.
    const silent = ctx.createBufferSource();
    silent.buffer = ctx.createBuffer(1, 1, ctx.sampleRate);
    silent.connect(ctx.destination);
    silent.onended = () => silent.disconnect();
    silent.start();
  }

  /** Nappes d'ambiance en boucle (vent, bourdonnement, grondement, air de la pièce), mixées selon la zone. */
  private buildBeds(ctx: AudioContext, keep: <T extends AudioNode>(n: T) => T): void {
    const noise = noiseBuffer(ctx);
    const loop = (offset: number) => {
      const src = keep(ctx.createBufferSource());
      src.buffer = noise;
      src.loop = true;
      src.start(0, offset);
      return src;
    };
    const lfo = (freq: number, depth: number, param: AudioParam) => {
      const o = keep(ctx.createOscillator());
      o.frequency.value = freq;
      const g = keep(ctx.createGain());
      g.gain.value = depth;
      o.connect(g);
      g.connect(param);
      o.start();
    };
    const bed = (layer: BedLayer) => {
      const g = keep(ctx.createGain());
      g.gain.value = 0;
      g.connect(this.ambBus!);
      this.beds[layer] = g;
      return g;
    };
    // Vent : bruit filtré dont la couleur et le souffle ondulent lentement.
    const wind = bed("wind");
    const windFilter = keep(ctx.createBiquadFilter());
    windFilter.type = "bandpass";
    windFilter.frequency.value = 450;
    windFilter.Q.value = 0.8;
    lfo(0.08, 220, windFilter.frequency);
    const windSwell = keep(ctx.createGain());
    windSwell.gain.value = 0.75;
    lfo(0.13, 0.25, windSwell.gain);
    loop(0).connect(windFilter);
    windFilter.connect(windSwell);
    windSwell.connect(wind);
    // Bourdonnement électrique (après la génératrice).
    const hum = bed("hum");
    const humFilter = keep(ctx.createBiquadFilter());
    humFilter.type = "lowpass";
    humFilter.frequency.value = 240;
    humFilter.connect(hum);
    for (const [f, type] of [[50, "sawtooth"], [50.4, "sawtooth"], [100, "sine"]] as const) {
      const o = keep(ctx.createOscillator());
      o.type = type;
      o.frequency.value = f;
      o.connect(humFilter);
      o.start();
    }
    // Grondement de la génératrice.
    const rumble = bed("rumble");
    const rumbleFilter = keep(ctx.createBiquadFilter());
    rumbleFilter.type = "lowpass";
    rumbleFilter.frequency.value = 120;
    rumbleFilter.Q.value = 2;
    const chug = keep(ctx.createGain());
    chug.gain.value = 0.8;
    lfo(7, 0.2, chug.gain);
    loop(0.5).connect(rumbleFilter);
    rumbleFilter.connect(chug);
    chug.connect(rumble);
    // Air de la pièce : souffle grave, presque imperceptible.
    const room = bed("room");
    const roomFilter = keep(ctx.createBiquadFilter());
    roomFilter.type = "lowpass";
    roomFilter.frequency.value = 280;
    loop(1).connect(roomFilter);
    roomFilter.connect(room);
  }

  /** Applique les volumes et la vibration (réglages). */
  configure(settings: Partial<SoundSettings>): void {
    this.settings = {
      master: clamp01(settings.master ?? this.settings.master),
      music: clamp01(settings.music ?? this.settings.music),
      sfx: clamp01(settings.sfx ?? this.settings.sfx),
      vibration: settings.vibration ?? this.settings.vibration,
    };
    this.applyMix(true);
  }

  private setHidden(hidden: boolean): void {
    this.hidden = hidden;
    const ctx = this.ctx;
    if (!ctx) return;
    this.applyMix(true);
    if (hidden) {
      setTimeout(() => { if (this.hidden && ctx.state === "running") void ctx.suspend().catch(() => undefined); }, 350);
    } else if (ctx.state !== "running") {
      void ctx.resume().catch(() => undefined);
    }
  }

  private effectiveMode(): MixMode {
    return this.hidden ? "hidden" : this.mode;
  }

  private applyMix(fast = false): void {
    const ctx = this.ctx;
    if (!ctx || !this.master) return;
    const levels = busLevels(this.settings, this.effectiveMode());
    const now = ctx.currentTime;
    // Courbe de volume perçue : le carré du curseur.
    this.master.gain.setTargetAtTime(levels.master * levels.master, now, fast ? 0.05 : 0.15);
    this.sfxBus!.gain.setTargetAtTime(levels.sfx * levels.sfx, now, 0.1);
    this.musicBus!.gain.setTargetAtTime(levels.music * levels.music * 4, now, fast ? 0.2 : 0.8);
    this.ambBus!.gain.setTargetAtTime(levels.ambience * levels.ambience, now, 0.6);
  }

  /** Appelé à chaque image par game/sound.ts. */
  update(dt: number, frame: AudioFrame): void {
    this.mode = frame.mode;
    this.listenerX = frame.x;
    this.listenerZ = frame.z;
    this.health = frame.health;
    const target = frame.mode === "playing" ? computeTension(frame.threats) : frame.mode === "paused" ? this.tension : 0;
    this.tension = approach(this.tension, target, dt, 0.9, 0.3);
    if (this.tension < 0.002) this.tension = 0;
    this.heartbeat = approach(this.heartbeat, frame.mode === "playing" || frame.mode === "paused" ? heartbeatLevel(frame.health) : 0, dt, 1.5, 0.8);
    this.hush = approach(this.hush, frame.hush ? 1 : 0, dt, 2.2, 0.6);
    if (this.hush < 0.002) this.hush = 0;
    const ctx = this.ctx;
    if (!ctx || ctx.state !== "running") return;
    this.mixClock -= dt;
    const zoneChanged = frame.room !== this.room || frame.powered !== this.powered;
    if (this.mixClock <= 0 || zoneChanged) {
      this.mixClock = 0.12;
      this.room = frame.room;
      this.powered = frame.powered;
      this.applyMix();
      const amb = zoneAmbience(frame.room, frame.powered);
      const now = ctx.currentTime;
      for (const layer of Object.keys(BED_SCALE) as BedLayer[]) {
        const level = frame.mode === "menu" ? 0 : (amb.beds[layer] ?? 0) * BED_SCALE[layer];
        this.beds[layer]?.gain.setTargetAtTime(level, now, 1.5);
      }
    }
    const levels = busLevels(this.settings, this.effectiveMode());
    this.music?.update({
      explore: Math.max(0.25, 1 - 0.7 * this.tension),
      tension: this.tension,
      heartbeat: this.heartbeat,
      health: frame.health,
      hush: this.hush,
      active: levels.music > 0.001 && levels.master > 0.001,
    });
    if (frame.mode === "playing") this.ambientSpots(dt, frame.room, frame.powered);
  }

  /** Petits bruits du lieu, et de temps en temps un bruit inexpliqué au loin. */
  private ambientSpots(dt: number, room: string | null, powered: boolean): void {
    const amb = zoneAmbience(room, powered);
    for (const [name, perMinute] of Object.entries(amb.spots)) {
      if (perMinute && Math.random() < (perMinute / 60) * dt) {
        this.play(name, { pan: rnd(-0.7, 0.7), gain: rnd(0.5, 1) });
      }
    }
    if (this.tension < 0.1) this.mysteryClock -= dt;
    if (this.mysteryClock <= 0) {
      this.mysteryClock = nextMysteryDelay(Math.random());
      this.cue(MYSTERY_CUES[Math.floor(Math.random() * MYSTERY_CUES.length)]);
    }
  }

  /**
   * Bruit d'ambiance par nom (enquête, mystère, effets) : `audio.cue("radio_static", x, z)`.
   * Sans position, un bruit mystérieux vient de loin, à gauche ou à droite. Faux si le nom est inconnu.
   */
  cue(name: string, x?: number, z?: number): boolean {
    if (!(name in SOUNDS)) return false;
    if (x !== undefined && z !== undefined) this.play(name, { x, z, far: MYSTERY.has(name) });
    else if (MYSTERY.has(name)) this.play(name, { pan: (Math.random() < 0.5 ? -1 : 1) * rnd(0.4, 0.85), gain: 0.7, far: true });
    else this.play(name, { pan: rnd(-0.5, 0.5) });
    return true;
  }

  /** Écoute les sons demandés (sous-titres). Retourne la fonction de désabonnement. */
  listen(listener: SoundListener): () => void {
    this.listeners.push(listener);
    return () => { this.listeners = this.listeners.filter((l) => l !== listener); };
  }

  /** Prévient les auditeurs (sous-titres) ; n'influe jamais sur le son lui-même. */
  private announce(name: string, options: PlayOptions): void {
    if (this.listeners.length === 0) return;
    let pan = options.pan ?? 0;
    let distance = 0;
    const placed = options.x !== undefined && options.z !== undefined;
    if (placed) {
      const dx = options.x! - this.listenerX;
      distance = Math.hypot(dx, options.z! - this.listenerZ);
      pan = panFor(dx, distance);
    }
    const heard: HeardSound = { name, pan, distance, placed, far: options.far === true, intensity: options.intensity ?? 0.5 };
    for (const listener of this.listeners) {
      try { listener(heard); } catch { /* un sous-titre fautif ne coupe jamais le son */ }
    }
  }

  /** Joue un son par nom. Vrai s'il a été programmé. */
  play(name: string, options: PlayOptions = {}): boolean {
    const def = SOUNDS[name];
    if (!def) return false;
    this.requested[name] = (this.requested[name] ?? 0) + 1;
    this.announce(name, options);
    const ctx = this.ctx;
    if (!ctx || ctx.state !== "running" || this.hidden) return false;
    const now = ctx.currentTime;
    const last = this.last.get(name);
    if (last !== undefined && now - last < (def.gap ?? 0.03)) return false;
    if (this.pool.active >= this.pool.max + (def.priority ? 4 : 0)) {
      this.dropped += 1;
      return false;
    }
    // Mode moins effrayant : les sons qui font sursauter sont atténués (multiplicateur, 1 par défaut).
    let gain = def.gain * (options.gain ?? 1) * (SCARY_SOUNDS.has(name) ? COMFORT.scare : 1);
    let pan = options.pan ?? 0;
    let distance = 0;
    if (options.x !== undefined && options.z !== undefined) {
      const dx = options.x - this.listenerX;
      const dz = options.z - this.listenerZ;
      distance = Math.hypot(dx, dz);
      gain *= options.far ? Math.max(0.25, distanceGain(distance, 4, 40)) : distanceGain(distance, 2, 20);
      pan = panFor(dx, distance);
    }
    if (gain < 0.004) return false;
    this.last.set(name, now);
    try {
      const bus = def.bus === "amb" ? this.ambBus! : this.sfxBus!;
      const v = new Voice(ctx, bus, this.pool, gain, pan);
      const echo = (def.echo ?? 0) + (options.far ? 0.3 : 0);
      if (echo > 0 && this.echoIn) v.send(this.echoIn, echo);
      let dest: AudioNode = v.out;
      if (options.far) {
        const muffle = v.node(ctx.createBiquadFilter());
        muffle.type = "lowpass";
        muffle.frequency.value = 1300;
        muffle.connect(v.out);
        dest = muffle;
      }
      def.recipe(v, now + 0.01, dest, { variant: options.variant ?? 0, floor: options.floor ?? "", intensity: options.intensity ?? 0.5, distance });
      v.done();
      this.played[name] = (this.played[name] ?? 0) + 1;
      return true;
    } catch {
      this.failed += 1;
      return false;
    }
  }

  vibrate(pattern: number | number[]): boolean {
    if (!this.settings.vibration || !COMFORT.vibration || typeof navigator === "undefined") return false;
    try {
      return typeof navigator.vibrate === "function" ? navigator.vibrate(pattern) : false;
    } catch {
      return false;
    }
  }

  /** Traduit un événement de jeu en son. */
  handle(event: GameEvent): void {
    switch (event.type) {
      case "step": {
        const gain = footstepGain(event.pose);
        if (gain > 0) this.play("step", { floor: event.floor, gain });
        break;
      }
      case "swing":
        this.play("swing");
        if (event.hits > 0) this.play("bonk", { intensity: Math.min(1, event.hits / 2) });
        break;
      case "shot": this.play("nail"); break;
      case "reload": this.play("reload"); break;
      case "reloaded": this.play("reload_done"); break;
      case "lamp": this.play("lamp"); break;
      case "weapon": this.play("swap"); break;
      case "zombie_growl": this.play("growl", { x: event.x, z: event.z, intensity: event.chasing ? 1 : 0.4 }); break;
      case "zombie_hit": this.play("zombie_hit", { x: event.x, z: event.z }); break;
      case "zombie_down": this.play("zombie_fall", { x: event.x, z: event.z }); break;
      case "player_hit":
        this.play("player_hurt");
        this.vibrate(70);
        break;
      case "player_death":
        this.play("death");
        this.vibrate([120, 60, 220]);
        break;
      case "heal": this.play("heal"); break;
      case "pickup": this.play("pickup", { variant: event.kind === "components" || event.kind === "ammo" ? 1 : 0 }); break;
      case "note_open": this.play("paper"); break;
      case "note_found": this.play("discovery", { intensity: event.clue ? 1 : 0.5 }); break;
      case "door_open": this.play("door_open", { x: event.x, z: event.z }); break;
      case "interact": this.interacted(event.id, event.changed); break;
      case "objective": this.play("objective"); break;
      case "generator": this.play("generator"); break;
      case "autosave": this.play("autosave"); break;
      case "sheet": this.play("sheet"); break;
      case "cue": this.cue(event.name, event.x, event.z); break;
    }
  }

  private interacted(id: string, changed: boolean): void {
    if (!changed) {
      if (id === "security_door" || id === "stairs") this.play("locked");
      else if (["generator", "workbench", "nail_press", "upgrade", "comms", "secret_wall"].includes(id)) this.play("denied");
      return;
    }
    switch (id) {
      case "workbench":
      case "nail_press":
      case "upgrade":
      case "recharge":
        this.play("craft");
        break;
      case "comms":
        this.play("craft");
        // La radio reprend vie… et grésille.
        this.play("radio_static", { pan: 0.2, gain: 1.4 });
        break;
      case "secret_wall":
        this.play("wall_break");
        break;
    }
  }

  debug(): AudioDebug {
    return {
      supported: this.supported,
      state: this.ctx?.state ?? "none",
      started: this.started,
      voices: this.pool.active,
      musicNotes: this.music?.notes ?? 0,
      hush: Math.round(this.hush * 1000) / 1000,
      tension: Math.round(this.tension * 1000) / 1000,
      heartbeat: Math.round(this.heartbeat * 1000) / 1000,
      room: this.room,
      mode: this.effectiveMode(),
      settings: { ...this.settings },
      requested: { ...this.requested },
      played: { ...this.played },
      dropped: this.dropped,
      failed: this.failed,
      names: SOUND_NAMES,
    };
  }

  dispose(): void {
    for (const off of this.detach) off();
    this.detach.length = 0;
    this.music?.dispose();
    for (const n of this.persistent) {
      try {
        if (n instanceof AudioScheduledSourceNode) n.stop();
        n.disconnect();
      } catch {
        // déjà arrêté
      }
    }
    this.persistent.length = 0;
    void this.ctx?.close().catch(() => undefined);
    this.ctx = null;
  }
}
