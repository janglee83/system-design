import { expect, test } from "@playwright/test";
import { addAt, connectByDrag } from "./helpers";

// A first visit: no stored checklist state.
test.use({ storageState: { cookies: [], origins: [] } });

test("the first-run checklist ticks itself, shows a coach step, and can be hidden and reopened", async ({ page }) => {
  await page.goto("/vi/lab");
  await expect(page.getByTestId("engine-status")).toHaveAttribute("data-status", "ready");
  const card = page.getByRole("region", { name: "Làm quen với Lab · 0/5" });
  await expect(card).toBeVisible();

  // Task 1 ticks when Users is added (drop clear of the card at the bottom left).
  await addAt(page, "Người dùng", 420, 120);
  await expect(page.getByRole("region", { name: "Làm quen với Lab · 1/5" })).toBeVisible();

  // "Chỉ cho tôi" on the current task opens step 2/4 with a spotlight on the canvas.
  await page.getByRole("button", { name: "Chỉ cho tôi" }).click();
  const coach = page.getByRole("dialog", { name: "Bước 2/4" });
  await expect(coach).toBeVisible();
  await expect(page.getByTestId("coach-spotlight")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(coach).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Chỉ cho tôi" })).toBeFocused();

  // Three more ticks: the server and its connection, the database, then a run.
  await addAt(page, "Máy chủ web", 600, 120);
  await addAt(page, "PostgreSQL", 600, 330);
  await connectByDrag(page, "client-1", "web-server-1");
  await connectByDrag(page, "web-server-1", "postgres-1");
  await page.keyboard.press("Escape");
  const bar = page.getByTestId("run-bar");
  await expect(bar.getByRole("button", { name: /^Chạy mô phỏng/ })).not.toHaveAttribute("aria-disabled", "true");
  await bar.getByRole("button", { name: /^Chạy mô phỏng/ }).click();
  await expect(page.getByRole("region", { name: "Làm quen với Lab · 4/5" })).toBeVisible();

  // Progress survives a reload.
  await page.reload();
  await expect(page.getByRole("region", { name: "Làm quen với Lab · 4/5" })).toBeVisible();

  // Ẩn hides it; the Help menu brings it back.
  await page.getByTestId("onboarding").getByRole("button", { name: "Ẩn" }).click();
  await expect(page.getByTestId("onboarding")).toHaveCount(0);
  await page.getByRole("button", { name: "Trợ giúp" }).click();
  await page.getByRole("menuitem", { name: "Làm quen với Lab" }).click();
  await expect(page.getByTestId("onboarding")).toBeVisible();
});

test("the checklist lets clicks through everywhere outside it", async ({ page }) => {
  await page.goto("/vi/lab?template=webDb");
  await expect(page.getByTestId("onboarding")).toBeVisible();
  await page.getByTestId("node-web-server-1").click();
  await expect(page.getByTestId("inspector-node")).toBeVisible();
});
