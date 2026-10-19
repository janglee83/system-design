import { describe, expect, it } from "vitest";
import { sim } from "../src/node";
import type { SimInput } from "../src/types";

function tenNodes(): SimInput {
  const nodes: SimInput["graph"]["nodes"] = [
    { id: "users", kind: "client", label: "", replicas: 1, config: {} },
    { id: "lb", kind: "lb", label: "", replicas: 2, config: {} },
  ];
  const edges: SimInput["graph"]["edges"] = [{ id: "e0", from: "users", to: "lb", kind: "http" }];
  for (let k = 1; k <= 4; k++) {
    nodes.push({ id: `web${k}`, kind: "web-server", label: "", replicas: 2, config: {} });
    nodes.push({ id: `pg${k}`, kind: "postgres", label: "", replicas: 1, config: { readReplicas: 1 } });
    edges.push({ id: `a${k}`, from: "lb", to: `web${k}`, kind: "http" });
    edges.push({ id: `b${k}`, from: `web${k}`, to: `pg${k}`, kind: "db" });
  }
  return {
    graph: { nodes, edges },
    workload: { profile: "mixed", baseRps: 20000, writeRatio: 0.2, clients: 1000, clientTimeoutMs: 1000, surge: null, params: {} },
    faults: [],
    durationMs: 10000,
    seed: 7,
  };
}

describe("performance budget (spec §5)", () => {
  it("runs 10 nodes for 10 s in under 50 ms including the boundary", () => {
    const input = tenNodes();
    sim.simulate(input).free(); // warm up
    const times: number[] = [];
    for (let k = 0; k < 20; k++) {
      const t0 = performance.now();
      const run = sim.simulate(input);
      void run.metrics;
      void run.timeline.series("web1", "busy");
      run.free();
      times.push(performance.now() - t0);
    }
    times.sort((a, b) => a - b);
    const median = times[10]!;
    expect(median).toBeLessThan(50);
  });
});
