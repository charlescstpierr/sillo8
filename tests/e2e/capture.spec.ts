// Captures d'écran de référence (ordi et téléphone) et vérifications de base dans un vrai navigateur.
import { expect, test, type Page } from "@playwright/test";

const SHOTS = process.env.SHOTS_DIR ?? "docs/screenshots";

async function boot(page: Page, query = "") {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  await page.goto("/" + query);
  await page.waitForFunction(() => Boolean((window as any).__silo), null, { timeout: 30_000 });
  // Le jeu s'ouvre sur le menu principal : on lance une descente.
  await page.evaluate(() => (window as any).__silo.newGame());
  await page.waitForTimeout(800);
  return errors;
}

/** Avance la simulation sans dépendre du rythme du navigateur headless. */
async function step(page: Page, seconds: number, setup?: string) {
  await page.evaluate(([s, code]) => {
    const engine = (window as any).__silo;
    engine.stop();
    if (code) new Function("engine", code as string)(engine);
    for (let t = 0; t < (s as number); t += 1 / 30) engine.tick(1 / 30);
  }, [seconds, setup ?? ""] as const);
}

test("ordi : refuge et secteur 01", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  const errors = await boot(page);
  await page.mouse.move(640, 300);
  await step(page, 1.2);
  await page.screenshot({ path: `${SHOTS}/step1-refuge.png` });

  // Marche jusque dans la décontamination, près d'un composant.
  await step(page, 0.1, "engine.player.x = -4.6; engine.player.z = -0.6; engine.rig.snap(new engine.rig.focus.constructor(-4.6, 0, -0.6));");
  await page.mouse.move(470, 330);
  await step(page, 1.0);
  const prompt = await page.evaluate(() => (window as any).__silo.hud.get().prompt);
  expect(prompt?.name).toBe("Composant");
  await page.screenshot({ path: `${SHOTS}/step1-decon.png` });
  expect(errors).toEqual([]);
});

test("téléphone paysage : commandes tactiles", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  const errors = await boot(page, "?low=0");
  await step(page, 0.1, "engine.input.device = 'touch'; engine.player.x = 2.5; engine.player.z = -3.5; engine.rig.snap(new engine.rig.focus.constructor(2.5, 0, -3.5));");
  await step(page, 0.6, "engine.input.touchMove.x = 0.6; engine.input.touchMove.y = 0.5;");
  await page.screenshot({ path: `${SHOTS}/step1-mobile.png` });
  expect(errors).toEqual([]);
  await context.close();
});

test("animations de l'opérateur", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  const errors = await boot(page);
  const poses: [string, string, number][] = [
    ["marche", "engine.input.releaseAll(); engine.input.pointer = null; engine.input.keyDown('KeyD');", 0.55],
    ["course", "engine.input.releaseAll(); engine.input.pointer = null; engine.input.keyDown('KeyD'); engine.input.keyDown('ShiftLeft');", 0.5],
    ["accroupi", "engine.input.releaseAll(); engine.input.pointer = null; engine.input.keyDown('ControlLeft');", 0.6],
    ["tir", "engine.input.releaseAll(); engine.input.pointer = { x: 0.45, y: -0.05 }; engine.input.mouseFiring = true;", 0.3],
    ["recharge", "engine.input.releaseAll(); engine.input.pointer = { x: 0.45, y: -0.05 }; engine.state.ammo = 4; engine.input.trigger('reload');", 0.75],
  ];
  for (const [name, setup, seconds] of poses) {
    await step(page, 0.05, "engine.player.x = 0; engine.player.z = 8.6; engine.player.yaw = Math.PI / 2; engine.rig.desiredDistance = 9; engine.rig.snap(new engine.rig.focus.constructor(0, 0.6, 8.6)); engine.state.ammo = 12;");
    await step(page, seconds, setup);
    await step(page, 0, "engine.rig.snap(new engine.rig.focus.constructor(engine.player.x, 0.6, engine.player.z)); engine.tick(0);");
    const center = await page.evaluate(() => {
      const engine = (window as any).__silo;
      const v = new engine.rig.focus.constructor(engine.player.x, 0.8, engine.player.z).project(engine.camera);
      return { x: (v.x * 0.5 + 0.5) * 1280, y: (-v.y * 0.5 + 0.5) * 720 };
    });
    await page.screenshot({ path: `${SHOTS}/pose-${name}.png`, clip: { x: Math.round(center.x - 180), y: Math.round(center.y - 230), width: 360, height: 360 } });
  }
  expect(errors).toEqual([]);
});
