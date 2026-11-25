import { expect, test } from "@playwright/test";
import { buildFourTier, expectAccessible, openLab, runOnce } from "./helpers";

for (const theme of ["light", "dark"] as const) {
  test.describe(`${theme} theme`, () => {
    test.use({ colorScheme: theme });

    for (const path of ["/vi/learn", "/en/learn", "/vi/challenges", "/en/leaderboard"]) {
      test(`page ${path}`, async ({ page }) => {
        await page.goto(path);
        await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
        await expectAccessible(page, path);
      });
    }

    test("Lab: empty, built, run, playback, every tab and a followed request", async ({ page }) => {
      test.setTimeout(90_000);
      await openLab(page);
      await expectAccessible(page, "empty lab");
      await buildFourTier(page);
      await page.getByTestId("node-web-server-1").click();
      await expectAccessible(page, "node selected");
      await page.keyboard.press("Escape");
      await runOnce(page);
      await expectAccessible(page, "after a run (verdict, metrics)");
      for (const tab of ["Events", "Logs", "Simulation"]) {
        await page.getByRole("tab", { name: new RegExp(`^${tab}`) }).click();
        await expectAccessible(page, `tab ${tab}`);
      }
      await page.getByRole("tab", { name: /^Logs/ }).click();
      await page.getByTestId("trace-row").first().click();
      await expect(page.getByTestId("trace-card")).toBeVisible();
      await expectAccessible(page, "following a request");
    });
  });
}

test("the Vietnamese Lab exposes no English React Flow text", async ({ page }) => {
  await openLab(page, "vi");
  const text = await page.evaluate(() => {
    const ids = [...document.querySelectorAll("[aria-describedby]")].flatMap((e) => (e.getAttribute("aria-describedby") ?? "").split(" "));
    return ids.map((id) => document.getElementById(id)?.textContent ?? "").join(" ") + " " + [...document.querySelectorAll(".react-flow [aria-label]")].map((e) => e.getAttribute("aria-label")).join(" ");
  });
  expect(text).not.toMatch(/Press enter|Zoom In|Zoom Out|Fit View|Mini Map|Toggle Interactivity|Handle/);
});
