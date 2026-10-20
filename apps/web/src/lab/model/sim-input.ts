import type { Graph } from "@sd/sim";
import type { Design } from "./design";

/** The engine's view of the canvas: no positions, groups or UI fields (Review Focus 4). */
export function toEngineGraph(d: Design): Graph {
  return {
    nodes: d.nodes.map(({ id, kind, label, replicas, config }) => ({ id, kind, label, replicas, config: { ...config } })),
    edges: d.edges.map(({ id, from, to, kind }) => ({ id, from, to, kind })),
  };
}
