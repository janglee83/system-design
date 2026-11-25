import { expect, test, type Page } from "@playwright/test";
import { addAt, clearPaletteSearch, connectByDrag, paletteItem, paletteRail } from "./helpers";

// A first visit: no stored checklist state.
test.use({ storageState: { cookies: [], origins: [] } });

test("the first-run checklist ticks itself, shows a coach step, and can be hidden and reopened", async ({ page }) => {
  await page.goto("/vi/lab");
  await expect(page.getByTestId("engine-status")).toHaveAttribute("data-status", "ready");
  const card = page.getByRole("region", { name: "Làm quen với Lab · 0/5" });
  await expect(card).toBeVisible();

  // Task 1 ticks when Users is added (drop clear of the card at the bottom left).
  await addAt(page, "Người dùng", 420, 120);
  await expect(page.getByRole("region", { name: "Làm quen với Lab · 1/5" })).toBeVisible();

  // "Chỉ cho tôi" on the current task opens step 2/4 with a spotlight on the canvas.
  await page.getByRole("button", { name: "Chỉ cho tôi" }).click();
  const coach = page.getByRole("dialog", { name: "Bước 2/4" });
  await expect(coach).toBeVisible();
  await expect(page.getByTestId("coach-spotlight")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(coach).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Chỉ cho tôi" })).toBeFocused();

  // Three more ticks: the server and its connection, the database, then a run.
  await addAt(page, "Máy chủ web", 600, 120);
  await addAt(page, "PostgreSQL", 600, 330);
  await connectByDrag(page, "client-1", "web-server-1");
  await connectByDrag(page, "web-server-1", "postgres-1");
  await page.keyboard.press("Escape");
  const bar = page.getByTestId("run-bar");
  await expect(bar.getByRole("button", { name: /^Chạy mô phỏng/ })).not.toHaveAttribute("aria-disabled", "true");
  await bar.getByRole("button", { name: /^Chạy mô phỏng/ }).click();
  await expect(page.getByRole("region", { name: "Làm quen với Lab · 4/5" })).toBeVisible();

  // Progress survives a reload.
  await page.reload();
  await expect(page.getByRole("region", { name: "Làm quen với Lab · 4/5" })).toBeVisible();

  // Ẩn hides it; the Help menu brings it back.
  await page.getByTestId("onboarding").getByRole("button", { name: "Ẩn" }).click();
  await expect(page.getByTestId("onboarding")).toHaveCount(0);
  await page.getByRole("button", { name: "Trợ giúp" }).click();
  await page.getByRole("menuitem", { name: "Làm quen với Lab" }).click();
  await expect(page.getByTestId("onboarding")).toBeVisible();
});

test("the checklist lets clicks through everywhere outside it", async ({ page }) => {
  await page.goto("/vi/lab?template=webDb");
  await expect(page.getByTestId("onboarding")).toBeVisible();
  await page.getByTestId("node-web-server-1").click();
  await expect(page.getByTestId("inspector-node")).toBeVisible();
});

test("on first open the canvas leaves room for the checklist", async ({ page }) => {
  await page.goto("/vi/lab?template=webDb");
  const card = page.getByTestId("onboarding");
  await expect(card).toBeVisible();
  const c = (await card.boundingBox())!;
  // Poll until the fit has landed with every tile above the card.
  const covered = async () => {
    const bad: string[] = [];
    for (const id of ["node-client-1", "node-web-server-1", "node-postgres-1"]) {
      const b = (await page.getByTestId(id).boundingBox())!;
      if (b.y + b.height > c.y + 1) bad.push(id);
    }
    return bad;
  };
  await expect.poll(covered).toEqual([]);
});

// QA: on a first visit the checklist must not cover the empty-Lab cards, nor swallow drops.
for (const size of [
  { width: 1280, height: 800 },
  { width: 1440, height: 900 },
]) {
  test(`the checklist and the empty-Lab cards never overlap at ${size.width}`, async ({ page }) => {
    await page.setViewportSize(size);
    await page.goto("/vi/lab");
    await expect(page.getByTestId("engine-status")).toHaveAttribute("data-status", "ready");
    await expect(page.getByTestId("onboarding")).toBeInViewport(); // shown, not just moved away
    const card = (await page.getByTestId("onboarding").boundingBox())!;
    const items = page.getByTestId("empty-lab").locator("ul.grid > li");
    await expect(items.first()).toBeVisible();
    for (const box of await Promise.all((await items.all()).map((l) => l.boundingBox()))) {
      const b = box!;
      const overlaps = b.x < card.x + card.width && card.x < b.x + b.width && b.y < card.y + card.height && card.y < b.y + b.height;
      expect(overlaps, JSON.stringify({ card, b })).toBe(false);
    }
  });
}

/** Drags a palette item onto the middle of the checklist card with the mouse, as a person would. */
async function dropOnChecklist(page: Page, name: string) {
  const item = await paletteItem(page, name); // opens the drawer, which narrows the canvas
  const card = (await page.getByTestId("onboarding").boundingBox())!;
  await item.hover();
  await page.mouse.down();
  await page.mouse.move(card.x + card.width / 2, card.y + Math.min(card.height / 2, 40), { steps: 8 });
  await page.mouse.up();
  await clearPaletteSearch(page);
  await paletteRail(page).locator('[role="tab"][aria-selected="true"]').click();
}

test("until the first run the checklist waits in the results panel; then in its corner it lets drops through", async ({ page }) => {
  await page.goto("/vi/lab");
  await expect(page.getByTestId("engine-status")).toHaveAttribute("data-status", "ready");
  const onboarding = page.getByTestId("onboarding");
  await expect(onboarding).toHaveAttribute("data-placement", "panel");
  await expect(page.getByTestId("onboarding-slot").getByTestId("onboarding")).toBeVisible();
  // Start from the suggested template and run it: the checklist moves to the canvas corner.
  await page.getByTestId("empty-lab").getByRole("button", { name: /PostgreSQL/ }).click();
  const bar = page.getByTestId("run-bar");
  await bar.getByRole("button", { name: /^Chạy mô phỏng/ }).click();
  await expect(onboarding).toHaveAttribute("data-placement", "corner");
  const before = await page.locator(".react-flow__node").count();
  await dropOnChecklist(page, "Máy chủ web");
  await expect(page.locator(".react-flow__node")).toHaveCount(before + 1);
});
