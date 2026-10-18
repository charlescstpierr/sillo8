// Gros plan de l'opératrice sous 4 angles et planche d'animations, depuis la caméra du jeu.
import { expect, test, type Page } from "@playwright/test";

const SHOTS = process.env.SHOTS_DIR ?? "docs/screenshots";

async function boot(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  await page.goto("/");
  await page.waitForFunction(() => Boolean((window as any).__silo), null, { timeout: 30_000 });
  // Le jeu s'ouvre sur le menu principal : on lance une descente.
  await page.evaluate(() => (window as any).__silo.newGame());
  await page.waitForTimeout(800);
  return errors;
}

async function step(page: Page, seconds: number, setup?: string) {
  await page.evaluate(([s, code]) => {
    const engine = (window as any).__silo;
    engine.stop();
    if (code) new Function("engine", code as string)(engine);
    for (let t = 0; t < (s as number); t += 1 / 30) engine.tick(1 / 30);
  }, [seconds, setup ?? ""] as const);
}

test("opérateur : gros plan 4 vues", async ({ browser }) => {
  test.setTimeout(600_000);
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const errors = await boot(page);
  await page.mouse.move(640, 300);
  // Face et droite : clé à molette en main ; dos et gauche : lance-clous en main, clé à la ceinture.
  const views: [string, string, number][] = [["face", "0", 0], ["droite", "Math.PI / 2", 0], ["dos", "Math.PI", 1], ["gauche", "-Math.PI / 2", 1]];
  for (const [name, yaw, weapon] of views) {
    const place = `engine.input.releaseAll(); engine.input.pointer = null; engine.operator.root.userData.animOverride = { weapon: ${weapon}, aiming: false };`
      + ` engine.horde.root.visible = false; for (const z of engine.horde.zombies) { z.x = 90; z.z = 90; }`
      + ` engine.player.x = -3; engine.player.z = 3; engine.player.yaw = ${yaw}; engine.rig.desiredDistance = 6; engine.rig.snap(new engine.rig.focus.constructor(-3, 0.7, 3));`;
    await step(page, 0.6, place);
    await step(page, 0, place + " engine.operator.root.rotation.y = engine.player.yaw; engine.tick(0); engine.player.yaw = " + yaw + "; engine.operator.root.rotation.y = " + yaw + "; engine.rig.snap(new engine.rig.focus.constructor(-3, 0.7, 3)); engine.renderer.render(engine.scene, engine.camera);");
    const center = await page.evaluate(() => {
      const engine = (window as any).__silo;
      const v = new engine.rig.focus.constructor(-3, 0.7, 3).project(engine.camera);
      return { x: (v.x * 0.5 + 0.5) * 1280, y: (-v.y * 0.5 + 0.5) * 720 };
    });
    await page.screenshot({ path: `${SHOTS}/operator-${name}.png`, clip: { x: Math.round(center.x - 120), y: Math.round(center.y - 140), width: 240, height: 240 } });
  }
  await page.evaluate(() => { delete (window as any).__silo.operator.root.userData.animOverride; });
  expect(errors).toEqual([]);
  await context.close();
});

/** Avance image par image ; `perFrame` reçoit `engine` et `f` (indice d'image). */
async function frames(page: Page, count: number, setup: string, perFrame: string) {
  await page.evaluate(([n, code, each]) => {
    const engine = (window as any).__silo;
    engine.stop();
    new Function("engine", code as string)(engine);
    const frame = new Function("engine", "f", each as string);
    for (let f = 0; f < (n as number); f++) {
      frame(engine, f);
      engine.tick(1 / 30);
    }
  }, [count, setup, perFrame] as const);
}

// Planche de poses (docs/screenshots/sillo8-poses.png via tools/compose_poses.py).
// Les paramètres d'arme sont forcés par operator.root.userData.animOverride, indépendamment du combat.
test("opérateur : planche d'animations", async ({ browser }) => {
  test.setTimeout(600_000);
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const errors = await boot(page);
  const set = (o: string) => `engine.operator.root.userData.animOverride = ${o};`;
  const poses: [string, string, number, string][] = [
    ["marche", "engine.input.keyDown('KeyD');", 16, ""],
    ["course", "engine.input.keyDown('KeyD'); engine.input.keyDown('ShiftLeft');", 15, ""],
    ["accroupi", "engine.input.keyDown('ControlLeft');", 15, set("{ weapon: 1 }")],
    ["cle", "", 14, set("{ aiming: false, swing: Math.min(0.46, f * 0.035) }")],
    ["lance-clous", "", 12, set("{ weapon: 1, aiming: true, shotTime: f >= 9 ? 0.16 - (f - 9) * 0.02 : 0 }")],
    ["recharge", "", 16, set("{ weapon: 1, aiming: false, reload: Math.min(0.66, 0.04 + f * 0.04) }")],
    ["eblouir", "", 10, set("{ aiming: false, dazzle: 0.22 }")],
  ];
  const reset = "engine.input.releaseAll(); engine.input.pointer = null; delete engine.operator.root.userData.animOverride; engine.operator.droppedMag.visible = false; engine.horde.root.visible = false; for (const z of engine.horde.zombies) { z.x = 90; z.z = 90; }"
    + " engine.player.x = -3; engine.player.z = 3; engine.player.yaw = Math.PI / 2; engine.rig.desiredDistance = 8; engine.rig.snap(new engine.rig.focus.constructor(-3, 0.6, 3));";
  for (const [name, setup, count, perFrame] of poses) {
    await frames(page, 4, reset, set("{ aiming: false }"));
    await frames(page, count, setup, perFrame);
    const center = await page.evaluate(() => {
      const engine = (window as any).__silo;
      engine.rig.snap(new engine.rig.focus.constructor(engine.player.x, 0.6, engine.player.z));
      engine.tick(0);
      const v = new engine.rig.focus.constructor(engine.player.x, 0.8, engine.player.z).project(engine.camera);
      return { x: (v.x * 0.5 + 0.5) * 1280, y: (-v.y * 0.5 + 0.5) * 720 };
    });
    await page.screenshot({ path: `${SHOTS}/pose-${name}.png`, clip: { x: Math.round(center.x - 160), y: Math.round(center.y - 200), width: 320, height: 320 } });
  }
  await page.evaluate(() => { delete (window as any).__silo.operator.root.userData.animOverride; });
  expect(errors).toEqual([]);
  await context.close();
});
