import { expect, test } from "@playwright/test";
import { addAt, connectByDrag, openLab } from "./helpers";

// The Linux container runs Chromium on Linux, so Mod is Control there.
const mod = process.platform === "darwin" ? "Meta" : "Control";

test("build client → lb → 2× web → postgres with the mouse", async ({ page }) => {
  await openLab(page);
  await addAt(page, "Users", 90, 220);
  await addAt(page, "Load balancer", 290, 220);
  await addAt(page, "Web server", 490, 220);
  await addAt(page, "PostgreSQL", 690, 220);
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
  await expect(page.getByTestId("node-web-server-1")).toContainText("×2");
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
  // Grab the frame's own background in its left padding, at the canvas's middle (the frame can be
  // taller than the visible canvas, so its top and bottom edges may be off screen).
  const c = (await page.getByTestId("lab-canvas").boundingBox())!;
  const y = Math.max(f.y, c.y) + (Math.min(f.y + f.height, c.y + c.height) - Math.max(f.y, c.y)) / 2;
  await page.mouse.move(f.x + 12, y);
  await page.mouse.down();
  await page.mouse.move(f.x + 92, y + 40, { steps: 8 });
  await page.mouse.up();
  const after = (await page.getByTestId("node-postgres-1").boundingBox())!;
  expect(Math.round(after.x - before.x)).toBeGreaterThan(40);

  // Dragging a member past the frame's bottom edge grows the frame to hold it (Phase 2 review).
  const f2 = (await frame.boundingBox())!;
  const pg = (await page.getByTestId("node-postgres-1").boundingBox())!;
  await page.mouse.move(pg.x + pg.width / 2, pg.y + 20);
  await page.mouse.down();
  await page.mouse.move(pg.x + pg.width / 2, pg.y + 20 + 160, { steps: 10 });
  await page.mouse.up();
  const f3 = (await frame.boundingBox())!;
  const pg2 = (await page.getByTestId("node-postgres-1").boundingBox())!;
  expect(f3.y + f3.height).toBeGreaterThan(f2.y + f2.height);
  expect(pg2.y + pg2.height).toBeLessThanOrEqual(f3.y + f3.height + 1);

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
