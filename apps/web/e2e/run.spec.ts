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
