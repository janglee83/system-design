import { expect, test } from "@playwright/test";

test.describe("Vietnamese browser", () => {
  test.use({ locale: "vi-VN" });
  test("a first visit lands on the Vietnamese Lab", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/vi\/lab$/);
    await expect(page.locator("html")).toHaveAttribute("lang", "vi");
  });
});

test.describe("English browser", () => {
  test.use({ locale: "en-US" });
  test("a first visit lands on the English Lab", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/en\/lab$/);
    await expect(page.getByTestId("lab-page")).toBeVisible();
  });
});

test("an unknown locale is a 404", async ({ page }) => {
  // "fr" is not a locale, so the middleware treats it as a path under the browser's locale
  // (en here): /fr/lab -> 307 -> /en/fr/lab, which does not exist.
  const res = await page.goto("/fr/lab");
  expect(res?.url()).toMatch(/\/en\/fr\/lab$/);
  expect(res?.status()).toBe(404);
  expect(res?.request().redirectedFrom()?.url()).toMatch(/\/fr\/lab$/);
  await expect(page).toHaveURL(/\/en\/fr\/lab$/);
});
