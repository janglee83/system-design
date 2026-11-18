import { expect, test } from "@playwright/test";

test("the top bar reaches every section", async ({ page }) => {
  await page.goto("/en/lab");
  const nav = page.getByRole("navigation", { name: "Main" });
  for (const [name, path] of [["Learn", "/en/learn"], ["Challenges", "/en/challenges"], ["Leaderboard", "/en/leaderboard"], ["Lab", "/en/lab"]]) {
    await nav.getByRole("link", { name }).click();
    await expect(page).toHaveURL(new RegExp(`${path}$`));
    await expect(nav.getByRole("link", { name })).toHaveAttribute("aria-current", "page");
  }
});

test("switching language keeps the page and is remembered", async ({ page }) => {
  await page.goto("/en/challenges");
  await page.getByRole("radio", { name: "VI" }).click();
  await expect(page).toHaveURL(/\/vi\/challenges$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Thử thách");
  await page.goto("/");
  await expect(page).toHaveURL(/\/vi\/lab$/);
});

test("the theme choice survives a reload, and system follows the OS", async ({ page }) => {
  await page.goto("/en/lab");
  await page.getByRole("radio", { name: "Dark" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

  await page.getByRole("radio", { name: "Follow the system" }).click();
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.emulateMedia({ colorScheme: "light" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
});

test("narrow windows get a dismissible notice and still render", async ({ page }) => {
  await page.setViewportSize({ width: 1100, height: 800 });
  await page.goto("/en/lab");
  await expect(page.getByText(/at least 1280 pixels/)).toBeVisible();
  await page.getByRole("button", { name: "Dismiss" }).click();
  await expect(page.getByText(/at least 1280 pixels/)).toBeHidden();
  await expect(page.getByTestId("lab-page")).toBeVisible();
});

test("⌘K / Ctrl+K adds a component in the Lab and finds a challenge in Vietnamese", async ({ page }) => {
  await page.goto("/en/lab");
  await expect(page.getByTestId("engine-status")).toHaveAttribute("data-status", "ready");
  await page.keyboard.press("Control+k");
  await page.getByRole("combobox", { name: "Search" }).fill("postgres");
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("node-postgres-1")).toBeVisible();

  await page.goto("/vi/learn");
  await page.getByRole("button", { name: /Tìm kiếm/ }).click();
  await page.getByRole("combobox", { name: "Tìm kiếm" }).fill("cua hang nho");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/vi\/lab\?challenge=c-l0-first-launch/);
});

test("Design v2 tokens: the 2A accent in both themes", async ({ page }) => {
  const accent = () => page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--sd-accent").trim().toUpperCase());
  await page.goto("/en/lab");
  await page.getByRole("radio", { name: "Light" }).click();
  expect(await accent()).toBe("#0B6870");
  await page.getByRole("radio", { name: "Dark" }).click();
  expect(await accent()).toBe("#3FC3CB");
});

test("focus rings show for the keyboard only", async ({ page }) => {
  await page.goto("/en/lab");
  const pill = page.getByTestId("problems");
  const outline = () => pill.evaluate((el) => ({ style: getComputedStyle(el).outlineStyle, width: getComputedStyle(el).outlineWidth }));
  await pill.click();
  await pill.click(); // closes the list; focus stays on the pill
  await expect(pill).toBeFocused();
  expect((await outline()).style).toBe("none");
  await page.keyboard.press("Shift+Tab");
  await page.keyboard.press("Tab");
  await expect(pill).toBeFocused();
  expect(await outline()).toEqual({ style: "solid", width: "2px" });
});
