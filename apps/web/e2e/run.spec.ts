import { expect, test } from "@playwright/test";
import { buildFourTier, openLab, runOnce } from "./helpers";

test("Run is disabled while there are problems, then runs with ⌘↵ / Ctrl+Enter", async ({ page }) => {
  await openLab(page);
  await expect(page.getByTestId("run-bar").getByRole("button", { name: /^Run simulation/ })).toBeDisabled();
  await buildFourTier(page);
  await page.keyboard.press("Control+Enter");
  await expect(page.getByTestId("run-bar")).toHaveAttribute("data-run-id", /\d+/);
});

test("each run joins the history", async ({ page }) => {
  await openLab(page);
  await buildFourTier(page);
  const a = await runOnce(page);
  const b = await runOnce(page);
  expect(Number(b)).toBe(Number(a) + 1);
});

test("metrics appear after a run and compare with the previous run", async ({ page }) => {
  await openLab(page);
  await buildFourTier(page);
  await runOnce(page);
  for (const k of ["p50", "p95", "p99", "availability", "throughputRps", "costPerMonth"]) {
    await expect(page.getByTestId(`metric-${k}`)).toBeVisible();
  }
  await expect(page.getByTestId("metric-availability")).toContainText("%");
  await runOnce(page);
  await expect(page.getByTestId("metric-p95")).toContainText(/vs previous run|same/);
});

test("changing a world parameter changes p95", async ({ page }) => {
  await openLab(page);
  await buildFourTier(page);
  await runOnce(page);
  const before = await page.getByTestId("metric-p95").locator("[data-value]").getAttribute("data-value");

  const inspector = page.getByRole("complementary", { name: "Inspector" });
  await inspector.getByRole("button", { name: /World parameters/ }).click();
  const field = inspector.getByRole("spinbutton", { name: "Web: time to serve a request (ms)" });
  await field.fill("40");
  await field.press("Enter");
  await runOnce(page);
  const after = await page.getByTestId("metric-p95").locator("[data-value]").getAttribute("data-value");
  expect(Number(after)).toBeGreaterThan(Number(before));
});

test("an empty Lab explains why Run is unavailable, on focus as well as hover", async ({ page }) => {
  await openLab(page, "vi");
  const go = page.getByTestId("run-bar").getByRole("button", { name: /^Chạy mô phỏng/ });
  await expect(go).toHaveAttribute("aria-disabled", "true");
  await go.focus();
  await expect(go).toBeFocused();
  await expect(page.getByRole("tooltip")).toHaveText("Thêm Người dùng và một máy chủ để chạy");
});

test("while running, progress and Stop replace the split button in the same box", async ({ page }) => {
  await openLab(page);
  await buildFourTier(page);
  const bar = page.getByTestId("run-bar");
  const before = await bar.boundingBox();
  // Runs are quick; record every state the box shows instead of racing it.
  await bar.evaluate((el) => {
    const seen: string[] = [];
    (window as unknown as { __seen: string[] }).__seen = seen;
    new MutationObserver(() => seen.push(`${el.dataset.status}|${el.textContent ?? ""}`)).observe(el, { attributes: true, childList: true, subtree: true });
  });
  await page.keyboard.press("Control+Enter");
  await expect(bar).toHaveAttribute("data-run-id", /\d+/);
  await expect(bar).toHaveAttribute("data-status", "idle");
  const seen = await page.evaluate(() => (window as unknown as { __seen: string[] }).__seen);
  expect(seen.some((s) => s.startsWith("running|") && s.includes("Running") && s.includes("Stop"))).toBe(true);
  await expect(bar.getByRole("button", { name: /^Run simulation/ })).toBeVisible();
  expect(await bar.boundingBox()).toEqual(before);
  await expect(page.getByTestId("save-line")).toContainText(/Run #\d+ done/);
});
