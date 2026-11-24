import fs from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { buildFourTier, openLab, runOnce } from "./helpers";

const overlap = (a: { x: number; y: number; width: number; height: number }, b: typeof a) =>
  a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

async function importDesign(page: Page, file: string) {
  await page.getByRole("button", { name: "Design", exact: true }).click();
  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("menuitem", { name: "Import…" }).click();
  await (await chooser).setFiles(file);
}

test("the minimap is off by default; the toggle and M switch it, and the choice is kept", async ({ page }) => {
  await page.goto("/en/lab?template=webDb");
  await expect(page.getByTestId("node-postgres-1")).toBeVisible();
  const map = page.locator(".react-flow__minimap");
  await expect(map).toHaveCount(0);
  await page.getByRole("button", { name: "Show the minimap" }).click();
  await expect(map).toBeVisible();
  await expect(page.getByRole("button", { name: "Hide the minimap" })).toHaveAttribute("aria-pressed", "true");
  await page.reload();
  await expect(page.getByTestId("engine-status")).toHaveAttribute("data-status", "ready");
  await expect(map).toBeVisible(); // kept in this browser
  await page.locator(".react-flow__pane").click({ position: { x: 20, y: 20 } });
  await page.keyboard.press("m");
  await expect(map).toHaveCount(0);
});

test("a 30-node design shows the minimap by itself, in category colours, clear of the controls", async ({ page }, info) => {
  await page.goto("/en/lab?template=webDb");
  await expect(page.getByTestId("node-postgres-1")).toBeVisible();
  await page.getByRole("button", { name: "Design", exact: true }).click();
  const download = page.waitForEvent("download");
  await page.getByRole("menuitem", { name: "Export" }).click();
  const saved = info.outputPath("three.sdlab.json");
  await (await download).saveAs(saved);
  const doc = JSON.parse(fs.readFileSync(saved, "utf8"));
  for (let i = 2; i <= 28; i++) {
    doc.nodes.push({ id: `web-server-${i}`, kind: "web-server", label: "", replicas: 1, config: {}, position: { x: 64 + (i % 7) * 208, y: 320 + Math.floor(i / 7) * 176 }, groupId: null });
  }
  expect(doc.nodes).toHaveLength(30);
  const thirty = info.outputPath("thirty.sdlab.json");
  fs.writeFileSync(thirty, JSON.stringify(doc));

  await importDesign(page, thirty);
  await expect(page.getByTestId("design-counts")).toContainText("30 components");
  const map = page.locator(".react-flow__minimap");
  await expect(map).toBeVisible();
  // Nodes are drawn in their category accent.
  await expect(map.locator(".react-flow__minimap-node").first()).toHaveAttribute("style", /fill: var\(--sd-cat-/);
  const controls = (await page.getByRole("toolbar", { name: "Canvas controls" }).boundingBox())!;
  expect(overlap((await map.boundingBox())!, controls)).toBe(false);
  // Hiding it by hand wins over the automatic rule.
  await page.getByRole("button", { name: "Hide the minimap" }).click();
  await expect(map).toHaveCount(0);
});

test("the minimap never covers the verdict strip", async ({ page }) => {
  await openLab(page);
  await buildFourTier(page);
  await page.getByRole("button", { name: "Show the minimap" }).click();
  await runOnce(page);
  const verdict = (await page.getByTestId("verdict").boundingBox())!;
  const map = (await page.locator(".react-flow__minimap").boundingBox())!;
  expect(overlap(verdict, map)).toBe(false);
});
