// Boucle de jeu three.js, hors de React. L'interface lit `hud` et `ui`, et positionne l'infobulle via `tooltipEl`.
// Port de main.gd (modes, partie, fins) et de SiloWorld.interact.
import {
  Clock, Color, DirectionalLight, Fog, HemisphereLight, NeutralToneMapping, PCFSoftShadowMap,
  PerspectiveCamera, Scene, SRGBColorSpace, Vector3, WebGLRenderer, type Mesh,
} from "three";
import { CAMERA, CameraRig } from "./camera";
import { AIM_HEIGHT, assistTarget, groundPoint, yawTowards } from "./aim";
import { InputState } from "./input";
import { PlayerController } from "./player";
import { SiloState, type Character, type KeyValueStore } from "./state";
import { SiloDialogue } from "./dialogue";
import { DOORS, ENTRANCE_TRIGGER, roomAt, sectorAt, type InteractableDef } from "./level";
import { doorOpen, interactableAvailable } from "./rules";
import { HudStore, type HudSnapshot } from "./hud";
import { UiStore, type UiMode } from "./ui";
import { createHorde } from "./enemy";
import { Combat } from "./combat";
import type { Horde, HordeContext } from "./types";
import { buildWorld, type WorldView } from "./render/world";
import { animateOperator, buildOperator, type OperatorRig } from "./render/operator";
import { PALETTE } from "./render/palette";
import { blobTexture } from "./render/textures";
import { decal } from "./render/props";

export interface EngineOptions {
  lowQuality?: boolean;
  storage?: KeyValueStore | null;
}

/** Distance d'approche en plus du rayon propre de l'objet. */
const REACH = 1.1;

export class Engine {
  readonly state = new SiloState();
  readonly dialogue = new SiloDialogue();
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
  tooltipEl: HTMLElement | null = null;
  lowQuality: boolean;
  /** Point visé au sol (souris), ou null. */
  aimPoint: Vector3 | null = null;
  focus: InteractableDef | null = null;
  storage: KeyValueStore | null;

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
  private sun: DirectionalLight;
  private shadowBlob: Mesh;
  private readonly tmp = new Vector3();
  private readonly aimTmp = new Vector3();
  private resizeObserver: ResizeObserver | null = null;
  private hordeContext: HordeContext;

  constructor(readonly canvas: HTMLCanvasElement, options: EngineOptions = {}) {
    this.lowQuality = options.lowQuality ?? false;
    this.storage = options.storage ?? null;
    this.renderer = new WebGLRenderer({ canvas, antialias: !this.lowQuality, stencil: true, powerPreference: "high-performance" });
    this.renderer.outputColorSpace = SRGBColorSpace;
    this.renderer.toneMapping = NeutralToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = PCFSoftShadowMap;
    this.renderer.setClearColor(PALETTE.sky);

    this.scene.background = new Color(PALETTE.sky);
    this.scene.fog = new Fog(PALETTE.fog, 22, 48);
    this.camera = new PerspectiveCamera(CAMERA.fov, 16 / 9, 0.5, 120);
    this.rig = new CameraRig(this.camera);

    this.scene.add(new HemisphereLight("#ffe9c8", "#3d4a3c", 0.95));
    this.sun = new DirectionalLight("#ffd7a3", 1.25);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    Object.assign(this.sun.shadow.camera, { left: -15, right: 15, top: 15, bottom: -15, near: 1, far: 40 });
    this.sun.shadow.bias = -0.0008;
    this.sun.shadow.normalBias = 0.03;
    this.sun.shadow.radius = 4;
    this.scene.add(this.sun, this.sun.target);

    this.world = buildWorld(this.scene);
    const [px, , pz] = this.state.playerPosition;
    this.player = new PlayerController(px, pz, this.state.playerYaw);
    this.operator = buildOperator();
    this.scene.add(this.operator.root, this.operator.droppedMag);
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
      operator: this.operator,
      horde: this.horde,
      world: this.world,
      notify: (text) => this.notify(text),
      noise: (x, z, radius) => this.horde.hearNoise(x, z, radius),
    });

    this.dialogue.setup(this.state);
    this.state.subscribe(() => { this.worldDirty = true; });
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
    this.dialogue.cancel();
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
    this.sun.castShadow = !low;
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
    this.publishHud();
  }

  /** Pause / reprise (bouton ❚❚, Échap). */
  setPaused(paused: boolean): void {
    if (paused) this.openPause();
    else this.resume();
  }

  resume(): void {
    this.dialogue.cancel();
    this.setMode(this.state.health > 0 ? "playing" : "death");
  }

  newGame(): void {
    this.dialogue.cancel();
    this.state.reset();
    this.startRun();
    this.setMode("playing");
    this.notify("SILLO 8. L'entrée est juste devant. Avancez sans bruit.");
  }

  saveGame(): boolean {
    if (!this.storage) {
      this.notify("Sauvegarde indisponible dans ce navigateur.");
      return false;
    }
    if (this.state.health <= 0) {
      this.notify("Sauvegarde indisponible dans cet état.");
      return false;
    }
    this.state.playerPosition = [this.player.x, 0, this.player.z];
    this.state.playerYaw = this.player.yaw;
    const result = this.state.saveGame(this.storage);
    this.notify(result === "ok" ? "Progression sauvegardée." : "Échec de sauvegarde.");
    return result === "ok";
  }

  hasSave(): boolean {
    try {
      return Boolean(this.storage?.getItem("sillo8-save"));
    } catch {
      return false;
    }
  }

  loadGame(): boolean {
    if (!this.storage) {
      this.notify("Sauvegarde indisponible dans ce navigateur.");
      return false;
    }
    // Validation sur une copie : un échec laisse la partie en cours intacte.
    const result = new SiloState().loadGame(this.storage);
    if (result !== "ok") {
      this.notify(result === "missing" ? "Aucune sauvegarde." : "Sauvegarde invalide.");
      return false;
    }
    this.dialogue.cancel();
    this.state.loadGame(this.storage);
    this.startRun();
    this.setMode("playing");
    this.notify("Progression restaurée.");
    return true;
  }

  /** Replace le joueur et le monde d'après l'état courant (nouvelle partie ou chargement). */
  private startRun(): void {
    const [x, , z] = this.state.playerPosition;
    this.player.x = x;
    this.player.z = z;
    this.player.vx = this.player.vz = 0;
    this.player.yaw = this.state.playerYaw;
    this.player.reloadTime = 0;
    this.horde.sync(this.state);
    this.refreshWorld();
    this.rig.snap(new Vector3(x, 0, z));
  }

  openPause(): void {
    this.setMode("pause");
  }

  openInventory(): void {
    this.setMode("inventory");
  }

  openConversation(character: Character): void {
    this.setMode("dialogue", character);
  }

  /** Fin de l'étage 1 : l'accès à l'étage 2 est ouvert (l'étage 2 reste à construire). */
  openFloor2(): void {
    if (!this.state.reachFloor2() && !this.state.has("floor2")) {
      this.notify("Accès verrouillé. Il faut une clé d'accès.");
      return;
    }
    this.saveGame();
    this.setMode("conclusion", "floor2");
  }

  /** Choix de fin : réservé aux étages suivants (l'histoire de SILLO 8 reste à écrire). */
  chooseEnding(choice: Character): boolean {
    void choice;
    this.notify("Ce choix n'est pas encore disponible.");
    return false;
  }

  useMedkit(): boolean {
    const ok = this.state.heal();
    this.notify(ok ? "Santé restaurée." : "Aucune trousse utilisable.");
    return ok;
  }

  useCell(): boolean {
    const ok = this.state.useCell();
    this.notify(ok ? "Batterie rechargée." : "Aucune cellule utilisable.");
    return ok;
  }

  notify(text: string): void {
    this.notice = text;
    this.noticeId += 1;
    this.noticeTime = 6;
  }

  damagePlayer(amount: number): void {
    if (this.state.health <= 0) return;
    this.state.damage(amount);
    this.operator.root.userData.hurt = 0.25;
    if (this.state.health <= 0) this.setMode("death");
  }

  private refreshWorld(): void {
    this.worldDirty = false;
    this.world.refresh(this.state);
    this.world.setEndingTint(this.state.ending);
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
      else if (mode !== "menu" && mode !== "death" && mode !== "ending") this.resume();
    } else if (mode === "inventory" && this.input.consume("inventory")) this.resume();
    if (this.ui.get().mode === "playing") this.simulate(dt);
    else this.input.clearPressed();
    this.render(dt);
  }

  private simulate(dt: number): void {
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

    // Armes et scan
    if (input.consume("reload")) this.startReload(false);
    if (input.firing && this.combat.weapon === 0 && this.state.ammo === 0 && !this.player.reloading) this.startReload(true);
    if (this.player.takeReloadCompleted()) this.state.reloadRounds(12);
    this.combat.update(dt, {
      firing: input.firing,
      arc: input.consume("arc"),
      scan: input.consume("scan"),
      weapon1: input.consume("weapon1"),
      weapon2: input.consume("weapon2"),
    });

    // Interaction et raccourcis
    this.focus = this.findFocus();
    if (input.consume("interact") && this.focus) this.interact(this.focus);
    if (input.consume("save")) this.saveGame();
    if (input.consume("load")) this.loadGame();
    if (input.consume("heal")) this.useMedkit();
    if (input.consume("cell")) this.useCell();
    if (input.consume("inventory")) this.openInventory();

    // Zombies
    this.hordeContext.player.x = this.player.x;
    this.hordeContext.player.z = this.player.z;
    this.hordeContext.player.crouched = this.player.crouched;
    this.hordeContext.player.alive = this.state.health > 0;
    this.hordeContext.dormant = this.state.ending === "n7";
    this.horde.update(dt, this.hordeContext);

    // Objectifs déclenchés en se déplaçant
    if (!this.state.has("entrance_explored") && Math.hypot(this.player.x - ENTRANCE_TRIGGER.x, this.player.z - ENTRANCE_TRIGGER.z) < ENTRANCE_TRIGGER.radius && this.state.exploreEntrance()) {
      this.notify("La porte de sécurité est morte. Plus de courant. La génératrice doit être à l'ouest.");
    }
    if (!this.state.has("hub_reached") && roomAt(this.player.x, this.player.z)?.id === "hub" && this.state.reachHub()) {
      this.notify("HUB CENTRAL. Toutes les ailes partent d'ici. Le relais radio est en salle de contrôle.");
    }

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
    }, dt);
    this.world.update(dt, this.elapsed, this.player.x, this.player.z);
    this.updateHighlights();
  }

  private startReload(silent: boolean): void {
    const canReload = this.combat.weapon === 0 && this.state.ammo < 12 && this.state.reserve > 0;
    if (this.player.startReload(canReload)) {
      if (!silent) this.notify("Rechargement du D9…");
    } else if (!silent && !this.player.reloading) {
      this.notify(this.state.reserve === 0 ? "Plus de munitions en réserve." : "Chargeur plein.");
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
    const s = this.state;
    if (def.kind) {
      if (s.collect(def.id, def.kind, def.amount ?? 1)) this.notify(def.kind === "components" ? `Pièce récupérée · ${s.components} en poche.` : "Ressource récupérée.");
      return;
    }
    switch (def.id) {
      case "security_door":
        this.notify("Hors tension. Il faut relancer la génératrice (3 pièces).");
        break;
      case "generator":
        if (s.powerGenerator()) {
          this.world.shudder();
          this.notify("La génératrice tousse… puis tourne. Les portes de sécurité s'ouvrent.");
        } else this.notify(`Il manque des pièces : ${s.components}/3. Fouillez la zone extérieure et la serre.`);
        break;
      case "workbench":
        this.notify(s.craftRadioModule() ? "Module radio fabriqué. Direction la salle de contrôle." : `L'établi demande 2 pièces (${s.components} en poche).`);
        break;
      case "upgrade":
        this.notify(s.upgrade() ? "Batterie améliorée : 150 énergie." : "Le banc demande 3 pièces, amélioration unique.");
        break;
      case "comms":
        this.notify(s.repairComms() ? "Communication rétablie. Un signal faible répond… quelque part plus bas." : "Le relais radio est grillé. Fabriquez un module à l'atelier.");
        break;
      case "keycard":
        if (s.takeKeycard()) this.notify("Clé d'accès de l'étage 2 récupérée.");
        break;
      case "stairs":
        this.openFloor2();
        break;
      case "recharge":
        s.recharge();
        this.notify("Batterie rechargée.");
        break;
      case "device":
        this.notify("Verrou sous tension. Une décharge d'ARC-3 (clic droit) le coupera.");
        break;
    }
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
    this.rig.update(dt, this.tmp.set(this.player.x, 0, this.player.z), this.aimPoint);
    const fog = this.scene.fog as Fog;
    fog.near = this.rig.distance + 3;
    fog.far = this.rig.distance + 30;
    // La lumière d'ensemble suit le joueur pour garder des ombres nettes autour de lui.
    this.sun.position.set(this.rig.focus.x - 7, 16, this.rig.focus.z - 9);
    this.sun.target.position.copy(this.rig.focus);
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
      cells: s.cells,
      weapon: this.combat?.weapon ?? 0,
      reloading: this.player?.reloading ?? false,
      notice: this.noticeTime > 0 ? this.notice : "",
      noticeId: this.noticeId,
      prompt: this.focus ? { name: this.focus.name, action: this.focus.action } : null,
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
