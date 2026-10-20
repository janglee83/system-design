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
