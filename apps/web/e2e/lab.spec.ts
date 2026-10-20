import { expect, test } from "@playwright/test";

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
  await expect(page.getByRole("button", { name: /^Thêm / })).toHaveCount(1);
});
