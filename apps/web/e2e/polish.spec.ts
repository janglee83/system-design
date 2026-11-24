import { expect, test, type Page } from "@playwright/test";
import { buildFourTier, openLab, paletteItem } from "./helpers";

/** Labels whose text does not fit (they must wrap instead, design-system §4.1). */
async function truncatedLabels(page: Page) {
  return page
    .getByRole("complementary", { name: /^(Inspector|Thuộc tính)$/ })
    .locator("[data-field] > label")
    .evaluateAll((els) => els.filter((e) => e.scrollWidth > e.clientWidth || e.scrollHeight > e.clientHeight + 1).map((e) => e.textContent));
}

test("no truncated inspector label at 1280 px in Vietnamese, for the design and for a node", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await openLab(page, "vi");
  const inspector = page.getByRole("complementary", { name: "Thuộc tính" });
  await expect(inspector.locator("[data-field]").first()).toBeVisible();
  expect(await inspector.locator("[data-field] > label").count()).toBeGreaterThan(8);
  expect(await truncatedLabels(page)).toEqual([]);

  await (await paletteItem(page, "Máy chủ web")).click();
  await expect(inspector.getByTestId("inspector-node")).toBeVisible();
  expect(await truncatedLabels(page)).toEqual([]);
});

test("a web server's sections: Configuration open, Advanced closed with its summary; vCPUs change the cost", async ({ page }) => {
  await openLab(page, "vi");
  await (await paletteItem(page, "Máy chủ web")).click();
  const inspector = page.getByRole("complementary", { name: "Thuộc tính" });
  await expect(inspector.getByRole("button", { name: /^Cấu hình/ })).toHaveAttribute("aria-expanded", "true");
  const advanced = inspector.getByRole("button", { name: /^Nâng cao/ });
  await expect(advanced).toHaveAttribute("aria-expanded", "false");
  await expect(advanced).toContainText("Theo tham số thế giới");

  const cost = inspector.getByTestId("inspector-node-cost");
  await expect(cost).toContainText("$");
  const before = await cost.innerText();
  await inspector.getByRole("button", { name: /^Tăng Số vCPU/ }).click();
  await expect(cost).not.toHaveText(before);
});

test("every inspector label fits after a run, too", async ({ page }) => {
  await openLab(page);
  await buildFourTier(page);
  await page.getByTestId("node-web-server-1").click();
  expect(await truncatedLabels(page)).toEqual([]);
});

test("nodes added by click and by auto-layout stay inside the visible canvas", async ({ page }) => {
  await openLab(page);
  for (let i = 0; i < 5; i++) await (await paletteItem(page, "Web server")).click();
  const inside = async () => {
    const c = (await page.getByTestId("lab-canvas").boundingBox())!;
    const bad: string[] = [];
    for (const el of await page.locator('[data-testid^="node-"]').all()) {
      const b = (await el.boundingBox())!;
      if (b.x < c.x - 1 || b.y < c.y - 1 || b.x + b.width > c.x + c.width + 1 || b.y + b.height > c.y + c.height + 1) bad.push((await el.getAttribute("data-testid"))!);
    }
    return bad;
  };
  await expect.poll(inside).toEqual([]);
  for (let i = 0; i < 7; i++) await (await paletteItem(page, "PostgreSQL")).click();
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await page.keyboard.press("Shift+L");
  await expect.poll(inside).toEqual([]);
});

test("the inspector can be resized with the keyboard and keeps its width after a reload", async ({ page }) => {
  await openLab(page);
  const handle = page.getByRole("separator", { name: "Inspector width" });
  await expect(handle).toHaveAttribute("aria-valuenow", "368");
  await handle.focus();
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("ArrowLeft");
  await expect(handle).toHaveAttribute("aria-valuenow", "400");
  const box = (await page.getByRole("complementary", { name: "Inspector" }).boundingBox())!;
  expect(Math.round(box.width)).toBeGreaterThanOrEqual(399);
  await page.reload();
  await expect(page.getByRole("separator", { name: "Inspector width" })).toHaveAttribute("aria-valuenow", "400");
});

test("a lesson link opens its level on the Learn page and scrolls to it", async ({ page }) => {
  await page.goto("/vi/learn#l2-indexes");
  await expect(page.getByTestId("level-L2")).toHaveAttribute("aria-current", "true");
  await expect(page.locator("#l2-indexes")).toBeInViewport();
});
