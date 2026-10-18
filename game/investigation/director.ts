// Chef d'orchestre de l'enquête pendant la partie : déclencheurs (pièces, approches), gros plans, lampe UV,
// pensées de Lou (file, une à la fois), événements étranges, tableau d'enquête (relier, phrases, aide).
// Le moteur l'appelle à chaque image (update en jeu, render toujours) ; l'interface React lit `store`.
import type { Camera, Scene, SpotLight } from "three";
import { Vector3 } from "three";
import type { GameEvent } from "../events";
import { roomAt } from "../level";
import type { SiloState } from "../state";
import type { UiMode } from "../ui";
import { addHighlight } from "../render/highlight";
import { InquiryView } from "../render/inquiry";
import type { InteractableView } from "../render/world";
import { UvView } from "../render/uv";
import { UV, litFraction, placeBubble, tracePoints, type BubbleSide, type Rect } from "./geometry";
import {
  applyDeduction, applyPuzzle, checkContradiction, checkPuzzle, checkSentence, conditionMet, examinableState, hintSuggested,
  knowsFact, puzzleSolved, sentenceReady, takeHint,
  type Applied, type Hint, type PuzzleVerdict, type Verdict,
} from "./logic";
import { addOnce, emptyRecord, recordOf } from "./record";
import { CARRIER_REACH, CARRIERS, CONTENT, DROPPED_RADIUS, EXAMINABLE_DEFS, INDEX } from "./world";
import { CARD_FLAG, DEDUCTION_FLAG, PUZZLE_FLAG } from "./content/links";
import type { EventAction, Point, Thought, Trigger } from "./types";

export interface InquiryHost {
  scene: Scene;
  state: SiloState;
  notify(text: string): void;
  emit(event: GameEvent): void;
  setMode(mode: UiMode, character?: string): void;
  /** Bruit qui attire les mordus (disjoncteur de l'énigme 2). */
  noise?(x: number, z: number, radius: number): void;
  /** Où est ce mordu (identifiant de ENEMIES) ? null s'il n'existe pas dans le monde. */
  locate?(enemy: string): { x: number; z: number; alive: boolean; frozen: boolean } | null;
}

export interface ThoughtShown {
  id: string;
  /** null : Lou se tait (« … »). */
  text: string | null;
  key: number;
}

export interface InquirySnapshot {
  thought: ThoughtShown | null;
  /** Dernière carte gagnée (petite animation « nouvel indice »). */
  toast: { card: string; key: number } | null;
  uv: boolean;
  /** Pensée de Lou au tableau (erreur, aide), ou null. */
  boardThought: { text: string; key: number; kind: "error" | "hint" | "ok" } | null;
  /** L'aide est suggérée (3 erreurs, ou longtemps sans progrès). */
  hintSuggested: boolean;
  /** Change à chaque progrès (le tableau se redessine). */
  version: number;
}

export class InquiryStore {
  private snapshot: InquirySnapshot = { thought: null, toast: null, uv: false, boardThought: null, hintSuggested: false, version: 0 };
  private listeners = new Set<() => void>();
  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };
  get = (): InquirySnapshot => this.snapshot;
  patch(next: Partial<InquirySnapshot>): void {
    this.snapshot = { ...this.snapshot, ...next };
    for (const listener of this.listeners) listener();
  }
}

/** Durée d'affichage d'une pensée (2 à 4,5 s selon la longueur ; un silence est bref). */
export const thoughtDuration = (text: string | null) => (text ? Math.min(4.5, Math.max(2.2, 1.2 + text.length * 0.045)) : 1.8);

interface Pending { at: number; run: () => void }

const THOUGHTS = new Map(CONTENT.thoughts.map((t) => [t.id, t]));
const CARRIED = CONTENT.examinables.filter((e) => e.carrier);
const DEFS = new Map(EXAMINABLE_DEFS.map((d) => [d.examine!, d]));
const TRACE_POINTS = new Map(CONTENT.traces.map((t) => [t.id, tracePoints(t.shape)]));
const HEAD = new Vector3();

export class InquiryDirector {
  readonly store = new InquiryStore();
  readonly view: InquiryView;
  readonly uvView: UvView;
  /** Bulle de pensée (élément posé par React). */
  thoughtEl: HTMLElement | null = null;

  private queue: string[] = [];
  private current: { id: string; left: number } | null = null;
  private pending: Pending[] = [];
  private clock = 0;
  private uv = false;
  private room: string | null = null;
  private notes = -1;
  private litTime = new Map<string, number>();
  private mistakes = 0;
  private attempts = 0;
  private lastProgress = Date.now();
  private obstacles: Rect[] = [];
  private obstacleClock = 0;
  private toastKey = 0;
  private toastAge = 0;
  private boardKey = 0;

  constructor(private host: InquiryHost) {
    this.view = new InquiryView(CONTENT);
    this.uvView = new UvView(CONTENT.traces);
    host.scene.add(this.view.root, this.uvView.root);
  }

  /** Range les objets examinables parmi les objets interactifs du monde (infobulle, contour, touche E). */
  attach(interactables: Map<string, InteractableView>): void {
    for (const def of EXAMINABLE_DEFS) {
      const built = this.view.markers.get(def.examine!);
      if (!built) continue;
      interactables.set(def.id, { def, group: built.group, highlight: addHighlight(built.group), tooltipHeight: built.height });
    }
  }

  private get record() {
    return recordOf(this.host.state);
  }

  /** Nouvelle partie ou chargement : files vidées, lampe UV éteinte. */
  reset(): void {
    this.queue = [];
    this.current = null;
    this.pending = [];
    this.uv = false;
    this.room = null;
    this.notes = -1;
    this.litTime.clear();
    this.mistakes = 0;
    this.lastProgress = Date.now();
    this.store.patch({ thought: null, toast: null, uv: false, boardThought: null, hintSuggested: false, version: this.store.get().version + 1 });
  }

  // ——— Lampe UV ———

  get uvOn(): boolean {
    return this.uv;
  }

  toggleUv(): void {
    this.setUv(!this.uv);
  }

  setUv(on: boolean): void {
    if (on && this.host.state.energy < UV.minEnergy) {
      this.host.notify("Plus assez de charge pour la lampe UV.");
      on = false;
    }
    if (on === this.uv) return;
    this.uv = on;
    this.host.emit({ type: "lamp" });
    this.store.patch({ uv: on });
  }

  /** La touche LAMPE (éblouir) repasse en lumière blanche : on fige OU on révèle. */
  lampPressed(pressed: boolean): boolean {
    if (pressed && this.uv) this.setUv(false);
    return pressed;
  }

  // ——— Boucle ———

  /** Une image de jeu (simulation). */
  update(dt: number, x: number, z: number, yaw: number): void {
    this.clock += dt;
    const s = this.host.state;
    // Notes canon lues → cartes (même texte).
    if (s.notes.length !== this.notes) {
      this.notes = s.notes.length;
      for (const card of CONTENT.cards) if (card.note && s.notes.includes(card.note)) this.grantCard(card.id, false);
    }
    const room = roomAt(x, z)?.id ?? null;
    const entered = room !== this.room ? room : null;
    this.room = room;
    this.updateCarriers();
    for (const t of CONTENT.thoughts) if (this.matches(t.trigger, x, z, entered) && conditionMet(t.requires, this.record, s)) this.think(t.id);
    for (const e of CONTENT.events) {
      if (this.record.events.includes(e.id) || !this.matches(e.trigger, x, z, entered) || !conditionMet(e.requires, this.record, s)) continue;
      this.runEvent(e.id);
    }
    // Actions différées.
    if (this.pending.length) {
      const due = this.pending.filter((p) => p.at <= this.clock);
      this.pending = this.pending.filter((p) => p.at > this.clock);
      for (const p of due) p.run();
    }
    // Lampe UV : consomme la charge, révèle ce qui reste assez longtemps dans le cône.
    if (this.uv) {
      if (!s.spendEnergy(Math.min(s.energy, UV.drain * dt)) || s.energy <= 0.01) {
        this.setUv(false);
        this.host.notify("La lampe UV s'éteint : plus de charge.");
      }
    }
    for (const trace of CONTENT.traces) {
      const lit = this.uv && conditionMet(trace.requires, this.record, s) ? litFraction(TRACE_POINTS.get(trace.id)!, x, z, yaw) : 0;
      if (lit <= 0 || this.record.traces.includes(trace.id)) {
        this.litTime.set(trace.id, 0);
        continue;
      }
      const time = (this.litTime.get(trace.id) ?? 0) + dt;
      this.litTime.set(trace.id, time);
      if (time >= UV.revealTime) this.seeTrace(trace.id);
    }
  }

  private matches(trigger: Trigger, x: number, z: number, entered: string | null): boolean {
    switch (trigger.on) {
      case "near": return Math.hypot(x - trigger.x, z - trigger.z) <= trigger.radius;
      case "enter": return entered === trigger.room;
      case "fact": return knowsFact(this.host.state, trigger.fact);
      case "nearEnemy": {
        const e = this.host.locate?.(trigger.enemy);
        return Boolean(e && e.alive && Math.hypot(x - e.x, z - e.z) <= trigger.radius);
      }
      case "ready": {
        const d = INDEX.deductions.get(trigger.deduction);
        return Boolean(d && d.kind === "sentence" && sentenceReady(d, this.record, this.host.state));
      }
      default: return false;
    }
  }

  /**
   * Objets portés par un mordu : ils suivent le mordu ; examinables de loin quand il est figé par la lampe, ou au sol
   * quand il est abattu. Un mordu absent du monde laisse l'objet posé à sa place (x, z du contenu).
   */
  private updateCarriers(): void {
    for (const e of CARRIED) {
      const where = this.host.locate?.(e.carrier!);
      const def = DEFS.get(e.id);
      const marker = this.view.markers.get(e.id);
      if (!where) {
        CARRIERS.delete(e.carrier!);
        if (marker) marker.group.visible = true;
        continue;
      }
      const dropped = !where.alive;
      CARRIERS.set(e.carrier!, { x: where.x, z: where.z, ready: dropped || where.frozen, dropped });
      if (def) {
        def.x = where.x;
        def.z = where.z;
        def.radius = dropped ? DROPPED_RADIUS : e.radius + CARRIER_REACH;
      }
      if (marker) {
        marker.group.position.set(where.x, 0, where.z);
        marker.group.visible = dropped;
      }
    }
  }

  /** Chaque image, même en pause : pensées, rendu UV, bulle. */
  render(dt: number, camera: Camera, headlamp: SpotLight, lou: { x: number; z: number; yaw: number }, viewW: number, viewH: number, mode: UiMode): void {
    const playing = mode === "playing";
    // Les pensées se lisent en jeu et en gros plan ; ailleurs (carnet, pause), elles attendent.
    if (!playing && mode !== "closeup") dt = 0;
    if (this.store.get().toast) {
      this.toastAge += dt;
      if (this.toastAge > 2.8) this.store.patch({ toast: null });
    }
    if (this.current) {
      this.current.left -= dt;
      if (this.current.left <= 0) {
        this.current = null;
        if (!this.queue.length) this.store.patch({ thought: null });
      }
    }
    if (!this.current && this.queue.length) this.showNext();
    const tilted = this.uv && playing;
    this.uvView.update(dt, { on: this.uv, x: lou.x, z: lou.z, yaw: lou.yaw, seen: this.record.traces, headlamp: tilted ? headlamp : null });
    this.view.update(dt, this.host.state);
    this.placeThought(camera, lou, viewW, viewH, dt);
  }

  private placeThought(camera: Camera, lou: { x: number; z: number }, viewW: number, viewH: number, dt: number): void {
    const el = this.thoughtEl;
    if (!el || !this.current) return;
    this.obstacleClock -= dt;
    if (this.obstacleClock <= 0 && typeof document !== "undefined") {
      this.obstacleClock = 0.25;
      this.obstacles = [...document.querySelectorAll<HTMLElement>(AVOID)]
        .filter((n) => n.offsetParent !== null || n.getClientRects().length > 0)
        .map((n) => n.getBoundingClientRect())
        .filter((r) => r.width > 0 && r.height > 0)
        .map((r) => ({ x: r.left, y: r.top, w: r.width, h: r.height }));
    }
    HEAD.set(lou.x, 2.1, lou.z).project(camera);
    const hx = (HEAD.x * 0.5 + 0.5) * viewW;
    const hy = (-HEAD.y * 0.5 + 0.5) * viewH;
    const w = el.offsetWidth || 200;
    const h = el.offsetHeight || 60;
    // Lou lui-même : la bulle ne doit pas le cacher.
    const self = { x: hx - 30, y: hy - 8, w: 60, h: 100 };
    const place = placeBubble(hx, hy, w, h, viewW, viewH, [...this.obstacles, self]);
    el.style.transform = `translate(${Math.round(place.x)}px, ${Math.round(place.y)}px)`;
    // Pointe de la bulle vers la tête.
    el.dataset.side = place.side satisfies BubbleSide;
    el.style.setProperty("--tail-x", `${Math.round(Math.min(Math.max(hx - place.x, 18), w - 18))}px`);
    el.style.setProperty("--tail-y", `${Math.round(Math.min(Math.max(hy - place.y, 14), h - 14))}px`);
  }

  // ——— Pensées ———

  /** Met une pensée en file (une seule fois par partie). */
  think(id: string): void {
    const t = THOUGHTS.get(id);
    if (!t || this.record.thoughts.includes(id) || this.queue.includes(id) || this.current?.id === id) return;
    addOnce(this.record, "thoughts", id);
    this.queue.push(id);
    if (t.card) this.grantCard(t.card);
    this.host.state.markChanged();
  }

  private showNext(): void {
    const id = this.queue.shift()!;
    const t = THOUGHTS.get(id) as Thought;
    const text = t.text ?? null;
    this.current = { id, left: thoughtDuration(text) };
    this.store.patch({ thought: { id, text, key: this.clock + Math.random() } });
    if (t.then) {
      const next = THOUGHTS.get(t.then);
      if (next && !this.record.thoughts.includes(next.id)) {
        addOnce(this.record, "thoughts", next.id);
        this.queue.unshift(next.id);
        if (next.card) this.grantCard(next.card);
      }
    }
  }

  /** Pensée affichée en ce moment (ou null). */
  get thought(): ThoughtShown | null {
    return this.current ? this.store.get().thought : null;
  }

  private fire(trigger: Trigger): void {
    for (const t of CONTENT.thoughts) {
      if (t.trigger.on !== trigger.on) continue;
      const same = JSON.stringify(t.trigger) === JSON.stringify(trigger);
      if (same && conditionMet(t.requires, this.record, this.host.state)) this.think(t.id);
    }
    for (const e of CONTENT.events) {
      if (e.trigger.on === trigger.on && JSON.stringify(e.trigger) === JSON.stringify(trigger) && !this.record.events.includes(e.id) && conditionMet(e.requires, this.record, this.host.state)) this.runEvent(e.id);
    }
  }

  // ——— Cartes, traces, événements ———

  /** Ajoute une carte au carnet ; `toast` : petite animation « nouvel indice ». */
  grantCard(id: string, toast = true): boolean {
    if (!INDEX.cards.has(id) || !addOnce(this.record, "cards", id)) return false;
    this.cardGained(id, toast);
    return true;
  }

  /** Suites d'une carte nouvellement rangée au carnet (déjà ajoutée à l'enregistrement). */
  private cardGained(id: string, toast: boolean): void {
    if (INDEX.cards.get(id)?.flag) this.host.state.setFlag(CARD_FLAG(id));
    this.progress();
    if (toast) {
      this.toastAge = 0;
      this.store.patch({ toast: { card: id, key: ++this.toastKey } });
    }
    this.fire({ on: "card", card: id });
  }

  private seeTrace(id: string): void {
    const trace = CONTENT.traces.find((t) => t.id === id)!;
    if (!addOnce(this.record, "traces", id)) return;
    this.host.emit({ type: "cue", name: "discovery" });
    if (trace.card) this.grantCard(trace.card);
    if (trace.thought) this.think(trace.thought);
    this.fire({ on: "uv", trace: id });
    this.progress();
  }

  private runEvent(id: string): void {
    const e = CONTENT.events.find((ev) => ev.id === id)!;
    if (!addOnce(this.record, "events", id)) return;
    this.runActions(e.actions);
    this.host.state.markChanged();
  }

  private runActions(actions: readonly EventAction[] | undefined): void {
    for (const a of actions ?? []) {
      const run = () => {
        switch (a.do) {
          case "sound": this.host.emit({ type: "cue", name: a.cue, x: a.x, z: a.z }); break;
          case "notice": this.host.notify(a.text); break;
          case "thought": this.think(a.thought); break;
          case "light": this.view.glow(a.x, a.z, a.y ?? 0.2, a.color, a.duration); break;
          case "silhouette": this.view.silhouette(a.x, a.z, a.toX, a.toZ, a.duration); break;
          case "card": this.grantCard(a.card); break;
          case "noise": this.host.noise?.(a.x, a.z, a.radius); break;
        }
      };
      if (a.delay) this.pending.push({ at: this.clock + a.delay, run });
      else run();
    }
  }

  // ——— Énigmes ———

  puzzleSolved(id: string): boolean {
    return puzzleSolved(this.record, id);
  }

  /** Essaie une réponse (lettres, mot de passe, ordre des leviers). Une erreur ne punit jamais : une pensée. */
  solvePuzzle(id: string, input: readonly string[]): PuzzleVerdict & { applied?: Applied } {
    const p = INDEX.puzzles.get(id);
    if (!p) return { ok: false, thought: "…" };
    if (this.puzzleSolved(id)) return { ok: true };
    const verdict = checkPuzzle(p, input);
    if (!verdict.ok) {
      this.runActions(p.onError);
      return verdict;
    }
    const applied = applyPuzzle(INDEX, this.record, id);
    const s = this.host.state;
    p.items?.forEach((item, i) => s.collect(`puzzle_${id}_${i}`, item.kind, item.amount));
    s.setFlag(PUZZLE_FLAG(id));
    for (const u of p.unlocks) if (u.kind === "fact" || u.kind === "dialogue") s.setFlag(u.id.toLowerCase());
    this.runActions(p.onSolve);
    for (const card of applied.cards) this.cardGained(card, true);
    for (const t of applied.thoughts) this.think(t);
    this.host.emit({ type: "cue", name: "objective" });
    this.progress();
    return { ok: true, applied };
  }

  // ——— Gros plans ———

  /** Touche E sur un objet examinable. */
  examine(id: string): boolean {
    const e = INDEX.examinables.get(id);
    if (!e) return false;
    const status = examinableState(e, this.record, this.host.state);
    if (status === "hidden") return false;
    if (status === "locked") {
      this.host.notify(e.locked!.message);
      return false;
    }
    if (e.card) this.grantCard(e.card);
    this.fire({ on: "examine", examinable: id });
    this.host.setMode("closeup", id);
    return true;
  }

  isRevealed(id: string, detail: number): boolean {
    return this.record.revealed.includes(`${id}#${detail}`);
  }

  /** Le détail caché n° `detail` du gros plan est révélé. Retourne la carte gagnée, s'il y en a une nouvelle. */
  reveal(id: string, detail: number): string | null {
    const d = INDEX.examinables.get(id)?.closeup.details?.[detail];
    if (!d || !addOnce(this.record, "revealed", `${id}#${detail}`)) return null;
    let card: string | null = null;
    if (d.card && this.grantCard(d.card)) card = d.card;
    if (d.thought) this.think(d.thought);
    this.fire({ on: "reveal", examinable: id });
    this.progress();
    return card;
  }

  // ——— Tableau ———

  /** Relie deux cartes (« ça ne colle pas »). */
  link(a: string, b: string): Verdict & { applied?: Applied } {
    const verdict = checkContradiction(INDEX, this.record, a, b, this.host.state, this.attempts++);
    return this.conclude(verdict);
  }

  /** Valide une phrase à trous entière. */
  submit(id: string, words: readonly (string | null)[]): Verdict & { applied?: Applied } {
    const verdict = checkSentence(INDEX, this.record, id, words, this.host.state, this.attempts++);
    if (!verdict.ok && verdict.kind === "incomplete") return verdict;
    return this.conclude(verdict);
  }

  private conclude(verdict: Verdict): Verdict & { applied?: Applied } {
    if (!verdict.ok) {
      if (verdict.kind !== "already") this.mistakes++;
      this.store.patch({ boardThought: { text: verdict.thought, key: ++this.boardKey, kind: "error" }, hintSuggested: this.suggestHint() });
      return verdict;
    }
    const applied = applyDeduction(INDEX, this.record, verdict.deduction.id);
    this.mistakes = 0;
    // Faits lisibles par les conversations : « x8 », « c5 », et les déblocages `fact` / `dialogue` (links.ts).
    const s = this.host.state;
    s.setFlag(DEDUCTION_FLAG(verdict.deduction.id));
    for (const u of verdict.deduction.unlocks) if (u.kind === "fact" || u.kind === "dialogue") s.setFlag(u.id.toLowerCase());
    for (const card of applied.cards) this.cardGained(card, false);
    for (const t of applied.thoughts) this.think(t);
    this.fire({ on: "deduction", deduction: verdict.deduction.id });
    this.host.emit({ type: "cue", name: "objective" });
    this.progress();
    this.store.patch({ boardThought: null, hintSuggested: false });
    return { ...verdict, applied };
  }

  /** Bouton « Réfléchir » : palier d'aide suivant. */
  hint(): Hint | null {
    const hint = takeHint(INDEX, this.record, this.host.state);
    if (hint) {
      this.store.patch({ boardThought: { text: hint.text, key: ++this.boardKey, kind: "hint" }, hintSuggested: false });
      this.host.state.markChanged();
    }
    return hint;
  }

  private suggestHint(): boolean {
    return hintSuggested(this.mistakes, (Date.now() - this.lastProgress) / 1000);
  }

  /** Rafraîchit la suggestion d'aide (le tableau l'appelle de temps en temps). */
  refreshHint(): void {
    const suggested = this.suggestHint();
    if (suggested !== this.store.get().hintSuggested) this.store.patch({ hintSuggested: suggested });
  }

  clearBoardThought(): void {
    if (this.store.get().boardThought) this.store.patch({ boardThought: null });
  }

  private progress(): void {
    this.lastProgress = Date.now();
    this.host.state.markChanged();
    this.store.patch({ version: this.store.get().version + 1 });
  }
}

/** Éléments que la bulle de pensée ne doit pas recouvrir. */
const AVOID = [
  'section[aria-label="Vie et lampe"]',
  'section[aria-label="Objectifs"]',
  'section[aria-label="État du survivant"]',
  '[role="note"]',
  // Avis du moteur (« La porte de sécurité est morte… »), sans étiquette, contrairement à la pensée.
  'p[role="status"]:not([aria-label])',
  "[data-touch-avoid]",
].join(",");

export { emptyRecord, type Point };
