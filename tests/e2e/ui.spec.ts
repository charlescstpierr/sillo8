// Parcours de l'interface papier de SILLO 8 : menu, HUD, sac, note, carnet, pause, mort (ordi et téléphone).
import { expect, test, type Page } from "@playwright/test";

const SHOTS = process.env.SHOTS_DIR ?? "docs/screenshots";

async function boot(page: Page, keepSave = false) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  await page.goto("/");
  await page.waitForFunction(() => Boolean((window as any).__silo), null, { timeout: 30_000 });
  await page.evaluate((keep) => {
    if (!keep) window.localStorage.removeItem("sillo8-save");
    // Le rendu logiciel (swiftshader) prend des secondes par image : la simulation tourne
    // sans dessiner, et on ne dessine qu'au moment des captures.
    const engine = (window as any).__silo;
    engine.stop();
    const renderer = engine.renderer;
    engine.__draw = renderer.render.bind(renderer);
    renderer.render = () => undefined;
    setInterval(() => engine.tick(1 / 30), 40);
  }, keepSave);
  return errors;
}

const mode = (page: Page) => page.evaluate(() => (window as any).__silo.ui.get().mode as string);

/** Laisse finir les animations d'entrée, dessine une image de la scène et capture. */
async function shot(page: Page, name: string) {
  await page.waitForTimeout(700);
  await page.evaluate(() => {
    const engine = (window as any).__silo;
    engine.__draw(engine.scene, engine.camera);
  });
  await page.screenshot({ path: `${SHOTS}/sillo8-ui-${name}.png`, animations: "disabled" });
}

/** Approche la note de l'entrée et interagit ; repli si le moteur n'ouvre pas encore la fiche. */
async function readEntranceNote(page: Page) {
  await page.evaluate(() => {
    const engine = (window as any).__silo;
    engine.player.x = -8;
    engine.player.z = 30.9;
    engine.player.vx = engine.player.vz = 0;
    engine.rig.snap?.({ x: -8, y: 0, z: 30.9 });
  });
  await page.waitForTimeout(200);
  await page.evaluate(() => (window as any).__silo.input.trigger("interact"));
  await page.waitForTimeout(400);
  await page.evaluate(() => {
    const engine = (window as any).__silo;
    if (engine.ui.get().mode === "note") return;
    engine.state.readNote("note_entrance", false);
    engine.setMode("note", "note_entrance");
  });
  await expect.poll(() => mode(page)).toBe("note");
}

/** Ajoute la note-indice de Lila et ouvre sa fiche. */
async function openClueNote(page: Page) {
  await page.evaluate(() => {
    const engine = (window as any).__silo;
    engine.state.readNote("note_storage", true);
    engine.setMode("note", "note_storage");
  });
}

test("ordi : parcours complet de l'interface", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  const errors = await boot(page);

  // Menu
  await expect.poll(() => mode(page)).toBe("menu");
  await expect(page.getByRole("heading", { name: "SILLO 8" })).toBeVisible();
  await expect(page.getByRole("button", { name: /CONTINUER LA SAUVEGARDE/ })).toBeDisabled();
  await expect(page.getByText("éblouir à la lampe")).toBeVisible();
  await shot(page, "menu");

  // Réglages depuis le menu, Échap revient au menu
  await page.getByRole("button", { name: "Réglages" }).click();
  await expect(page.getByRole("heading", { name: "Réglages" })).toBeVisible();
  await expect(page.getByText("Mode performance")).toBeVisible();
  await shot(page, "settings");
  await page.keyboard.press("Escape");
  await expect.poll(() => mode(page)).toBe("menu");

  // Nouvelle partie : HUD du bricoleur
  await page.getByRole("button", { name: /NOUVELLE DESCENTE/ }).click();
  await expect.poll(() => mode(page)).toBe("playing");
  await expect(page.getByLabel("État du survivant").getByText("CLÉ À MOLETTE")).toBeVisible();
  await expect(page.getByLabel("État du survivant").getByText("LAMPE", { exact: true })).toBeVisible();
  await expect(page.getByLabel(/Clic droit : éblouir/)).toBeVisible();
  await page.waitForTimeout(600);
  await shot(page, "hud");

  // Sac (Tab) : un bandage soigne de 30
  await page.evaluate(() => {
    const s = (window as any).__silo.state;
    s.health = 55;
    s.collect("e2e_scrap", "components", 2);
    s.collect("e2e_kit", "medkit", 1);
  });
  await page.keyboard.press("Tab");
  await expect(page.getByRole("heading", { name: "Le sac" })).toBeVisible();
  await page.getByRole("button", { name: "Utiliser un bandage" }).click();
  await expect.poll(() => page.evaluate(() => (window as any).__silo.state.health)).toBe(85);
  await expect(page.getByText("Presse à clous · 1 → 16 clous")).toBeVisible();
  await shot(page, "inventory");
  await page.getByRole("button", { name: /Refermer le sac/ }).click();
  await expect.poll(() => mode(page)).toBe("playing");

  // Note de l'entrée, lue sur place
  await readEntranceNote(page);
  await expect(page.getByRole("heading", { name: "Consigne de garde" })).toBeVisible();
  await expect(page.getByText(/Sgt\. Bérard/)).toBeVisible();
  await page.getByRole("button", { name: /Ranger dans le carnet/ }).click();
  await expect.poll(() => mode(page)).toBe("playing");

  // Note-indice : tampon INDICE, puis le carnet
  await openClueNote(page);
  await expect(page.getByRole("heading", { name: "Liste de Lila" })).toBeVisible();
  await expect(page.getByLabel("Indice")).toBeVisible();
  await shot(page, "note");
  await page.getByRole("button", { name: /Ouvrir le carnet/ }).click();
  await expect.poll(() => mode(page)).toBe("journal");
  await expect(page.getByText("2 / 7 notes trouvées")).toBeVisible();
  await expect(page.getByRole("button", { name: /Consigne de garde/ })).toBeVisible();
  await shot(page, "journal");
  await page.keyboard.press("KeyJ");
  await expect.poll(() => mode(page)).toBe("playing");
  await page.keyboard.press("KeyJ");
  await expect.poll(() => mode(page)).toBe("journal");
  await page.keyboard.press("Escape");
  await expect.poll(() => mode(page)).toBe("playing");

  // Pause (Échap via le moteur), sauvegarde
  await page.keyboard.press("Escape");
  await expect(page.getByRole("heading", { name: "On souffle un peu" })).toBeVisible();
  await page.getByRole("button", { name: /Sauvegarder/ }).click();
  await expect(page.getByRole("status")).toContainText("Progression sauvegardée");
  await expect(page.getByRole("button", { name: /Charger la sauvegarde/ })).toBeEnabled();
  await shot(page, "pause");
  await page.keyboard.press("Escape");
  await expect.poll(() => mode(page)).toBe("playing");

  // Mort
  await page.evaluate(() => (window as any).__silo.damagePlayer(999));
  await expect(page.getByRole("heading", { name: "Vous êtes tombé" })).toBeVisible();
  await shot(page, "death");
  await page.getByRole("button", { name: "Menu principal" }).click();
  await expect.poll(() => mode(page)).toBe("menu");
  await expect(page.getByRole("button", { name: /CONTINUER LA SAUVEGARDE/ })).toBeEnabled();

  expect(errors).toEqual([]);
});

test("ordi : vie basse, lance-clous en main", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  const errors = await boot(page);
  await page.evaluate(() => {
    const engine = (window as any).__silo;
    engine.newGame();
    engine.combat.weapon = 1;
    engine.state.ammo = 12;
    engine.state.reserve = 31;
    engine.state.energy = 20;
    engine.state.health = 12;
  });
  await expect(page.getByText("LANCE-CLOUS", { exact: true })).toBeVisible();
  await expect(page.getByText("réserve 31")).toBeVisible();
  await shot(page, "hud-low");
  expect(errors).toEqual([]);
});

test("téléphone paysage : menu, jeu, sac, note, carnet, pause", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  const errors = await boot(page);
  await expect(page.getByRole("heading", { name: "SILLO 8" })).toBeVisible();
  await shot(page, "menu-mobile");

  await page.getByRole("button", { name: /NOUVELLE DESCENTE/ }).tap();
  await expect.poll(() => mode(page)).toBe("playing");
  await page.evaluate(() => { (window as any).__silo.input.device = "touch"; });
  await expect(page.getByRole("button", { name: "Sac" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Frapper" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Recharger" })).toHaveCount(0);
  await shot(page, "hud-mobile");

  // Lance-clous : le bouton devient TIRER et R apparaît
  await page.evaluate(() => { (window as any).__silo.combat.weapon = 1; });
  await expect(page.getByRole("button", { name: "Tirer" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Recharger" })).toBeVisible();
  await shot(page, "hud-nailgun-mobile");

  await page.getByRole("button", { name: "Sac" }).dispatchEvent("pointerdown");
  await expect(page.getByRole("heading", { name: "Le sac" })).toBeVisible();
  await shot(page, "inventory-mobile");
  await page.getByRole("button", { name: /Refermer le sac/ }).tap();
  await expect.poll(() => mode(page)).toBe("playing");

  await readEntranceNote(page);
  await openClueNote(page);
  await expect(page.getByRole("heading", { name: "Liste de Lila" })).toBeVisible();
  await shot(page, "note-mobile");
  await page.getByRole("button", { name: /Ranger dans le carnet/ }).tap();
  await expect.poll(() => mode(page)).toBe("playing");

  await page.getByRole("button", { name: "Carnet" }).dispatchEvent("pointerdown");
  await expect.poll(() => mode(page)).toBe("journal");
  await expect(page.getByText("2 / 7 notes trouvées")).toBeVisible();
  await shot(page, "journal-mobile");
  await page.getByRole("button", { name: /Fermer le carnet/ }).tap();
  await expect.poll(() => mode(page)).toBe("playing");

  await page.evaluate(() => (window as any).__silo.openPause());
  await shot(page, "pause-mobile");
  expect(errors).toEqual([]);
  await context.close();
});

/** Nombre d'étapes affichées dans le panneau d'objectifs. */
const visibleSteps = (page: Page) => page.locator('section[aria-label="Objectifs"] li').count();

test("objectifs pliables : téléphone en portrait", async ({ browser }) => {
  test.setTimeout(300_000);
  const context = await browser.newContext({ viewport: { width: 390, height: 760 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  const errors = await boot(page);
  await page.evaluate(() => window.localStorage.removeItem("sillo8-objectives-open"));
  await page.evaluate(() => (window as any).__silo.newGame());
  await expect.poll(() => mode(page)).toBe("playing");
  const toggle = page.locator('section[aria-label="Objectifs"] button');
  // Replié par défaut sur téléphone : seulement la prochaine étape et le compteur.
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(toggle).toContainText("0/5");
  expect(await visibleSteps(page)).toBe(0);
  await expect(page.locator('section[aria-label="Objectifs"]')).toContainText("Explorer l'entrée");
  await shot(page, "objectifs-plies-portrait");
  // Un toucher déplie les 5 étapes, un autre replie.
  await toggle.tap();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  expect(await visibleSteps(page)).toBe(5);
  await shot(page, "objectifs-deplies-portrait");
  await toggle.tap();
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  // Le choix est mémorisé : déplié, il reste déplié après rechargement.
  await toggle.tap();
  expect(await page.evaluate(() => window.localStorage.getItem("sillo8-objectives-open"))).toBe("1");
  // Nouveau chargement de la page (même stockage), avec le même réglage de rendu que boot().
  errors.push(...(await boot(page)));
  await page.evaluate(() => (window as any).__silo.newGame());
  await expect(page.locator('section[aria-label="Objectifs"] button')).toHaveAttribute("aria-expanded", "true");
  // Le compteur suit la progression.
  await page.evaluate(() => (window as any).__silo.state.exploreEntrance());
  await expect(page.locator('section[aria-label="Objectifs"] button')).toContainText("1/5");
  // En portrait, la carte compacte (vie, lampe) ne chevauche ni le stick ni les boutons tactiles.
  const mini = await page.locator("section[aria-hidden]").filter({ hasText: "CLÉ À MOLETTE" }).boundingBox({ timeout: 10_000 });
  expect(mini).not.toBeNull();
  for (const name of ["Frapper", "Éblouir", "Changer d'arme", "Interagir", "S'accroupir"]) {
    const button = await page.getByRole("button", { name, exact: true }).boundingBox({ timeout: 10_000 });
    expect(button, name).not.toBeNull();
    const apart = mini!.y + mini!.height <= button!.y || button!.y + button!.height <= mini!.y || mini!.x + mini!.width <= button!.x || button!.x + button!.width <= mini!.x;
    expect(apart, `la carte compacte chevauche « ${name} »`).toBe(true);
  }
  expect(errors).toEqual([]);
  await context.close();
});

test("objectifs pliables : ordi au clic", async ({ page }) => {
  test.setTimeout(300_000);
  await page.setViewportSize({ width: 1280, height: 720 });
  const errors = await boot(page);
  await page.evaluate(() => window.localStorage.removeItem("sillo8-objectives-open"));
  await page.evaluate(() => (window as any).__silo.newGame());
  const toggle = page.locator('section[aria-label="Objectifs"] button');
  // Déplié par défaut sur ordi.
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  expect(await visibleSteps(page)).toBe(5);
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  expect(await visibleSteps(page)).toBe(0);
  // Le clic sur le panneau ne doit pas tirer : le chargeur reste plein.
  expect(await page.evaluate(() => (window as any).__silo.state.ammo)).toBe(16);
  expect(errors).toEqual([]);
});

test("sauvegarde automatique : progrès, minuterie, arrière-plan, reprise", async ({ page }) => {
  test.setTimeout(300_000);
  await page.setViewportSize({ width: 1280, height: 720 });
  const errors = await boot(page);
  const saved = () => page.evaluate(() => {
    const raw = window.localStorage.getItem("sillo8-save");
    return raw ? JSON.parse(raw) : null;
  });
  await page.evaluate(() => (window as any).__silo.newGame());
  // Un objet ramassé déclenche une sauvegarde à l'image suivante.
  await page.evaluate(() => (window as any).__silo.state.collect("part_0", "components", 1));
  await expect.poll(async () => (await saved())?.collected ?? []).toContain("part_0");
  await expect(page.getByRole("status").filter({ hasText: "Sauvegardé" })).toBeVisible();
  // Toutes les 30 s de jeu, même sans progrès : la position suit le joueur.
  await page.evaluate(() => {
    const engine = (window as any).__silo;
    engine.player.x = 4;
    engine.player.z = 38;
  });
  // boot() fait avancer la simulation de 1/30 s toutes les 40 ms : 30 s de jeu ≈ 36 s réelles.
  await expect.poll(async () => (await saved())?.player_position?.[0] ?? 0, { timeout: 60_000 }).toBeCloseTo(4, 0);
  // Passage en arrière-plan (téléphone verrouillé, autre appli) : sauvegarde immédiate.
  await page.evaluate(() => {
    const engine = (window as any).__silo;
    engine.state.readNote("note_entrance", false);
    Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "hidden" });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  expect((await saved())?.notes).toContain("note_entrance");
  // Après rechargement, le menu propose de continuer et la partie revient telle quelle.
  errors.push(...(await boot(page, true)));
  await expect(page.getByRole("button", { name: /CONTINUER/i })).toBeEnabled();
  await page.getByRole("button", { name: /CONTINUER/i }).click({ force: true });
  await expect.poll(() => mode(page)).toBe("playing");
  const state = await page.evaluate(() => {
    const engine = (window as any).__silo;
    return { notes: engine.state.notes, components: engine.state.components };
  });
  expect(state.notes).toContain("note_entrance");
  expect(state.components).toBe(1);
  // Mort : aucune sauvegarde ne remplace la dernière.
  const before = JSON.stringify(await saved());
  await page.evaluate(() => (window as any).__silo.damagePlayer(999));
  await page.waitForTimeout(500);
  expect(JSON.stringify(await saved())).toBe(before);
  expect(errors).toEqual([]);
});
