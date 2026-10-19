// Les personnes de l'étage 1 : conversations valides, confiance sans jauge (marches, plafonds, nom donné à Lou),
// moments clés M1 à M7 déclenchés par conditions, fin d'étage selon les découvertes, sauvegarde.
import { describe, expect, it } from "vitest";
import { PerspectiveCamera, Scene } from "three";
import { CONVERSATIONS, ConversationRun, checkConversation, conditionMet, fillText, speakerStatus, type Conversation } from "@/game/conversation";
import {
  COOK, OPERATOR, applyGesture, cookLevel, cookName, exonerated, farewell, floorEnding, gestureDone, markScene,
  momentReady, operatorMood, operatorName, peopleNotices, peopleRecord, played, radioMessage, syncOperator,
  CANON_ENDING,
} from "@/game/content/people";
import { PEOPLE_CONVERSATIONS } from "@/game/content/people_talk";
import { PeopleDirector } from "@/game/content/people_director";
import { InquiryDirector } from "@/game/investigation/director";
import { recordOf } from "@/game/investigation/record";
import { CONTENT } from "@/game/investigation/world";
import { ENEMY } from "@/game/investigation/content/links";
import { createHorde } from "@/game/enemy";
import { GameEvents } from "@/game/events";
import { ENEMIES } from "@/game/level";
import { SiloState } from "@/game/state";
import type { UiMode } from "@/game/ui";

/** Partie avec des déductions de l'enquête déjà faites (record.deductions). */
function withDeductions(...ids: string[]): SiloState {
  const s = new SiloState();
  recordOf(s).deductions.push(...ids);
  return s;
}

function lines(c: Conversation, speaker = true): string[] {
  return Object.values(c.nodes).flatMap((n) => n.lines.filter((l) => !speaker || l.who === "speaker").map((l) => l.text));
}

describe("conversations des personnes", () => {
  it("sont toutes bien formées, enregistrées, et chaque nœud est atteignable", () => {
    expect(PEOPLE_CONVERSATIONS.map((c) => c.id).sort()).toEqual([
      "cuisine", "cuisine_m1", "cuisine_m3", "cuisine_m4", "cuisine_m5", "cuisine_m7", "operatrice", "operatrice_aveu",
      "operatrice_m2", "radio_fin", "radio_guerite",
    ]);
    for (const c of PEOPLE_CONVERSATIONS) {
      expect(checkConversation(c), c.id).toBe("");
      expect(CONVERSATIONS[c.id]).toBe(c);
      const reached = new Set([c.start]);
      for (const node of Object.values(c.nodes)) for (const choice of node.choices ?? []) if (choice.next) reached.add(choice.next);
      expect([...reached].sort(), c.id).toEqual(Object.keys(c.nodes).sort());
    }
  });

  it("Cuisine parle un québécois léger : 2 marqueurs au plus par réplique ; l'opératrice vouvoie", () => {
    const markers = [/\bicitte\b/gi, /\bpis\b/gi, /-tu\b/gi, /\bben\b/gi, /\bpantoute\b/gi, /de même/gi, /\basteure\b/gi, /\bouin\b/gi, /\bc'te\b/gi, /en maudit/gi, /\benvoye\b/gi, /\bj'me\b/gi];
    const cook = PEOPLE_CONVERSATIONS.filter((c) => c.speaker.id === COOK).flatMap((c) => lines(c));
    expect(cook.length).toBeGreaterThan(30);
    for (const line of cook) {
      const count = markers.reduce((n, re) => n + (line.match(re)?.length ?? 0), 0);
      expect(count, line).toBeLessThanOrEqual(2);
    }
    const operator = PEOPLE_CONVERSATIONS.filter((c) => c.speaker.id === OPERATOR).flatMap((c) => lines(c));
    for (const line of operator) expect(line, line).not.toMatch(/\b(tu|t'|toi|ton|ta)\b/i);
    // Elle ne dit « Lou » qu'à l'aveu (et après).
    const beforeConfession = [...lines(CONVERSATIONS.operatrice_m2), ...lines(CONVERSATIONS.radio_guerite)];
    for (const line of beforeConfession) expect(line).not.toMatch(/\bLou\b/);
    expect(lines(CONVERSATIONS.operatrice_aveu).join(" ")).toContain("Pardon, Lou.");
  });

  it("le nom donné à Lou suit la confiance : « l'étranger » → « le bricoleur » → « Lou »", () => {
    const s = new SiloState();
    expect(cookName(s)).toBe("l'étranger");
    expect(fillText("Encore toi, {nom}.", COOK, s)).toBe("Encore toi, l'étranger.");
    applyGesture(s, "don_bandage");
    expect(cookLevel(s)).toBe(1);
    expect(cookName(s)).toBe("le bricoleur");
    expect(speakerStatus(COOK, s)).toMatchObject({ calls: "le bricoleur", title: "PORTE OUVERTE", mood: "careful" });
    // Pas de « Lou » sans preuve : un autre geste reste à « prudent ».
    applyGesture(s, "verite_promesse");
    expect(cookName(s)).toBe("le bricoleur");
    recordOf(s).deductions.push("C5");
    applyGesture(s, "preuve");
    expect(cookName(s)).toBe("Lou");
    expect(fillText("{Nom}. Entre, entre.", COOK, s)).toBe("Lou. Entre, entre.");
    expect(speakerStatus(COOK, s).gesture).toContain("tourne le dos");
    // Au départ (M7), l'état suit la scène : il tend des pêches, il ne fouille pas son étagère.
    expect(speakerStatus(COOK, s, "cuisine_m7").gesture).toContain("pêches");
    expect(speakerStatus(COOK, s, "cuisine_m7").gesture).not.toContain("tourne le dos");
  });
});

describe("confiance sans jauge", () => {
  it("monte d'une marche par clé, descend d'une marche par faux pas, chacun une seule fois", () => {
    const s = new SiloState();
    expect(cookLevel(s)).toBe(0);
    expect(applyGesture(s, "don_pile")?.moved).toBe(1);
    expect(applyGesture(s, "don_pile")).toBeNull();
    expect(gestureDone(s, "don_pile")).toBe(true);
    expect(applyGesture(s, "fouille")?.moved).toBe(-1);
    expect(applyGesture(s, "annonce_m2")?.moved).toBe(-1);
    expect(cookLevel(s)).toBe(-1);
    // Plancher : hostile.
    expect(applyGesture(s, "vacarme")?.moved).toBe(0);
    expect(s.relations[COOK]).toBe(-1);
    expect(applyGesture(s, "sauvetage")?.moved).toBe(1);
    expect(cookLevel(s)).toBe(0);
  });

  it("les cadeaux s'arrêtent à « prudent » ; « confiant » demande la preuve (C5)", () => {
    const s = new SiloState();
    applyGesture(s, "don_bandage");
    expect(applyGesture(s, "don_conserve")?.moved).toBe(0);
    expect(applyGesture(s, "indice_seuil")?.moved).toBe(0);
    expect(cookLevel(s)).toBe(1);
    recordOf(s).deductions.push("C5");
    expect(exonerated(s)).toBe(true);
    expect(applyGesture(s, "respect_secret")?.moved).toBe(1);
    expect(cookLevel(s)).toBe(2);
    // La preuve fait franchir d'un coup, même depuis « hostile ».
    const h = withDeductions("C5");
    applyGesture(h, "nier");
    expect(cookLevel(h)).toBe(-1);
    expect(applyGesture(h, "preuve")?.moved).toBe(3);
    expect(cookName(h)).toBe("Lou");
  });

  it("« Cuisine a remarqué. » : seulement pour les gros gestes, 4 fois au plus", () => {
    peopleNotices.length = 0;
    const s = withDeductions("C5");
    applyGesture(s, "don_bandage");
    expect(peopleNotices).toEqual([]);
    for (const id of ["sauvetage", "parole_tenue", "preuve"]) applyGesture(s, id);
    for (const id of ["vacarme", "fuite", "nier"]) applyGesture(s, id);
    expect(peopleNotices.filter((n) => n === "Cuisine a remarqué.")).toHaveLength(4);
    expect(peopleRecord(s).noticed).toBe(4);
    peopleNotices.length = 0;
  });

  it("les choix de dialogue permettent de mentir à un personnage, et le mensonge a une suite", () => {
    const s = new SiloState();
    s.facts.push("generator_powered");
    const m1 = new ConversationRun(CONVERSATIONS.cuisine_m1, s);
    m1.choose(0);
    expect(m1.view().lines.map((l) => l.text)).toContain("C'est-tu toi qui as rallumé la génératrice ?");
    expect(m1.view().choices.map((c) => c.text)).toEqual(["Oui. Ça fait du bruit, je sais.", "Non."]);
    m1.choose(1);
    expect(s.knows("cuisine_menti_generatrice")).toBe(true);
    // À l'accusation publique, la boue le contredit.
    s.setFlag("m1");
    const m3 = new ConversationRun(CONVERSATIONS.cuisine_m3, s);
    expect(m3.view().lines.map((l) => l.text)).toContain("Pas rentré par là, hein ? Ta boue dit le contraire.");
    // « Chercher un abri, c'est tout » : un demi-mensonge à Cuisine, retenu pour l'étage 3.
    const talk = new ConversationRun(CONVERSATIONS.cuisine, new SiloState());
    const st = talk.state;
    talk.choose(talk.conversation.nodes.accueil.choices!.findIndex((c) => c.text === "Écoute-moi." && conditionMet(c.when, st)));
    talk.choose(talk.conversation.nodes.menu.choices!.findIndex((c) => c.next === "sacoche"));
    talk.choose(0);
    expect(st.knows("lou_abri")).toBe(true);
    expect(talk.view().lines[0].text).toBe("Mouais.");
  });

  it("partager une ressource rare en conversation donne l'objet et fait monter d'une marche", () => {
    const s = new SiloState();
    expect(s.bandages).toBe(2);
    const run = new ConversationRun(CONVERSATIONS.cuisine, s);
    run.choose(run.conversation.nodes.accueil.choices!.findIndex((c) => c.text === "Écoute-moi." && conditionMet(c.when, s)));
    const give = run.conversation.nodes.menu.choices!.findIndex((c) => c.text.startsWith("[Passer un bandage") && conditionMet(c.when, s));
    expect(give).toBeGreaterThanOrEqual(0);
    run.choose(give);
    expect(s.bandages).toBe(1);
    expect(cookLevel(s)).toBe(1);
    expect(run.view().lines.map((l) => l.text)).toContain("…Merci. Ça chauffe en maudit.");
  });
});

describe("l'opératrice : un masque, puis la vérité", () => {
  it("« mon garçon » en face, puis sur la défensive, puis honteuse, puis « Lou » à l'aveu", () => {
    const s = new SiloState();
    expect([operatorMood(s), operatorName(s)]).toEqual(["mask", "mon garçon"]);
    recordOf(s).deductions.push("X9");
    expect(operatorMood(s)).toBe("defensive");
    recordOf(s).deductions.push("C4");
    expect([operatorMood(s), operatorName(s)]).toEqual(["ashamed", "…"]);
    syncOperator(s);
    expect(s.relations[OPERATOR]).toBe(2);
    const run = new ConversationRun(CONVERSATIONS.operatrice_aveu, s);
    run.choose(0);
    expect(run.view().lines.map((l) => l.text).join(" ")).toContain("Pardon, Lou.");
    expect([operatorMood(s), operatorName(s)]).toEqual(["true", "Lou"]);
    run.choose(0);
    expect(s.knows("m6_elle")).toBe(true);
    syncOperator(s);
    expect(s.relations[OPERATOR]).toBe(3);
  });
});

describe("moments clés", () => {
  const at = (room: string | null) => ({ room });

  it("se déclenchent par conditions (faits, déductions de l'enquête, lieu)", () => {
    const s = new SiloState();
    expect(momentReady("M1", s, at("cafeteria"))).toBe(false);
    s.facts.push("entrance_explored", "generator_powered");
    expect(momentReady("M1", s, at("cafeteria"))).toBe(true);
    // M2 : circuit CONTRÔLE rallumé (énigme 2 : « puzzle_shed »), après M1, hors de la cafétéria.
    expect(momentReady("M2", s, at("west"))).toBe(false);
    markScene(s, "M1");
    expect(momentReady("M2", s, at("west"))).toBe(false);
    s.setFlag("puzzle_shed");
    expect(momentReady("M2", s, at("cafeteria"))).toBe(false);
    expect(momentReady("M2", s, at("west"))).toBe(true);
    expect(momentReady("M3", s, at("hub"))).toBe(false);
    markScene(s, "M2");
    expect(momentReady("M3", s, at("west"))).toBe(false);
    expect(momentReady("M3", s, at("hub"))).toBe(true);
    markScene(s, "M3");
    expect(momentReady("M4", s, at("cafeteria"))).toBe(true);
    expect(momentReady("M5", s, at(null))).toBe(false);
    recordOf(s).deductions.push("C5");
    expect(momentReady("M5", s, at(null))).toBe(true);
    expect(momentReady("M6", s, at(null))).toBe(false);
    recordOf(s).unlocked.push("fact:C4");
    expect(momentReady("M6", s, at(null))).toBe(true);
    expect(momentReady("M7", s, at("north"))).toBe(false);
    s.facts.push("hub_reached", "secret_clue", "secret_revealed", "keycard");
    expect(momentReady("M7", s, at("north"))).toBe(true);
    // Chaque scène ne se joue qu'une fois, et l'enquête la voit (« scene:Mx »).
    markScene(s, "M7");
    expect(momentReady("M7", s, at("north"))).toBe(false);
    expect(recordOf(s).unlocked).toEqual(expect.arrayContaining(["scene:M1", "scene:M2", "scene:M3", "scene:M7"]));
  });

  it("l'énigme 2 (« circuit_controle ») suffit aussi pour M2", () => {
    const s = new SiloState();
    s.setFlag("circuit_controle");
    markScene(s, "M1");
    expect(momentReady("M2", s, at("control"))).toBe(true);
  });

  it("le départ dépend de la confiance de Cuisine", () => {
    const s = new SiloState();
    expect(farewell(s)).toBeNull();
    markScene(s, "M1");
    expect(farewell(s)).toEqual({ kind: "silence", line: "Bon débarras, l'étranger." });
    applyGesture(s, "don_pile");
    expect(farewell(s)?.line).toBe("Bonne chance, le bricoleur.");
    recordOf(s).deductions.push("C5");
    applyGesture(s, "preuve");
    expect(farewell(s)?.line).toBe("Reviens pas mordu, Lou. J'ai pas assez de pêches pour deux.");
  });
});

/** Directeur des personnes branché sur une horde sans visuels et un directeur d'enquête (sans navigateur). */
function director() {
  const state = new SiloState();
  const scene = new Scene();
  const horde = createHorde(state, { visuals: false });
  const events = new GameEvents();
  const opened: string[] = [];
  const notices: string[] = [];
  let mode: UiMode = "playing";
  const inquiry = new InquiryDirector({ scene, state, notify: (t) => notices.push(t), emit: () => {}, setMode: () => {} });
  const people = new PeopleDirector({
    scene, state, horde, inquiry, events, notify: (t) => notices.push(t), mode: () => mode,
    openConversation: (id) => { opened.push(id); mode = "dialogue"; return true; },
  });
  const close = () => { mode = "playing"; };
  const tick = (x: number, z: number, seconds = 0.1) => { for (let t = 0; t < seconds; t += 0.05) people.update(0.05, x, z); };
  return { state, horde, people, inquiry, opened, notices, close, tick, events };
}

describe("pensées en retard", () => {
  it("une pensée qui attend trop longtemps son tour est abandonnée ; une pensée urgente passe devant", () => {
    const d = director();
    const camera = new PerspectiveCamera();
    const frame = (seconds: number) => {
      for (let t = 0; t < seconds; t += 0.1) d.inquiry.render(0.1, camera, null as never, { x: 0, z: 0, yaw: 0 }, 800, 600, "playing");
    };
    const plain = CONTENT.thoughts.filter((t) => t.text && !t.then && !t.card).slice(0, 5).map((t) => t.id);
    for (const id of plain) d.inquiry.think(id);
    frame(0.1);
    expect(d.inquiry.store.get().thought?.id).toBe(plain[0]);
    // Les suivantes sont écourtées (2,4 s chacune au plus) ; au bout de 6 s d'attente, elles sont abandonnées.
    const seen = new Set<string>();
    for (let i = 0; i < 120; i++) {
      frame(0.1);
      const id = d.inquiry.store.get().thought?.id;
      if (id) seen.add(id);
    }
    // 1re, 2e, 3e : à temps ; la 4e attend 7,2 s, abandonnée ; la dernière demandée est gardée.
    expect(seen.has(plain[2])).toBe(true);
    expect(seen.has(plain[3])).toBe(false);
    expect(seen.has(plain[4])).toBe(true);
    d.inquiry.think("t_lampe_commis", true);
    frame(0.4);
    expect(d.inquiry.store.get().thought?.id).toBe("t_lampe_commis");
  });
});

describe("directeur des personnes", () => {
  it("M1 en frappant, M2 au haut-parleur en sortant, M3 au hub (Cuisine sort et accuse), M4 avec le commis", () => {
    const d = director();
    const s = d.state;
    s.facts.push("entrance_explored", "generator_powered", "hub_reached");
    // L'énigme 2 (leviers) rallume le circuit CONTRÔLE : l'interphone de l'opératrice remarche.
    s.setFlag("circuit_controle");
    const cook = d.people.defs.find((def) => def.talk === "cuisine")!;
    expect(d.people.available(cook)).toBe(true);
    d.people.interact(cook);
    expect(d.opened).toEqual(["cuisine_m1"]);
    expect(played(s, "M1")).toBe(true);
    d.close();
    d.tick(-20, 12);
    // Dans la cafétéria : pas encore d'annonce. Dans le couloir ouest : la voix au haut-parleur.
    expect(d.opened).toEqual(["cuisine_m1"]);
    d.tick(-9, 5);
    expect(d.opened).toEqual(["cuisine_m1", "operatrice_m2"]);
    new ConversationRun(CONVERSATIONS.operatrice_m2, s);
    d.close();
    d.tick(-9, 5);
    expect(played(s, "M2")).toBe(true);
    expect(cookLevel(s)).toBe(-1);
    // Au hub : Cuisine sort de sa chambre froide, marche jusqu'à l'avis, puis accuse.
    d.tick(0, 0, 4);
    expect(d.opened).toEqual(["cuisine_m1", "operatrice_m2", "cuisine_m3"]);
    d.close();
    d.tick(0, 0);
    expect(played(s, "M3")).toBe(true);
    expect(s.knows("lou_accuse")).toBe(true);
    expect(recordOf(s).unlocked).toContain("fact:lou_accuse");
    // Retour à la cafétéria : le commis se tourne vers son ancien patron ; Lou le fige à la lampe.
    d.tick(-20, 10, 30);
    const commis = d.horde.get("crawler_cafe")!;
    expect(d.notices).toContain("CUISINE : « C'est… mon commis. Il s'en vient su' moi ! Aveugle-le avec ta lampe, vite ! »");
    // Lou pense aussitôt à sa lampe.
    expect(recordOf(s).thoughts).toContain("t_lampe_commis");
    // (La horde n'avance pas dans ce test : on place le commis, revenu vers Cuisine.)
    [commis.x, commis.z] = [-24.5, 15];
    d.horde.damage("crawler_cafe", 0, 1.8);
    // (Une image : le moteur ne fait plus tourner le monde pendant la conversation.)
    d.people.update(0.05, -20, 10);
    expect(commis.alive).toBe(true);
    expect(played(s, "M4")).toBe(true);
    expect(gestureDone(s, "sauvetage")).toBe(true);
    expect(d.opened.at(-1)).toBe("cuisine_m4");
    expect(cookLevel(s)).toBe(0);
    // Pendant la conversation, il reste devant son commis ; ensuite, il rentre à sa porte.
    expect(d.people.speakerSpot("cuisine_m4")?.x).toBeCloseTo(-26.9, 1);
    d.close();
    d.tick(-20, 10, 0.2);
    expect(d.people.speakerSpot("cuisine")?.x).toBeCloseTo(-29.95, 1);
  });

  it("M4 : fuir la cafétéria laisse Cuisine face au commis (« Je le savais. »)", () => {
    const d = director();
    const s = d.state;
    s.facts.push("generator_powered");
    for (const m of ["M1", "M2", "M3"] as const) markScene(s, m);
    d.tick(-20, 10, 0.2);
    // Sortir un instant n'est pas fuir : Cuisine prévient d'abord ; revenir annule.
    d.tick(-9, 5, 2);
    expect(played(s, "M4")).toBe(false);
    expect(d.notices).toContain("CUISINE : « Tu t'en vas ?! Reviens, l'étranger ! »");
    d.tick(-20, 10, 0.2);
    d.tick(-9, 5, 3);
    expect(played(s, "M4")).toBe(false);
    d.tick(-9, 5, 2);
    expect(played(s, "M4")).toBe(true);
    expect(gestureDone(s, "fuite")).toBe(true);
    d.tick(-9, 5, 8);
    expect(d.notices).toContain("CUISINE : « Je le savais. »");
  });

  it("M4 : le commis déjà près de Cuisine laisse quand même à Lou le temps de sortir sa lampe", () => {
    const d = director();
    const s = d.state;
    s.facts.push("generator_powered");
    for (const m of ["M1", "M2", "M3"] as const) markScene(s, m);
    const commis = d.horde.get("crawler_cafe")!;
    [commis.x, commis.z] = [-27.3, 16.9];
    d.tick(-22, 14, 0.2);
    d.tick(-22, 14, 3);
    expect(played(s, "M4")).toBe(false);
    d.horde.damage("crawler_cafe", 0, 1.8);
    d.tick(-22, 14, 0.2);
    expect(played(s, "M4")).toBe(true);
    expect(gestureDone(s, "sauvetage")).toBe(true);
  });

  it("le bruit près de la cafétéria fâche Cuisine ; refermer la porte promise le radoucit", () => {
    const d = director();
    const s = d.state;
    s.facts.push("generator_powered");
    markScene(s, "M1");
    d.tick(-20, 12);
    d.events.emit({ type: "shot" });
    expect(cookLevel(s)).toBe(-1);
    s.setFlag("promesse_porte");
    const latch = d.people.defs.find((def) => def.talk === "loquet")!;
    d.people.interact(latch);
    expect(s.knows("porte_refermee")).toBe(true);
    expect(cookLevel(s)).toBe(0);
    expect(d.people.available(latch)).toBe(false);
  });

  it("la radio de la guérite : la voix de l'opératrice, une seule fois", () => {
    const d = director();
    const radio = d.people.defs.find((def) => def.talk === "radio_guerite")!;
    expect(d.people.available(radio)).toBe(true);
    d.people.interact(radio);
    expect(d.opened).toEqual(["radio_guerite"]);
    // La voix passe dans l'accroche automatique (d1) ; la conversation commence par la réponse de Lou.
    const run = new ConversationRun(CONVERSATIONS.radio_guerite, d.state);
    const said = run.view().lines.map((l) => l.text).join(" ");
    expect(said).not.toContain("relève");
    expect(said).not.toContain("il y a quelqu'un");
    expect(run.view().choices[0].text).toMatch(/^Allô \?/);
    run.choose(0);
    expect(d.people.available(radio)).toBe(false);
  });

  it("radio de la guérite : l'accroche automatique puis « Écouter » donnent la même carte, une seule fois", () => {
    const d = director();
    const record = () => recordOf(d.state);
    // Lou s'approche : avis court, puis la carte 1,5 s plus tard.
    for (let t = 0; t < 2; t += 0.05) d.inquiry.update(0.05, 4.7, 25.0, 0);
    expect(record().events).toContain("d1");
    expect(d.notices.filter((n) => n.includes("il y a quelqu'un ?"))).toHaveLength(1);
    expect(record().cards.filter((c) => c === "audio_gate")).toHaveLength(1);
    const radio = d.people.defs.find((def) => def.talk === "radio_guerite")!;
    d.people.interact(radio);
    expect(record().cards.filter((c) => c === "audio_gate")).toHaveLength(1);
  });

  it("radio de la guérite : « Écouter » avant que la carte de l'accroche tombe ne la donne pas deux fois", () => {
    const d = director();
    const record = () => recordOf(d.state);
    d.inquiry.update(0.05, 4.7, 25.0, 0);
    const radio = d.people.defs.find((def) => def.talk === "radio_guerite")!;
    d.people.interact(radio);
    expect(record().cards.filter((c) => c === "audio_gate")).toHaveLength(1);
    for (let t = 0; t < 5; t += 0.05) d.inquiry.update(0.05, 4.7, 25.0, 0);
    expect(record().cards.filter((c) => c === "audio_gate")).toHaveLength(1);
  });
});

describe("les 5 mordus identifiés", () => {
  it("les porteurs d'indices de l'enquête sont exactement les 5 mordus de l'étage", () => {
    const carriers = [...new Set(CONTENT.examinables.map((e) => e.carrier).filter(Boolean))].sort();
    expect(carriers).toEqual(ENEMIES.map((e) => e.id).sort());
    expect(Object.values(ENEMY).sort()).toEqual(ENEMIES.map((e) => e.id).sort());
  });
});

describe("tenues des mordus et des survivants", () => {
  it("chaque mordu a sa tenue reconnaissable ; les survivants se construisent hors navigateur", async () => {
    const { ZOMBIE_LOOKS } = await import("@/game/render/zombie");
    const { buildCook, buildNightOperator, animateSurvivor } = await import("@/game/render/survivor");
    expect(Object.keys(ZOMBIE_LOOKS).sort()).toEqual(ENEMIES.map((e) => e.id).sort());
    const horde = createHorde(new SiloState());
    expect(horde.zombies.map((z) => z.rig!.root.name)).toEqual([
      "ZombieWalker:guetteur", "ZombieWalker:marceau", "ZombieCrawler:commis", "ZombieWalker:infirmier", "ZombieWalker:berard",
    ]);
    const cook = buildCook();
    const op = buildNightOperator();
    for (const pose of ["guard", "chain", "hips", "back", "accuse", "afraid", "offer"] as const) animateSurvivor(cook, { pose, speed: 0, look: 0.3, lamp: false, armed: true }, 0.05);
    animateSurvivor(op, { pose: "mask", speed: 0, look: 0, lamp: true, armed: false }, 0.05);
    expect(op.lampGlow!.visible).toBe(true);
    animateSurvivor(op, { pose: "defensive", speed: 0, look: 0, lamp: false, armed: false }, 0.05);
    expect(op.lampGlow!.visible).toBe(false);
  });
});

describe("fin de l'étage 1", () => {
  const base = () => {
    const s = new SiloState();
    s.facts.push("entrance_explored", "generator_powered", "hub_reached", "radio_module", "comms_repaired", "secret_clue", "secret_revealed", "keycard", "floor2");
    return s;
  };

  it("sans rien résoudre : le texte canon, la question qui suit, sans punir", () => {
    const s = new SiloState();
    s.facts.push("keycard");
    const end = floorEnding(s);
    expect(end.lines).toEqual([...CANON_ENDING, "Une question te suit dans l'escalier : qui a ouvert la chambre 1 ?"]);
  });

  it("radio réparée : Okafor, « VIENS » traduit par l'opératrice, et ce qu'elle dit de Lou", () => {
    const s = base();
    markScene(s, "M1");
    markScene(s, "M2");
    markScene(s, "M3");
    const end = floorEnding(s).lines.join("\n");
    expect(end).toContain("« Ne descendez pas. Lila, tu n'es jamais arrivée. »");
    expect(end).toContain("« V… I… E… N… S. »");
    expect(end).toContain("« Un étranger est entré par la porte de service… et ils se sont remis à marcher. »");
    expect(end).toContain("Bon débarras, l'étranger.");
    expect(end).toContain("Là-haut, on t'appelle encore « l'étranger ».");
  });

  it("Lou disculpé, affaire résolue, aveu dit à Cuisine : la vérité à la radio, les pêches au départ", () => {
    const s = base();
    for (const m of ["M1", "M2", "M3", "M5", "M6"] as const) markScene(s, m);
    recordOf(s).deductions.push("C5", "C4");
    applyGesture(s, "preuve");
    s.setFlag("operatrice_aveu");
    s.setFlag("m6_elle");
    expect(radioMessage(s)).toBe("« Il y a un garçon avec nous. Il s'appelle Lou. Il n'y est pour rien. C'est moi qui ai ouvert. »");
    const lines = floorEnding(s).lines;
    expect(lines[0]).toBe("Marceau était le premier. Ils ont menti pour le cacher. Et c'est elle qui a ouvert.");
    expect(lines.join("\n")).toContain("Reviens pas mordu, Lou.");
    expect(lines.at(-1)).toBe("Derrière toi, à la radio, une voix commence enfin à raconter.");
    expect(lines).toEqual(expect.arrayContaining(CANON_ENDING));
  });

  it("disculpé sans l'aveu : « Un bricoleur est passé. » ; secret gardé : la vieille version", () => {
    const s = base();
    markScene(s, "M2");
    recordOf(s).deductions.push("C5");
    expect(radioMessage(s)).toBe("« Un bricoleur est passé. Il n'y est pour rien. »");
    recordOf(s).deductions.push("C4");
    s.setFlag("m6_secret");
    expect(radioMessage(s)).toContain("Un étranger est entré");
  });
});

describe("sauvegarde", () => {
  it("la confiance, les faits et les gestes passent dans relations, flags et ext.people (rien au premier niveau)", () => {
    const s = withDeductions("C5");
    markScene(s, "M1");
    applyGesture(s, "don_bandage");
    applyGesture(s, "preuve");
    s.setFlag("lou_abri");
    syncOperator(s);
    const text = s.saveText()!;
    expect(text).not.toBeNull();
    const data = JSON.parse(text);
    expect(Object.keys(data)).toEqual(Object.keys(new SiloState().snapshot()));
    const loaded = new SiloState();
    expect(loaded.loadText(text)).toBe("ok");
    expect(cookName(loaded)).toBe("Lou");
    expect(loaded.knows("lou_abri")).toBe(true);
    expect(played(loaded, "M1")).toBe(true);
    expect(peopleRecord(loaded).steps).toEqual(["don_bandage", "preuve"]);
    expect(loaded.relations[OPERATOR]).toBe(1);
  });
});
