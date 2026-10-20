import { expect, test } from "@playwright/test";

test("the Lab shows an empty canvas with the edge legend", async ({ page }) => {
  await page.goto("/en/lab");
  await expect(page.getByTestId("engine-status")).toHaveAttribute("data-status", "ready");
  await expect(page.getByText("Nothing here yet")).toBeVisible();
  for (const k of ["http", "db", "cache", "msg"]) await expect(page.getByTestId(`legend-${k}`)).toBeVisible();
  await expect(page.getByTestId("legend-db")).toContainText("Database");
});
