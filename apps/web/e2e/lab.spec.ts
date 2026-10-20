import { expect, test } from "@playwright/test";
import { addAt, connectByDrag, connectToCard, openLab } from "./helpers";

test("the Lab shows an empty canvas with the edge legend", async ({ page }) => {
  await page.goto("/en/lab");
  await expect(page.getByTestId("engine-status")).toHaveAttribute("data-status", "ready");
  await expect(page.getByText("Nothing here yet")).toBeVisible();
  for (const k of ["http", "db", "cache", "msg"]) await expect(page.getByTestId(`legend-${k}`)).toBeVisible();
  await expect(page.getByTestId("legend-db")).toContainText("Database");
});

test("components are added by click (centre) and by drag (drop point)", async ({ page }) => {
  await page.goto("/en/lab");
  await expect(page.getByTestId("engine-status")).toHaveAttribute("data-status", "ready");
  await page.getByRole("button", { name: "Add Web server" }).click();
  await expect(page.getByTestId("node-web-server-1")).toBeVisible();
  await expect(page.getByTestId("node-web-server-1")).toContainText("Web server 1");

  const canvas = page.getByTestId("lab-canvas");
  const box = (await canvas.boundingBox())!;
  await page.getByRole("button", { name: "Add PostgreSQL" }).dragTo(canvas, { targetPosition: { x: box.width - 200, y: 120 } });
  const pg = page.getByTestId("node-postgres-1");
  await expect(pg).toBeVisible();
  const pgBox = (await pg.boundingBox())!;
  expect(pgBox.x).toBeGreaterThan(box.x + box.width / 2);
});

test("searching the palette ignores accents", async ({ page }) => {
  await page.goto("/vi/lab");
  await page.getByRole("searchbox", { name: "Tìm thành phần" }).fill("can bang");
  const palette = page.getByRole("complementary", { name: "Thành phần" });
  await expect(palette.getByRole("button", { name: /^Thêm / })).toHaveCount(1);
});

test("dragging from a port to a port creates a typed edge", async ({ page }) => {
  await page.goto("/en/lab");
  await addAt(page, "Users", 120, 200);
  await addAt(page, "Web server", 420, 200);
  await addAt(page, "PostgreSQL", 720, 200);
  await connectByDrag(page, "client-1", "web-server-1");
  await connectByDrag(page, "web-server-1", "postgres-1");
  await expect(page.getByTestId("edge-e1")).toHaveAttribute("data-kind", "http");
  await expect(page.getByTestId("edge-e2")).toHaveAttribute("data-kind", "db");
});

test("connecting into Users is refused with a message", async ({ page }) => {
  await page.goto("/en/lab");
  await addAt(page, "Users", 120, 200);
  await addAt(page, "Web server", 420, 200);
  // Users takes no incoming connections, so its card has no input port at all.
  await expect(page.getByTestId("handle-in-client-1")).toHaveCount(0);
  await connectToCard(page, "web-server-1", "client-1");
  await expect(page.getByTestId("toast")).toHaveText("Users 1 does not take incoming connections.");
  await expect(page.getByTestId("edge-e1")).toHaveCount(0);
});

test("problems update live and nodes show their monthly cost", async ({ page }) => {
  await openLab(page);
  await expect(page.getByTestId("problems")).toHaveText("1 problem"); // no client
  await addAt(page, "Users", 120, 200);
  await addAt(page, "Web server", 420, 200);
  await expect(page.getByTestId("problems")).toHaveText("2 problems"); // client.no-path + unreachable
  await page.getByTestId("problems").click();
  const list = page.getByRole("dialog", { name: "Problems" });
  await expect(list.getByRole("button")).toHaveText(["Users 1 has no path to a server.", "Web server 1 gets no requests: nothing connects to it."]);
  await list.getByRole("button", { name: /Web server 1 gets no requests/ }).click();
  await expect(list).toBeHidden();
  await expect(page.getByRole("complementary", { name: "Inspector" }).getByRole("heading", { name: "Web server 1" })).toBeVisible();
  await connectByDrag(page, "client-1", "web-server-1");
  await expect(page.getByTestId("problems")).toHaveText("No problems");
  await expect(page.getByTestId("node-web-server-1")).toContainText(/\$\d+ \/mo/);
});

test("a dropped component lands where it was dropped", async ({ page }) => {
  await openLab(page);
  const canvas = (await page.getByTestId("lab-canvas").boundingBox())!;
  await addAt(page, "PostgreSQL", 500, 300);
  const pg = (await page.getByTestId("node-postgres-1").boundingBox())!;
  // Centred on the drop point, give or take the 16 px grid.
  expect(Math.abs(pg.x + pg.width / 2 - (canvas.x + 500))).toBeLessThanOrEqual(16);
  expect(Math.abs(pg.y + pg.height / 2 - (canvas.y + 300))).toBeLessThanOrEqual(16);
});

test("dragging a node or a group frame is one undo step that restores the position", async ({ page }) => {
  await openLab(page);
  const mod = process.platform === "darwin" ? "Meta" : "Control";
  await addAt(page, "Web server", 300, 200);
  await addAt(page, "PostgreSQL", 600, 200);
  const node = page.getByTestId("node-web-server-1");
  const before = (await node.boundingBox())!;
  await page.mouse.move(before.x + 40, before.y + 20);
  await page.mouse.down();
  await page.mouse.move(before.x + 140, before.y + 120, { steps: 10 });
  await page.mouse.up();
  await expect.poll(async () => Math.round((await node.boundingBox())!.x - before.x)).toBeGreaterThan(80);
  await page.keyboard.press(`${mod}+z`);
  await expect.poll(async () => (await node.boundingBox())!).toEqual(before);
  await page.keyboard.press(`${mod}+z`); // the next undo removes PostgreSQL: the drag was one step
  await expect(page.getByTestId("node-postgres-1")).toHaveCount(0);
  await page.keyboard.press(`${mod}+Shift+z`);

  await page.getByTestId("node-web-server-1").click();
  await page.getByTestId("node-postgres-1").click({ modifiers: ["Shift"] });
  await page.keyboard.press(`${mod}+g`);
  const frame = page.getByTestId("group-g1");
  const f = (await frame.boundingBox())!;
  const pgBefore = (await page.getByTestId("node-postgres-1").boundingBox())!;
  await page.mouse.move(f.x + 12, f.y + 8);
  await page.mouse.down();
  await page.mouse.move(f.x + 112, f.y + 88, { steps: 10 });
  await page.mouse.up();
  await expect.poll(async () => Math.round((await page.getByTestId("node-postgres-1").boundingBox())!.x - pgBefore.x)).toBeGreaterThan(80);
  await page.keyboard.press(`${mod}+z`);
  await expect.poll(async () => (await page.getByTestId("node-postgres-1").boundingBox())!).toEqual(pgBefore);
  await expect(frame).toBeVisible(); // undoing the move kept the group
});

test("the inspector edits a node and its cost follows", async ({ page }) => {
  await openLab(page);
  await addAt(page, "Users", 120, 200);
  await addAt(page, "Web server", 420, 200);
  await connectByDrag(page, "client-1", "web-server-1");
  await page.getByTestId("node-web-server-1").click();
  const inspector = page.getByRole("complementary", { name: "Inspector" });
  const before = await page.getByTestId("node-web-server-1").innerText();
  await inspector.getByRole("spinbutton", { name: "vCPUs" }).fill("4");
  await inspector.getByRole("spinbutton", { name: "vCPUs" }).press("Enter");
  await expect(page.getByTestId("node-web-server-1")).not.toHaveText(before);
  await inspector.getByRole("spinbutton", { name: "Replicas" }).fill("2");
  await inspector.getByRole("spinbutton", { name: "Replicas" }).press("Enter");
  await expect(page.getByTestId("node-web-server-1")).toContainText("× 2");
});

test("the engine chip does not cover the minimap", async ({ page }) => {
  await openLab(page);
  await addAt(page, "Users", 120, 200); // the minimap shows once there is something to map
  const chip = (await page.getByTestId("engine-status").boundingBox())!;
  const map = (await page.getByRole("img", { name: "Overview map" }).boundingBox())!;
  const overlap = chip.x < map.x + map.width && map.x < chip.x + chip.width && chip.y < map.y + map.height && map.y < chip.y + chip.height;
  expect(overlap).toBe(false);
});

test("clicking Add twice places the second node beside the first and announces each add", async ({ page }) => {
  await openLab(page);
  await page.getByRole("button", { name: "Add Web server" }).click();
  await expect(page.getByTestId("announcer")).toHaveText("Added Web server 1");
  await page.getByRole("button", { name: "Add Web server" }).click();
  await expect(page.getByTestId("announcer")).toHaveText("Added Web server 2");
  const a = (await page.getByTestId("node-web-server-1").boundingBox())!;
  const b = (await page.getByTestId("node-web-server-2").boundingBox())!;
  const overlap = a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
  expect(overlap).toBe(false);
});
