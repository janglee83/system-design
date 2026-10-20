import { expect, test } from "@playwright/test";
import { addAt, connectByDrag, openLab } from "./helpers";

test("build client → lb → 2× web → postgres with the mouse", async ({ page }) => {
  await openLab(page);
  await addAt(page, "Users", 100, 220);
  await addAt(page, "Load balancer", 330, 220);
  await addAt(page, "Web server", 560, 220);
  await addAt(page, "PostgreSQL", 790, 220);
  await connectByDrag(page, "client-1", "lb-1");
  await connectByDrag(page, "lb-1", "web-server-1");
  await connectByDrag(page, "web-server-1", "postgres-1");

  await page.getByTestId("node-web-server-1").click();
  const replicas = page.getByRole("complementary", { name: "Inspector" }).getByRole("spinbutton", { name: "Replicas" });
  await replicas.fill("2");
  await replicas.press("Enter");

  await expect(page.locator("[data-testid^='node-']")).toHaveCount(4);
  await expect(page.locator("[data-testid^='edge-']")).toHaveCount(3);
  await expect(page.getByTestId("problems")).toHaveText("No problems");
  await expect(page.getByTestId("node-web-server-1")).toContainText("× 2");
});

test("undo, redo, delete, duplicate", async ({ page }) => {
  await openLab(page);
  await addAt(page, "Users", 100, 220);
  await addAt(page, "Web server", 400, 220);
  await connectByDrag(page, "client-1", "web-server-1");
  const mod = process.platform === "darwin" ? "Meta" : "Control";

  await page.keyboard.press("Escape"); // clear the selection; shortcuts listen on the window
  await page.keyboard.press(`${mod}+z`);
  await expect(page.getByTestId("edge-e1")).toHaveCount(0);
  await page.keyboard.press(`${mod}+Shift+z`);
  await expect(page.getByTestId("edge-e1")).toHaveCount(1);

  await page.getByTestId("node-web-server-1").click();
  await page.keyboard.press(`${mod}+d`);
  await expect(page.getByTestId("node-web-server-2")).toBeVisible();
  await page.keyboard.press("Delete");
  await expect(page.getByTestId("node-web-server-2")).toHaveCount(0);
});
