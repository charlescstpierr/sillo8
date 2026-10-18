// Tutoriel léger, flèche d'objectif et astuces : logique pure de game/tutorial.ts.
import { describe, expect, it } from "vitest";
import { SiloState, type KeyValueStore } from "@/game/state";
import { roomAt } from "@/game/level";
import {
  arrowVisible, GUIDE_TIMING, nearestZombie, sameArea, IDLE_OBSERVATION, loadTutorial, nearestUnreadNote, ObjectiveWatch, objectiveGoal,
  objectiveTarget, saveTutorial, stallHint, TUTORIAL_KEY, TUTORIAL_STEPS, TUTORIAL_TIMING, TutorialDirector,
  TutorialTracker, waypoint, type StepDef, type TutorialObservation,
} from "@/game/tutorial";

class MemoryStore implements KeyValueStore {
  data = new Map<string, string>();
  getItem(key: string) { return this.data.get(key) ?? null; }
  setItem(key: string, value: string) { this.data.set(key, value); }
}

const obs = (patch: Partial<TutorialObservation> = {}): TutorialObservation => ({ ...IDLE_OBSERVATION, ...patch });

/** Avance le suivi de `seconds` par pas de 0,1 s. */
function run(t: TutorialTracker, seconds: number, o: TutorialObservation) {
  let bubble = null;
  for (let i = 0; i < Math.round(seconds * 10); i++) bubble = t.update(0.1, o);
  return bubble;
}

describe("bulles du tutoriel", () => {
  it("commence par se déplacer, avec le texte de l'appareil", () => {
    const t = new TutorialTracker();
    expect(t.update(0.1, obs())).toBeNull(); // petite pause d'intro
    const keyboard = run(t, TUTORIAL_TIMING.intro, obs());
    expect(keyboard?.step).toBe("move");
    expect(keyboard?.key).toContain("ZQSD");
    expect(t.update(0.1, obs({ device: "touch" }))?.key).toBe("Stick");
    expect(t.update(0.1, obs({ device: "touch" }))?.target).toBe("stick");
    expect(t.update(0.1, obs({ device: "gamepad" }))?.key).toBe("Stick gauche");
  });

  it("disparaît dès que l'action est faite, puis passe à la suivante après une pause", () => {
    const t = new TutorialTracker();
    run(t, 2, obs());
    expect(t.current).toBe("move");
    expect(t.update(0.1, obs({ moving: true }))).toBeNull();
    expect(t.done.has("move")).toBe(true);
    // Rien d'autre tant qu'aucune note n'est proche ni aucun zombie.
    expect(run(t, 5, obs())).toBeNull();
    // Une note à portée : bulle « examiner » (enquête d'abord).
    const examine = run(t, 2, obs({ noteDistance: 3 }));
    expect(examine?.step).toBe("examine");
    expect(examine?.key).toBe("E");
    t.update(0.1, obs({ interacted: true, notesRead: 1 }));
    expect(t.done.has("examine")).toBe(true);
    // Une note lue : relire les indices au carnet.
    const journal = run(t, 2, obs({ notesRead: 1 }));
    expect(journal?.step).toBe("journal");
    expect(journal?.target).toBe("journal");
    t.update(0.1, obs({ journalOpened: true, notesRead: 1 }));
    expect(t.current).toBeNull();
  });

  it("une bulle sans réponse s'efface après le délai et compte comme vue", () => {
    const t = new TutorialTracker();
    run(t, 2, obs());
    expect(t.current).toBe("move");
    run(t, TUTORIAL_TIMING.timeout + 0.2, obs());
    expect(t.done.has("move")).toBe(true);
    expect(t.current).toBeNull();
  });

  it("le combat vient plus tard, brièvement, quand un zombie approche", () => {
    const t = new TutorialTracker(["move"]);
    // Zombie loin : rien.
    expect(run(t, 3, obs({ zombieDistance: 30 }))).toBeNull();
    // Il approche : s'accroupir passe avant une note proche.
    expect(run(t, 0.2, obs({ zombieDistance: 9, noteDistance: 2 }))?.step).toBe("crouch");
    t.update(0.1, obs({ crouched: true, zombieDistance: 6 }));
    const strike = run(t, 2, obs({ zombieDistance: 6 }));
    expect(strike?.step).toBe("strike");
    // Bulle de combat brève.
    run(t, TUTORIAL_TIMING.combatTimeout, obs({ zombieDistance: 6 }));
    expect(t.done.has("strike")).toBe(true);
    expect(run(t, 2, obs({ zombieDistance: 6, device: "touch" }))?.key).toBe("LAMPE");
  });

  it("une action faite d'elle-même n'est plus expliquée", () => {
    const t = new TutorialTracker();
    t.update(0.1, obs({ moving: true, crouched: true }));
    expect(t.done.has("move")).toBe(true);
    expect(t.done.has("crouch")).toBe(true);
    expect(run(t, 3, obs({ zombieDistance: 9 }))).toBeNull();
  });

  it("accepte de nouvelles étapes déclenchées par condition", () => {
    const uv: StepDef = {
      id: "uv", kind: "inquiry", target: "lamp",
      texts: { keyboard: ["U", "lampe UV : révèle les traces."], gamepad: ["X", "lampe UV."], touch: ["UV", "révèle les traces."] },
      ready: (o) => (o as TutorialObservation & { uvDistance?: number }).uvDistance! < 3,
      achieved: () => false,
    };
    const t = new TutorialTracker([], [uv]);
    expect(run(t, 3, obs())).toBeNull();
    expect(run(t, 0.5, { ...obs(), uvDistance: 2 } as TutorialObservation)?.step).toBe("uv");
  });

  it("mémorise les étapes vues dans sillo8-tutorial et ignore les données invalides", () => {
    const store = new MemoryStore();
    expect(loadTutorial(store)).toEqual([]);
    expect(saveTutorial(store, ["move", "examine"])).toBe(true);
    expect(JSON.parse(store.data.get(TUTORIAL_KEY)!)).toEqual({ done: ["move", "examine"] });
    expect(loadTutorial(store)).toEqual(["move", "examine"]);
    store.setItem(TUTORIAL_KEY, JSON.stringify({ done: ["move", "inconnu", 3, "move"] }));
    expect(loadTutorial(store)).toEqual(["move"]);
    store.setItem(TUTORIAL_KEY, "{pas du json");
    expect(loadTutorial(store)).toEqual([]);
    expect(loadTutorial(null)).toEqual([]);
  });

  it("le directeur sauvegarde la progression, et « Revoir le tutoriel » efface tout", () => {
    const store = new MemoryStore();
    const state = new SiloState();
    const director = new TutorialDirector(store);
    director.start(state);
    director.update(0.1, state, 0, 41, obs({ moving: true }));
    expect(loadTutorial(store)).toEqual(["move"]);
    // Partie suivante : on ne revoit pas « se déplacer ».
    const next = new TutorialDirector(store);
    next.start(state);
    for (let i = 0; i < 30; i++) next.update(0.1, state, 0, 41, obs());
    expect(next.bubble).toBeNull();
    // Carnet ouvert hors simulation : compté à l'image suivante.
    next.markJournal();
    next.update(0.1, state, 0, 41, obs());
    expect(loadTutorial(store)).toContain("journal");
    next.replay();
    expect(loadTutorial(store)).toEqual([]);
    for (let i = 0; i < 30; i++) next.update(0.1, state, 0, 41, obs());
    expect(next.bubble?.step).toBe("move");
  });

  it("toutes les étapes ont un texte pour chaque appareil", () => {
    for (const step of TUTORIAL_STEPS) {
      for (const device of ["keyboard", "gamepad", "touch"] as const) {
        const [key, text] = step.texts[device];
        expect(key.length, `${step.id}/${device}`).toBeGreaterThan(0);
        expect(text.length, `${step.id}/${device}`).toBeLessThan(80);
      }
    }
  });
});

describe("cible de l'objectif", () => {
  it("suit state.objective() tout au long de l'étage", () => {
    const s = new SiloState();
    expect(objectiveGoal(s, 0, 41)?.label).toBe("Entrée du silo");
    s.exploreEntrance();
    // Il manque de la ferraille : la plus proche, dehors.
    const scrap = objectiveGoal(s, 0, 41)!;
    expect(scrap.label).toBe("Ferraille");
    expect([scrap.x, scrap.z]).toEqual([-6, 36]);
    s.collect("part_0", "components", 1);
    expect(objectiveGoal(s, -6, 36)?.label).toBe("Ferraille");
    s.collect("x1", "components", 2);
    expect(objectiveGoal(s, 0, 41)?.label).toBe("Génératrice");
    s.powerGenerator();
    expect(objectiveGoal(s, 0, 25)?.label).toBe("Hub central");
    s.reachHub();
    expect(objectiveGoal(s, 0, 0)?.label).toBe("Ferraille");
    s.collect("x2", "components", 2);
    expect(objectiveGoal(s, 0, 0)?.label).toBe("Établi");
    s.craftRadioModule();
    expect(objectiveGoal(s, 0, 0)?.label).toBe("Console radio");
    s.repairComms();
    expect(objectiveGoal(s, 0, 0)?.label).toBe("Note de survivant");
    s.readNote("note_storage", true);
    expect(objectiveGoal(s, 0, 0)?.label).toBe("Mur creux");
    s.openSecretWall();
    expect(objectiveGoal(s, 0, 0)?.label).toBe("Clé d'accès");
    s.takeKeycard();
    expect(objectiveGoal(s, 0, 0)?.label).toBe("Accès étage 2");
    s.reachFloor2();
    expect(objectiveGoal(s, 0, 0)).toBeNull();
    expect(objectiveTarget(s, 0, 0)).toBeNull();
  });

  it("ignore la ferraille derrière une porte encore fermée", () => {
    const s = new SiloState();
    s.exploreEntrance();
    for (const id of ["part_0", "part_1", "part_2"]) s.collect(id, "components", 1);
    s.components = 0;
    // Restent la serre (ouverte depuis dehors) et l'intérieur (fermé sans courant).
    const goal = objectiveGoal(s, 20, 30)!;
    expect(roomAt(goal.x, goal.z)?.id).toBe("greenhouse");
  });

  it("passe par la bonne porte quand la cible est dans une autre salle", () => {
    const s = new SiloState();
    s.exploreEntrance();
    s.collect("x", "components", 3);
    // De l'entrée vers la génératrice : la porte de service à l'ouest.
    const target = objectiveTarget(s, 0, 35)!;
    expect(target.label).toBe("Génératrice");
    expect([target.x, target.z]).toEqual([-11, 27]);
    expect([target.goalX, target.goalZ]).toEqual([-22, 26]);
    // Dans la salle de la génératrice : droit dessus.
    expect(waypoint(s, -15, 26, -22, 26)).toEqual({ x: -22, z: 26, hops: 0 });
    // Porte verrouillée sans autre chemin : inaccessible.
    expect(waypoint(s, 0, 35, 0, 0)).toBeNull();
    s.powerGenerator();
    expect(waypoint(s, 0, 35, 0, 0)).toMatchObject({ x: 0, z: 22 });
  });
});

describe("flèche discrète et astuce", () => {
  it("auto : la flèche n'apparaît qu'après ~45 s sans progrès ; toujours / jamais", () => {
    const s = new SiloState();
    const watch = new ObjectiveWatch();
    watch.reset(s);
    watch.update(10, s);
    expect(watch.arrowWanted("auto")).toBe(false);
    expect(watch.arrowWanted("always")).toBe(true);
    watch.update(GUIDE_TIMING.arrow, s);
    expect(watch.arrowWanted("auto")).toBe(true);
    expect(watch.arrowWanted("never")).toBe(false);
    // Un progrès (objectif atteint) remet le compteur à zéro.
    s.exploreEntrance();
    watch.update(0.1, s);
    expect(watch.arrowWanted("auto")).toBe(false);
    // Une ferraille ramassée change aussi l'objectif (1/3 pièces).
    watch.update(GUIDE_TIMING.arrow, s);
    s.collect("part_0", "components", 1);
    watch.update(0.1, s);
    expect(watch.arrowWanted("auto")).toBe(false);
  });

  it("la flèche se cache quand la cible est à l'écran et proche", () => {
    expect(arrowVisible(true, 20, true)).toBe(true);
    expect(arrowVisible(true, 4, false)).toBe(true);
    expect(arrowVisible(true, 4, true)).toBe(false);
    expect(arrowVisible(false, 20, false)).toBe(false);
  });

  it("une astuce contextuelle après ~3 minutes sans progrès, puis elle s'efface", () => {
    const s = new SiloState();
    s.exploreEntrance();
    const watch = new ObjectiveWatch();
    watch.reset(s);
    for (let t = 0; t < GUIDE_TIMING.hint - 1; t += 1) watch.update(1, s);
    expect(watch.hint).toBe("");
    watch.update(1.5, s);
    expect(watch.hint).toBe("La ferraille se trouve dans les épaves dehors et dans la serre.");
    for (let t = 0; t <= GUIDE_TIMING.hintDuration; t += 1) watch.update(1, s);
    expect(watch.hint).toBe("");
  });

  it("chaque objectif a son astuce", () => {
    const s = new SiloState();
    const seen = new Set<string>();
    const steps = [
      () => s.exploreEntrance(), () => s.collect("x", "components", 3), () => s.powerGenerator(), () => s.reachHub(),
      () => s.collect("y", "components", 2), () => s.craftRadioModule(), () => s.repairComms(),
      () => s.readNote("note_storage", true), () => s.openSecretWall(), () => s.takeKeycard(),
    ];
    seen.add(stallHint(s));
    for (const step of steps) {
      step();
      seen.add(stallHint(s));
    }
    expect(seen.size).toBe(steps.length + 1);
    for (const hint of seen) expect(hint.length).toBeGreaterThan(10);
  });

  it("ne compte que les zombies de la même zone", () => {
    // Entrée et zone extérieure : dehors tous les deux.
    expect(sameArea(0, 41, 32, 38)).toBe(true);
    // Le zombie de la génératrice est derrière le mur de la porte de service.
    expect(sameArea(-8, 32, -16, 29)).toBe(false);
    expect(nearestZombie([{ x: -16, z: 29 }], -8, 32)).toBe(Infinity);
    expect(nearestZombie([{ x: -16, z: 29 }, { x: -4, z: 32 }], -8, 32)).toBeCloseTo(4);
  });

  it("repère la note non lue la plus proche", () => {
    const s = new SiloState();
    expect(nearestUnreadNote(s, -8, 31)).toBeLessThan(1.5);
    s.readNote("note_entrance");
    expect(nearestUnreadNote(s, -8, 31)).toBeGreaterThan(5);
  });
});
