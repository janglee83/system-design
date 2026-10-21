import { expect, test } from "@playwright/test";
import { addAt, connectByDrag, openLab } from "./helpers";

// The Linux container runs Chromium on Linux, so Mod is Control there.
const mod = process.platform === "darwin" ? "Meta" : "Control";

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

test("group nodes, move the frame, ungroup, and tidy the layout", async ({ page }) => {
  await openLab(page);
  await addAt(page, "Users", 100, 300);
  await addAt(page, "Web server", 600, 120);
  await addAt(page, "PostgreSQL", 300, 420);
  await connectByDrag(page, "client-1", "web-server-1");
  await connectByDrag(page, "web-server-1", "postgres-1");

  await page.getByTestId("node-web-server-1").click();
  await page.getByTestId("node-postgres-1").click({ modifiers: ["Shift"] });
  await page.keyboard.press(`${mod}+g`);
  const frame = page.getByTestId("group-g1");
  await expect(frame).toBeVisible();

  const before = (await page.getByTestId("node-postgres-1").boundingBox())!;
  const f = (await frame.boundingBox())!;
  await page.mouse.move(f.x + 12, f.y + 8);
  await page.mouse.down();
  await page.mouse.move(f.x + 92, f.y + 48, { steps: 8 });
  await page.mouse.up();
  const after = (await page.getByTestId("node-postgres-1").boundingBox())!;
  expect(Math.round(after.x - before.x)).toBeGreaterThan(40);

  await page.keyboard.press(`${mod}+Shift+g`);
  await expect(frame).toHaveCount(0);

  await page.keyboard.press("Shift+L");
  // The layout runs asynchronously (ELK, then a fit-view animation): poll until it has landed.
  const xs = () => Promise.all(["client-1", "web-server-1", "postgres-1"].map(async (id) => (await page.getByTestId(`node-${id}`).boundingBox())!.x));
  await expect.poll(async () => {
    const [a, b, c] = await xs();
    return a! < b! && b! < c!;
  }).toBe(true);
});
