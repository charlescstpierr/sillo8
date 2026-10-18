// Parcours de l'interface papier : menu, pause, inventaire, dialogue, fin, conclusion, mort.
import { expect, test, type Page } from "@playwright/test";

const SHOTS = process.env.SHOTS_DIR ?? "docs/screenshots";

async function boot(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  await page.goto("/");
  await page.waitForFunction(() => Boolean((window as any).__silo), null, { timeout: 30_000 });
  await page.evaluate(() => {
    window.localStorage.removeItem("silo9-save");
    // Le rendu logiciel (swiftshader) prend des secondes par image : la simulation tourne
    // sans dessiner, et on ne dessine qu'au moment des captures.
    const engine = (window as any).__silo;
    engine.stop();
    const renderer = engine.renderer;
    engine.__draw = renderer.render.bind(renderer);
    renderer.render = () => undefined;
    setInterval(() => engine.tick(1 / 30), 40);
  });
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
  await page.screenshot({ path: `${SHOTS}/ui-${name}.png`, animations: "disabled" });
}

test("ordi : parcours complet de l'interface", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  const errors = await boot(page);

  // Menu
  await expect.poll(() => mode(page)).toBe("menu");
  await expect(page.getByRole("heading", { name: "SILLO 8" })).toBeVisible();
  await expect(page.getByRole("button", { name: /CONTINUER LA SAUVEGARDE/ })).toBeDisabled();
  await shot(page, "menu");

  // Réglages depuis le menu, Échap revient au menu
  await page.getByRole("button", { name: "Réglages" }).click();
  await expect(page.getByRole("heading", { name: "Réglages" })).toBeVisible();
  await expect(page.getByText("indisponible sur ce serveur")).toBeVisible();
  await page.getByPlaceholder("http://127.0.0.1:8080").fill("http://exemple.com");
  await page.getByRole("button", { name: /Appliquer et revenir/ }).click();
  await expect(page.getByText(/^Adresse refusée/)).toBeVisible();
  await shot(page, "settings");
  await page.getByPlaceholder("http://127.0.0.1:8080").fill("");
  await page.keyboard.press("Escape");
  await expect.poll(() => mode(page)).toBe("menu");

  // Nouvelle partie
  await page.getByRole("button", { name: /NOUVELLE DESCENTE/ }).click();
  await expect.poll(() => mode(page)).toBe("playing");
  await page.waitForTimeout(600);
  await shot(page, "hud");

  // Pause (Échap via le moteur), sauvegarde
  await page.keyboard.press("Escape");
  await expect(page.getByRole("heading", { name: "Signal suspendu" })).toBeVisible();
  await page.getByRole("button", { name: /Sauvegarder/ }).click();
  await expect(page.getByRole("status")).toContainText("Progression sauvegardée");
  await expect(page.getByRole("button", { name: /Charger la sauvegarde/ })).toBeEnabled();
  await shot(page, "pause");
  await page.keyboard.press("Escape");
  await expect.poll(() => mode(page)).toBe("playing");

  // Inventaire (Tab)
  await page.evaluate(() => { (window as any).__silo.state.health = 60; });
  await page.keyboard.press("Tab");
  await expect(page.getByRole("heading", { name: "Équipement" })).toBeVisible();
  await page.getByRole("button", { name: /Utiliser une trousse/ }).click();
  await expect(page.locator("li", { hasText: "trousses" })).toContainText("1");
  await shot(page, "inventory");
  await page.getByRole("button", { name: /Retour au terrain/ }).click();
  await expect.poll(() => mode(page)).toBe("playing");

  // Dialogue avec N-7
  await page.evaluate(() => (window as any).__silo.openConversation("n7"));
  const input = page.getByPlaceholder("Écrivez à ce personnage…");
  await expect(input).toBeVisible();
  await input.fill("Comment recharger ma batterie ?");
  await input.press("Enter");
  await expect(page.getByRole("log")).toContainText("VOUS");
  await expect(page.getByRole("log")).toContainText("L'ascenseur recharge gratuitement");
  await expect(page.getByRole("log")).toContainText("[hors ligne]");
  await page.getByRole("button", { name: /Que savez-vous de la surface/ }).click();
  await expect(page.getByRole("log")).toContainText("[dialogue scénarisé]");
  await shot(page, "dialogue");
  await page.getByRole("button", { name: "Fermer la liaison" }).click();
  await expect.poll(() => mode(page)).toBe("playing");

  // Fin forcée
  await page.evaluate(() => {
    const engine = (window as any).__silo;
    const s = engine.state;
    s.discoverRelay();
    s.collect("x", "components", 3);
    s.repairRelay();
    s.recoverCore();
    engine.openEnding();
  });
  await expect(page.getByRole("heading", { name: "Quel sera votre choix ?" })).toBeVisible();
  await shot(page, "ending");
  await page.getByRole("button", { name: /N-7$/ }).click();
  await expect.poll(() => mode(page)).toBe("conclusion");
  await expect(page.getByText("ÉMANCIPATION")).toBeVisible();
  await shot(page, "conclusion");

  // Mort
  await page.getByRole("button", { name: "Recommencer une descente" }).click();
  await expect.poll(() => mode(page)).toBe("playing");
  await page.evaluate(() => (window as any).__silo.damagePlayer(999));
  await expect(page.getByRole("heading", { name: "Signal perdu" })).toBeVisible();
  await shot(page, "death");
  await page.getByRole("button", { name: "Menu principal" }).click();
  await expect.poll(() => mode(page)).toBe("menu");
  await expect(page.getByRole("button", { name: /CONTINUER LA SAUVEGARDE/ })).toBeEnabled();

  expect(errors).toEqual([]);
});

test("ordi : vie basse", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  const errors = await boot(page);
  await page.evaluate(() => {
    const engine = (window as any).__silo;
    engine.newGame();
    engine.combat.weapon = 1;
    engine.state.health = 12;
  });
  await shot(page, "hud-low");
  expect(errors).toEqual([]);
});

test("téléphone paysage : menu, jeu et dialogue", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  const errors = await boot(page);
  await expect(page.getByRole("heading", { name: "SILLO 8" })).toBeVisible();
  await shot(page, "menu-mobile");

  await page.getByRole("button", { name: /NOUVELLE DESCENTE/ }).tap();
  await expect.poll(() => mode(page)).toBe("playing");
  await page.evaluate(() => { (window as any).__silo.input.device = "touch"; });
  await expect(page.getByRole("button", { name: "Inventaire" })).toBeVisible();
  await shot(page, "hud-mobile");

  await page.getByRole("button", { name: "Inventaire" }).dispatchEvent("pointerdown");
  await expect(page.getByRole("heading", { name: "Équipement" })).toBeVisible();
  await shot(page, "inventory-mobile");
  await page.getByRole("button", { name: /Retour au terrain/ }).tap();

  await page.evaluate(() => (window as any).__silo.openConversation("mother"));
  const input = page.getByPlaceholder("Écrivez à ce personnage…");
  await input.tap();
  await input.fill("Que dois-je faire ?");
  await page.getByRole("button", { name: "Transmettre" }).tap();
  await expect(page.getByRole("log")).toContainText("[hors ligne]");
  await shot(page, "dialogue-mobile");
  await page.getByRole("button", { name: "Fermer la liaison" }).tap();

  await page.evaluate(() => (window as any).__silo.openPause());
  await shot(page, "pause-mobile");
  expect(errors).toEqual([]);
  await context.close();
});
