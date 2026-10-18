// Observateur sonore : compare l'état du moteur d'une image à l'autre et en déduit des événements de jeu
// (pas, coups, zombies, ramassages, portes, objectifs…) émis sur engine.events, que GameAudio écoute.
// Ainsi le moteur, le combat et les zombies n'ont pas d'appels au son dispersés dans leur code.
import type { GameAudio } from "./audio";
import type { GameEvent, GameEvents } from "./events";
import type { ZombieHorde } from "./enemy";
import { hushed, type MixMode, type Threat } from "./mix";
import type { PlayerController } from "./player";
import type { SiloState } from "./state";
import type { Horde } from "./types";
import type { UiMode } from "./ui";
import { DOORS, INTERACTABLES, roomAt } from "./level";
import { doorOpen } from "./rules";

/** Ce que l'observateur lit du moteur (sous-ensemble public d'Engine). */
export interface SoundSource {
  state: SiloState;
  player: PlayerController;
  combat: { weapon: number; swingTime: number; dazzleTime: number };
  horde: Horde;
  ui: { get(): { mode: UiMode; previous?: UiMode } };
  hud: { get(): { autosaved: boolean } };
}

/** Distance d'écoute des grognements. */
const GROWL_RANGE = 16;
const LOCKED_DOORS = DOORS.filter((d) => d.lock);
const KIND = new Map(INTERACTABLES.map((d) => [d.id, d.kind ?? ""]));

interface ZombieMemo {
  hit: number;
  alive: boolean;
  mode: string;
  growl: number;
}

export function mixMode(mode: UiMode, previous?: UiMode): MixMode {
  if (mode === "playing") return "playing";
  if (mode === "death") return "death";
  if (mode === "menu" || (mode === "settings" && previous === "menu")) return "menu";
  return "paused";
}

export class SoundDirector {
  private primed = false;
  private mode: UiMode = "menu";
  private health = 100;
  private facts = 0;
  private notes = 0;
  private collected = 0;
  private ammo = 0;
  private weapon = 0;
  private swing = 0;
  private dazzle = 0;
  private shot = 0;
  private reloadTime = 0;
  private stepIndex = 0;
  private x = 0;
  private z = 0;
  private autosaved = false;
  private doors: boolean[] = [];
  private zombies = new Map<string, ZombieMemo>();
  private growlGap = 0;
  private readonly threats: Threat[] = [];
  /** Distance au mordu muet (Marceau) le plus proche, mesurée à cette image. */
  private silentDistance = Infinity;
  /** Musique coupée parce que Marceau est tout près (mix.ts, hushed). */
  private hush = false;

  constructor(private audio: GameAudio, private events: GameEvents) {
    events.on((e) => audio.handle(e));
  }

  private emit(event: GameEvent): void {
    this.events.emit(event);
  }

  /** Recopie l'état sans rien jouer (démarrage, nouvelle partie, chargement). */
  private prime(src: SoundSource): void {
    const { state, player, combat } = src;
    this.primed = true;
    this.health = state.health;
    this.facts = state.facts.length;
    this.notes = state.notes.length;
    this.collected = state.collected.length;
    this.ammo = state.ammo;
    this.weapon = combat.weapon;
    this.swing = combat.swingTime;
    this.dazzle = combat.dazzleTime;
    this.shot = player.shotTime;
    this.reloadTime = player.reloadTime;
    this.stepIndex = Math.floor(player.stride / Math.PI);
    this.x = player.x;
    this.z = player.z;
    this.doors = LOCKED_DOORS.map((d) => doorOpen(d, state));
    this.zombies.clear();
    this.hush = false;
  }

  update(dt: number, src: SoundSource): void {
    const { state, player, combat } = src;
    const ui = src.ui.get();
    const mode = ui.mode;
    const previous = this.mode;
    this.mode = mode;
    // Nouvelle partie, chargement, téléportation : on resynchronise en silence.
    const restarted = state.facts.length < this.facts || state.collected.length < this.collected || state.notes.length < this.notes
      || Math.hypot(player.x - this.x, player.z - this.z) > 4;
    if (!this.primed || restarted || (mode === "playing" && (previous === "menu" || previous === "death" || previous === "conclusion"))) this.prime(src);

    if (mode !== previous) {
      if (mode === "note") this.emit({ type: "note_open" });
      else if (mode !== "playing" && mode !== "menu" && mode !== "death" && previous !== "menu") this.emit({ type: "sheet" });
    }

    // Vie : coups reçus, mort, soins (aussi depuis le sac).
    if (state.health < this.health - 0.01) {
      if (state.health <= 0) this.emit({ type: "player_death" });
      else this.emit({ type: "player_hit", amount: this.health - state.health });
    } else if (state.health > this.health + 0.01 && this.health > 0) this.emit({ type: "heal" });
    this.health = state.health;

    // Notes lues, objets ramassés, objectifs.
    if (state.notes.length > this.notes) this.emit({ type: "note_found", clue: this.isClue(state) });
    if (state.collected.length > this.collected) {
      for (const id of state.collected.slice(this.collected)) this.emit({ type: "pickup", kind: KIND.get(id) ?? "" });
    }
    if (state.facts.length > this.facts) {
      for (const fact of state.facts.slice(this.facts)) {
        if (fact === "generator_powered") this.emit({ type: "generator" });
        else if (fact !== "secret_clue" && fact !== "floor2") this.emit({ type: "objective", fact });
      }
    }
    this.notes = state.notes.length;
    this.collected = state.collected.length;
    this.facts = state.facts.length;

    // Portes qui s'ouvrent (génératrice, clé, mur creux).
    LOCKED_DOORS.forEach((door, i) => {
      const open = doorOpen(door, state);
      if (open && !this.doors[i]) this.emit({ type: "door_open", id: door.id, x: door.x, z: door.z });
      this.doors[i] = open;
    });

    const autosaved = src.hud.get().autosaved;
    if (autosaved && !this.autosaved) this.emit({ type: "autosave" });
    this.autosaved = autosaved;

    this.threats.length = 0;
    this.silentDistance = Infinity;
    if (mode === "playing") {
      this.playing(dt, src);
      // Hors jeu (gros plan, carnet…), la musique garde l'état de la dernière image jouée.
      this.hush = hushed(this.hush, this.silentDistance);
    } else {
      this.stepIndex = Math.floor(player.stride / Math.PI);
      this.zombieMemo(src, 0, false);
    }

    this.ammo = state.ammo;
    this.weapon = combat.weapon;
    this.swing = combat.swingTime;
    this.dazzle = combat.dazzleTime;
    this.shot = player.shotTime;
    this.reloadTime = player.reloadTime;
    this.x = player.x;
    this.z = player.z;

    const room = roomAt(player.x, player.z);
    this.audio.update(dt, {
      mode: mixMode(mode, ui.previous),
      x: player.x,
      z: player.z,
      room: room?.id ?? null,
      powered: state.has("generator_powered"),
      threats: this.threats,
      health: state.health,
      hush: this.hush,
    });
  }

  private isClue(state: SiloState): boolean {
    // La note qui vient d'être lue a-t-elle donné l'indice ? (le fait arrive avec elle)
    return state.facts.length > this.facts && state.facts.slice(this.facts).includes("secret_clue");
  }

  private playing(dt: number, src: SoundSource): void {
    const { state, player, combat } = src;
    // Pas : un par demi-foulée.
    const step = Math.floor(player.stride / Math.PI);
    if (step !== this.stepIndex) {
      const pose = player.pose;
      if (pose !== "idle" && pose !== "crouch") this.emit({ type: "step", pose, floor: roomAt(player.x, player.z)?.floor ?? "concrete" });
      this.stepIndex = step;
    }
    if (combat.weapon !== this.weapon) this.emit({ type: "weapon", weapon: combat.weapon });
    if (player.shotTime > this.shot + 0.05) this.emit({ type: "shot" });
    if (combat.dazzleTime > this.dazzle + 0.05) this.emit({ type: "lamp" });
    if (player.reloadTime > this.reloadTime + 0.05) this.emit({ type: "reload" });
    if (state.ammo > this.ammo && this.reloadTime > 0 && player.reloadTime === 0) this.emit({ type: "reloaded" });
    const swung = combat.swingTime > this.swing + 0.05;
    const hits = this.zombieMemo(src, dt, true);
    if (swung) this.emit({ type: "swing", hits });
  }

  /** Suit chaque zombie : touché, tombé, grognements espacés ; remplit la liste des menaces. Retourne le nombre touché. */
  private zombieMemo(src: SoundSource, dt: number, live: boolean): number {
    const zombies = (src.horde as Partial<ZombieHorde>).zombies;
    if (!zombies) return 0;
    const { player } = src;
    let hits = 0;
    this.growlGap = Math.max(0, this.growlGap - dt);
    for (const z of zombies) {
      let memo = this.zombies.get(z.id);
      if (!memo) {
        memo = { hit: z.hit, alive: z.alive, mode: z.mode, growl: 2 + Math.random() * 6 };
        this.zombies.set(z.id, memo);
      }
      if (live) {
        if (z.hit > memo.hit + 0.05) {
          hits += 1;
          if (z.alive) this.emit({ type: "zombie_hit", id: z.id, x: z.x, z: z.z });
        }
        if (memo.alive && !z.alive && z.dead < 1) this.emit({ type: "zombie_down", id: z.id, x: z.x, z: z.z });
        if (z.alive) {
          const distance = Math.hypot(z.x - player.x, z.z - player.z);
          const chasing = z.mode === "chase";
          const alert = chasing || z.mode === "investigate" || z.mode === "search";
          this.threats.push({ distance, alert, chasing });
          if (z.spawn?.silent) this.silentDistance = Math.min(this.silentDistance, distance);
          memo.growl -= dt;
          // Repéré : grognement immédiat ; sinon espacés, plus fréquents en poursuite.
          const spotted = chasing && memo.mode !== "chase";
          // Marceau, le Silencieux, ne grogne jamais (game/level.ts, `silent`).
          if (!z.spawn?.silent && distance < GROWL_RANGE && (spotted || memo.growl <= 0) && this.growlGap <= 0 && z.stunned <= 0) {
            this.emit({ type: "zombie_growl", id: z.id, x: z.x, z: z.z, chasing });
            this.growlGap = 0.8;
            memo.growl = chasing ? 2.5 + Math.random() * 2 : alert ? 4 + Math.random() * 3 : 8 + Math.random() * 8;
          } else if (memo.growl <= 0) memo.growl = 1 + Math.random() * 2;
        }
      }
      memo.hit = z.hit;
      memo.alive = z.alive;
      memo.mode = z.mode;
    }
    return hits;
  }
}
