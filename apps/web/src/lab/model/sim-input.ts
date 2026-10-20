import type { Graph, SimInput } from "@sd/sim";
import type { Design } from "./design";

/** The engine's view of the canvas: no positions, groups or UI fields (Review Focus 4). */
export function toEngineGraph(d: Design): Graph {
  return {
    nodes: d.nodes.map(({ id, kind, label, replicas, config }) => ({ id, kind, label, replicas, config: { ...config } })),
    edges: d.edges.map(({ id, from, to, kind }) => ({ id, from, to, kind })),
  };
}

/** Everything the engine needs, nothing it does not (spec §5.4, Review Focus 4). */
export function buildSimInput(d: Design): SimInput {
  const input: SimInput = {
    graph: toEngineGraph(d),
    workload: structuredClone(d.workload),
    faults: d.faults.map((f) => ({ ...f })),
    durationMs: d.durationMs,
    seed: d.seed,
  };
  if (Object.keys(d.calibration).length > 0) input.calibration = { ...d.calibration };
  return input;
}
