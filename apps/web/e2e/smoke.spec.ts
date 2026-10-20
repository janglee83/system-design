import { expect, test } from "@playwright/test";

test("the app answers", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("app-root")).toBeAttached();
});
