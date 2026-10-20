import { expect, test } from "@playwright/test";
import { addAt, connectByDrag, openLab } from "./helpers";

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
  await connectByDrag(page, "web-server-1", "client-1");
  await expect(page.getByTestId("edge-e1")).toHaveCount(0);
});

test("problems update live and nodes show their monthly cost", async ({ page }) => {
  await openLab(page);
  await expect(page.getByTestId("problems")).toHaveText("1 problem"); // no client
  await addAt(page, "Users", 120, 200);
  await addAt(page, "Web server", 420, 200);
  await expect(page.getByTestId("problems")).toContainText("problem"); // client.no-path + unreachable
  await connectByDrag(page, "client-1", "web-server-1");
  await expect(page.getByTestId("problems")).toHaveText("No problems");
  await expect(page.getByTestId("node-web-server-1")).toContainText(/\$\d+ \/mo/);
  await page.getByTestId("problems").click();
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
