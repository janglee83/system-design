import { expect, test, type Page } from "@playwright/test";

async function pickTheme(page: Page, name: string) {
  await page.getByRole("button", { name: "Theme" }).click();
  await page.getByRole("menuitemradio", { name }).click();
}

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
  await page.getByRole("button", { name: "Language" }).click();
  await page.getByRole("menuitemradio", { name: "Tiếng Việt" }).click();
  await expect(page).toHaveURL(/\/vi\/challenges$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Thử thách");
  await page.goto("/");
  await expect(page).toHaveURL(/\/vi\/lab$/);
});

test("the theme choice survives a reload, and system follows the OS", async ({ page }) => {
  await page.goto("/en/lab");
  await pickTheme(page, "Dark");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

  await pickTheme(page, "Follow the system");
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
  await pickTheme(page, "Light");
  expect(await accent()).toBe("#0B6870");
  await pickTheme(page, "Dark");
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

test("at 1280 px nothing in the Lab's top bar overflows", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/vi/lab");
  await expect(page.getByTestId("engine-status")).toHaveAttribute("data-status", "ready");
  const bar = page.getByTestId("top-bar");
  const overflow = await bar.evaluate((el) =>
    [el, ...el.querySelectorAll<HTMLElement>("*")].filter((e) => e.clientWidth > 1 && e.scrollWidth > e.clientWidth + 1).map((e) => e.outerHTML.slice(0, 80)),
  );
  expect(overflow).toEqual([]);
  const box = (await bar.boundingBox())!;
  for (const el of await bar.locator("button, a").all()) {
    const b = await el.boundingBox();
    if (b) expect(b.x + b.width).toBeLessThanOrEqual(box.x + box.width);
  }
  // The language button folds into Help at this width.
  await expect(page.getByRole("button", { name: "Ngôn ngữ" })).toBeHidden();
  await page.getByRole("button", { name: "Trợ giúp" }).click();
  await expect(page.getByRole("menuitemradio", { name: "English" })).toBeVisible();
});
