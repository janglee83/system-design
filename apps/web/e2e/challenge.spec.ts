import { expect, test } from "@playwright/test";
import { addAt, connectByDrag, runOnce, paletteItem } from "./helpers";

test("open c-l0-first-launch from the challenges list, check the locked node, run", async ({ page }) => {
  await page.goto("/en/challenges");
  await page.locator("li", { hasText: "Opening a small online shop" }).getByRole("link", { name: "Open in the Lab" }).click();
  // The challenge's start design opened (the query is dropped once it is in place).
  await expect(page).toHaveURL(/\/en\/lab/);
  await expect(page.getByTestId("node-users")).toBeVisible();
  await expect(page.getByTestId("engine-status")).toHaveAttribute("data-status", "ready");

  const users = page.getByTestId("node-users");
  await expect(users.getByLabel("Locked by the challenge")).toBeVisible();
  await users.click();
  await page.keyboard.press("Delete");
  await expect(users).toBeVisible();
  const inspector = page.getByRole("complementary", { name: "Inspector" });
  await expect(inspector.getByText("The challenge locks this component.")).toBeVisible();
  await expect(inspector.getByRole("spinbutton", { name: "Replicas" })).toBeDisabled();

  await expect(await paletteItem(page, "Load balancer")).toHaveAttribute("aria-disabled", "true");
  // Below the challenge's Users tile (the start design is zoomed to fit).
  await addAt(page, "Web server", 150, 470);
  await addAt(page, "PostgreSQL", 600, 470);
  await connectByDrag(page, "users", "web-server-1");
  await connectByDrag(page, "web-server-1", "postgres-1");
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("problems")).toHaveText("No problems");
  await runOnce(page);
  await expect(page.getByTestId("metric-p95")).toBeVisible();
});

test("a template starts a fresh design", async ({ page }) => {
  await page.goto("/en/lab?template=webDb");
  await expect(page.getByTestId("node-postgres-1")).toBeVisible();
  await expect(page.getByTestId("edge-e2")).toHaveAttribute("data-kind", "db");
});
