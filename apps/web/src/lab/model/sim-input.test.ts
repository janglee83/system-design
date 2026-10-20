import { describe, expect, it } from "vitest";
import { emptyDesign } from "./design";
import { addNode, connect, groupNodes, setConfig } from "./ops";
import { buildSimInput, toEngineGraph } from "./sim-input";
import { META_BY_KIND, meta } from "../../test/metas";

describe("toEngineGraph", () => {
  it("keeps only engine fields (Review Focus 4)", () => {
    let d = emptyDesign();
    d = addNode(d, meta("client"), { x: 5, y: 5 }).design;
    d = addNode(d, meta("web-server"), { x: 300, y: 5 }).design;
    d = setConfig(d, "web-server-1", "cpu", 2);
    d = (connect(d, "client-1", "web-server-1", META_BY_KIND) as { design: typeof d }).design;
    d = groupNodes(d, ["web-server-1"])!.design;
    expect(toEngineGraph(d)).toEqual({
      nodes: [
        { id: "client-1", kind: "client", label: "", replicas: 1, config: {} },
        { id: "web-server-1", kind: "web-server", label: "", replicas: 1, config: { cpu: 2 } },
      ],
      edges: [{ id: "e1", from: "client-1", to: "web-server-1", kind: "http" }],
    });
  });
});

describe("buildSimInput", () => {
  it("builds exactly what the engine needs (Review Focus 4)", () => {
    let d = emptyDesign();
    d = addNode(d, meta("client"), { x: 0, y: 0 }).design;
    d = { ...d, faults: [{ kind: "instance-down", target: null, atMs: 3000 }], durationMs: 20_000, seed: 7 };
    const input = buildSimInput(d);
    expect(Object.keys(input).sort()).toEqual(["durationMs", "faults", "graph", "seed", "workload"]);
    expect(input).toMatchObject({ durationMs: 20_000, seed: 7, faults: [{ kind: "instance-down", target: null, atMs: 3000 }] });
  });

  it("sends calibration only when a world parameter changed", () => {
    const d = { ...emptyDesign(), calibration: { webServiceMs: 9 } };
    expect(buildSimInput(d).calibration).toEqual({ webServiceMs: 9 });
  });

  it("returns copies, so the design cannot be mutated through the input", () => {
    const d = emptyDesign();
    const input = buildSimInput(d);
    input.workload.params["x"] = 1;
    input.faults.push({ kind: "instance-down", target: null, atMs: 0 });
    expect(d.workload.params).toEqual({});
    expect(d.faults).toEqual([]);
  });

  it("the engine accepts what it builds", async () => {
    const { sim } = await import("@sd/sim/node");
    let d = emptyDesign();
    d = addNode(d, meta("client"), { x: 0, y: 0 }).design;
    d = addNode(d, meta("web-server"), { x: 0, y: 0 }).design;
    d = (connect(d, "client-1", "web-server-1", META_BY_KIND) as { design: typeof d }).design;
    const run = sim.simulate(buildSimInput(d));
    expect(run.metrics.requestsTotal).toBeGreaterThan(0);
    run.free();
  });
});
