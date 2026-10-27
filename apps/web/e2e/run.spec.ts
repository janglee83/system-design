import { expect, test } from "@playwright/test";
import { buildFourTier, openLab, runOnce } from "./helpers";

test("Run is disabled while there are problems, then runs with ⌘↵ / Ctrl+Enter", async ({ page }) => {
  await openLab(page);
  await expect(page.getByTestId("run-bar").getByRole("button", { name: /^Run/ })).toBeDisabled();
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
