// Musique générative : boîte à musique mystérieuse et douce en exploration (accords en ré dorien,
// notes rares qui résonnent), couche de tension discrète (pulsation basse, grappe en trémolo)
// et battement de cœur quand la vie est basse. Elle se tait quand Marceau, le mordu muet, approche (levels.hush).
// Tout est programmé un peu en avance sur l'horloge audio.
import { heartbeatInterval } from "./mix";
import { midiToHz, Voice, VoicePool } from "./synth";

const BEAT = 60 / 62;
const BAR = BEAT * 4;
const LOOKAHEAD = 0.5;

/** Progression : accords en notes MIDI (voix médiane), un par mesure. Un peu d'ambiguïté (7e majeure, demi-diminué). */
const CHORDS: number[][] = [
  [50, 57, 64, 65], // Ré m (add9)
  [46, 57, 62, 65], // Si♭ maj7
  [43, 58, 62, 64], // Sol m6
  [45, 57, 62, 64], // La sus4
  [50, 57, 61, 65], // Ré m (maj7) : la note qui intrigue
  [46, 58, 62, 65], // Si♭
  [40, 55, 58, 62], // Mi m7♭5
  [45, 55, 61, 64], // La 7
];
/** Gamme de la mélodie (ré dorien, aigu), plus une note étrangère rare (sol♯). */
const SCALE = [74, 76, 77, 79, 81, 83, 84, 86];
const STRANGE = 80;

export interface MusicLevels {
  /** Gain d'exploration 0 → 1 (baisse quand la tension monte). */
  explore: number;
  tension: number;
  heartbeat: number;
  health: number;
  /**
   * Coupure 0 → 1 quand Marceau, le mordu muet, est tout près : boîte à musique et tension se taisent (le battement
   * de cœur, qui dit la vie basse, reste). Le fondu est fait en amont (game/audio.ts).
   */
  hush?: number;
  /** Faux : on ne programme plus de notes (bus muet, onglet caché). */
  active: boolean;
}

export class Music {
  private exploreBus: GainNode;
  private tensionBus: GainNode;
  private echo: DelayNode;
  private readonly pool = new VoicePool(14);
  private nextBar = 0;
  private nextBeat = 0;
  private nextPulse = 0;
  private nextHeart = 0;
  private bar = 0;
  private started = false;
  private nodes: AudioNode[] = [];
  /** Nombre de notes programmées (tests, débogage). */
  notes = 0;

  constructor(private ctx: BaseAudioContext, private out: AudioNode, private random: () => number = Math.random) {
    this.exploreBus = this.keep(ctx.createGain());
    this.tensionBus = this.keep(ctx.createGain());
    this.exploreBus.gain.value = 0;
    this.tensionBus.gain.value = 0;
    this.exploreBus.connect(out);
    this.tensionBus.connect(out);
    // Écho doux de la boîte à musique.
    this.echo = this.keep(ctx.createDelay(1));
    this.echo.delayTime.value = BEAT * 0.75;
    const feedback = this.keep(ctx.createGain());
    feedback.gain.value = 0.38;
    const tone = this.keep(ctx.createBiquadFilter());
    tone.type = "lowpass";
    tone.frequency.value = 2200;
    this.echo.connect(tone);
    tone.connect(feedback);
    feedback.connect(this.echo);
    tone.connect(this.exploreBus);
  }

  private keep<T extends AudioNode>(n: T): T {
    this.nodes.push(n);
    return n;
  }

  update(levels: MusicLevels): void {
    const now = this.ctx.currentTime;
    const open = 1 - Math.min(1, Math.max(0, levels.hush ?? 0));
    this.exploreBus.gain.setTargetAtTime(levels.explore * open, now, open < 1 ? 0.25 : 0.8);
    this.tensionBus.gain.setTargetAtTime(Math.min(1, levels.tension * 1.2) * open, now, open < 1 ? 0.25 : 0.6);
    if (!this.started) {
      this.started = true;
      this.nextBar = this.nextBeat = this.nextPulse = this.nextHeart = now + 0.2;
    }
    const horizon = now + LOOKAHEAD;
    if (!levels.active) {
      // Rien à programmer : l'horloge musicale suit simplement le temps.
      if (this.nextBar < now) this.nextBar = this.nextBeat = this.nextPulse = this.nextHeart = now + 0.2;
      return;
    }
    while (this.nextBar < horizon) {
      this.playBar(this.nextBar, levels);
      this.nextBar += BAR;
      this.bar += 1;
    }
    while (this.nextBeat < horizon) {
      this.playBeat(this.nextBeat, levels);
      this.nextBeat += BEAT;
    }
    if (levels.tension > 0.04) {
      while (this.nextPulse < horizon) {
        this.pulse(this.nextPulse, levels.tension);
        this.nextPulse += BEAT * (1 - 0.4 * levels.tension);
      }
    } else this.nextPulse = Math.max(this.nextPulse, now);
    if (levels.heartbeat > 0.02) {
      while (this.nextHeart < horizon) {
        this.heart(this.nextHeart, levels.heartbeat);
        this.nextHeart += heartbeatInterval(levels.health);
      }
    } else this.nextHeart = Math.max(this.nextHeart, now);
  }

  private voice(gain = 1, dest: AudioNode = this.exploreBus): Voice | null {
    if (this.pool.full) return null;
    this.notes += 1;
    return new Voice(this.ctx, dest, this.pool, gain);
  }

  private chord(): number[] {
    return CHORDS[this.bar % CHORDS.length];
  }

  /** Nappe douce (triangles filtrés) et petite basse pincée, cartoon. Toutes les 16 mesures, deux mesures de quasi-silence. */
  private playBar(t: number, levels: MusicLevels): void {
    const chord = this.chord();
    const rest = this.bar % 16 >= 14;
    if (levels.explore > 0.02 && !rest) {
      const pad = this.voice(0.07);
      if (pad) {
        const filter = pad.node(this.ctx.createBiquadFilter());
        filter.type = "lowpass";
        filter.frequency.value = 900;
        filter.connect(pad.out);
        for (const note of chord.slice(1)) {
          pad.tone({ type: "triangle", freq: midiToHz(note), start: t, dur: BAR + 1.6, peak: 0.6, attack: 1.4, dest: filter });
        }
      }
      const bass = this.voice(0.12);
      bass?.tone({ type: "triangle", freq: midiToHz(chord[0] - 12), start: t, dur: 1.4, peak: 0.9, attack: 0.01 });
    }
    // Tension : grappe en trémolo (seconde mineure) quand ils sont tout près.
    if (levels.tension > 0.45) {
      const v = this.voice(0.035 * levels.tension, this.tensionBus);
      if (v) {
        const filter = v.node(this.ctx.createBiquadFilter());
        filter.type = "lowpass";
        filter.frequency.value = 1400;
        filter.connect(v.out);
        const root = chord[0] + 24;
        for (const n of [root, root + 1]) v.tone({ type: "sawtooth", freq: midiToHz(n), start: t, dur: BAR, peak: 0.5, attack: 0.8, vibrato: [7, 3], dest: filter });
      }
    }
  }

  /** Notes de boîte à musique, rares, qui résonnent dans l'écho. */
  private playBeat(t: number, levels: MusicLevels): void {
    if (levels.explore < 0.02 || this.bar % 16 >= 14) return;
    const chance = levels.tension > 0.3 ? 0.12 : 0.3;
    if (this.random() > chance) return;
    const chord = this.chord();
    const r = this.random();
    let note: number;
    if (r < 0.05) note = STRANGE;
    else if (r < 0.55) note = chord[1 + Math.floor(this.random() * 3)] + 12;
    else note = SCALE[Math.floor(this.random() * SCALE.length)];
    while (note > 88) note -= 12;
    while (note < 69) note += 12;
    this.bell(t, note, 0.13);
    // Parfois une petite réponse descendante, comme une question sans réponse.
    if (this.random() < 0.15) this.bell(t + BEAT / 2, note - 2, 0.07);
  }

  private bell(t: number, midi: number, gain: number): void {
    const v = this.voice(gain);
    if (!v) return;
    const f = midiToHz(midi);
    v.send(this.echo, 0.6);
    v.tone({ type: "sine", freq: f, start: t, dur: 2.2, peak: 0.8, attack: 0.004 });
    v.tone({ type: "sine", freq: f * 2.01, start: t, dur: 0.7, peak: 0.25, attack: 0.002 });
    v.tone({ type: "triangle", freq: f * 4, start: t, dur: 0.15, peak: 0.06, attack: 0.001 });
  }

  private pulse(t: number, tension: number): void {
    const v = this.voice(0.28 * tension, this.tensionBus);
    v?.tone({ type: "sine", freq: 62, freqEnd: 44, start: t, dur: 0.28, peak: 1, attack: 0.01 });
  }

  private heart(t: number, level: number): void {
    const v = this.voice(0.5 * level, this.out);
    if (!v) return;
    v.tone({ type: "sine", freq: 70, freqEnd: 42, start: t, dur: 0.16, peak: 1, attack: 0.008 });
    v.tone({ type: "sine", freq: 60, freqEnd: 38, start: t + 0.2, dur: 0.18, peak: 0.7, attack: 0.008 });
  }

  dispose(): void {
    for (const n of this.nodes) {
      try {
        n.disconnect();
      } catch {
        // déjà déconnecté
      }
    }
  }
}
