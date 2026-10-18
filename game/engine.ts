// Boucle de jeu three.js, hors de React. L'interface lit `hud` et positionne l'infobulle via `tooltipEl`.
import {
  Clock, Color, DirectionalLight, Fog, HemisphereLight, Mesh, MeshBasicMaterial, NeutralToneMapping, PCFSoftShadowMap,
  PerspectiveCamera, Scene, SphereGeometry, SRGBColorSpace, Vector3, WebGLRenderer,
} from "three";
import { CAMERA, CameraRig } from "./camera";
import { AIM_HEIGHT, assistTarget, groundPoint, yawTowards } from "./aim";
import { InputState } from "./input";
import { PlayerController } from "./player";
import { SiloState, type KeyValueStore } from "./state";
import { SiloDialogue } from "./dialogue";
import { sectorAt, type InteractableDef } from "./level";
import { HudStore, type HudSnapshot } from "./hud";
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
  readonly renderer: WebGLRenderer;
  readonly scene = new Scene();
  readonly camera: PerspectiveCamera;
  readonly rig: CameraRig;
  readonly player: PlayerController;
  readonly operator: OperatorRig;
  readonly world: WorldView;
  tooltipEl: HTMLElement | null = null;
  paused = false;
  lowQuality: boolean;
  /** Point visé au sol (souris), ou null. */
  aimPoint: Vector3 | null = null;
  focus: InteractableDef | null = null;

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
  private sun: DirectionalLight;
  private flash: Mesh;
  private shadowBlob: Mesh;
  private storage: KeyValueStore | null;
  private readonly tmp = new Vector3();
  private readonly aimTmp = new Vector3();
  private resizeObserver: ResizeObserver | null = null;

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

    const hemi = new HemisphereLight("#ffe9c8", "#3d4a3c", 0.95);
    this.scene.add(hemi);
    this.sun = new DirectionalLight("#ffd7a3", 1.25);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.camera.left = -15;
    this.sun.shadow.camera.right = 15;
    this.sun.shadow.camera.top = 15;
    this.sun.shadow.camera.bottom = -15;
    this.sun.shadow.camera.near = 1;
    this.sun.shadow.camera.far = 40;
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
    this.flash = new Mesh(new SphereGeometry(0.11, 8, 6), new MeshBasicMaterial({ color: "#ffe28a", transparent: true, opacity: 0.95 }));
    this.flash.visible = false;
    this.flash.position.set(0, -0.36, 0.02);
    this.operator.gun.add(this.flash);

    this.dialogue.setup(this.state);
    this.hud = new HudStore(this.snapshot());
    this.setLowQuality(this.lowQuality);
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
    this.shadowBlob.visible = true;
    this.operator.headlamp.visible = true;
    this.world.setLowQuality(low);
    this.resize();
  }

  setPaused(paused: boolean): void {
    this.paused = paused;
    if (paused) this.input.releaseAll();
    this.publishHud(true);
  }

  notify(text: string): void {
    this.notice = text;
    this.noticeId += 1;
    this.noticeTime = 6;
  }

  /** Avance la simulation d'un pas (utilisé aussi par les tests). */
  tick(dt: number): void {
    this.input.update();
    if (this.input.consume("pause")) this.setPaused(!this.paused);
    if (this.input.consume("perf")) this.showPerf = !this.showPerf;
    if (!this.paused) this.simulate(dt);
    else this.input.clearPressed();
    this.render(dt);
  }

  private simulate(dt: number): void {
    this.elapsed += dt;
    this.state.elapsed += dt;
    const input = this.input;
    this.rig.zoom(input.takeZoom());

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
      const target = assistTarget(this.player.x, this.player.z, this.player.yaw, this.aimCandidates());
      if (target) {
        aimYaw = yawTowards(this.player.x, this.player.z, target.x, target.z);
        aiming = true;
      } else if (input.firing) {
        aiming = true;
      }
    }
    if (input.firing && !aiming) aiming = true;

    // Déplacement (le haut de l'écran est le nord, −Z)
    this.player.update(dt, { x: input.move.x, z: -input.move.y, sprint: input.sprint, crouch: input.crouch, aimYaw }, this.world.colliders);

    // Armes (le tir lui-même et les dégâts arrivent à l'étape 3)
    if (input.firing && this.player.tryFire(() => this.state.fireRound())) {
      this.flash.visible = true;
      this.flash.scale.setScalar(1);
    }
    if (input.firing && this.state.ammo === 0 && !this.player.reloading) this.startReload(true);
    if (input.consume("reload")) this.startReload(false);
    if (this.player.takeReloadCompleted()) this.state.reloadRounds(12);
    if (this.player.shotTime < 0.12) this.flash.visible = false;

    // Interaction
    this.focus = this.findFocus();
    if (input.consume("interact")) {
      if (this.focus) this.interact(this.focus);
    }
    if (input.consume("save")) this.save();
    if (input.consume("load")) this.load();
    if (input.consume("heal")) this.notify(this.state.heal() ? "Santé restaurée." : "Aucune trousse utilisable.");
    if (input.consume("cell")) this.notify(this.state.useCell() ? "Batterie rechargée." : "Aucune cellule utilisable.");
    input.consume("scan");
    input.consume("arc");
    input.consume("weapon1");
    input.consume("weapon2");
    input.consume("inventory");

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
    this.world.update(dt, this.elapsed);
    this.updateHighlights();
  }

  private startReload(silent: boolean): void {
    const canReload = this.state.ammo < 12 && this.state.reserve > 0;
    if (this.player.startReload(canReload)) {
      if (!silent) this.notify("Rechargement du D9…");
    } else if (!silent && !this.player.reloading) {
      this.notify(this.state.reserve === 0 ? "Plus de munitions en réserve." : "Chargeur plein.");
    }
  }

  private aimCandidates(): { id: string; x: number; z: number }[] {
    // Aucune machine dans le secteur 01 : les ennemis s'ajoutent à l'étape 4.
    return [];
  }

  available(def: InteractableDef): boolean {
    if (def.kind) return !this.state.collected.includes(def.id);
    return true;
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

  /** Port de SiloWorld.interact pour les objets du refuge et du secteur 01. */
  interact(def: InteractableDef): void {
    const s = this.state;
    if (def.kind) {
      if (s.collect(def.id, def.kind, def.amount ?? 1)) this.notify(def.kind === "components" ? `Composant récupéré · ${s.components} en réserve.` : "Ressource récupérée.");
      return;
    }
    switch (def.id) {
      case "mother":
        this.notify("MÈRE : " + this.dialogue.offlineReply("mother", "bonjour"));
        break;
      case "recharge":
        s.recharge();
        this.notify("Batterie rechargée. L'ascenseur reste votre refuge.");
        break;
      case "upgrade":
        this.notify(s.upgrade() ? "Batterie améliorée : 150 énergie." : "L'établi demande 3 composants, amélioration unique.");
        break;
      case "ending":
        this.notify(s.phase === 3 ? "Choix final disponible." : "Descente suspendue. Récupérez le cœur mémoriel du secteur 04.");
        break;
    }
  }

  private updateHighlights(): void {
    for (const view of this.world.interactables.values()) {
      const available = this.available(view.def);
      view.group.visible = available;
      const distance = Math.hypot(view.def.x - this.player.x, view.def.z - this.player.z);
      const shown = available && distance < 15;
      view.highlight.setVisible(shown);
      if (shown) {
        const pulse = 0.85 + Math.sin(this.elapsed * 5) * 0.15;
        view.highlight.setStrength(this.focus === view.def ? pulse : 0.55);
      }
    }
  }

  save(): void {
    if (!this.storage) return this.notify("Sauvegarde indisponible dans ce navigateur.");
    const result = this.state.saveGame(this.storage);
    this.notify(result === "ok" ? "Progression sauvegardée." : "Échec de sauvegarde.");
  }

  load(): void {
    if (!this.storage) return this.notify("Sauvegarde indisponible dans ce navigateur.");
    const result = this.state.loadGame(this.storage);
    if (result !== "ok") return this.notify(result === "missing" ? "Aucune sauvegarde." : "Sauvegarde invalide.");
    const [x, , z] = this.state.playerPosition;
    this.player.x = x;
    this.player.z = z;
    this.player.yaw = this.state.playerYaw;
    this.rig.snap(new Vector3(x, 0, z));
    this.notify("Progression restaurée.");
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
    if (this.hudClock >= 0.1) this.publishHud(false);
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
      reloading: this.player?.reloading ?? false,
      notice: this.noticeTime > 0 ? this.notice : "",
      noticeId: this.noticeId,
      prompt: this.focus ? { name: this.focus.name, action: this.focus.action } : null,
      device: this.input.device,
      paused: this.paused,
      fps: this.fps,
      showPerf: this.showPerf,
    };
  }

  private publishHud(force: boolean): void {
    this.hudClock = 0;
    const next = this.snapshot();
    if (force) this.hud.set({ ...next });
    else this.hud.set(next);
  }
}
