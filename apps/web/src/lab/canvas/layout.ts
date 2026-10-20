import ELK from "elkjs/lib/elk.bundled.js";
import { NODE_SIZE, type Design, type XY } from "../model/design";
import { snap } from "../model/ops";

const elk = new ELK();

const OPTIONS = {
  "elk.algorithm": "layered",
  "elk.direction": "RIGHT",
  "elk.edgeRouting": "ORTHOGONAL",
  "elk.layered.spacing.nodeNodeBetweenLayers": "96",
  "elk.spacing.nodeNode": "48",
  "elk.layered.nodePlacement.strategy": "BRANDES_KOEPF",
  "elk.layered.considerModelOrder.strategy": "NODES_AND_EDGES",
};

/** New absolute positions for every node; edges are drawn by React Flow (R14). */
export async function layoutPositions(d: Design): Promise<Record<string, XY>> {
  if (d.nodes.length === 0) return {};
  const ids = [...d.nodes.map((n) => n.id)].sort(); // stable input order
  const graph = await elk.layout({
    id: "root",
    layoutOptions: OPTIONS,
    children: ids.map((id) => ({ id, width: NODE_SIZE.width, height: NODE_SIZE.height })),
    edges: d.edges.map((e) => ({ id: e.id, sources: [e.from], targets: [e.to] })),
  });
  const out: Record<string, XY> = {};
  for (const c of graph.children ?? []) out[c.id] = { x: snap(c.x ?? 0) + 64, y: snap(c.y ?? 0) + 64 };
  return out;
}
