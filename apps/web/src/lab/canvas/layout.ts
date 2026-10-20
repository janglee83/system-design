import type { ELK } from "elkjs/lib/elk-api";
import { NODE_SIZE, type Design, type XY } from "../model/design";
import { snap } from "../model/ops";

/** ELK is large; it loads on the first layout, not with the Lab. */
let elkP: Promise<ELK> | null = null;
const getElk = (): Promise<ELK> =>
  (elkP ??= import("elkjs/lib/elk.bundled.js").then(
    (m) => new m.default(),
    (e: unknown) => {
      elkP = null; // let a later layout try again
      throw e;
    },
  ));

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
  const known = new Set(ids);
  const elk = await getElk();
  const graph = await elk.layout({
    id: "root",
    layoutOptions: OPTIONS,
    children: ids.map((id) => ({ id, width: NODE_SIZE.width, height: NODE_SIZE.height })),
    // An edge to a missing node (an imported file) would make ELK throw; validation reports it.
    edges: d.edges.filter((e) => known.has(e.from) && known.has(e.to)).map((e) => ({ id: e.id, sources: [e.from], targets: [e.to] })),
  });
  const out: Record<string, XY> = {};
  for (const c of graph.children ?? []) out[c.id] = { x: snap(c.x ?? 0) + 64, y: snap(c.y ?? 0) + 64 };
  return out;
}
