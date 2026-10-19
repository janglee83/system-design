import { describe, expect, it } from "vitest";
import { sim } from "../src/node";
import { SimValidationError } from "../src/errors";
import { webTier } from "./helpers";

describe("SimRun", () => {
  it("exposes metrics, events and a typed timeline", () => {
    const run = sim.simulate(webTier(2, 2, 2000));
    expect(run.metrics.availability).toBeGreaterThan(0.999);
    expect(run.timeline.frames).toBe(100);
    expect(run.timeline.nodeIds).toEqual(["lb", "users", "web"]);
    const busy = run.timeline.series("web", "busy");
    expect(busy).toBeInstanceOf(Float32Array);
    expect(busy.length).toBe(100);
    expect(run.timeline.value(99, "web", "up")).toBe(1);
    expect(() => run.timeline.value(0, "nope", "busy")).toThrow(/unknown node/);
    run.free();
  });

  it("loads traces on demand", () => {
    const run = sim.simulate(webTier(2, 2, 2000));
    const summaries = run.traceSummaries();
    expect(summaries.length).toBeGreaterThan(200);
    const first = run.trace(0);
    expect(first.steps[0]?.nodeId).toBe("users");
    expect(first.outcome).toBe("delivered");
    run.free();
  });

  it("grades a run against goals", () => {
    const run = sim.simulate(webTier(2, 5, 8000));
    const verdict = sim.grade(run, [
      { id: "lat", metric: "p95", op: "<=", value: 100 },
      { id: "spof", metric: "spofCount", op: "==", value: 0 },
    ]);
    expect(verdict).toMatchObject({ passed: true, score: 100, stars: 5 });
    run.free();
  });

  // Review focus 5.
  it("throws a clear error after free()", () => {
    const run = sim.simulate(webTier(1, 1, 100));
    run.free();
    expect(() => run.metrics).toThrow("SimRun already freed");
    expect(() => run.trace(0)).toThrow("SimRun already freed");
    expect(() => run.free()).not.toThrow();
  });

  it("turns invalid graphs into SimValidationError", () => {
    const input = webTier(1, 1, 100);
    input.graph.nodes = input.graph.nodes.filter((n) => n.kind !== "client");
    input.graph.edges = [];
    try {
      sim.simulate(input);
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(SimValidationError);
      expect((e as SimValidationError).issues.map((i) => i.code)).toContain("graph.no-client");
    }
  });

  it("lists component metadata for the palette", () => {
    expect(sim.listComponents().map((c) => c.kind)).toEqual(["client", "lb", "postgres", "web-server"]);
  });

  it("exposes default calibration and applies overrides", () => {
    const defaults = sim.defaultCalibration();
    expect(defaults.webRpsPerVcpu).toBe(9000);
    expect(defaults.webCostPerVcpu).toBe(22.5);
    const input = webTier(2, 5, 8000);
    input.workload.surge = { factor: 3, atMs: 2000, durationMs: 6000 };
    const fast = sim.simulate(input);
    input.calibration = { webRpsPerVcpu: 3000 };
    const slow = sim.simulate(input);
    expect(fast.metrics.availability).toBeGreaterThan(0.999);
    expect(slow.metrics.availability).toBeLessThan(0.95);
    fast.free();
    slow.free();
  });

  it("rejects invalid calibration with the field name", () => {
    const input = webTier(1, 1, 100);
    input.calibration = { webRpsPerVcpu: -1 };
    try {
      sim.simulate(input);
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(SimValidationError);
      expect((e as SimValidationError).issues[0]).toMatchObject({ code: "calibration.invalid", field: "webRpsPerVcpu" });
    }
  });
});
