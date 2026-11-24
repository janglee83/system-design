import { expect, test, type Page } from "@playwright/test";

/**
 * Screenshot sweep (Task 35a, on demand: SWEEP=1 playwright test --grep @sweep). Every key screen
 * and state, light and dark, VI and EN, at 1280, 1440 and 1920 px. Images go to test-results/sweep
 * (ignored) and are reviewed by hand; none are committed.
 */
const OUT = "test-results/sweep";

async function shots(page: Page, tag: string) {
  const shot = (name: string) => page.screenshot({ path: `${OUT}/${tag}-${name}.png` });
  const lang = tag.includes("-vi-") ? "vi" : "en";
  const run = async () => {
    const bar = page.getByTestId("run-bar");
    const before = (await bar.getAttribute("data-run-id")) ?? "";
    await bar.getByRole("button", { name: /^(Chạy mô phỏng|Run simulation)/ }).click();
    await expect(bar).not.toHaveAttribute("data-run-id", before);
    await expect(bar).toHaveAttribute("data-status", "idle");
  };

  await page.goto(`/${lang}/lab`);
  await expect(page.getByTestId("engine-status")).toHaveAttribute("data-status", "ready");
  await shot("01-empty");

  await page.goto(`/${lang}/lab?template=webDb`);
  await expect(page.getByTestId("node-postgres-1")).toBeVisible();
  await shot("02-built-design-inspector");
  await page.getByTestId("node-web-server-1").click();
  await shot("03-node-inspector");
  await page.locator('g[data-testid="edge-e1"]').click({ force: true });
  await shot("04-edge-selected");
  await page.keyboard.press("Escape");

  await run();
  await shot("05-run-verdict-metrics");
  for (const [i, tab] of [["06", /^(Sự kiện|Events)/], ["07", /^(Nhật ký|Logs)/], ["08", /^(Mô phỏng|Simulation)/]] as const) {
    await page.getByRole("tab", { name: tab }).click();
    await shot(`${i}-tab`);
  }
  await page.getByRole("tab", { name: /^(Nhật ký|Logs)/ }).click();
  await page.getByTestId("trace-row").first().click();
  await expect(page.getByTestId("trace-card")).toBeVisible();
  await shot("09-follow-request");

  await page.keyboard.press("Control+k");
  await shot("10-command-palette");
  await page.keyboard.press("Escape");

  await page.goto(`/${lang}/learn`);
  await expect(page.getByTestId("learning-path")).toBeVisible();
  await shot("11-learn");
  await page.goto(`/${lang}/challenges`);
  await shot("12-challenges");
  await page.goto(`/${lang}/leaderboard`);
  await shot("13-leaderboard");
}

for (const width of [1280, 1440, 1920]) {
  for (const lang of ["vi", "en"] as const) {
    for (const theme of ["light", "dark"] as const) {
      test(`@sweep ${width} ${lang} ${theme}`, async ({ page }) => {
        test.setTimeout(120_000);
        await page.setViewportSize({ width, height: width === 1920 ? 1080 : 900 });
        await page.emulateMedia({ colorScheme: theme });
        await shots(page, `${width}-${lang}-${theme}`);
      });
    }
  }
}
