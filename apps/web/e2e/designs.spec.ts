import fs from "node:fs";
import { expect, test } from "@playwright/test";
import { buildFourTier, openLab } from "./helpers";

// Linux Chromium in the container: Mod is Control.
const mod = process.platform === "darwin" ? "Meta" : "Control";

test("save, reload, open", async ({ page }) => {
  await openLab(page);
  await buildFourTier(page);
  await page.keyboard.press(`${mod}+s`);
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("textbox", { name: "Design name" }).fill("Shop v1");
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Saved “Shop v1”.")).toBeVisible();

  await page.reload();
  await expect(page.getByTestId("engine-status")).toHaveAttribute("data-status", "ready");
  await expect(page.getByTestId("node-postgres-1")).toBeVisible(); // draft restored
  await expect(page.getByTestId("design-menu")).toContainText("Shop v1");

  await page.getByRole("button", { name: "Design" }).click();
  await page.getByRole("menuitem", { name: "New" }).hover();
  await page.getByRole("menuitem", { name: "Empty" }).click();
  await expect(page.getByTestId("node-postgres-1")).toHaveCount(0);

  await page.keyboard.press(`${mod}+o`);
  await page.getByRole("button", { name: "Open “Shop v1”" }).click();
  await expect(page.getByTestId("node-postgres-1")).toBeVisible();
  await expect(page.getByTestId("node-web-server-1")).toContainText("× 2");
});

test("opening over unsaved changes asks first", async ({ page }) => {
  await openLab(page);
  await page.getByRole("button", { name: "Add Users" }).click();
  await page.keyboard.press(`${mod}+s`);
  await page.getByRole("dialog").getByRole("textbox", { name: "Design name" }).fill("One");
  await page.getByRole("dialog").getByRole("button", { name: "Save" }).click();
  await page.getByRole("button", { name: "Add Web server" }).click(); // now unsaved
  await expect(page.getByRole("img", { name: "Unsaved changes" })).toBeVisible();
  await page.keyboard.press(`${mod}+o`);
  await page.getByRole("button", { name: "Open “One”" }).click();
  await expect(page.getByText("Your unsaved changes will be lost. Continue?")).toBeVisible();
  await page.getByRole("button", { name: "Open", exact: true }).click();
  await expect(page.getByTestId("node-web-server-1")).toHaveCount(0);
  await expect(page.getByTestId("node-client-1")).toBeVisible();
});

test("export a design and import it again; a broken file lists its problems", async ({ page }, info) => {
  await openLab(page);
  await buildFourTier(page);
  await page.getByRole("button", { name: "Design" }).click();
  const download = page.waitForEvent("download");
  await page.getByRole("menuitem", { name: "Export" }).click();
  const file = await download;
  const saved = info.outputPath("export.sdlab.json");
  await file.saveAs(saved);

  await page.evaluate(() => indexedDB.deleteDatabase("sd-lab"));
  await openLab(page, "en");
  await page.getByRole("button", { name: "Design" }).click();
  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("menuitem", { name: "Import…" }).click();
  await (await chooser).setFiles(saved);
  await expect(page.getByTestId("node-postgres-1")).toBeVisible();

  const broken = info.outputPath("broken.sdlab.json");
  const doc = JSON.parse(fs.readFileSync(saved, "utf8"));
  doc.nodes[0].replicas = "many";
  fs.writeFileSync(broken, JSON.stringify(doc));
  await page.getByRole("button", { name: "Design" }).click();
  const chooser2 = page.waitForEvent("filechooser");
  await page.getByRole("menuitem", { name: "Import…" }).click();
  await (await chooser2).setFiles(broken);
  await expect(page.getByRole("dialog", { name: "This file cannot be opened" })).toContainText("nodes.0.replicas: has the wrong type");
});
