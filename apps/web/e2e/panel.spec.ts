import { expect, test } from "@playwright/test";
import { buildFourTier, openLab, runOnce } from "./helpers";

test("events, logs and the simulation tab", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await openLab(page);
  await buildFourTier(page, 1);

  const inspector = page.getByRole("complementary", { name: "Inspector" });
  await inspector.getByRole("button", { name: "Add fault" }).click(); // instance-down, any matching, 3.0 s
  await runOnce(page);

  await page.getByRole("tab", { name: "Events" }).click();
  await expect(page.getByRole("row", { name: /one instance stopped/ })).toBeVisible();

  await page.getByRole("tab", { name: "Logs" }).click();
  await expect(page.getByText(/Run \d+ started: 4 components/)).toBeVisible();
  await expect(page.getByText(/finished in \d+ ms/)).toBeVisible();

  await page.getByRole("tab", { name: "Simulation" }).click();
  await expect(page.getByText(/Simulator version \d+\.\d+\.\d+/)).toBeVisible();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export run (JSON)" }).click();
  const file = await download;
  expect(file.suggestedFilename()).toMatch(/^sd-lab-run-\d+\.json$/);
  await page.getByRole("button", { name: "Copy input" }).click();
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(JSON.parse(copied).graph.nodes).toHaveLength(4);
});
