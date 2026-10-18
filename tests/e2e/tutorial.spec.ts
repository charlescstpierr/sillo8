// Tutoriel léger : première bulle en nouvelle partie (ordi, téléphone portrait et paysage), disparition
// après l'action, aucun chevauchement avec le HUD ni les boutons tactiles, flèche d'objectif réglable.
import { expect, test, type Locator, type Page } from "@playwright/test";

const SHOTS = process.env.SHOTS_DIR ?? "docs/screenshots";

test.setTimeout(300_000);

async function boot(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  await page.goto("/");
  await page.waitForFunction(() => Boolean((window as any).__silo), null, { timeout: 30_000 });
  await page.evaluate(() => {
    window.localStorage.removeItem("sillo8-save");
    window.localStorage.removeItem("sillo8-tutorial");
    window.localStorage.removeItem("sillo8-settings");
    const engine = (window as any).__silo;
    engine.tutorial.replay();
    engine.tutorial.arrowMode = "auto";
    // Rendu logiciel lent : la simulation tourne sans dessiner, on ne dessine qu'aux captures.
    engine.stop();
    const renderer = engine.renderer;
    engine.__draw = renderer.render.bind(renderer);
    renderer.render = () => undefined;
    setInterval(() => engine.tick(1 / 30), 40);
  });
  return errors;
}

const mode = (page: Page) => page.evaluate(() => (window as any).__silo.ui.get().mode as string);

async function shot(page: Page, name: string) {
  await page.waitForTimeout(500);
  await page.evaluate(() => {
    const engine = (window as any).__silo;
    engine.__draw(engine.scene, engine.camera);
  });
  await page.screenshot({ path: `${SHOTS}/sillo8-ui-${name}.png`, animations: "disabled" });
}

/** Vérifie que la bulle ne recouvre aucun des éléments donnés (ceux qui sont affichés). */
async function expectApart(bubble: Locator, others: [string, Locator][]) {
  const box = await bubble.boundingBox({ timeout: 10_000 });
  expect(box, "bulle affichée").not.toBeNull();
  for (const [name, locator] of others) {
    if ((await locator.count()) === 0 || !(await locator.first().isVisible())) continue;
    const other = await locator.first().boundingBox();
    if (!other) continue;
    const apart = box!.y + box!.height <= other.y || other.y + other.height <= box!.y || box!.x + box!.width <= other.x || other.x + other.width <= box!.x;
    expect(apart, `la bulle chevauche « ${name} »`).toBe(true);
  }
  return box!;
}

const bubble = (page: Page) => page.getByRole("note", { name: "Conseil" });

function touchObstacles(page: Page): [string, Locator][] {
  const named = ["Examiner", "Frapper", "Éblouir", "Lampe UV", "Changer d'arme", "S'accroupir", "Pause", "Sac", "Carnet"]
    .map((name) => [name, page.getByRole("button", { name, exact: true })] as [string, Locator]);
  return [
    ...named,
    ["Vie et lampe", page.locator('section[aria-label="Vie et lampe"]')],
    ["Objectifs", page.locator('section[aria-label="Objectifs"]')],
    ["stick", page.getByText("déplacer", { exact: true })],
  ];
}

test("ordi : première bulle, disparition après l'action, flèche réglable", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  const errors = await boot(page);
  await page.getByRole("button", { name: /NOUVELLE DESCENTE/ }).click();
  await expect.poll(() => mode(page)).toBe("playing");

  // Première bulle : se déplacer, au clavier.
  await expect(bubble(page)).toBeVisible();
  await expect(bubble(page)).toContainText("ZQSD / WASD");
  const box = await expectApart(bubble(page), [
    ["État du survivant", page.locator('section[aria-label="État du survivant"]')],
    ["Objectifs", page.locator('section[aria-label="Objectifs"]')],
    ["Rappel des commandes", page.locator("p[aria-label*='Clic droit']")],
  ]);
  // Jamais sur le bricoleur (au centre de l'écran) : bulle dans le bas de l'écran.
  expect(box.y, "bulle sous le bricoleur").toBeGreaterThan(720 * 0.62);
  await shot(page, "tuto-ordi");

  // Se déplacer fait disparaître la bulle, et l'étape est mémorisée.
  await page.keyboard.down("KeyW");
  await expect(bubble(page)).toHaveCount(0, { timeout: 15_000 });
  await page.keyboard.up("KeyW");
  expect(await page.evaluate(() => JSON.parse(window.localStorage.getItem("sillo8-tutorial") ?? "{}").done)).toContain("move");

  // La flèche n'est pas là tout de suite (mode auto : seulement après ~45 s sans progrès).
  expect(await page.evaluate(() => (window as any).__silo.guide.root.visible)).toBe(false);

  // Réglages (depuis la pause) : flèche toujours visible.
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Réglages" }).click();
  const select = page.getByLabel("Flèche d'objectif");
  await expect(select).toHaveValue("auto");
  await select.selectOption("always");
  await shot(page, "tuto-reglages");
  await page.getByRole("button", { name: /Appliquer et revenir/ }).click();
  await page.getByRole("button", { name: /Reprendre/ }).click();
  await expect.poll(() => mode(page)).toBe("playing");
  await page.evaluate(() => {
    const engine = (window as any).__silo;
    engine.player.x = 0;
    engine.player.z = 42;
    engine.rig.snap(new engine.rig.focus.constructor(0, 0, 42));
  });
  await expect.poll(() => page.evaluate(() => (window as any).__silo.guide.root.visible)).toBe(true);
  await shot(page, "tuto-fleche");
  expect(await page.evaluate(() => JSON.parse(window.localStorage.getItem("sillo8-settings") ?? "{}").objectiveArrow)).toBe("always");

  // … puis désactivée.
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Réglages" }).click();
  await page.getByLabel("Flèche d'objectif").selectOption("never");
  // « Revoir le tutoriel » efface les étapes vues.
  await page.getByRole("button", { name: "Revoir le tutoriel" }).click();
  await expect(page.getByRole("button", { name: "Tutoriel relancé" })).toBeDisabled();
  await page.getByRole("button", { name: /Appliquer et revenir/ }).click();
  await page.getByRole("button", { name: /Reprendre/ }).click();
  await expect.poll(() => page.evaluate(() => (window as any).__silo.guide.root.visible)).toBe(false);
  expect(await page.evaluate(() => JSON.parse(window.localStorage.getItem("sillo8-tutorial") ?? "{}").done)).toEqual([]);
  await expect(bubble(page)).toContainText("ZQSD / WASD");
  expect(errors).toEqual([]);
});

test("téléphone portrait : bulles au-dessus des commandes, pointées vers le bouton", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 760 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  const errors = await boot(page);
  await page.getByRole("button", { name: /NOUVELLE DESCENTE/ }).tap();
  await expect.poll(() => mode(page)).toBe("playing");
  await page.evaluate(() => { (window as any).__silo.input.device = "touch"; });

  await expect(bubble(page)).toContainText("Stick");
  await expect(page.getByText("déplacer", { exact: true })).toHaveAttribute("data-tutorial", "true");
  await expectApart(bubble(page), touchObstacles(page));
  await shot(page, "tuto-portrait");

  // Le stick bouge : la bulle disparaît.
  await page.evaluate(() => { (window as any).__silo.input.touchMove.y = 0.6; });
  await expect(bubble(page)).toHaveCount(0, { timeout: 15_000 });
  await page.evaluate(() => { (window as any).__silo.input.touchMove.y = 0; });

  // Près de la note de l'entrée : le gros bouton EXAMINER (enquête d'abord).
  await page.evaluate(() => {
    const engine = (window as any).__silo;
    engine.player.x = -8;
    engine.player.z = 32;
    engine.player.vx = engine.player.vz = 0;
    engine.rig.snap(new engine.rig.focus.constructor(-8, 0, 32));
  });
  await expect(bubble(page)).toContainText("EXAMINER", { timeout: 15_000 });
  await expect(page.getByRole("button", { name: "Examiner", exact: true })).toHaveAttribute("data-tutorial", "true");
  await expectApart(bubble(page), touchObstacles(page));
  await shot(page, "tuto-portrait-examiner");
  expect(errors).toEqual([]);
  await context.close();
});

test("téléphone paysage : la bulle reste entre le stick et les boutons", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  const errors = await boot(page);
  await page.getByRole("button", { name: /NOUVELLE DESCENTE/ }).tap();
  await expect.poll(() => mode(page)).toBe("playing");
  await page.evaluate(() => { (window as any).__silo.input.device = "touch"; });
  await expect(bubble(page)).toContainText("Stick");
  await expectApart(bubble(page), touchObstacles(page));
  await shot(page, "tuto-paysage");
  expect(errors).toEqual([]);
  await context.close();
});
