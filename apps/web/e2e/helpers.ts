import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";

export async function openLab(page: Page, locale = "en", query = "") {
  await page.goto(`/${locale}/lab${query}`);
  await expect(page.getByTestId("engine-status")).toHaveAttribute("data-status", "ready");
}

/** The palette's category rail (its tabs, not the bottom panel's). */
export const paletteRail = (page: Page) => page.getByTestId("palette").getByRole("tablist");

/** A palette row, found through the drawer's search (rows show only in the open category). */
export async function paletteItem(page: Page, name: string) {
  const search = page.getByRole("searchbox", { name: /^(Search components|Tìm thành phần)$/ });
  if (!(await search.isVisible())) await paletteRail(page).getByRole("tab").first().click();
  await search.fill(name);
  return page.getByRole("button", { name: new RegExp(`^(Add|Thêm) ${name}$`) });
}

/** Clears the drawer's search. */
export async function clearPaletteSearch(page: Page) {
  await page.getByRole("searchbox", { name: /^(Search components|Tìm thành phần)$/ }).fill("");
}

/**
 * Drags a component from the drawer to a point on the canvas, then closes the drawer so the canvas
 * is wide again. Points are relative to the canvas while the drawer is open (about 730 px wide).
 */
export async function addAt(page: Page, name: string, x: number, y: number) {
  await (await paletteItem(page, name)).dragTo(page.getByTestId("lab-canvas"), { targetPosition: { x, y } });
  await clearPaletteSearch(page);
  await paletteRail(page).locator('[role="tab"][aria-selected="true"]').click();
}

/** The centre of an element once React Flow has measured and placed it (two equal reads). */
async function settledCentre(page: Page, testId: string) {
  const el = page.getByTestId(testId);
  await expect(el).toBeVisible();
  let last = "";
  await expect
    .poll(async () => {
      const b = await el.boundingBox();
      const now = b ? JSON.stringify(b) : "";
      const stable = now !== "" && now === last;
      last = now;
      return stable;
    })
    .toBe(true);
  const b = (await el.boundingBox())!;
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
}

export async function connectByDrag(page: Page, from: string, to: string) {
  // A node just dropped from the palette is measured and placed on the next frames; reading
  // its handle earlier can aim the drag at a stale position.
  await expect(page.getByTestId(`node-${from}`)).toBeVisible();
  await expect(page.getByTestId(`node-${to}`)).toBeVisible();
  const a = await settledCentre(page, `handle-out-${from}`);
  const b = await settledCentre(page, `handle-in-${to}`);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(b.x, b.y, { steps: 12 });
  await page.mouse.up();
}

/** Drags a connection from a node's output port and drops it on the middle of another node's card. */
export async function connectToCard(page: Page, from: string, to: string) {
  await expect(page.getByTestId(`node-${from}`)).toBeVisible();
  const a = await settledCentre(page, `handle-out-${from}`);
  const b = await settledCentre(page, `node-${to}`);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(b.x, b.y, { steps: 12 });
  await page.mouse.up();
}

/** client → lb → web-server (×replicas) → postgres, laid out on one row. */
export async function buildFourTier(page: Page, webReplicas = 2) {
  await addAt(page, "Users", 90, 220);
  await addAt(page, "Load balancer", 290, 220);
  await addAt(page, "Web server", 490, 220);
  await addAt(page, "PostgreSQL", 690, 220);
  await connectByDrag(page, "client-1", "lb-1");
  await connectByDrag(page, "lb-1", "web-server-1");
  await connectByDrag(page, "web-server-1", "postgres-1");
  if (webReplicas !== 1) {
    await page.getByTestId("node-web-server-1").click();
    const r = page.getByRole("complementary", { name: "Inspector" }).getByRole("spinbutton", { name: "Replicas" });
    await r.fill(String(webReplicas));
    await r.press("Enter");
  }
  // Leave the inspector field first: Escape does not clear the selection while typing (review I7).
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("problems")).toHaveText("No problems");
  // The pill keeps the last result while a re-check is pending; an enabled Run button means it is current.
  await expect(page.getByTestId("run-bar").getByRole("button", { name: /^Run simulation/ })).toBeEnabled();
}

export async function runOnce(page: Page): Promise<string> {
  const bar = page.getByTestId("run-bar");
  const before = await bar.getAttribute("data-run-id");
  await bar.getByRole("button", { name: /^Run simulation/ }).click();
  await expect(bar).not.toHaveAttribute("data-run-id", before ?? "");
  await expect(bar).toHaveAttribute("data-status", "idle");
  return (await bar.getAttribute("data-run-id"))!;
}

/** Spec §7: no serious or critical axe violations (WCAG 2.2 A and AA rules). */
export async function expectAccessible(page: Page, label: string) {
  const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
  const bad = r.violations
    .filter((v) => v.impact === "serious" || v.impact === "critical")
    .map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).slice(0, 5).join(" | ")}`);
  expect(bad, label).toEqual([]);
}

/** Presses Tab until the canvas node `id` has focus (keyboard-only tests). */
export async function focusNode(page: Page, id: string) {
  for (let i = 0; i < 120; i++) {
    const current = await page.evaluate(() => document.activeElement?.closest<HTMLElement>(".react-flow__node")?.dataset.id ?? null);
    if (current === id) return;
    await page.keyboard.press("Tab");
  }
  throw new Error(`could not reach node ${id} with Tab`);
}

/** Presses Tab until the focused element has this accessible name. */
export async function tabTo(page: Page, name: string) {
  for (let i = 0; i < 120; i++) {
    const n = await page.evaluate(() => {
      const el = document.activeElement;
      const id = el?.getAttribute("id");
      const byLabel = id ? document.querySelector(`label[for="${id}"]`)?.textContent?.trim() : null;
      return el?.getAttribute("aria-label") ?? byLabel ?? el?.textContent?.trim() ?? "";
    });
    if (n === name) return;
    await page.keyboard.press("Tab");
  }
  throw new Error(`could not reach "${name}" with Tab`);
}
