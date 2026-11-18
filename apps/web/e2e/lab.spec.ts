import { expect, test } from "@playwright/test";
import { addAt, connectByDrag, connectToCard, openLab, paletteItem } from "./helpers";

test("the Lab shows an empty canvas, with no minimap and no floating legend card", async ({ page }) => {
  await page.goto("/en/lab");
  await expect(page.getByTestId("engine-status")).toHaveAttribute("data-status", "ready");
  await expect(page.getByText("Nothing here yet")).toBeVisible();
  await expect(page.locator(".react-flow__minimap")).toHaveCount(0);
  await expect(page.getByText("Connection kinds in this design")).toHaveCount(0);
});

test("components are added by click (centre) and by drag (drop point)", async ({ page }) => {
  await page.goto("/en/lab");
  await expect(page.getByTestId("engine-status")).toHaveAttribute("data-status", "ready");
  await (await paletteItem(page, "Web server")).click();
  await expect(page.getByTestId("node-web-server-1")).toBeVisible();
  await expect(page.getByTestId("node-web-server-1")).toContainText("Web server 1");

  const canvas = page.getByTestId("lab-canvas");
  const box = (await canvas.boundingBox())!;
  await (await paletteItem(page, "PostgreSQL")).dragTo(canvas, { targetPosition: { x: box.width - 200, y: 120 } });
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
  await addAt(page, "PostgreSQL", 690, 200);
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
  // In the Lab, messages sit in the status strip's lane, never over the canvas or panels.
  await expect(page.getByTestId("toast-lane").getByTestId("toast")).toBeVisible();
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
  await expect(page.getByTestId("node-web-server-1")).toContainText(/\$\d+\/mo/);
});

test("a dropped component lands where it was dropped", async ({ page }) => {
  await openLab(page);
  const canvas = (await page.getByTestId("lab-canvas").boundingBox())!;
  // Dragged directly (not addAt): the drawer stays open, so the canvas does not move after the drop.
  await (await paletteItem(page, "PostgreSQL")).dragTo(page.getByTestId("lab-canvas"), { targetPosition: { x: 500, y: 300 } });
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
  await expect(page.getByTestId("node-web-server-1")).toContainText("×2");
});

test("the engine state and the design's size live in the status strip", async ({ page }) => {
  await openLab(page);
  const strip = page.getByRole("contentinfo", { name: "Status" });
  await expect(strip.getByTestId("engine-status")).toContainText(/Simulator \d+\.\d+\.\d+ ready/);
  await addAt(page, "Users", 120, 200);
  await expect(strip).toContainText("1 component · 0 connections");
  await expect(strip).toContainText("Autosaved in this browser");
});

test("clicking Add twice places the second node beside the first and announces each add", async ({ page }) => {
  await openLab(page);
  await (await paletteItem(page, "Web server")).click();
  await expect(page.getByTestId("announcer")).toHaveText("Added Web server 1");
  await (await paletteItem(page, "Web server")).click();
  await expect(page.getByTestId("announcer")).toHaveText("Added Web server 2");
  const a = (await page.getByTestId("node-web-server-1").boundingBox())!;
  const b = (await page.getByTestId("node-web-server-2").boundingBox())!;
  const overlap = a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
  expect(overlap).toBe(false);
});

test("at 1024 px the problems count is announced", async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  await openLab(page);
  await page.getByRole("button", { name: "Dismiss" }).click();
  await addAt(page, "Users", 80, 120);
  await expect(page.getByTestId("problems-live")).toHaveText("1 problem");
});

test("a node is the 172 × 148 illustrated tile, with 24 px ports and a dashed focus ring", async ({ page }) => {
  await openLab(page, "vi");
  await (await paletteItem(page, "Máy chủ web")).click();
  const tile = page.getByTestId("node-web-server-1");
  const box = (await tile.boundingBox())!;
  expect(Math.abs(box.width - 172)).toBeLessThanOrEqual(1);
  expect(Math.abs(box.height - 148)).toBeLessThanOrEqual(1);
  const port = (await page.getByTestId("handle-out-web-server-1").boundingBox())!;
  expect(port.width).toBeGreaterThanOrEqual(24);
  expect(port.height).toBeGreaterThanOrEqual(24);
  const wrapper = page.locator('.react-flow__node[data-id="web-server-1"]');
  await expect(wrapper).toHaveAttribute("aria-label", /Máy chủ web/);

  const inspector = page.getByRole("complementary", { name: "Thuộc tính" });
  await inspector.getByRole("spinbutton", { name: "Số bản sao" }).fill("2");
  await inspector.getByRole("spinbutton", { name: "Số bản sao" }).press("Enter");
  await expect(tile.getByText("×2")).toBeVisible();

  await wrapper.focus();
  await page.keyboard.press("Shift+Tab");
  await page.keyboard.press("Tab");
  await expect(wrapper).toBeFocused();
  expect(await tile.evaluate((el) => getComputedStyle(el).outlineStyle)).toBe("dashed");
});


test("the palette rail and drawer: coming-soon kinds show but cannot be placed", async ({ page }) => {
  await openLab(page, "vi");
  const rail = page.getByRole("tablist", { name: "Loại thành phần" });
  await expect(rail.getByRole("tab")).toHaveCount(7);
  await rail.getByRole("tab", { name: "Đệm" }).click();
  const drawer = page.getByRole("tabpanel");
  await expect(drawer.getByRole("heading", { name: "Bộ nhớ đệm" })).toBeVisible();
  const redis = drawer.getByRole("button", { name: "Thêm Redis" });
  await expect(redis).toContainText("Sắp có");
  await expect(drawer.getByRole("button", { name: "Thêm Memcached" })).toContainText("Sắp có");
  await redis.dragTo(page.getByTestId("lab-canvas"), { targetPosition: { x: 300, y: 200 } });
  await redis.click({ force: true });
  await expect(page.locator(".react-flow__node")).toHaveCount(0);

  await drawer.getByRole("searchbox", { name: "Tìm thành phần" }).fill("bo nho dem");
  await expect(drawer.getByRole("button", { name: /^Thêm / })).toHaveText([/Redis/, /Memcached/]);

  await drawer.getByRole("searchbox", { name: "Tìm thành phần" }).fill("");
  await rail.getByRole("tab", { name: "Lối vào" }).click();
  await page.getByRole("button", { name: "Thêm CDN" }).focus();
  await expect(page.getByRole("tooltip")).toContainText("Chưa kéo vào khung vẽ được");
});

test("while connecting, valid targets glow with a drop tip and invalid ones say why; Esc cancels", async ({ page }) => {
  await openLab(page, "vi");
  await addAt(page, "Người dùng", 90, 140);
  await addAt(page, "Máy chủ web", 330, 140);
  await addAt(page, "PostgreSQL", 570, 140);
  const box = async (id: string) => {
    const b = (await page.getByTestId(id).boundingBox())!;
    return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
  };
  const from = await box("handle-out-web-server-1");
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  const pg = await box("node-postgres-1");
  await page.mouse.move(pg.x, pg.y, { steps: 10 });
  await expect(page.getByTestId("node-postgres-1")).toHaveAttribute("data-target", "valid");
  await expect(page.getByRole("tooltip").filter({ hasText: "Thả để nối" })).toBeVisible();
  await expect(page.getByText("Thả vào một thành phần để nối")).toBeVisible();
  const users = await box("node-client-1");
  await page.mouse.move(users.x, users.y, { steps: 10 });
  await expect(page.getByTestId("node-client-1")).toHaveAttribute("data-target", "invalid");
  await expect(page.getByRole("tooltip").filter({ hasText: "không nhận kết nối đi vào" })).toBeVisible();
  await page.keyboard.press("Escape");
  await page.mouse.up();
  await expect(page.locator('[data-testid^="edge-"]')).toHaveCount(0);
  await expect(page.getByTestId("node-postgres-1")).not.toHaveAttribute("data-target", /./);
});

test("the legend toggles from the controls cluster and counts edges per kind", async ({ page }) => {
  await openLab(page, "vi");
  await addAt(page, "Người dùng", 90, 140);
  await addAt(page, "Cân bằng tải", 330, 140);
  await addAt(page, "Máy chủ web", 570, 140);
  await connectByDrag(page, "client-1", "lb-1");
  await connectByDrag(page, "lb-1", "web-server-1");
  const legend = page.getByRole("toolbar", { name: "Điều khiển khung vẽ" }).getByRole("button", { name: "Chú giải" });
  await legend.click();
  const pop = page.getByRole("dialog").filter({ hasText: "Kiểu kết nối trong thiết kế" });
  await expect(pop).toContainText("HTTP");
  await expect(pop).toContainText("2 đường");
  await expect(pop).toContainText("chưa dùng");
  await legend.click();
  await expect(pop).toHaveCount(0);
});

test("arrowheads keep one on-screen size at every zoom, and C opens the connect list", async ({ page }) => {
  await openLab(page);
  await addAt(page, "Users", 90, 140);
  await addAt(page, "Web server", 330, 140);
  await connectByDrag(page, "client-1", "web-server-1");
  const onScreen = () =>
    page.evaluate(() => {
      const m = document.querySelector("#sd-arrow-http")!;
      const zoom = new DOMMatrix(getComputedStyle(document.querySelector(".react-flow__viewport")!).transform).a;
      return Number(m.getAttribute("markerWidth")) * zoom;
    });
  const zoomOut = page.getByRole("button", { name: "Zoom out" });
  await zoomOut.click();
  await zoomOut.click();
  await expect.poll(onScreen).toBeCloseTo(11, 1);
  const zoomIn = page.getByRole("button", { name: "Zoom in" });
  for (let i = 0; i < 4; i++) await zoomIn.click();
  await expect.poll(onScreen).toBeCloseTo(11, 1);

  await page.getByTestId("node-web-server-1").click();
  await page.keyboard.press("c");
  await expect(page.getByRole("dialog", { name: /Connect Web server 1/ })).toBeVisible();
});

