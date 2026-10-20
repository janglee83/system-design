import { expect, test } from "@playwright/test";

const WASM = /\/_next\/static\/media\/sim_wasm_bg\.[0-9a-f]+\.wasm$/;

test("the engine loads in a worker from a hashed wasm asset", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(String(e)));
  const wasm = page.waitForResponse((r) => WASM.test(new URL(r.url()).pathname));
  await page.goto("/en/lab");
  const res = await wasm;
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toBe("application/wasm");
  expect(res.headers()["cache-control"]).toContain("immutable");
  const status = page.getByTestId("engine-status");
  await expect(status).toHaveAttribute("data-status", "ready");
  await expect(status).toContainText(/\d+\.\d+\.\d+/);
  expect(errors).toEqual([]);
});

test("a failed wasm load shows a retry banner, and retry recovers", async ({ page, context }) => {
  let block = true;
  await context.route(WASM, (route) => (block ? route.abort() : route.continue()));
  await page.goto("/en/lab");
  // Next.js renders its own (empty) role="alert" route announcer, so pick ours by its text.
  await expect(page.getByRole("alert").filter({ hasText: "could not start" })).toBeVisible();
  block = false;
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.getByTestId("engine-status")).toHaveAttribute("data-status", "ready");
});
