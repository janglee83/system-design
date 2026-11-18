import { expect, test } from "@playwright/test";
import { addAt, connectByDrag, runOnce } from "./helpers";

test("open c-l0-first-launch from the challenges list, check the locked node, run", async ({ page }) => {
  await page.goto("/en/challenges");
  await page.locator("li", { hasText: "Opening a small online shop" }).getByRole("link", { name: "Open in the Lab" }).click();
  await expect(page).toHaveURL(/\/en\/lab\?challenge=c-l0-first-launch/);
  await expect(page.getByTestId("engine-status")).toHaveAttribute("data-status", "ready");

  const users = page.getByTestId("node-users");
  await expect(users.getByLabel("Locked by the challenge")).toBeVisible();
  await users.click();
  await page.keyboard.press("Delete");
  await expect(users).toBeVisible();
  const inspector = page.getByRole("complementary", { name: "Inspector" });
  await expect(inspector.getByText("The challenge locks this component.")).toBeVisible();
  await expect(inspector.getByRole("spinbutton", { name: "Replicas" })).toBeDisabled();

  await expect(page.getByRole("button", { name: "Add Load balancer" })).toHaveAttribute("aria-disabled", "true");
  await addAt(page, "Web server", 420, 220);
  await addAt(page, "PostgreSQL", 700, 220);
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
