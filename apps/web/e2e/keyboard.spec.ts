import { expect, test, type Page } from "@playwright/test";
import { focusNode, openLab } from "./helpers";

async function addByPalette(page: Page, query: string) {
  await page.keyboard.press("Control+k");
  await page.keyboard.type(query);
  await expect(page.getByRole("option").first()).toBeVisible();
  await page.keyboard.press("Enter");
}

/** Tab to a node, press C, and pick the target in the connect list by its name. */
async function connectTo(page: Page, from: string, target: RegExp) {
  await focusNode(page, from);
  await page.keyboard.press("c");
  const dialog = page.getByRole("dialog", { name: /^Connect / });
  await expect(dialog).toBeVisible();
  for (let i = 0; i < 6; i++) {
    const active = await dialog.locator('[aria-selected="true"], [data-highlighted]').first().textContent().catch(() => "");
    if (active && target.test(active)) break;
    await page.keyboard.press("ArrowDown");
  }
  await page.keyboard.press("Enter");
  await expect(dialog).toHaveCount(0);
}

test("build client → lb → web → postgres with the keyboard only, then run it", async ({ page }) => {
  await openLab(page);
  await addByPalette(page, "Users");
  await addByPalette(page, "Load balancer");
  await addByPalette(page, "Web server");
  await addByPalette(page, "PostgreSQL");
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await page.keyboard.press("Escape");

  await connectTo(page, "client-1", /Load balancer 1/);
  await connectTo(page, "lb-1", /Web server 1/);
  await connectTo(page, "web-server-1", /PostgreSQL 1/);
  await expect(page.locator("g[data-testid^='edge-e']")).toHaveCount(3);

  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("problems")).toHaveText("No problems");
  await page.keyboard.press("Control+Enter");
  await expect(page.getByTestId("run-bar")).toHaveAttribute("data-run-id", /\d+/);
  await expect(page.getByTestId("metric-p95")).toBeVisible();
});

test("arrow keys move a focused node by one grid step, and undo puts it back", async ({ page }) => {
  await openLab(page);
  await addByPalette(page, "Web server");
  await focusNode(page, "web-server-1");
  const before = (await page.getByTestId("node-web-server-1").boundingBox())!;
  await page.keyboard.press("ArrowRight");
  await expect.poll(async () => (await page.getByTestId("node-web-server-1").boundingBox())!.x).toBeGreaterThan(before.x);
  await page.keyboard.press("Control+z");
  await expect.poll(async () => Math.round((await page.getByTestId("node-web-server-1").boundingBox())!.x)).toBe(Math.round(before.x));
});
