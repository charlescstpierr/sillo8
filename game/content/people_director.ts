// Déroulé des personnes pendant la partie : les deux survivants dans le monde (poses selon la confiance,
// déplacements des scènes), les moments clés M1 à M7 déclenchés par conditions, les gestes faits hors des
// conversations (bruit, fouille, porte refermée, commis). (Les indices portés par les mordus s'examinent par
// l'enquête : champ `carrier` des examinables, game/investigation/content/objects.ts.)
// Le moteur l'appelle à chaque image de jeu (update) ; l'état durable est dans SiloState (voir people.ts).
import { Group, type Object3D, type Scene } from "three";
import type { GameEvent, GameEvents } from "../events";
import { roomAt, type InteractableDef } from "../level";
import type { SiloState } from "../state";
import type { Horde } from "../types";
import type { ZombieHorde } from "../enemy";
import type { UiMode } from "../ui";
import type { InquiryDirector } from "../investigation/director";
import type { InteractableView } from "../render/world";
import { addHighlight } from "../render/highlight";
import { getStoryObject } from "../render/storyProps";
import {
  animateSurvivor, buildColdDoor, buildCook, buildCookShelf, buildLatch, buildNightOperator,
  COLD_DOOR, TECH_DOOR, type ColdDoorView, type SurvivorPose, type SurvivorRig,
} from "../render/survivor";
import {
  applyGesture, controlPowered, cookLevel, farewell, markScene, momentReady, operatorMood,
  peopleNotices, played, syncOperator, unlockForInquiry, MOMENTS, sceneFlag,
} from "./people";
import "./people_talk";

export interface PeopleHost {
  scene: Scene;
  state: SiloState;
  horde: Horde;
  inquiry: InquiryDirector;
  events: GameEvents;
  notify(text: string): void;
  openConversation(id: string): boolean;
  mode(): UiMode;
  /** Rappelle une commande à l'écran (bulle du tutoriel : « Clic droit », « LAMPE »…) pendant `seconds` s. */
  prompt?(step: string, seconds: number): void;
}

/**
 * M4 : le commis s'arrête net à son entrée (HOLD s), puis revient vers Cuisine à PACE de son allure. Lou peut
 * s'éloigner sans que ça compte comme une fuite : seulement hors de la cafétéria, après AWAY s (avec un avertissement).
 * Le commis patrouille près de Cuisine : même s'il est déjà à côté de lui, il ne l'atteint qu'après GRACE s.
 */
export const M4_TIMING = { hold: 1.8, pace: 0.6, away: 4, reach: 1.1, grace: 6, limit: 35 };

/** Où se tiennent les survivants (positions réelles du décor, storyProps.ts). */
export const SPOTS = {
  /** Cuisine sur la chaîne : à moitié dans l'embrasure de la chambre froide. */
  cookChain: { x: -29.95, z: 17.72, yaw: 0.3 },
  /** Cuisine, porte ouverte : debout sur le seuil, mains sur les hanches. */
  cookSit: { x: -30.25, z: 18.1, yaw: 0.25 },
  /** Cuisine confiant : dehors, dos tourné, il fouille son étagère contre le caisson. */
  cookOut: { x: -28.15, z: 15.05, yaw: -Math.PI / 2 },
  /** Où Lou lui parle, devant la porte (entre le caisson et la barricade). */
  cookTalk: { x: -29.1, z: 17.65 },
  /** Accusation publique : devant l'avis officiel du hub. */
  cookHub: { x: -3.4, z: -3.4, yaw: -2.89 },
  /** M4 : sorti devant la barricade, face à la salle. */
  cookM4: { x: -26.9, z: 16.3, yaw: 1.2 },
  /** M7 : au hub, devant le couloir nord, une boîte de pêches à la main. */
  cookFarewell: { x: 0.9, z: -5.6, yaw: Math.PI },
  /** L'opératrice, dans son local technique (assez loin de la cloison sud pour être vue de la caméra). */
  operator: { x: 28.6, z: -20.5, yaw: 0 },
  // Interphone du décor, à droite de la porte (la porte elle-même est un gros plan de l'enquête, a11).
  operatorTalk: { x: TECH_DOOR.x + 0.75, z: TECH_DOOR.z + 0.3 },
  /** Radio de la guérite (storyProps : guard_radio). */
  radio: { x: 5.2, z: 26.08 },
  /** Loquet de la porte de service, côté entrée. */
  latch: { x: -10.78, z: 28.35 },
  /** Étagère de Cuisine, contre le caisson de la chambre froide. */
  shelf: { x: -28.72, z: 15.05 },
} as const;

/** Chemin de Cuisine, de sa porte au hub (et retour) : la colère est plus forte que la peur. */
const PATH_TO_HUB: [number, number][] = [[-29.35, 17.6], [-28.4, 17.3], [-12.6, 13.2], [-9, 13], [-9, 0.3], [-6.4, 0.3], [-4.2, 0.3], [SPOTS.cookHub.x, SPOTS.cookHub.z]];
const WALK_SPEED = 1.9;

type CookPhase = "home" | "toHub" | "hub" | "toCafe" | "m4" | "farewell";

export class PeopleDirector {
  readonly cook: SurvivorRig;
  readonly operator: SurvivorRig;
  readonly coldDoor: ColdDoorView;
  readonly root = new Group();
  readonly defs: InteractableDef[] = [];
  /** Petits objets à cacher quand ils ne servent plus (loquet refermé, étagère fouillée). */
  private readonly props = new Map<InteractableDef, Object3D>();
  private cookPhase: CookPhase = "home";
  private cookPos: { x: number; z: number; yaw: number } = { x: SPOTS.cookChain.x, z: SPOTS.cookChain.z, yaw: SPOTS.cookChain.yaw };
  private path: [number, number][] = [];
  private speed = 0;
  private talking: string | null = null;
  private m4 = { t: 0, lure: 0, away: 0, warned: false };
  private noticeQueue: string[] = [];
  private noticeClock = 0;
  private pending: { at: number; run: () => void }[] = [];
  private clock = 0;
  /** Horloge à la réparation de la radio (−1 : pas encore vue). */
  private repairedAt = -1;
  private lou = { x: 0, z: 0 };
  private room: string | null = null;
  private readonly talkCook: InteractableDef;
  private readonly talkOperator: InteractableDef;

  constructor(private host: PeopleHost) {
    this.root.name = "Personnes";
    this.cook = buildCook();
    this.operator = buildNightOperator();
    this.coldDoor = buildColdDoor();
    this.root.add(this.cook.root, this.operator.root, this.coldDoor.root);
    host.scene.add(this.root);
    this.talkCook = { id: "people_cuisine", name: "Cuisine", action: "Parler", x: SPOTS.cookTalk.x, z: SPOTS.cookTalk.z, radius: 0.5, solid: false, talk: "cuisine" };
    this.talkOperator = { id: "people_operatrice", name: "Local technique", action: "Interphone", x: SPOTS.operatorTalk.x, z: SPOTS.operatorTalk.z, radius: 0.35, solid: false, talk: "operatrice" };
    this.defs.push(
      this.talkCook,
      this.talkOperator,
      { id: "people_radio", name: "Radio de la guérite", action: "Écouter", x: SPOTS.radio.x, z: SPOTS.radio.z, radius: 0.5, solid: false, talk: "radio_guerite" },
      { id: "people_latch", name: "Porte de service", action: "Refermer", x: SPOTS.latch.x, z: SPOTS.latch.z, radius: 0.35, solid: false, talk: "loquet" },
      { id: "people_shelf", name: "Étagère de Cuisine", action: "Fouiller", x: SPOTS.shelf.x, z: SPOTS.shelf.z, radius: 0.4, solid: false, talk: "etagere" },
    );
    host.events.on((event) => this.onEvent(event));
    this.reset();
  }

  /** Range nos objets parmi les objets interactifs du monde (infobulle, contour, touche E). */
  attach(interactables: Map<string, InteractableView>): void {
    const models: Record<string, () => { group: Group; height: number }> = {
      people_cuisine: () => ({ group: this.cook.root, height: 2.1 }),
      people_operatrice: () => ({ group: new Group(), height: 1.7 }),
      people_radio: () => ({ group: new Group(), height: 1.6 }),
      people_latch: () => {
        const built = buildLatch();
        built.group.position.set(SPOTS.latch.x, 0, SPOTS.latch.z);
        built.group.rotation.y = Math.PI / 2;
        this.root.add(built.group);
        return built;
      },
      people_shelf: () => {
        const built = buildCookShelf();
        built.group.position.set(SPOTS.shelf.x, 0, SPOTS.shelf.z);
        this.root.add(built.group);
        return built;
      },
    };
    for (const def of this.defs) {
      const built = models[def.id]();
      if (def.id === "people_latch" || def.id === "people_shelf") this.props.set(def, built.group);
      interactables.set(def.id, { def, group: built.group as Group, highlight: addHighlight(built.group), tooltipHeight: built.height });
    }
  }

  /** Nouvelle partie ou chargement. */
  reset(): void {
    this.cookPhase = "home";
    this.path = [];
    this.speed = 0;
    this.talking = null;
    this.pending = [];
    this.noticeQueue = [];
    this.m4 = { t: 0, lure: 0, away: 0, warned: false };
    this.repairedAt = -1;
    this.placeCookHome();
    peopleNotices.length = 0;
  }

  /**
   * Où se tient l'interlocuteur d'une conversation (pour que la caméra le cadre) : Cuisine là où il est, sinon l'objet
   * auquel on parle (interphone, radio, loquet…). null : une voix sans lieu (haut-parleur).
   */
  speakerSpot(conversation: string): { x: number; z: number; y: number } | null {
    if (conversation.startsWith("cuisine")) {
      if (!this.cook.root.visible && this.cookPhase === "home") return { x: SPOTS.cookTalk.x - 0.6, z: SPOTS.cookTalk.z, y: 1.2 };
      const p = this.cook.root.position;
      return { x: p.x, z: p.z, y: 1.3 };
    }
    if (conversation.startsWith("operatrice") && conversation !== "operatrice_m2") return { x: SPOTS.operatorTalk.x, z: SPOTS.operatorTalk.z, y: 1.2 };
    const def = this.defs.find((d) => d.talk === conversation);
    return def ? { x: def.x, z: def.z, y: 1 } : null;
  }

  /**
   * Scène à montrer pendant le jeu (la caméra s'y penche) : en M4, Cuisine et son commis, pour que le joueur voie
   * la menace. null hors scène.
   */
  sceneFocus(): { x: number; z: number } | null {
    if (this.cookPhase !== "m4") return null;
    const commis = this.zombie("crawler_cafe");
    if (!commis || !commis.alive) return { x: this.cookPos.x, z: this.cookPos.z };
    return { x: (this.cookPos.x + commis.x) / 2, z: (this.cookPos.z + commis.z) / 2 };
  }

  // ——— Disponibilité et touche E ———

  available(def: InteractableDef): boolean {
    const s = this.host.state;
    switch (def.talk) {
      case "cuisine": return s.has("generator_powered") && (this.cookPhase === "home" || this.cookPhase === "farewell");
      case "operatrice": return true;
      case "radio_guerite": return !s.knows("radio_guerite");
      case "loquet": return s.has("generator_powered") && !s.knows("porte_refermee");
      case "etagere": return played(s, "M1") && !s.knows("cu_fouille");
      default: return false;
    }
  }

  interact(def: InteractableDef): boolean {
    const s = this.host.state;
    switch (def.talk) {
      case "cuisine": return this.talkToCook();
      case "operatrice": return this.talkToOperator();
      case "radio_guerite":
        if (!this.open("radio_guerite")) return false;
        // Même carte que l'accroche automatique d1, une seule fois (grantCard ignore une carte déjà rangée).
        this.host.inquiry.grantCard("audio_gate");
        return true;
      case "loquet":
        s.setFlag("porte_refermee");
        this.host.notify("Tu refermes la porte de service. Le loquet claque.");
        if (s.knows("promesse_porte")) this.gesture("parole_tenue", "CUISINE, au loin");
        return true;
      case "etagere":
        s.setFlag("cu_fouille");
        s.cans = Math.min(99, s.cans + 1);
        s.markChanged();
        this.gesture("fouille", "CUISINE");
        return true;
      default:
        return false;
    }
  }

  private talkToCook(): boolean {
    const s = this.host.state;
    if (!played(s, "M1")) {
      markScene(s, "M1");
      return this.open("cuisine_m1");
    }
    if (this.cookPhase === "farewell") return this.open("cuisine_m7");
    if (momentReady("M5", s, { room: this.room })) return this.open("cuisine_m5");
    return this.open("cuisine");
  }

  private talkToOperator(): boolean {
    const s = this.host.state;
    if (!controlPowered(s)) {
      this.host.notify("Personne ne répond. Une lueur verte s'éteint sous la porte.");
      return false;
    }
    if (!played(s, "M2")) return this.open("operatrice_m2");
    if (momentReady("M6", s, { room: this.room })) return this.open("operatrice_aveu");
    return this.open("operatrice");
  }

  private open(id: string): boolean {
    if (!this.host.openConversation(id)) return false;
    this.talking = id;
    return true;
  }

  private zombie(id: string) {
    return (this.host.horde as Partial<ZombieHorde>).get?.(id);
  }

  // ——— Événements : le bruit près de la cafétéria ———

  private onEvent(event: GameEvent): void {
    if (event.type !== "shot") return;
    const s = this.host.state;
    if (!played(s, "M1")) return;
    const near = this.room === "cafeteria" || Math.hypot(this.lou.x - COLD_DOOR.x, this.lou.z - COLD_DOOR.z) < 10;
    if (near) this.gesture("vacarme", "CUISINE");
  }

  /** Geste hors conversation : marche, réplique de Cuisine en avis, « Cuisine a remarqué. ». */
  private gesture(id: string, who: string): void {
    const result = applyGesture(this.host.state, id);
    if (result?.line) this.say(`${who} : « ${result.line} »`);
  }

  private say(text: string, urgent = false): void {
    if (!urgent) {
      this.noticeQueue.push(text);
      return;
    }
    // Appel à l'aide : passe devant les autres avis et s'affiche tout de suite.
    this.noticeQueue.unshift(text);
    this.noticeClock = 0;
  }

  private later(seconds: number, run: () => void): void {
    this.pending.push({ at: this.clock + seconds, run });
  }

  // ——— Chaque image de jeu ———

  update(dt: number, x: number, z: number): void {
    const s = this.host.state;
    this.clock += dt;
    this.lou = { x, z };
    this.room = roomAt(x, z)?.id ?? null;
    syncOperator(s);
    for (const m of MOMENTS) if (s.knows(sceneFlag(m))) unlockForInquiry(s, `scene:${m}`);
    if (s.knows("lou_accuse")) unlockForInquiry(s, "fact:lou_accuse");

    if (this.talking) {
      const ended = this.talking;
      this.talking = null;
      this.after(ended);
    }
    // Avis : « Cuisine a remarqué. », répliques lointaines ; un à la fois.
    for (const n of peopleNotices.splice(0)) this.noticeQueue.push(n);
    this.noticeClock -= dt;
    if (this.noticeQueue.length && this.noticeClock <= 0) {
      this.host.notify(this.noticeQueue.shift()!);
      this.noticeClock = 3.2;
    }
    if (this.pending.length) {
      const due = this.pending.filter((p) => p.at <= this.clock);
      this.pending = this.pending.filter((p) => p.at > this.clock);
      for (const p of due) p.run();
    }
    this.moments(dt);
    this.animate(dt);
    for (const [def, group] of this.props) group.visible = def.id === "people_shelf" ? s.has("generator_powered") : this.available(def);
  }

  private quiet(): boolean {
    const threats = this.host.horde.threats?.() ?? [];
    return !threats.some((t) => t.alert && Math.hypot(t.x - this.lou.x, t.z - this.lou.z) < 12);
  }

  private moments(dt: number): void {
    const s = this.host.state;
    const where = { room: this.room };
    if (this.host.mode() !== "playing") return;
    // Fin de l'étage : la radio réparée capte Okafor, puis « VIENS ».
    if (s.has("comms_repaired") && this.repairedAt < 0) this.repairedAt = this.clock;
    // Après les avis de la radio (voix d'Okafor, bips : événements d10 et d11 de l'enquête), la traduction.
    if (s.has("comms_repaired") && !s.knows("radio_fin") && this.room === "control" && this.clock - this.repairedAt > 9) {
      this.open("radio_fin");
      return;
    }
    if (momentReady("M2", s, where) && this.quiet()) {
      this.open("operatrice_m2");
      return;
    }
    if (this.cookPhase === "home" && momentReady("M3", s, where)) {
      if (s.knows("cuisine_menti_generatrice")) applyGesture(s, "mensonge_demasque");
      this.cookPhase = "toHub";
      this.cookPos = { x: -6.6, z: 0.3, yaw: Math.PI / 2 };
      this.path = PATH_TO_HUB.slice(-2);
      this.host.notify("Des pas lourds dans le couloir ouest. Cuisine est sorti de sa chambre froide.");
    }
    if (this.cookPhase === "hub" && this.room === "hub" && this.quiet()) {
      markScene(s, "M3");
      this.open("cuisine_m3");
      return;
    }
    if (this.cookPhase === "home" && played(s, "M3") && !played(s, "M4") && this.room === "cafeteria") this.startM4();
    if (this.cookPhase === "m4") this.runM4(dt);
    if (momentReady("M7", s, where)) this.departure();
    else if (this.cookPhase === "home" && s.has("keycard") && !played(s, "M7") && played(s, "M1") && cookLevel(s) >= 2) {
      // Il attend Lou devant le couloir nord, une boîte de pêches à la main.
      this.cookPhase = "farewell";
      this.cookPos = { ...SPOTS.cookFarewell };
    }
  }

  /** Après une conversation : pensées, cartes de l'enquête, scènes et déplacements. */
  private after(id: string): void {
    const s = this.host.state;
    const inquiry = this.host.inquiry;
    switch (id) {
      case "cuisine_m1":
        break;
      case "operatrice_m2":
        markScene(s, "M2");
        break;
      case "cuisine_m3":
        s.setFlag("lou_accuse");
        s.setFlag("cuisine_dehors", false);
        unlockForInquiry(s, "fact:lou_accuse");
        if (s.knows("m5")) this.afterProof();
        this.cookPhase = "toCafe";
        this.path = [...PATH_TO_HUB].reverse().slice(1);
        break;
      case "cuisine_m5":
        if (s.knows("m5")) this.afterProof();
        break;
      case "operatrice_aveu":
        if (s.knows("m6")) markScene(s, "M6");
        break;
      case "cuisine_m7":
        markScene(s, "M7");
        this.cookPhase = "home";
        this.placeCookHome();
        break;
      case "radio_fin":
        break;
    }
  }

  /** M5 : trois secondes de silence à l'interphone, puis « Je suis contente pour vous. » La lueur verte s'éteint. */
  private afterProof(): void {
    markScene(this.host.state, "M5");
    this.later(3, () => this.say("[Trois secondes de silence à l'interphone.] L'OPÉRATRICE : « Je suis contente pour vous. »"));
  }

  // ——— M4 : le commis ———

  private startM4(): void {
    const s = this.host.state;
    const commis = this.zombie("crawler_cafe");
    if (!commis || !commis.alive) {
      // Le commis est déjà tombé : la scène n'a plus lieu d'être (aucun geste).
      s.setFlag("m4_sans_objet");
      markScene(s, "M4");
      return;
    }
    this.cookPhase = "m4";
    this.cookPos = { ...SPOTS.cookM4 };
    this.m4 = { t: 0, lure: 0, away: 0, warned: false };
    // Le commis se fige un instant : le joueur a le temps de comprendre la scène.
    this.host.horde.hold?.("crawler_cafe", M4_TIMING.hold);
    this.say("CUISINE : « C'est… mon commis. Il s'en vient su' moi ! Aveugle-le avec ta lampe, vite ! »", true);
    this.host.inquiry.think("t_lampe_commis", true);
    this.host.prompt?.("dazzle", 8);
  }

  private runM4(dt: number): void {
    const s = this.host.state;
    const commis = this.zombie("crawler_cafe");
    this.m4.t += dt;
    this.m4.lure -= dt;
    const end = (saved: boolean) => {
      markScene(s, "M4");
      this.cookPhase = "home";
      this.placeCookHome();
      if (saved) {
        applyGesture(s, "sauvetage");
        this.open("cuisine_m4");
      } else {
        this.gesture("fuite", "CUISINE");
      }
    };
    if (!commis || !commis.alive) return end(true);
    const distance = Math.hypot(commis.x - SPOTS.cookM4.x, commis.z - SPOTS.cookM4.z);
    if (commis.stunned > 0 && distance < 8) return end(true);
    // Lou sort de la cafétéria : un avertissement d'abord ; la fuite ne compte qu'après quelques secondes dehors.
    if (this.room !== "cafeteria") {
      this.m4.away += dt;
      if (!this.m4.warned) {
        this.m4.warned = true;
        this.say("CUISINE : « Tu t'en vas ?! Reviens, l'étranger ! »", true);
      }
      if (this.m4.away > M4_TIMING.away) return end(false);
    } else this.m4.away = 0;
    if (distance < M4_TIMING.reach && this.m4.t > M4_TIMING.grace) return end(false);
    if (this.m4.t > M4_TIMING.limit) return end(true);
    // Fidèle à son habitude, il revient vers son ancien patron (lentement : il traîne son plateau).
    if (this.m4.lure <= 0) {
      this.host.horde.lure?.("crawler_cafe", SPOTS.cookM4.x, SPOTS.cookM4.z, 6, M4_TIMING.pace);
      this.m4.lure = 1;
    }
  }

  // ——— M7 : le départ ———

  private departure(): void {
    const s = this.host.state;
    if (s.knows("promesse_porte") && !s.knows("porte_refermee")) this.gesture("promesse_trahie", "CUISINE, au loin");
    const bye = farewell(s);
    if (bye?.kind === "peaches" && this.cookPhase === "farewell") {
      markScene(s, "M7");
      this.open("cuisine_m7");
      return;
    }
    markScene(s, "M7");
    if (bye?.kind === "interphone") this.say(`À l'interphone, la voix de Cuisine : « ${bye.line} »`);
    else if (bye) this.say(`CUISINE, au loin : « ${bye.line} »`);
  }

  // ——— Rendu des survivants ———

  private placeCookHome(): void {
    const level = cookLevel(this.host.state);
    const spot = level >= 2 ? SPOTS.cookOut : level === 1 ? SPOTS.cookSit : SPOTS.cookChain;
    this.cookPos = { x: spot.x, z: spot.z, yaw: spot.yaw };
  }

  private animate(dt: number): void {
    const s = this.host.state;
    const level = cookLevel(s);
    // Déplacement le long du chemin.
    this.speed = 0;
    if (this.path.length && (this.cookPhase === "toHub" || this.cookPhase === "toCafe")) {
      const [tx, tz] = this.path[0];
      const dx = tx - this.cookPos.x;
      const dz = tz - this.cookPos.z;
      const d = Math.hypot(dx, dz);
      const step = WALK_SPEED * dt;
      if (d <= step) {
        this.cookPos.x = tx;
        this.cookPos.z = tz;
        this.path.shift();
      } else {
        this.cookPos.x += (dx / d) * step;
        this.cookPos.z += (dz / d) * step;
        this.cookPos.yaw = Math.atan2(dx, dz);
        this.speed = WALK_SPEED;
      }
      if (!this.path.length) {
        if (this.cookPhase === "toHub") {
          this.cookPhase = "hub";
          this.cookPos.yaw = SPOTS.cookHub.yaw;
        } else {
          this.cookPhase = "home";
          this.placeCookHome();
        }
      }
    } else if (this.cookPhase === "home") this.placeCookHome();

    // Pose : la confiance se lit sur le corps.
    let pose: SurvivorPose = level >= 2 ? "back" : level === 1 ? "hips" : level === 0 ? "chain" : "guard";
    if (this.cookPhase === "hub") pose = "accuse";
    if (this.cookPhase === "m4") pose = "afraid";
    if (this.cookPhase === "farewell") pose = "offer";
    const outside = this.cookPhase !== "home";
    // Hostile : derrière sa porte fermée, on ne le voit pas.
    this.cook.root.visible = outside || level >= 0;
    this.cook.root.position.set(this.cookPos.x, 0, this.cookPos.z);
    const lookAt = Math.atan2(this.lou.x - this.cookPos.x, this.lou.z - this.cookPos.z);
    const facing = pose === "back" || pose === "hips" || pose === "chain" ? this.cookPos.yaw : this.speed > 0 ? this.cookPos.yaw : this.cookPhase === "hub" ? lookAt : this.cookPos.yaw;
    this.cook.root.rotation.y = facing;
    if (this.cook.wrap) this.cook.wrap.visible = s.knows("cu_bandage");
    animateSurvivor(this.cook, { pose, speed: this.speed, look: angle(lookAt - facing), lamp: false, armed: level <= 0 || (outside && level < 2) }, dt);
    this.coldDoor.setDoor(outside ? 2 : level);
    this.coldDoor.setTally(level);
    this.coldDoor.update(dt);
    this.talkCook.x = outside ? this.cookPos.x : SPOTS.cookTalk.x;
    this.talkCook.z = outside ? this.cookPos.z : SPOTS.cookTalk.z;
    if (level >= 2 && !outside) {
      this.talkCook.x = SPOTS.cookOut.x + 0.4;
      this.talkCook.z = SPOTS.cookOut.z;
    }

    // L'opératrice : visible dans son local quand le circuit CONTRÔLE est rallumé et que Lou est dans la salle.
    const mood = operatorMood(s);
    const op = SPOTS.operator;
    this.operator.root.position.set(op.x, 0, op.z);
    this.operator.root.rotation.y = op.yaw;
    const opLook = Math.atan2(this.lou.x - op.x, this.lou.z - op.z);
    const opPose: SurvivorPose = mood === "true" ? "open" : mood === "ashamed" ? "ashamed" : mood === "defensive" ? "defensive" : "mask";
    animateSurvivor(this.operator, { pose: opPose, speed: 0, look: angle(opLook - op.yaw), lamp: mood === "mask", armed: false }, dt);
    const seen = controlPowered(s) && (this.room === "control" || mood === "true");
    const ceiling: Object3D | undefined = getStoryObject("local_ceiling");
    if (ceiling) ceiling.visible = !seen;
    const glow = getStoryObject("operator_glow");
    if (glow) glow.visible = mood === "mask";
  }

}

function angle(a: number): number {
  let d = a % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}
