import { expect, test } from "@playwright/test";

async function ranThreeTier(page: import("@playwright/test").Page) {
  await page.goto("/vi/lab?template=webDb");
  await expect(page.getByTestId("node-postgres-1")).toBeVisible();
  const bar = page.getByTestId("run-bar");
  await expect(bar.getByRole("button", { name: /^Chạy mô phỏng/ })).not.toHaveAttribute("aria-disabled", "true");
  await bar.getByRole("button", { name: /^Chạy mô phỏng/ }).click();
  await expect(bar).toHaveAttribute("data-run-id", /\d+/);
  await expect(bar).toHaveAttribute("data-status", "idle");
}

test("the playback bar plays and pauses (button and Space) and starts paused", async ({ page }) => {
  await ranThreeTier(page);
  const pb = page.getByTestId("playback-bar");
  await expect(pb).toBeVisible();
  await pb.getByRole("button", { name: "Phát" }).click();
  await expect(pb.getByRole("button", { name: "Tạm dừng" })).toBeVisible();
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await page.keyboard.press("Space");
  await expect(pb.getByRole("button", { name: "Phát" })).toBeVisible();
  await page.keyboard.press("Space");
  await expect(pb.getByRole("button", { name: "Tạm dừng" })).toBeVisible();
});

test("the scrubber is a slider: ArrowRight moves 0.1 s, End jumps to the end; speeds are a radio group", async ({ page }) => {
  await ranThreeTier(page);
  const slider = page.getByTestId("playback-bar").getByRole("slider", { name: "Thời điểm phát" });
  await expect(slider).toHaveAttribute("aria-valuetext", "0,0 / 10,0 giây");
  await slider.focus();
  await page.keyboard.press("ArrowRight");
  await expect(slider).toHaveAttribute("aria-valuetext", "0,1 / 10,0 giây");
  await page.keyboard.press("End");
  await expect(slider).toHaveAttribute("aria-valuetext", "10,0 / 10,0 giây");
  const speeds = page.getByRole("radiogroup", { name: "Tốc độ phát" });
  await expect(speeds.getByRole("radio")).toHaveCount(5);
  await speeds.getByRole("radio", { name: "4×" }).click();
  await expect(speeds.getByRole("radio", { name: "4×" })).toHaveAttribute("aria-checked", "true");
});

test("instance-down turns the node grey with its live line; the edge goes dead; Home brings it back", async ({ page }) => {
  await page.goto("/en/lab?template=webDb");
  await expect(page.getByTestId("node-postgres-1")).toBeVisible();
  const inspector = page.getByRole("complementary", { name: "Inspector" });
  await inspector.getByRole("button", { name: "Add fault" }).click(); // instance-down at 3.0 s, any web server
  const bar = page.getByTestId("run-bar");
  await bar.getByRole("button", { name: /^Run simulation/ }).click();
  await expect(bar).toHaveAttribute("data-run-id", /\d+/);
  const scrub = page.getByRole("slider", { name: "Playback time" });
  await scrub.focus();
  await page.keyboard.press("End");
  const web = page.getByTestId("node-web-server-1");
  await expect(web).toHaveAttribute("data-state", "down");
  await expect(web).toContainText("Down since 3.0 s");
  await expect(page.getByTestId("edge-e1")).toHaveAttribute("data-state", "dead");
  await page.keyboard.press("Home");
  await expect(web).not.toHaveAttribute("data-state", "down");
  await expect(web).toContainText("% load");
});

test("a design edit after the run makes the playback stale", async ({ page }) => {
  await page.goto("/en/lab?template=webDb");
  await expect(page.getByTestId("node-postgres-1")).toBeVisible();
  const bar = page.getByTestId("run-bar");
  await bar.getByRole("button", { name: /^Run simulation/ }).click();
  await expect(bar).toHaveAttribute("data-run-id", /\d+/);
  await expect(page.getByTestId("node-web-server-1")).toContainText("% load");
  await page.getByTestId("node-web-server-1").click();
  const r = page.getByRole("complementary", { name: "Inspector" }).getByRole("spinbutton", { name: "Replicas" });
  await r.fill("3");
  await r.press("Enter");
  await expect(page.getByText("The design changed after this run.", { exact: false })).toBeVisible();
  await expect(page.getByTestId("node-web-server-1")).not.toContainText("% load");
});

test("request dots move while playing, beside a live chip; none under reduced motion", async ({ page }) => {
  await ranThreeTier(page);
  await page.getByTestId("playback-bar").getByRole("button", { name: "Phát" }).click();
  await expect(page.locator("circle.dot").first()).toBeAttached();
  expect(await page.locator("circle.dot").count()).toBeGreaterThanOrEqual(4);
  await expect(page.getByTestId("live-chip")).toContainText(/giây \d+,\d \/ 10,0/);
  await expect(page.getByTestId("verdict")).toHaveCount(0); // the chip has the top of the canvas
  await page.emulateMedia({ reducedMotion: "reduce" }); // listened to live
  await expect(page.locator("circle.dot")).toHaveCount(0);
});
