// Boucle de jeu three.js, hors de React. L'interface lit `hud` et `ui`, et positionne l'infobulle via `tooltipEl`.
// Modes, partie, armes du bricoleur et interactions (la progression pure est dans progress.ts).
import {
  Clock, NeutralToneMapping, PCFShadowMap, PerspectiveCamera, Scene, SRGBColorSpace, Vector3, WebGLRenderer, type Mesh,
} from "three";
import { CAMERA, CameraRig } from "./camera";
import { AIM_HEIGHT, assistTarget, groundPoint, yawTowards } from "./aim";
import { InputState } from "./input";
import { PlayerController } from "./player";
import { NAIL_CAPACITY, SiloState, type Character, type KeyValueStore } from "./state";
import { DOORS, sectorAt, type InteractableDef } from "./level";
import { actionLabel, doorOpen, interactableAvailable } from "./rules";
import { anySave, clearSlot, latestSlot, listSlots, loadSlot, writeSlot, type SlotId, type SlotInfo } from "./save";
import { safeSpot } from "./safety";
import { CONVERSATIONS } from "./conversation";
import { HudStore, type HudSnapshot } from "./hud";
import { UiStore, type UiMode } from "./ui";
import { createHorde, type ZombieHorde } from "./enemy";
import { Combat, LAMP, WRENCH } from "./combat";
import { checkTriggers, interactWith, type ProgressEffects } from "./progress";
import type { Horde, HordeContext } from "./types";
import { GameAudio } from "./audio";
import { GameEvents } from "./events";
import { SoundDirector } from "./sound";
import { buildWorld, type WorldView } from "./render/world";
import { animateOperator, buildOperator, type OperatorRig } from "./render/operator";
import { PALETTE } from "./render/palette";
import { blobTexture } from "./render/textures";
import { decal } from "./render/props";
import { arrowVisible, nearestUnreadNote, nearestZombie, TutorialDirector } from "./tutorial";
import { buildGuide } from "./render/guide";
import { Atmosphere } from "./render/atmosphere";
import { InquiryDirector } from "./investigation/director";
import { recordKey, recordOf } from "./investigation/record";

export interface EngineOptions {
  lowQuality?: boolean;
  storage?: KeyValueStore | null;
}

/** Distance d'approche en plus du rayon propre de l'objet. */
const REACH = 1.1;

export class Engine {
  readonly state = new SiloState();
  /** Conversations écrites (game/conversation.ts), ouvertes par openConversation(id). */
  readonly conversations = CONVERSATIONS;
  readonly input = new InputState();
  readonly hud: HudStore;
  readonly ui = new UiStore();
  readonly renderer: WebGLRenderer;
  readonly scene = new Scene();
  readonly camera: PerspectiveCamera;
  readonly rig: CameraRig;
  readonly player: PlayerController;
  readonly operator: OperatorRig;
  readonly world: WorldView;
  readonly horde: Horde;
  readonly combat: Combat;
  /** Événements de jeu (le son les écoute, voir game/sound.ts) et son synthétisé. */
  readonly events = new GameEvents();
  readonly audio = new GameAudio();
  private readonly sound = new SoundDirector(this.audio, this.events);
  tooltipEl: HTMLElement | null = null;
  lowQuality: boolean;
  /** Point visé au sol (souris), ou null. */
  aimPoint: Vector3 | null = null;
  focus: InteractableDef | null = null;
  storage: KeyValueStore | null;
  /** Tutoriel léger, flèche d'objectif et astuces (logique dans tutorial.ts). */
  readonly tutorial: TutorialDirector;
  readonly guide = buildGuide();
  /** Enquête : gros plans, lampe UV, pensées de Lou, tableau (game/investigation). */
  readonly inquiry: InquiryDirector;

  private clock = new Clock();
  private frame = 0;
  private running = false;
  private elapsed = 0;
  private hudClock = 0;
  private fpsFrames = 0;
  private fpsClock = 0;
  private fps = 60;
  private showPerf = false;
  private notice = "";
  private noticeId = 0;
  private noticeTime = 0;
  private worldDirty = true;
  private autosaveClock = 0;
  private autosaveDue = false;
  /** Temps de jeu de la dernière sauvegarde automatique (pour le petit tampon « Sauvegardé »). */
  private savedAt = -10;
  /** Temps de jeu du dernier coup reçu (danger : vie basse en plein combat). */
  private hurtAt = -Infinity;
  private detachPageEvents: (() => void) | null = null;
  /** Vrai dès qu'une partie a commencé ou été chargée : avant (menu, réglages), rien à sauvegarder. */
  private runActive = false;
  private progressKey = "";
  /** Lumières, brouillard et vignette selon la zone (nuit dehors, pièces teintées dedans). */
  readonly atmosphere: Atmosphere;
  private shadowBlob: Mesh;
  private readonly tmp = new Vector3();
  private readonly aimTmp = new Vector3();
  private readonly guideTmp = new Vector3();
  private resizeObserver: ResizeObserver | null = null;
  private hordeContext: HordeContext;
  private progressEffects: ProgressEffects;

  constructor(readonly canvas: HTMLCanvasElement, options: EngineOptions = {}) {
    this.lowQuality = options.lowQuality ?? false;
    this.storage = options.storage ?? null;
    this.tutorial = new TutorialDirector(this.storage);
    this.renderer = new WebGLRenderer({ canvas, antialias: !this.lowQuality, stencil: true, powerPreference: "high-performance" });
    this.renderer.outputColorSpace = SRGBColorSpace;
    this.renderer.toneMapping = NeutralToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.shadowMap.enabled = true;
    // PCF filtré (5 prises tournées) : ombres douces ; PCFSoftShadowMap n'existe plus dans three r18x.
    this.renderer.shadowMap.type = PCFShadowMap;
    this.renderer.setClearColor(PALETTE.sky);

    this.camera = new PerspectiveCamera(CAMERA.fov, 16 / 9, 0.5, 120);
    this.rig = new CameraRig(this.camera);
    this.atmosphere = new Atmosphere(this.scene, this.renderer);

    this.world = buildWorld(this.scene);
    const [px, , pz] = this.state.playerPosition;
    this.player = new PlayerController(px, pz, this.state.playerYaw);
    this.operator = buildOperator();
    this.scene.add(this.operator.root, this.operator.droppedMag, this.guide.root);
    this.shadowBlob = decal(this.scene, blobTexture("shadow"), px, pz, 1.1, 1.1, 0, 0.02);

    this.horde = createHorde(this.state);
    this.scene.add(this.horde.root);
    this.hordeContext = {
      player: { x: px, z: pz, crouched: false, alive: true },
      colliders: this.world.colliders,
      doorOpen: (id) => {
        const door = DOORS.find((d) => d.id === id);
        return door ? doorOpen(door, this.state) : false;
      },
      damagePlayer: (amount) => this.damagePlayer(amount),
      dormant: false,
    };
    this.combat = new Combat({
      scene: this.scene,
      state: this.state,
      player: this.player,
      horde: this.horde,
      world: this.world,
      notify: (text) => this.notify(text),
      noise: (x, z, radius) => this.horde.hearNoise(x, z, radius),
    });
    this.inquiry = new InquiryDirector({
      scene: this.scene, state: this.state, notify: (text) => this.notify(text),
      emit: (event) => this.events.emit(event), setMode: (mode, id) => this.setMode(mode, id),
      noise: (x, z, radius) => this.horde.hearNoise(x, z, radius),
      // Mordus porteurs d'indices : figés par la lampe (étourdis) ou abattus.
      locate: (id) => {
        const z = (this.horde as Partial<ZombieHorde>).get?.(id);
        return z ? { x: z.x, z: z.z, alive: z.alive, frozen: z.alive && (z.stunned > 0 || z.freeze > 0) } : null;
      },
    });
    this.inquiry.attach(this.world.interactables);
    this.progressEffects = {
      notify: (text) => this.notify(text),
      shudder: () => this.world.shudder(),
      showNote: (id) => this.setMode("note", id),
      floor2: () => this.openFloor2(),
    };

    this.state.subscribe(() => {
      this.worldDirty = true;
      // Un progrès (objectif, note, objet ramassé) déclenche une sauvegarde automatique.
      const key = `${this.state.facts.length}:${this.state.notes.length}:${this.state.collected.length}:${this.state.upgraded}:${recordKey(recordOf(this.state))}`;
      if (key !== this.progressKey) {
        this.progressKey = key;
        this.autosaveDue = true;
      }
    });
    if (typeof document !== "undefined") {
      // Onglet masqué, appel, appli quittée : pause automatique, puis sauvegarde si l'on est en lieu sûr.
      const visibility = () => { if (document.visibilityState === "hidden") this.pageHidden(); };
      const pagehide = () => this.pageHidden();
      document.addEventListener("visibilitychange", visibility);
      window.addEventListener("pagehide", pagehide);
      this.detachPageEvents = () => {
        document.removeEventListener("visibilitychange", visibility);
        window.removeEventListener("pagehide", pagehide);
      };
    }
    this.hud = new HudStore(this.snapshot());
    this.setLowQuality(this.lowQuality);
    this.refreshWorld();
    this.rig.snap(new Vector3(px, 0, pz));
    this.input.attach(canvas);
    this.resize();
    if (typeof ResizeObserver !== "undefined") {
      this.resizeObserver = new ResizeObserver(() => this.resize());
      this.resizeObserver.observe(canvas);
    }
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.clock.start();
    const loop = () => {
      if (!this.running) return;
      this.frame = requestAnimationFrame(loop);
      this.tick(Math.min(this.clock.getDelta(), 0.05));
    };
    this.frame = requestAnimationFrame(loop);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.frame);
  }

  dispose(): void {
    this.stop();
    this.input.dispose();
    this.audio.dispose();
    this.detachPageEvents?.();
    this.resizeObserver?.disconnect();
    this.renderer.dispose();
  }

  resize(): void {
    const width = this.canvas.clientWidth || window.innerWidth;
    const height = this.canvas.clientHeight || window.innerHeight;
    const ratio = Math.min(window.devicePixelRatio || 1, this.lowQuality ? 1.25 : 2);
    this.renderer.setPixelRatio(ratio);
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    // Écran en portrait : on recule un peu pour garder la même largeur de jeu visible.
    this.camera.fov = width < height ? CAMERA.fov * 1.45 : CAMERA.fov;
    this.camera.updateProjectionMatrix();
  }

  setLowQuality(low: boolean): void {
    this.lowQuality = low;
    this.renderer.shadowMap.enabled = !low;
    this.atmosphere.setLowQuality(low);
    this.world.setLowQuality(low);
    this.horde.setLowQuality(low);
    this.combat.setLowQuality(low);
    this.resize();
  }

  // ——— Modes et partie (port de main.gd) ———

  get paused(): boolean {
    return this.ui.get().mode !== "playing";
  }

  setMode(mode: UiMode, character?: Character): void {
    this.ui.set(mode, character);
    if (mode !== "playing") this.input.releaseAll();
    if (mode === "journal" || mode === "inventory") this.tutorial.markJournal();
    this.publishHud();
  }

  /** Pause / reprise (bouton ❚❚, Échap). */
  setPaused(paused: boolean): void {
    if (paused) this.openPause();
    else this.resume();
  }

  resume(): void {
    this.setMode(this.state.health > 0 ? "playing" : "death");
  }

  /**
   * Pause automatique quand la page passe en arrière-plan (onglet masqué, appel, appli quittée). Le son se coupe
   * de lui-même (audio.ts) ; au retour, la feuille de pause attend « Reprendre ».
   */
  pageHidden(): void {
    const mode = this.ui.get().mode;
    if (mode === "playing") {
      this.openPause();
      this.notify("Pause automatique : la partie vous attend.");
    }
    if (mode !== "menu" && mode !== "death") this.autosave();
  }

  /**
   * Nouvelle descente. L'interface demande d'abord confirmation s'il existe une sauvegarde (ui/NewGameButton).
   * Écrit l'emplacement « Début d'étage » et efface l'ancien « Lieu sûr » ; le « Manuel » reste intact.
   */
  newGame(): void {
    this.state.reset();
    this.startRun();
    this.setMode("playing");
    if (this.storage) {
      clearSlot(this.storage, "safe");
      this.saveFloorStart();
    }
    this.notify("SILLO 8. L'entrée est juste devant. Avancez sans bruit.");
  }

  /** Emplacement « Début d'étage » : écrit en entrant dans un étage, jamais en cours d'étage. */
  saveFloorStart(): boolean {
    if (!this.storage || this.state.health <= 0) return false;
    return this.writeSave("floor");
  }

  /** Sauvegarde manuelle (F5, menu pause) : annonce le résultat. */
  saveGame(): boolean {
    if (!this.storage) {
      this.notify("Sauvegarde indisponible dans ce navigateur.");
      return false;
    }
    if (this.state.health <= 0) {
      this.notify("Sauvegarde indisponible dans cet état.");
      return false;
    }
    const ok = this.writeSave("manual");
    this.notify(ok ? "Progression sauvegardée." : "Échec de sauvegarde.");
    return ok;
  }

  /** Vrai en lieu sûr : pièce sûre, aucun mordu en alerte proche, pas de vie basse en plein combat (safety.ts). */
  safeNow(): boolean {
    return safeSpot({
      x: this.player.x, z: this.player.z, health: this.state.health,
      sinceHurt: this.elapsed - this.hurtAt, threats: this.horde.threats?.() ?? [],
    });
  }

  /**
   * Sauvegarde automatique « Lieu sûr », silencieuse : à chaque progrès (objectif, note, objet ramassé), toutes les
   * 30 s de jeu et quand la page passe en arrière-plan, mais seulement en lieu sûr. Jamais en danger ni pendant la
   * mort : un progrès fait ailleurs attend le prochain lieu sûr.
   */
  autosave(): boolean {
    this.autosaveClock = 0;
    if (!this.runActive || !this.storage || this.state.health <= 0 || !this.safeNow()) return false;
    this.autosaveDue = false;
    const ok = this.writeSave("safe");
    if (ok) this.savedAt = this.elapsed;
    return ok;
  }

  private writeSave(slot: SlotId): boolean {
    this.state.playerPosition = [this.player.x, 0, this.player.z];
    this.state.playerYaw = this.player.yaw;
    return writeSlot(this.state, this.storage!, slot);
  }

  /** Vrai s'il existe au moins une sauvegarde (même illisible : la nouvelle descente demande confirmation). */
  hasSave(): boolean {
    return this.storage ? anySave(this.storage) : false;
  }

  /** Emplacements remplis, pour le choix au menu et en pause. */
  saveSlots(): SlotInfo[] {
    return this.storage ? listSlots(this.storage) : [];
  }

  /** Charge un emplacement, ou le plus récent (« Continuer », F9). */
  loadGame(slot?: SlotId): boolean {
    if (!this.storage) {
      this.notify("Sauvegarde indisponible dans ce navigateur.");
      return false;
    }
    const target = slot ?? latestSlot(this.storage);
    // Validation sur une copie : un échec laisse la partie en cours intacte.
    const result = target ? loadSlot(new SiloState(), this.storage, target) : "missing";
    if (result !== "ok" || !target) {
      this.notify(result === "missing" ? "Aucune sauvegarde." : result === "newer" ? "Sauvegarde d'une version plus récente du jeu." : "Sauvegarde invalide.");
      return false;
    }
    loadSlot(this.state, this.storage, target);
    this.startRun();
    // Pas de sauvegarde automatique immédiate : charger un ancien emplacement n'écrase pas aussitôt le « Lieu sûr ».
    this.progressKey = `${this.state.facts.length}:${this.state.notes.length}:${this.state.collected.length}:${this.state.upgraded}`;
    this.autosaveDue = false;
    this.autosaveClock = 0;
    this.hurtAt = -Infinity;
    this.setMode("playing");
    this.notify("Progression restaurée.");
    return true;
  }

  /** Replace le joueur et le monde d'après l'état courant (nouvelle partie ou chargement). */
  private startRun(): void {
    this.runActive = true;
    const [x, , z] = this.state.playerPosition;
    this.player.x = x;
    this.player.z = z;
    this.player.vx = this.player.vz = 0;
    this.player.yaw = this.state.playerYaw;
    this.player.cancelReload();
    this.player.cooldown = 0;
    this.combat.weapon = 0;
    this.combat.swingTime = this.combat.dazzleTime = this.combat.lightCooldown = 0;
    this.horde.sync(this.state);
    this.refreshWorld();
    this.rig.snap(new Vector3(x, 0, z));
    this.tutorial.start(this.state);
    this.inquiry.reset();
    this.atmosphere.snap();
  }

  openPause(): void {
    this.setMode("pause");
  }

  openInventory(): void {
    this.setMode("inventory");
  }

  /** Carnet des notes lues (touche J ou Q/A, bouton CARNET). */
  openJournal(): void {
    this.setMode("journal");
  }

  /** Relit une note du carnet (fiche de lecture). */
  readNote(id: string): void {
    if (this.state.notes.includes(id)) this.setMode("note", id);
  }

  /** Ouvre une conversation écrite (identifiant dans game/conversation.ts). */
  openConversation(id: Character): boolean {
    if (!this.conversations[id]) return false;
    this.setMode("dialogue", id);
    return true;
  }

  /** Fin de l'étage 1 : l'accès à l'étage 2 est ouvert (l'étage 2 reste à construire). */
  openFloor2(): void {
    if (!this.state.reachFloor2() && !this.state.has("floor2")) {
      this.notify("Accès verrouillé. Il faut une clé d'accès.");
      return;
    }
    // L'escalier est un lieu sûr : sauvegarde automatique si aucun mordu ne talonne Lou.
    this.autosave();
    this.setMode("conclusion", "floor2");
  }

  // ——— Soins et lampe (touches H et B, inventaire) ———

  /** Soigne avec le meilleur objet adapté (bandage pour une égratignure, trousse sinon). */
  heal(): boolean {
    const s = this.state;
    const bandages = s.bandages;
    const ok = s.heal();
    if (ok) this.notify(s.bandages < bandages ? `Bandage posé · santé ${Math.round(s.health)}.` : `Trousse de soins utilisée · santé ${Math.round(s.health)}.`);
    else this.notify(this.cannotHeal(s.bandages + s.medkits > 0));
    return ok;
  }

  useBandage(): boolean {
    const ok = this.state.useBandage();
    this.notify(ok ? `Bandage posé · santé ${Math.round(this.state.health)}.` : this.cannotHeal(this.state.bandages > 0, "Plus de bandage."));
    return ok;
  }

  useMedkit(): boolean {
    const ok = this.state.useMedkit();
    this.notify(ok ? `Trousse de soins utilisée · santé ${Math.round(this.state.health)}.` : this.cannotHeal(this.state.medkits > 0, "Plus de trousse de soins."));
    return ok;
  }

  eatCan(): boolean {
    const ok = this.state.eatCan();
    this.notify(ok ? `Conserve avalée · santé ${Math.round(this.state.health)}.` : this.cannotHeal(this.state.cans > 0, "Plus de conserve."));
    return ok;
  }

  /** Pile de rechange dans la lampe. */
  useCell(): boolean {
    const s = this.state;
    const ok = s.useCell();
    if (ok) this.notify(`Pile changée · lampe ${Math.round(s.energy)}/${s.maxEnergy()}.`);
    else this.notify(s.cells <= 0 ? "Plus de pile de rechange." : "La lampe est déjà chargée.");
    return ok;
  }

  private cannotHeal(hasItem: boolean, empty = "Rien pour se soigner."): string {
    if (!hasItem) return empty;
    return this.state.health >= 100 ? "Santé déjà au maximum." : "Impossible de se soigner maintenant.";
  }

  notify(text: string): void {
    this.notice = text;
    this.noticeId += 1;
    this.noticeTime = 6;
  }

  damagePlayer(amount: number): void {
    if (this.state.health <= 0) return;
    this.state.damage(amount);
    this.hurtAt = this.elapsed;
    this.operator.root.userData.hurt = 0.25;
    if (this.state.health <= 0) this.setMode("death");
  }

  private refreshWorld(): void {
    this.worldDirty = false;
    this.world.refresh(this.state);
    this.hordeContext.colliders = this.world.colliders;
  }

  // ——— Boucle ———

  /** Avance la simulation d'un pas (utilisé aussi par les tests). */
  tick(dt: number): void {
    this.input.update();
    const mode = this.ui.get().mode;
    if (this.input.consume("perf")) this.showPerf = !this.showPerf;
    if (this.input.consume("pause")) {
      if (mode === "playing") this.openPause();
      else if (mode !== "menu" && mode !== "death") this.resume();
    } else if (mode === "inventory" && this.input.consume("inventory")) this.resume();
    else if (mode === "journal" && this.input.consume("journal")) this.resume();
    else if (mode === "note" && this.input.consume("journal")) this.openJournal();
    else if ((mode === "note" || mode === "closeup") && this.input.consume("interact")) this.resume();
    if (this.ui.get().mode === "playing") this.simulate(dt);
    else this.input.clearPressed();
    this.render(dt);
    this.sound.update(dt, this);
  }

  private simulate(dt: number): void {
    // Sauvegarde « Lieu sûr » : due à chaque progrès et toutes les 30 s, écrite dès qu'on est en sécurité.
    this.autosaveClock += dt;
    if (this.autosaveClock >= 30) {
      this.autosaveDue = true;
      this.autosaveClock = 0;
    }
    if (this.autosaveDue) this.autosave();
    this.elapsed += dt;
    this.state.elapsed += dt;
    const input = this.input;
    this.rig.zoom(input.takeZoom());
    if (this.worldDirty) this.refreshWorld();

    // Visée
    let aimYaw: number | null = null;
    let aiming = false;
    this.aimPoint = null;
    if (input.device === "keyboard" && input.pointer) {
      const point = groundPoint(this.camera, input.pointer.x, input.pointer.y, AIM_HEIGHT, this.aimTmp);
      if (point) {
        this.aimPoint = point;
        aimYaw = yawTowards(this.player.x, this.player.z, point.x, point.z);
        aiming = true;
      }
    } else if (input.device === "gamepad" && Math.hypot(input.aimStick.x, input.aimStick.y) > 0.25) {
      aimYaw = Math.atan2(input.aimStick.x, -input.aimStick.y);
      aiming = true;
    } else if (input.device === "touch") {
      const target = assistTarget(this.player.x, this.player.z, this.player.yaw, this.horde.aimCandidates());
      if (target) {
        aimYaw = yawTowards(this.player.x, this.player.z, target.x, target.z);
        aiming = true;
      }
    }
    if (input.firing) aiming = true;

    // Déplacement (le haut de l'écran est le nord, −Z)
    this.player.update(dt, { x: input.move.x, z: -input.move.y, sprint: input.sprint, crouch: input.crouch, aimYaw }, this.world.colliders);

    // Armes et lampe
    this.combat.update(dt, {
      firing: input.firing,
      light: this.inquiry.lampPressed(input.consume("light")),
      swap: input.consume("swap"),
      weapon1: input.consume("weapon1"),
      weapon2: input.consume("weapon2"),
    });
    if (input.consume("uv")) this.inquiry.toggleUv();
    if (input.consume("reload")) this.startReload(false);
    // Lance-clous vide : rechargement automatique s'il reste des clous dans la sacoche.
    if (this.combat.weapon === 1 && this.state.ammo === 0 && this.state.reserve > 0 && !this.player.reloading) this.startReload(true);
    if (this.player.takeReloadCompleted() && this.combat.weapon === 1) this.state.reloadRounds(NAIL_CAPACITY);

    // Interaction et raccourcis
    this.focus = this.findFocus();
    const interacted = input.consume("interact") && this.focus !== null;
    if (interacted) this.interact(this.focus!);
    if (input.consume("save")) this.saveGame();
    if (input.consume("load")) this.loadGame();
    if (input.consume("heal")) this.heal();
    if (input.consume("cell")) this.useCell();
    if (input.consume("inventory")) this.openInventory();
    else if (input.consume("journal")) this.openJournal();

    // Zombies
    this.hordeContext.player.x = this.player.x;
    this.hordeContext.player.z = this.player.z;
    this.hordeContext.player.crouched = this.player.crouched;
    this.hordeContext.player.alive = this.state.health > 0;
    this.horde.update(dt, this.hordeContext);

    // Objectifs déclenchés en se déplaçant
    for (const message of checkTriggers(this.state, this.player.x, this.player.z)) this.notify(message);
    this.inquiry.update(dt, this.player.x, this.player.z, this.player.yaw);

    this.noticeTime = Math.max(0, this.noticeTime - dt);
    this.state.playerPosition = [this.player.x, 0, this.player.z];
    this.state.playerYaw = this.player.yaw;

    // Visuel du joueur
    this.operator.root.position.set(this.player.x, 0, this.player.z);
    this.operator.root.rotation.y = this.player.yaw;
    this.shadowBlob.position.set(this.player.x, 0.02, this.player.z);
    animateOperator(this.operator, {
      pose: this.player.pose,
      stride: this.player.stride,
      speed: this.player.speed,
      shotTime: this.player.shotTime,
      reload: this.player.reloadProgress,
      aiming,
      weapon: this.combat.weapon,
      swing: this.combat.swingTime > 0 ? 1 - this.combat.swingTime / WRENCH.swing : 0,
      dazzle: this.combat.dazzleTime,
    }, dt);
    this.world.update(dt, this.elapsed, this.player.x, this.player.z);
    this.updateHighlights();
    this.updateTutorial(dt, interacted);
  }

  /** Bulles d'aide, astuce et flèche d'objectif (au sol, cachée quand la cible est à l'écran et proche). */
  private updateTutorial(dt: number, interacted: boolean): void {
    const { x, z } = this.player;
    this.tutorial.update(dt, this.state, x, z, {
      device: this.input.device, moving: this.player.speed > 0.6, interacted, crouched: this.player.crouched,
      struck: this.combat.swingTime > 0 || this.player.shotTime > 0, dazzled: this.combat.dazzleTime > 0, journalOpened: false,
      noteDistance: nearestUnreadNote(this.state, x, z), zombieDistance: nearestZombie(this.horde.aimCandidates(), x, z), notesRead: this.state.notes.length,
    });
    const target = this.tutorial.target;
    let show = false;
    if (target) {
      const p = this.guideTmp.set(target.goalX, 0.5, target.goalZ).project(this.camera);
      const onScreen = p.z < 1 && Math.abs(p.x) < 0.9 && Math.abs(p.y) < 0.9;
      show = arrowVisible(this.tutorial.arrowWanted(), Math.hypot(target.goalX - x, target.goalZ - z), onScreen);
    }
    this.guide.update(dt, this.elapsed, x, z, target?.x ?? x, target?.z ?? z + 1, show);
  }

  /** Rechargement du lance-clous (la clé à molette ne se recharge pas). */
  private startReload(silent: boolean): void {
    if (this.combat.weapon !== 1) return;
    const canReload = this.state.ammo < NAIL_CAPACITY && this.state.reserve > 0;
    if (this.player.startReload(canReload)) {
      if (!silent) this.notify("Rechargement du lance-clous…");
    } else if (!silent && !this.player.reloading) {
      this.notify(this.state.reserve === 0 ? "Plus de clous dans la sacoche." : "Chargeur plein.");
    }
  }

  available(def: InteractableDef): boolean {
    return interactableAvailable(def, this.state);
  }

  private findFocus(): InteractableDef | null {
    let best: InteractableDef | null = null;
    let bestScore = Infinity;
    for (const view of this.world.interactables.values()) {
      const def = view.def;
      if (!this.available(def)) continue;
      const distance = Math.hypot(def.x - this.player.x, def.z - this.player.z) - def.radius;
      if (distance > REACH) continue;
      // Préfère ce qui est devant l'opérateur.
      const facing = Math.cos(yawTowards(this.player.x, this.player.z, def.x, def.z) - this.player.yaw);
      const score = distance - facing * 0.4;
      if (score < bestScore) {
        best = def;
        bestScore = score;
      }
    }
    return best;
  }

  interact(def: InteractableDef): void {
    if (def.examine) {
      this.events.emit({ type: "interact", id: def.id, changed: this.inquiry.examine(def.examine) });
      return;
    }
    this.events.emit({ type: "interact", id: def.id, changed: interactWith(def, this.state, this.progressEffects) });
  }

  private updateHighlights(): void {
    for (const view of this.world.interactables.values()) {
      const available = this.available(view.def);
      const distance = Math.hypot(view.def.x - this.player.x, view.def.z - this.player.z);
      const shown = available && distance < 15;
      view.highlight.setVisible(shown);
      if (shown) {
        const pulse = 0.85 + Math.sin(this.elapsed * 5) * 0.15;
        view.highlight.setStrength(this.focus === view.def ? pulse : 0.55);
      }
    }
  }

  private render(dt: number): void {
    // Ressenti du combat (game/combat.ts) : tremblement et à-coups de la caméra.
    this.combat.applyCamera(this.rig);
    this.rig.update(dt, this.tmp.set(this.player.x, 0, this.player.z), this.aimPoint);
    // Ambiance de la pièce du joueur ; la lune suit le point visé pour garder des ombres nettes autour de lui.
    this.atmosphere.update({
      dt, x: this.player.x, z: this.player.z, focus: this.rig.focus, distance: this.rig.distance,
      aspect: this.camera.aspect, state: this.state, headlamp: this.operator.headlamp,
    });
    this.inquiry.render(dt, this.camera, this.operator.headlamp, this.player, this.canvas.clientWidth, this.canvas.clientHeight, this.ui.get().mode);
    this.renderer.render(this.scene, this.camera);
    this.placeTooltip();
    this.fpsFrames += 1;
    this.fpsClock += dt;
    if (this.fpsClock >= 0.5) {
      this.fps = Math.round(this.fpsFrames / this.fpsClock);
      this.fpsFrames = 0;
      this.fpsClock = 0;
    }
    this.hudClock += dt;
    if (this.hudClock >= 0.1) this.publishHud();
  }

  private placeTooltip(): void {
    const el = this.tooltipEl;
    if (!el) return;
    const def = this.focus;
    if (!def || this.paused) {
      el.style.opacity = "0";
      return;
    }
    const view = this.world.interactables.get(def.id)!;
    this.tmp.set(def.x, view.tooltipHeight, def.z).project(this.camera);
    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;
    const x = (this.tmp.x * 0.5 + 0.5) * width;
    const y = (-this.tmp.y * 0.5 + 0.5) * height;
    el.style.opacity = "1";
    el.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px) translate(-50%, -100%)`;
  }

  private snapshot(): HudSnapshot {
    const s = this.state;
    return {
      sector: sectorAt(this.player?.x ?? s.playerPosition[0], this.player?.z ?? s.playerPosition[2]),
      objective: s.objectiveChecklist(),
      health: Math.round(s.health),
      energy: Math.round(s.energy),
      maxEnergy: s.maxEnergy(),
      ammo: s.ammo,
      reserve: s.reserve,
      components: s.components,
      medkits: s.medkits,
      bandages: s.bandages,
      cans: s.cans,
      cells: s.cells,
      notesCount: s.notes.length,
      weapon: this.combat?.weapon ?? 0,
      reloading: this.player?.reloading ?? false,
      lightReady: (this.combat?.lightCooldown ?? 0) <= 0 && s.energy >= LAMP.energy,
      autosaved: this.elapsed - this.savedAt < 1.6,
      notice: this.noticeTime > 0 ? this.notice : "",
      noticeId: this.noticeId,
      prompt: this.focus ? { name: this.focus.name, action: actionLabel(this.focus, s) } : null,
      tutorial: this.tutorial?.bubble ?? null,
      hint: this.tutorial?.hint ?? "",
      device: this.input.device,
      paused: this.ui.get().mode !== "playing",
      fps: this.fps,
      showPerf: this.showPerf,
    };
  }

  private publishHud(): void {
    this.hudClock = 0;
    this.hud.set(this.snapshot());
  }
}
