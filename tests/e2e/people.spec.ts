// Les personnes de l'étage 1 dans un vrai navigateur : la voix de l'opératrice à la guérite, la première rencontre
// avec Cuisine sur téléphone en portrait (« l'étranger »), la confiance gagnée (« Lou »), l'accusation au hub, la fin
// d'étage selon les découvertes, et des gros plans des 5 mordus et des 2 survivants.
import { expect, test, type Page } from "@playwright/test";

const SHOTS = process.env.SHOTS_DIR ?? "docs/screenshots";
const PORTRAIT = { viewport: { width: 390, height: 760 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true };

test.setTimeout(600_000);

async function boot(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  await page.goto("/");
  await page.waitForFunction(() => Boolean((window as any).__silo), null, { timeout: 120_000 });
  await page.evaluate(() => {
    for (const key of ["sillo8-save", "sillo8-save-safe", "sillo8-save-floor"]) window.localStorage.removeItem(key);
    const engine = (window as any).__silo;
    engine.stop();
    const renderer = engine.renderer;
    engine.__draw = renderer.render.bind(renderer);
    renderer.render = () => undefined;
    engine.newGame();
    (window as any).__ticker = setInterval(() => engine.tick(1 / 30), 40);
  });
  return errors;
}

const mode = (page: Page) => page.evaluate(() => (window as any).__silo.ui.get().mode as string);

async function teleport(page: Page, x: number, z: number, yaw: number) {
  await page.evaluate(([x, z, yaw]) => {
    const engine = (window as any).__silo;
    engine.input.releaseAll();
    engine.input.pointer = null;
    engine.player.x = x;
    engine.player.z = z;
    engine.player.vx = engine.player.vz = 0;
    engine.player.yaw = yaw;
    engine.rig.snap(new engine.rig.focus.constructor(x, 0, z));
  }, [x, z, yaw] as const);
}

/** Capture du jeu, la caméra centrée sur un point du décor plutôt que sur Lou (la chambre froide est dans un coin). */
async function shotAt(page: Page, name: string, x: number, z: number) {
  await page.waitForTimeout(600);
  await page.evaluate(([x, z]) => {
    const engine = (window as any).__silo;
    engine.rig.snap(new engine.rig.focus.constructor(x, 0, z));
    engine.__draw(engine.scene, engine.camera);
  }, [x, z] as const);
  await page.screenshot({ path: `${SHOTS}/sillo8-personnages-${name}.png`, animations: "disabled" });
}

async function shot(page: Page, name: string) {
  await page.waitForTimeout(600);
  await page.evaluate(() => {
    const engine = (window as any).__silo;
    engine.__draw(engine.scene, engine.camera);
  });
  await page.screenshot({ path: `${SHOTS}/sillo8-personnages-${name}.png`, animations: "disabled" });
}

/** Gros plan : une caméra serrée posée en `from`, qui regarde `at` ; capture du seul canevas. */
async function closeup(page: Page, name: string, at: [number, number, number], from: [number, number, number], fov = 26) {
  await page.waitForTimeout(400);
  await page.evaluate(([at, from, fov]) => {
    const engine = (window as any).__silo;
    // Gros plan seul : sans l'interface, sans Lou, sans les contours d'objets à portée.
    let style = document.getElementById("closeup-style");
    if (!style) {
      style = document.createElement("style");
      style.id = "closeup-style";
      style.textContent = "body * { visibility: hidden !important; } canvas { visibility: visible !important; }";
      document.head.appendChild(style);
    }
    const hidden: any[] = [];
    engine.scene.traverse((o: any) => { if (o.userData?.isHighlight && o.visible) { o.visible = false; hidden.push(o); } });
    engine.operator.root.visible = false;
    const cam = engine.camera.clone();
    cam.fov = fov;
    cam.position.set(from[0], from[1], from[2]);
    cam.lookAt(at[0], at[1], at[2]);
    cam.updateProjectionMatrix();
    engine.__draw(engine.scene, cam);
    engine.operator.root.visible = true;
    for (const o of hidden) o.visible = true;
  }, [at, from, fov] as const);
  await page.locator("canvas").first().screenshot({ path: `${SHOTS}/sillo8-personnages-${name}.png`, animations: "disabled" });
  await page.evaluate(() => document.getElementById("closeup-style")?.remove());
}

const POWER = () => {
  const engine = (window as any).__silo;
  engine.state.collect("e2e-p", "components", 3);
  engine.state.exploreEntrance();
  engine.state.powerGenerator();
};

test("téléphone en portrait : voix de l'opératrice à la guérite, Cuisine se méfie de « l'étranger », puis l'appelle « Lou »", async ({ browser }) => {
  const context = await browser.newContext(PORTRAIT);
  const page = await context.newPage();
  const errors = await boot(page);
  // Rendu logiciel très lent : les mordus dorment pour ce parcours (ils ne mordent pas pendant qu'on lit).
  await page.evaluate(() => { const e = (window as any).__silo; e.input.device = "touch"; e.hordeContext.dormant = true; });

  // 1. La première minute : la radio de la guérite grésille.
  await teleport(page, 4.7, 25.0, Math.PI * 0.85);
  await expect.poll(() => page.evaluate(() => (window as any).__silo.focus?.id ?? null), { timeout: 15_000 }).toBe("people_radio");
  await page.getByRole("button", { name: "Examiner" }).tap({ force: true }); // le bouton respire : jamais « stable »
  await expect.poll(() => mode(page)).toBe("dialogue");
  await expect(page.getByRole("heading", { name: "L'OPÉRATRICE DE NUIT" })).toBeVisible();
  // La voix a déjà passé dans l'accroche (avis + carte) : la conversation commence par la réponse de Lou.
  await expect(page.getByText("[La radio grésille encore, tout bas.]")).toBeVisible();
  await expect(page.getByText(/c'est l'heure de la relève/)).toHaveCount(0);
  expect(await page.evaluate(() => (window as any).__silo.state.ext?.investigation?.cards?.filter((c: string) => c === "audio_gate").length
    ?? 0)).toBe(1);
  await shot(page, "guerite-portrait");
  await page.getByRole("button", { name: /Allô \? Je suis là/ }).tap();
  await expect(page.getByText(/La pile de la radio meurt/)).toBeVisible();
  await page.getByRole("button", { name: /Terminer/ }).tap();
  await expect.poll(() => mode(page)).toBe("playing");

  // 2. Première rencontre (M1), génératrice relancée : trois coups, la porte sur la chaîne.
  await page.evaluate(POWER);
  await teleport(page, -28.45, 17.3, -Math.PI / 2);
  await expect.poll(() => page.evaluate(() => (window as any).__silo.focus?.id ?? null), { timeout: 15_000 }).toBe("people_cuisine");
  await page.getByRole("button", { name: "Examiner" }).tap({ force: true }); // le bouton respire : jamais « stable »
  await expect(page.getByRole("heading", { name: "CUISINE" })).toBeVisible();
  await expect(page.getByText(/Toc toc toc/)).toBeVisible();
  await page.getByRole("button", { name: /J'ai faim/ }).tap();
  await expect(page.getByText("Ça, c'est un vivant. T'es qui, toi ? T'es pas d'ici.")).toBeVisible();
  await expect(page.getByTestId("speaker-status")).toContainText("Il t'appelle « l'étranger »");
  await expect(page.getByText("C'est-tu toi qui as rallumé la génératrice ?")).toBeVisible();
  await shot(page, "rencontre-portrait");
  await page.getByRole("button", { name: /Oui\. Ça fait du bruit/ }).tap();
  await expect(page.getByText("…Au moins, tu mens pas.")).toBeVisible();
  await page.getByRole("button", { name: "Je repasserai." }).tap();
  await page.getByRole("button", { name: /Terminer/ }).tap();
  await expect.poll(() => mode(page)).toBe("playing");
  expect(await page.evaluate(() => (window as any).__silo.state.knows("m1"))).toBe(true);

  // Il reste méfiant, sur la chaîne : on le voit dans le monde, couperet baissé.
  await teleport(page, -27.6, 16.4, -2.2);
  await shotAt(page, "chaine-portrait", -29.6, 18.2);

  // 3. La confiance gagnée : C5 validée au tableau, Lou montre la preuve (M5). Il demande son nom, puis dit « Lou ».
  await page.evaluate(() => {
    const engine = (window as any).__silo;
    // L'enquête pose ses déductions en minuscules dans state.flags (game/investigation/content/links.ts).
    engine.state.setFlag("c5");
    engine.state.setFlag("accused_cleared");
  });
  await teleport(page, -28.45, 17.3, -Math.PI / 2);
  await expect.poll(() => page.evaluate(() => (window as any).__silo.focus?.id ?? null), { timeout: 15_000 }).toBe("people_cuisine");
  await page.getByRole("button", { name: "Examiner" }).tap({ force: true }); // le bouton respire : jamais « stable »
  await page.getByRole("button", { name: /La montre de l'infirmier/ }).tap();
  await expect(page.getByText("Bon. J'me suis trompé. Ça arrive pas souvent. C'est quoi ton nom, déjà ?")).toBeVisible();
  await page.getByRole("button", { name: "Lou.", exact: true }).tap();
  await expect(page.getByText("Mais si c'est pas toi… c'est qui ?")).toBeVisible();
  await expect(page.getByTestId("speaker-status")).toContainText("Il t'appelle « Lou »");
  await shot(page, "confiance-portrait");
  await page.getByRole("button", { name: /Terminer/ }).tap();
  await expect.poll(() => mode(page)).toBe("playing");
  // Dans le monde : il sort de sa chambre froide et tourne le dos ; sur sa porte, « L'ÉTRANGER » est barré.
  await expect.poll(() => page.evaluate(() => (window as any).__silo.state.relations.cuisine)).toBe(2);
  await page.waitForTimeout(800);
  await teleport(page, -26.9, 15.6, -2.2);
  await shotAt(page, "dehors-portrait", -28.9, 16.6);
  expect(errors).toEqual([]);
  await context.close();
});

test("ordi : la voix au haut-parleur, l'accusation devant l'avis, et la fin selon les découvertes", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  const errors = await boot(page);
  await page.evaluate(POWER);
  await page.evaluate(() => {
    const engine = (window as any).__silo;
    engine.hordeContext.dormant = true;
    engine.state.setFlag("m1");
    // L'énigme 2 (leviers) a rallumé le circuit CONTRÔLE.
    engine.state.setFlag("circuit_controle");
    engine.state.setFlag("cuisine_rencontre");
    engine.state.reachHub();
  });
  // M2 : en sortant de la cafétéria, la voix douce de l'opératrice accuse « l'étranger ».
  await teleport(page, -9, 4, Math.PI);
  await expect.poll(() => mode(page), { timeout: 15_000 }).toBe("dialogue");
  await expect(page.getByText("Mon tableau dit que la porte de service est ouverte. L'étranger est entré par là.")).toBeVisible();
  await expect(page.getByText("La nuit de l'orage aussi, j'ai vu le voyant s'allumer. J'étais à ma console.")).toBeVisible();
  await shot(page, "haut-parleur");
  await page.getByRole("button", { name: /Terminer/ }).click();
  await expect.poll(() => mode(page)).toBe("playing");
  await expect(page.getByRole("status", { name: "Pensée de Lou" })).toContainText("Elle dit vrai. Presque tout.", { timeout: 15_000 });

  // M3 : au hub, Cuisine sort, se plante devant l'avis, couperet à la main.
  await teleport(page, -1.2, 0.8, Math.PI);
  await expect.poll(() => mode(page), { timeout: 20_000 }).toBe("dialogue");
  await expect(page.getByText("« Par la porte de service. » Pis toi, t'es rentré par où ?")).toBeVisible();
  await expect(page.getByTestId("speaker-status")).toContainText("Il t'appelle « l'étranger »");
  await page.evaluate(() => { const e = (window as any).__silo; e.__draw(e.scene, e.camera); });
  await page.screenshot({ path: `${SHOTS}/sillo8-personnages-accusation.png`, animations: "disabled" });
  await page.getByRole("button", { name: "[Vider la sacoche]" }).click();
  await expect(page.getByText("Ça, c'est à quelqu'un qui est mort. Ça ne te regarde pas.")).toBeVisible();
  await page.getByRole("button", { name: "…" }).click();
  await page.getByRole("button", { name: /Terminer/ }).click();
  await expect.poll(() => mode(page)).toBe("playing");
  await expect.poll(() => page.evaluate(() => (window as any).__silo.state.ext.investigation.unlocked)).toContain("fact:lou_accuse");
  // La scène, dans le monde : Cuisine devant l'avis officiel.
  await page.evaluate(() => { (window as any).__silo.people.cookPhase = "hub"; });
  await closeup(page, "hub-accusation", [-3.6, 0.8, -4.2], [1.5, 5.5, 3.5], 40);

  // Fin : radio réparée, affaire non résolue, Lou pas disculpé ; on descend quand même, sans punition.
  await page.evaluate(() => {
    const engine = (window as any).__silo;
    const s = engine.state;
    s.setFlag("m2");
    s.collect("e2e-r", "components", 2);
    s.craftRadioModule();
    s.repairComms();
    s.readNote("note_storage", true);
    s.openSecretWall();
    s.takeKeycard();
    engine.openFloor2();
  });
  await expect.poll(() => mode(page)).toBe("conclusion");
  const ending = page.locator("[data-ending-line]");
  await expect(ending.filter({ hasText: "Ne descendez pas. Lila, tu n'es jamais arrivée." })).toHaveCount(1);
  await expect(ending.filter({ hasText: "V… I… E… N… S." })).toHaveCount(1);
  await expect(ending.filter({ hasText: "Un étranger est entré par la porte de service" })).toHaveCount(1);
  await expect(ending.filter({ hasText: "qui a ouvert la chambre 1 ?" })).toHaveCount(1);
  await expect(ending.filter({ hasText: "La clé glisse dans le lecteur." })).toHaveCount(1);
  await shot(page, "fin-non-resolue");
  // Affaire résolue, Lou disculpé, aveu dit à Cuisine : la vérité à la radio, et les pêches.
  await page.evaluate(() => {
    const engine = (window as any).__silo;
    const s = engine.state;
    s.ext.investigation.deductions.push("C5", "C4");
    s.setFlag("operatrice_aveu");
    s.setFlag("m6_elle");
    s.changeTrust("cuisine", 2 - (s.relations.cuisine ?? 0));
    engine.setMode("playing");
    engine.openFloor2();
  });
  await expect(ending.filter({ hasText: "Il s'appelle Lou. Il n'y est pour rien. C'est moi qui ai ouvert." })).toHaveCount(1);
  await expect(ending.filter({ hasText: "Reviens pas mordu, Lou." })).toHaveCount(1);
  await expect(ending.filter({ hasText: "une voix commence enfin à raconter" })).toHaveCount(1);
  await shot(page, "fin-resolue");
  expect(errors).toEqual([]);
});

test("gros plans : les 5 mordus identifiés et les 2 survivants", async ({ page }) => {
  await page.setViewportSize({ width: 900, height: 900 });
  const errors = await boot(page);
  await page.evaluate(POWER);
  // Chaque mordu, immobile dans son habitude (Lou derrière lui, hors de sa vue), filmé de face.
  const mordus: [string, string, number, number][] = [
    ["guetteur", "walker_ext", 33.8, 40.4],
    ["marceau", "walker_gen", -18.5, 28.5],
    ["commis", "crawler_cafe", -24, 13],
    ["infirmier", "walker_control", 15.5, 1.5],
    ["berard", "walker_dorms", 0, -10.5],
  ];
  for (const [name, id, x, z] of mordus) {
    await page.evaluate(([id, x, z]) => {
      const engine = (window as any).__silo;
      for (const other of engine.horde.zombies) { other.wait = 999; other.mode = "patrol"; }
      const zb = engine.horde.get(id);
      zb.x = x; zb.z = z; zb.yaw = 0; zb.wait = 999; zb.mode = "patrol"; zb.stunned = 0; zb.freeze = 0;
      engine.player.x = x; engine.player.z = z - 6; engine.player.yaw = 0;
      engine.rig.snap(new engine.rig.focus.constructor(x, 0, z - 6));
    }, [id, x, z] as const);
    await page.waitForTimeout(900);
    // Figé dans sa pose de ronde, face à la caméra.
    await page.evaluate(([id, x, z]) => {
      const zb = (window as any).__silo.horde.get(id);
      zb.x = x; zb.z = z; zb.yaw = 0; zb.mode = "patrol"; zb.freeze = 999;
    }, [id, x, z] as const);
    await page.waitForTimeout(200);
    const crawler = id.startsWith("crawler");
    await closeup(page, `mordu-${name}`, [x, crawler ? 0.45 : 1.15, z], [x + 0.9, crawler ? 2.4 : 3.1, z + (crawler ? 3.0 : 4.2)]);
  }
  // Cuisine, porte ouverte (prudent), et l'opératrice dans son local (plafond levé).
  await page.evaluate(() => {
    const engine = (window as any).__silo;
    for (const z of engine.horde.zombies) { z.x = 45; z.z = 44; z.wait = 999; }
    engine.state.changeTrust("cuisine", 1);
  });
  await teleport(page, -26.0, 14.0, -2.2);
  await page.waitForTimeout(800);
  await closeup(page, "cuisine-prudent", [-30.25, 0.8, 18.2], [-28.4, 2.3, 21.4]);
  await page.evaluate(() => { (window as any).__silo.state.changeTrust("cuisine", -1); });
  await page.waitForTimeout(800);
  await closeup(page, "cuisine-mefiant", [-30.1, 1.0, 18.0], [-28.6, 2.3, 21.2]);
  await page.evaluate(() => { (window as any).__silo.state.changeTrust("cuisine", 2); });
  await page.waitForTimeout(800);
  await closeup(page, "cuisine-confiant", [-28.4, 0.9, 15.4], [-25.6, 2.6, 17.4]);
  // L'opératrice : circuit CONTRÔLE rallumé, sa voix déjà entendue (M2) ; le plafond du local se lève quand Lou est là.
  await page.evaluate(() => { const s = (window as any).__silo.state; s.setFlag("circuit_controle"); s.setFlag("m2"); });
  await teleport(page, 27.2, -16.6, Math.PI);
  await page.waitForTimeout(800);
  await closeup(page, "operatrice", [28.6, 0.9, -20.5], [27.8, 3.0, -17.0], 30);
  expect(errors).toEqual([]);
});
