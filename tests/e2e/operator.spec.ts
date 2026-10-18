// Gros plan de l'opérateur sous 4 angles, depuis la caméra du jeu (vérification visuelle du modèle).
import { expect, test, type Page } from "@playwright/test";

const SHOTS = process.env.SHOTS_DIR ?? "docs/screenshots";

async function boot(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  await page.goto("/");
  await page.waitForFunction(() => Boolean((window as any).__silo), null, { timeout: 30_000 });
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
  test.setTimeout(200_000);
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const errors = await boot(page);
  await page.mouse.move(640, 300);
  const views: [string, string][] = [["face", "0"], ["droite", "Math.PI / 2"], ["dos", "Math.PI"], ["gauche", "-Math.PI / 2"]];
  for (const [name, yaw] of views) {
    const place = `engine.input.releaseAll(); engine.input.pointer = null; engine.player.x = 0; engine.player.z = 8.6; engine.player.yaw = ${yaw}; engine.rig.desiredDistance = 6; engine.rig.snap(new engine.rig.focus.constructor(0, 0.7, 8.6));`;
    await step(page, 0.6, place);
    await step(page, 0, place + " engine.operator.root.rotation.y = engine.player.yaw; engine.tick(0); engine.player.yaw = " + yaw + "; engine.operator.root.rotation.y = " + yaw + "; engine.rig.snap(new engine.rig.focus.constructor(0, 0.7, 8.6)); engine.renderer.render(engine.scene, engine.camera);");
    const center = await page.evaluate(() => {
      const engine = (window as any).__silo;
      const v = new engine.rig.focus.constructor(0, 0.7, 8.6).project(engine.camera);
      return { x: (v.x * 0.5 + 0.5) * 1280, y: (-v.y * 0.5 + 0.5) * 720 };
    });
    await page.screenshot({ path: `${SHOTS}/operator-${name}.png`, clip: { x: Math.round(center.x - 120), y: Math.round(center.y - 140), width: 240, height: 240 } });
  }
  expect(errors).toEqual([]);
  await context.close();
});
