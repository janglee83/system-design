import { sim } from "@sd/sim/node";
import { describe, expect, it, vi } from "vitest";
import type { EngineRequest, ResultOf } from "./protocol";
import { fourTier } from "../test/engine-fixtures";
import { createHandler, MAX_RUNS } from "./worker-core";

function setup() {
  const handle = createHandler(sim, () => 0);
  let id = 0;
  const call = <K extends EngineRequest["type"]>(request: Extract<EngineRequest, { type: K }>) => {
    const { reply, transfer } = handle({ id: ++id, request });
    return { reply, transfer, value: (reply.ok ? reply.value : undefined) as ResultOf[K] };
  };
  return { call };
}

describe("worker-core", () => {
  it("answers the info requests", () => {
    const { call } = setup();
    expect(call({ type: "engineVersion" }).value).toMatch(/^\d+\.\d+\.\d+$/);
    expect(call({ type: "listComponents" }).value.map((m) => m.kind)).toContain("web-server");
    expect(call({ type: "defaultCalibration" }).value.webServiceMs).toBeGreaterThan(0);
    expect(call({ type: "capabilities" }).value.faults).toContain("instance-down");
  });

  it("validates and prices every node; the costs add up to the run's cost", () => {
    const { call } = setup();
    const input = fourTier();
    const v = call({ type: "validate", graph: input.graph, limits: null, calibration: {} }).value;
    expect(v.issues.filter((i) => i.blocking)).toEqual([]);
    expect(v.costs["users"]).toBe(0);
    const sum = Object.values(v.costs).reduce<number>((a, c) => a + (c ?? 0), 0);
    const run = call({ type: "run", input }).value;
    expect(sum).toBeCloseTo(run.metrics.costPerMonth, 6);
  });

  it("uses the design's calibration for prices", () => {
    const { call } = setup();
    const g = fourTier().graph;
    const base = call({ type: "validate", graph: g, limits: null, calibration: {} }).value.costs["pg"]!;
    const doubled = call({ type: "validate", graph: g, limits: null, calibration: { pgCostPerInstance: 1000 } }).value.costs["pg"]!;
    expect(doubled).not.toBe(base);
  });

  it("prices a node with a rejected config as null", () => {
    const { call } = setup();
    const g = fourTier().graph;
    g.nodes[2]!.config = { cpu: 999 };
    const v = call({ type: "validate", graph: g, limits: null, calibration: {} }).value;
    expect(v.costs["web"]).toBeNull();
    expect(v.issues.map((i) => i.code)).toContain("config.invalid");
  });

  it("applies challenge limits", () => {
    const { call } = setup();
    const g = fourTier().graph;
    const v = call({ type: "validate", graph: g, limits: { maxNodes: 3, maxInstances: null, allowedKinds: null }, calibration: {} }).value;
    expect(v.issues.map((i) => i.code)).toContain("limits.too-many-nodes");
  });

  it("runs and transfers the timeline buffer", () => {
    const { call } = setup();
    const { value, transfer } = call({ type: "run", input: fourTier() });
    expect(value.runId).toBe(1);
    expect(value.timeline.header.frames).toBe(100);
    expect(value.timeline.header.fields).toEqual(["inFlight", "queued", "busy", "rejected", "up"]);
    expect(value.timeline.data.length).toBe(100 * value.timeline.header.nodeIds.length * 5);
    expect(transfer).toEqual([value.timeline.data.buffer]);
    expect(value.traces.length).toBeGreaterThan(0);
    expect(value.elapsedMs).toBe(0);
  });

  it("serves traces and JSON of kept runs, and frees runs beyond the last 10", () => {
    const { call } = setup();
    for (let i = 0; i < MAX_RUNS + 1; i++) call({ type: "run", input: fourTier(500) });
    const first = call({ type: "trace", runId: 1, index: 0 }).reply;
    expect(first).toMatchObject({ ok: false, error: { kind: "internal", message: "unknown run 1" } });
    const last = call({ type: "trace", runId: MAX_RUNS + 1, index: 0 }).value;
    expect(last.steps[0]?.nodeId).toBe("users");
    expect(JSON.parse(call({ type: "resultJson", runId: MAX_RUNS + 1 }).value).metrics).toBeDefined();
    expect(call({ type: "dropRun", runId: MAX_RUNS + 1 }).reply.ok).toBe(true);
    expect(call({ type: "trace", runId: MAX_RUNS + 1, index: 0 }).reply.ok).toBe(false);
  });

  it("turns engine errors into typed replies", () => {
    const { call } = setup();
    const bad = fourTier();
    bad.graph.nodes = bad.graph.nodes.filter((n) => n.kind !== "client");
    bad.graph.edges = bad.graph.edges.filter((e) => e.from !== "users");
    expect(call({ type: "run", input: bad }).reply).toMatchObject({ ok: false, error: { kind: "validation" } });

    const nonsense = { ...fourTier(), durationMs: "soon" } as unknown as ReturnType<typeof fourTier>;
    expect(call({ type: "run", input: nonsense }).reply).toMatchObject({ ok: false, error: { kind: "input" } });
  });

  it("reports a wasm trap as a crash, so the client can replace the worker", () => {
    const trapping = { ...sim, simulate: () => { throw new WebAssembly.RuntimeError("unreachable executed"); } };
    const handle = createHandler(trapping, () => 0);
    expect(handle({ id: 1, request: { type: "run", input: fourTier() } }).reply).toEqual({
      id: 1,
      ok: false,
      error: { kind: "crash", message: "unreachable executed" },
    });
  });

  it("frees the run when building its result fails", () => {
    let free: ReturnType<typeof vi.spyOn> | undefined;
    const failing = {
      ...sim,
      simulate: (input: Parameters<typeof sim.simulate>[0]) => {
        const run = sim.simulate(input);
        vi.spyOn(run, "traceSummaries").mockImplementation(() => {
          throw new Error("boom");
        });
        free = vi.spyOn(run, "free");
        return run;
      },
    };
    const handle = createHandler(failing, () => 0);
    expect(handle({ id: 1, request: { type: "run", input: fourTier() } }).reply).toMatchObject({ ok: false, error: { kind: "internal", message: "boom" } });
    expect(free).toHaveBeenCalledOnce();
    // Nothing was kept under a run id.
    expect(handle({ id: 2, request: { type: "trace", runId: 1, index: 0 } }).reply).toMatchObject({ ok: false });
  });

  it("prices each distinct node once: a repeated validate reuses the cached costs", () => {
    let runs = 0;
    const counting = { ...sim, simulate: (input: Parameters<typeof sim.simulate>[0]) => (runs++, sim.simulate(input)) };
    const handle = createHandler(counting, () => 0);
    const g = fourTier().graph;
    handle({ id: 1, request: { type: "validate", graph: g, limits: null, calibration: {} } });
    const first = runs;
    expect(first).toBe(3); // lb, web, pg (the client is free)
    handle({ id: 2, request: { type: "validate", graph: g, limits: null, calibration: {} } });
    expect(runs).toBe(first);
    // A changed config or calibration is priced again; ids do not matter.
    g.nodes[2]!.config = { cpu: 4 };
    handle({ id: 3, request: { type: "validate", graph: g, limits: null, calibration: {} } });
    expect(runs).toBe(first + 1);
    handle({ id: 4, request: { type: "validate", graph: g, limits: null, calibration: { pgCostPerInstance: 1 } } });
    expect(runs).toBe(first + 1 + 3);
  });

  it("a wasm trap while pricing nodes in validate is a crash, not a missing price", () => {
    const trapping = { ...sim, simulate: () => { throw new WebAssembly.RuntimeError("unreachable executed"); } };
    const handle = createHandler(trapping, () => 0);
    expect(handle({ id: 1, request: { type: "validate", graph: fourTier().graph, limits: null, calibration: {} } }).reply).toEqual({
      id: 1,
      ok: false,
      error: { kind: "crash", message: "unreachable executed" },
    });
  });

  it("an unexpected error while pricing is reported, not swallowed", () => {
    const broken = { ...sim, simulate: () => { throw new TypeError("boom"); } };
    const handle = createHandler(broken, () => 0);
    expect(handle({ id: 1, request: { type: "validate", graph: fourTier().graph, limits: null, calibration: {} } }).reply).toMatchObject({
      ok: false,
      error: { kind: "internal", message: "boom" },
    });
  });
});
