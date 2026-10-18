// Briques de synthèse Web Audio : une « voix » = quelques nœuds reliés, libérés dès que ses sources se taisent.
// Aucun fichier audio : oscillateurs, bruit blanc filtré, enveloppes.

/** Compte les voix actives pour plafonner la polyphonie (téléphones). */
export class VoicePool {
  active = 0;
  constructor(public max: number) {}
  get full(): boolean {
    return this.active >= this.max;
  }
}

const noiseBuffers = new WeakMap<BaseAudioContext, AudioBuffer>();

/** Bruit blanc de 2 s, créé une fois par contexte. */
export function noiseBuffer(ctx: BaseAudioContext): AudioBuffer {
  let buffer = noiseBuffers.get(ctx);
  if (!buffer) {
    buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 2), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let seed = 22222;
    for (let i = 0; i < data.length; i++) {
      seed = (seed * 16807) % 2147483647;
      data[i] = (seed / 2147483647) * 2 - 1;
    }
    noiseBuffers.set(ctx, buffer);
  }
  return buffer;
}

export function midiToHz(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12);
}

const SILENT = 0.0001;

export interface ToneOptions {
  type?: OscillatorType;
  freq: number;
  /** Glissando jusqu'à cette fréquence à la fin. */
  freqEnd?: number;
  start: number;
  dur: number;
  peak: number;
  attack?: number;
  /** Vibrato : fréquence (Hz) et profondeur (Hz). */
  vibrato?: [number, number];
  dest?: AudioNode;
}

export interface NoiseOptions {
  start: number;
  dur: number;
  peak: number;
  attack?: number;
  filter?: BiquadFilterType;
  freq?: number;
  freqEnd?: number;
  q?: number;
  dest?: AudioNode;
}

export class Voice {
  readonly out: GainNode;
  private nodes: AudioNode[] = [];
  private pending = 0;
  private freed = false;

  constructor(readonly ctx: BaseAudioContext, dest: AudioNode, private pool: VoicePool | null, gain = 1, pan = 0) {
    this.out = this.node(ctx.createGain());
    this.out.gain.value = gain;
    if (pan !== 0 && typeof ctx.createStereoPanner === "function") {
      const panner = this.node(ctx.createStereoPanner());
      panner.pan.value = Math.max(-1, Math.min(1, pan));
      this.out.connect(panner);
      panner.connect(dest);
    } else {
      this.out.connect(dest);
    }
    if (pool) pool.active += 1;
  }

  node<T extends AudioNode>(n: T): T {
    this.nodes.push(n);
    return n;
  }

  /** Envoie aussi la voix vers un bus (écho), avec un gain propre. */
  send(dest: AudioNode, amount: number): void {
    const g = this.node(this.ctx.createGain());
    g.gain.value = amount;
    this.out.connect(g);
    g.connect(dest);
  }

  source<T extends AudioScheduledSourceNode>(src: T, start: number, stop: number): T {
    this.node(src);
    this.pending += 1;
    src.onended = () => {
      this.pending -= 1;
      if (this.pending <= 0) this.free();
    };
    src.start(start);
    src.stop(stop);
    return src;
  }

  /** Enveloppe attaque linéaire, extinction exponentielle. */
  envelope(param: AudioParam, start: number, dur: number, peak: number, attack = 0.005): void {
    param.setValueAtTime(SILENT, start);
    param.linearRampToValueAtTime(Math.max(SILENT, peak), start + Math.min(attack, dur * 0.9));
    param.exponentialRampToValueAtTime(SILENT, start + dur);
  }

  tone(o: ToneOptions): OscillatorNode {
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    osc.type = o.type ?? "sine";
    osc.frequency.setValueAtTime(o.freq, o.start);
    if (o.freqEnd !== undefined) osc.frequency.exponentialRampToValueAtTime(Math.max(1, o.freqEnd), o.start + o.dur);
    const env = this.node(ctx.createGain());
    this.envelope(env.gain, o.start, o.dur, o.peak, o.attack);
    osc.connect(env);
    env.connect(o.dest ?? this.out);
    if (o.vibrato) {
      const lfo = ctx.createOscillator();
      lfo.frequency.value = o.vibrato[0];
      const depth = this.node(ctx.createGain());
      depth.gain.value = o.vibrato[1];
      lfo.connect(depth);
      depth.connect(osc.frequency);
      this.source(lfo, o.start, o.start + o.dur + 0.02);
    }
    return this.source(osc, o.start, o.start + o.dur + 0.02);
  }

  noise(o: NoiseOptions): AudioBufferSourceNode {
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer(ctx);
    src.loop = true;
    const env = this.node(ctx.createGain());
    this.envelope(env.gain, o.start, o.dur, o.peak, o.attack);
    let head: AudioNode = src;
    if (o.filter) {
      const f = this.node(ctx.createBiquadFilter());
      f.type = o.filter;
      f.frequency.setValueAtTime(o.freq ?? 1000, o.start);
      if (o.freqEnd !== undefined) f.frequency.exponentialRampToValueAtTime(Math.max(20, o.freqEnd), o.start + o.dur);
      f.Q.value = o.q ?? 1;
      src.connect(f);
      head = f;
    }
    head.connect(env);
    env.connect(o.dest ?? this.out);
    // Départ à un endroit aléatoire du bruit : deux bruits successifs ne sonnent pas pareil.
    this.node(src);
    this.pending += 1;
    src.onended = () => {
      this.pending -= 1;
      if (this.pending <= 0) this.free();
    };
    src.start(o.start, Math.random() * 1.5);
    src.stop(o.start + o.dur + 0.02);
    return src;
  }

  /** À appeler si aucune source n'a été programmée. */
  done(): void {
    if (this.pending <= 0) this.free();
  }

  private free(): void {
    if (this.freed) return;
    this.freed = true;
    for (const n of this.nodes) {
      try {
        n.disconnect();
      } catch {
        // déjà déconnecté
      }
    }
    this.nodes.length = 0;
    if (this.pool) this.pool.active = Math.max(0, this.pool.active - 1);
  }
}
