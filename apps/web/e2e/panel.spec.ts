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

test("the bottom panel: delta lines name the compared run, events show on the canvas, requests filter by outcome", async ({ page }) => {
  await page.goto("/vi/lab?template=webDb");
  await expect(page.getByTestId("node-postgres-1")).toBeVisible();
  const rps = page.getByRole("complementary", { name: "Thuộc tính" }).getByRole("spinbutton", { name: "Tổng số yêu cầu mỗi giây" });
  const run = async () => {
    const bar = page.getByTestId("run-bar");
    const before = (await bar.getAttribute("data-run-id")) ?? "";
    await bar.getByRole("button", { name: /^Chạy mô phỏng/ }).click();
    await expect(bar).not.toHaveAttribute("data-run-id", before);
    await expect(bar).toHaveAttribute("data-status", "idle");
  };
  await run();
  await rps.fill("9000");
  await rps.press("Enter");
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await run();
  await expect(page.getByTestId("metric-p95")).toContainText(/so với #1/);

  // Requests: the "Bị từ chối" chip shows only rejected rows.
  await page.getByRole("tab", { name: "Nhật ký" }).click();
  await page.getByRole("group", { name: "Lọc theo kết quả" }).getByRole("button", { name: /^Bị từ chối/ }).click();
  const rows = page.getByTestId("request-table").getByTestId("trace-row");
  expect(await rows.count()).toBeGreaterThan(0);
  for (const o of await rows.evaluateAll((els) => els.map((e) => e.getAttribute("data-outcome")))) expect(o).toBe("rejected");
});

test("an event's 'Xem trên sơ đồ' selects its component; the events tab counts warnings", async ({ page }) => {
  await page.goto("/vi/lab?template=webDb");
  await expect(page.getByTestId("node-postgres-1")).toBeVisible();
  const inspector = page.getByRole("complementary", { name: "Thuộc tính" });
  await inspector.getByRole("button", { name: "Thêm sự cố" }).click(); // instance-down at 3.0 s
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  const bar = page.getByTestId("run-bar");
  await bar.getByRole("button", { name: /^Chạy mô phỏng/ }).click();
  await expect(bar).toHaveAttribute("data-run-id", /\d+/);
  const tab = page.getByRole("tab", { name: /^Sự kiện/ });
  await expect(tab).toContainText(/\d/);
  await tab.click();
  await page.getByRole("button", { name: "Xem trên sơ đồ" }).first().click();
  await expect(page.locator('[data-testid^="node-"][data-selected]')).toHaveCount(1);
});

test("the Mô phỏng tab holds the workload form in four columns", async ({ page }) => {
  await page.goto("/vi/lab?template=webDb");
  await expect(page.getByTestId("node-postgres-1")).toBeVisible();
  const bar = page.getByTestId("run-bar");
  await bar.getByRole("button", { name: /^Chạy mô phỏng/ }).click();
  await expect(bar).toHaveAttribute("data-run-id", /\d+/);
  await page.getByRole("tab", { name: "Mô phỏng" }).click();
  const form = page.getByTestId("sim-form");
  await expect(form.getByRole("spinbutton", { name: "Tổng số yêu cầu mỗi giây" })).toBeVisible();
  const cols = await form.locator("[data-section-body]").first().evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(" ").length);
  expect(cols).toBe(4);
});
