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
