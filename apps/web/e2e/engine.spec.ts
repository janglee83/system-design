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

test("while the engine boots, the canvas is busy and the boot card lists real steps", async ({ page, context }) => {
  let release!: () => void;
  const gate = new Promise<void>((r) => (release = r));
  await context.route(WASM, async (route) => {
    await gate;
    await route.continue();
  });
  await page.goto("/vi/lab");
  const boot = page.getByTestId("engine-boot");
  await expect(boot).toBeVisible();
  await expect(boot).toHaveAttribute("role", "status");
  await expect(page.locator('section[data-tour="canvas"]')).toHaveAttribute("aria-busy", "true");
  await expect(boot.locator("li")).toHaveText([/Tải lõi mô phỏng/, /Đọc tham số thế giới/, /Chuẩn bị khung vẽ/, /Mở thiết kế gần nhất/]);
  release();
  await expect(page.getByTestId("engine-status")).toHaveAttribute("data-status", "ready");
  await expect(boot).toHaveCount(0);
  await expect(page.locator('section[data-tour="canvas"]')).not.toHaveAttribute("aria-busy", /./);
});

test("an engine error keeps the saved design on the canvas; editing still works; retry boots again", async ({ page, context }) => {
  await page.goto("/en/lab?template=webDb");
  await expect(page.getByTestId("node-postgres-1")).toBeVisible();
  // Wait for the autosave to have written the draft (IndexedDB "sd-lab", kv "draft").
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          new Promise<number>((resolve) => {
            const open = indexedDB.open("sd-lab");
            open.onsuccess = () => {
              const get = open.result.transaction("kv").objectStore("kv").get("draft");
              get.onsuccess = () => resolve((get.result as { design?: { nodes?: unknown[] } } | undefined)?.design?.nodes?.length ?? 0);
              get.onerror = () => resolve(0);
            };
            open.onerror = () => resolve(0);
          }),
      ),
    )
    .toBe(3);
  let block = true;
  await context.route(WASM, (route) => (block ? route.abort() : route.continue()));
  await page.goto("/en/lab");
  const card = page.getByRole("alert").filter({ hasText: "could not start" });
  await expect(card).toBeVisible();
  await expect(page.getByTestId("node-postgres-1")).toBeVisible();
  await card.getByRole("button", { name: "Edit the design while it cannot run" }).click();
  await expect(card).toHaveCount(0);
  await expect(page.getByTestId("engine-status")).toHaveAttribute("data-status", "error");
  await expect(page.getByTestId("run-bar").getByRole("button", { name: /^Run simulation/ })).toHaveAttribute("aria-disabled", "true");
  block = false;
  await page.reload();
  await expect(page.getByTestId("engine-status")).toHaveAttribute("data-status", "ready");
  await expect(page.getByTestId("node-postgres-1")).toBeVisible();
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

// users -> lb -> web -> pg (same design as src/test/engine-fixtures.ts fourTier()).
const node = (id: string, kind: string, replicas = 1, config: Record<string, number> = {}) => ({ id, kind, label: "", replicas, config });
const INPUT = {
  graph: {
    nodes: [node("users", "client"), node("lb", "lb", 2), node("web", "web-server", 3, { cpu: 2 }), node("pg", "postgres", 1, { readReplicas: 1 })],
    edges: [
      { id: "e1", from: "users", to: "lb", kind: "http" },
      { id: "e2", from: "lb", to: "web", kind: "http" },
      { id: "e3", from: "web", to: "pg", kind: "db" },
    ],
  },
  workload: { profile: "mixed", baseRps: 2000, writeRatio: 0.2, clients: 1000, clientTimeoutMs: 1000, surge: null, params: {} },
  faults: [],
  durationMs: 10_000,
  seed: 1,
};

test("validate and run go through the real worker and structured clone", async ({ page }) => {
  await page.goto("/en/lab");
  await expect(page.getByTestId("engine-status")).toHaveAttribute("data-status", "ready");
  const out = await page.evaluate(async (input) => {
    type Req = { type: string; [k: string]: unknown };
    const engine = (window as unknown as { __sdEngine: { request(r: Req): Promise<any> } }).__sdEngine; // eslint-disable-line @typescript-eslint/no-explicit-any
    const v = await engine.request({ type: "validate", graph: input.graph, limits: null, calibration: {} });
    const run = await engine.request({ type: "run", input });
    const trace = await engine.request({ type: "trace", runId: run.runId, index: 0 });
    const { header, data } = run.timeline;
    return {
      blocking: v.issues.filter((i: { blocking: boolean }) => i.blocking).length,
      costed: Object.keys(v.costs).sort(),
      isFloat32: data instanceof Float32Array,
      length: data.length,
      expected: header.frames * header.nodeIds.length * header.fields.length,
      frames: header.frames,
      traces: run.traces.length,
      firstStep: trace.steps[0]?.nodeId,
      costPerMonth: run.metrics.costPerMonth,
      costSum: Object.values(v.costs as Record<string, number | null>).reduce<number>((a, c) => a + (c ?? 0), 0),
    };
  }, INPUT);
  expect(out.blocking).toBe(0);
  expect(out.costed).toEqual(["lb", "pg", "users", "web"]);
  expect(out.isFloat32).toBe(true);
  expect(out.frames).toBe(100);
  expect(out.length).toBe(out.expected);
  expect(out.length).toBe(100 * 4 * 5);
  expect(out.traces).toBeGreaterThan(0);
  expect(out.firstStep).toBe("users");
  expect(out.costSum).toBeCloseTo(out.costPerMonth, 6);
});

test("pages carry a nonce CSP and the hardening headers; the engine still starts with no violation", async ({ page }) => {
  const violations: string[] = [];
  page.on("console", (m) => {
    if (/Content Security Policy|Refused to/i.test(m.text())) violations.push(m.text());
  });
  const res = (await page.goto("/en/lab"))!;
  const h = res.headers();
  expect(h["content-security-policy"]).toMatch(/script-src 'self' 'nonce-[^']+' 'strict-dynamic' 'wasm-unsafe-eval'/);
  expect(h["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(h["x-content-type-options"]).toBe("nosniff");
  expect(h["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(h["permissions-policy"]).toContain("camera=()");
  expect(h["cross-origin-opener-policy"]).toBe("same-origin");
  expect(h["content-security-policy"]).toContain("worker-src 'self';");
  expect(h["content-security-policy"]).not.toContain("blob:");
  await expect(page.getByTestId("engine-status")).toHaveAttribute("data-status", "ready");
  await expect(page.locator("html")).toHaveAttribute("data-theme", /light|dark/); // the nonced head script ran
  expect(violations).toEqual([]);
});
