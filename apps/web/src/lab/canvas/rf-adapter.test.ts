import { describe, expect, it } from "vitest";
import { emptyDesign } from "../model/design";
import { addNode, groupNodes, moveNodes } from "../model/ops";
import { META_BY_KIND, meta } from "../../test/metas";
import { reuseFlowEdges, reuseFlowNodes, toAbsolute, toFlowEdges, toFlowNodes } from "./rf-adapter";

function design() {
  let d = emptyDesign();
  d = addNode(d, meta("client"), { x: 0, y: 0 }).design;
  d = addNode(d, meta("lb"), { x: 240, y: 0 }).design;
  return groupNodes(d, ["lb-1"])!.design;
}
const ctx = {
  metas: META_BY_KIND,
  selection: { nodes: ["client-1"], edges: [], groups: [] },
  costs: {},
  issues: { nodes: {}, edges: {} },
  drag: {},
};

describe("React Flow adapter", () => {
  it("puts groups first and gives members a position relative to their frame", () => {
    const d = design();
    const nodes = toFlowNodes(d, ctx);
    expect(nodes.map((n) => [n.id, n.type, n.parentId])).toEqual([
      ["g1", "group", undefined],
      ["client-1", "lab", undefined],
      ["lb-1", "lab", "g1"],
    ]);
    const g = d.groups[0]!;
    expect(nodes[2]!.position).toEqual({ x: 240 - g.position.x, y: 0 - g.position.y });
    expect(nodes[1]!.selected).toBe(true);
  });

  it("converts a member's relative position back to absolute", () => {
    const d = design();
    const g = d.groups[0]!;
    expect(toAbsolute("lb-1", { x: 10, y: 20 }, d)).toEqual({ x: g.position.x + 10, y: g.position.y + 20 });
    expect(toAbsolute("client-1", { x: 10, y: 20 }, d)).toEqual({ x: 10, y: 20 });
  });

  it("marks locked nodes as not deletable and carries the edge kind", () => {
    const d = { ...design(), locked: ["client-1"], edges: [{ id: "e1", from: "client-1", to: "lb-1", kind: "http" as const }] };
    const n = toFlowNodes(d, ctx).find((x) => x.id === "client-1")!;
    expect(n.deletable).toBe(false);
    expect(toFlowEdges(d, ctx)[0]).toMatchObject({ id: "e1", source: "client-1", target: "lb-1", type: "lab", data: { kind: "http" } });
  });

  it("gives React Flow the measured size, so it never hides nodes to re-measure them", () => {
    const d = design();
    const nodes = toFlowNodes(d, ctx);
    expect(nodes.find((n) => n.id === "client-1")!.measured).toEqual({ width: 184, height: 76 });
    expect(nodes.find((n) => n.id === "g1")!.measured).toEqual(d.groups[0]!.size);
  });

  it("reuses unchanged node and edge objects, so only what changed re-renders", () => {
    const d = { ...design(), edges: [{ id: "e1", from: "client-1", to: "lb-1", kind: "http" as const }] };
    const first = toFlowNodes(d, ctx);
    const firstEdges = toFlowEdges(d, ctx);
    // A drag of client-1, with freshly computed (but equal) issue counts.
    const moved = moveNodes(d, { "client-1": { x: 32, y: 32 } });
    const ctx2 = { ...ctx, issues: { nodes: {}, edges: {} } };
    const next = reuseFlowNodes(toFlowNodes(moved, ctx2), first);
    expect(next.find((n) => n.id === "client-1")).not.toBe(first.find((n) => n.id === "client-1"));
    expect(next.find((n) => n.id === "lb-1")).toBe(first.find((n) => n.id === "lb-1"));
    expect(next.find((n) => n.id === "g1")).toBe(first.find((n) => n.id === "g1"));
    expect(reuseFlowEdges(toFlowEdges(moved, ctx2), firstEdges)[0]).toBe(firstEdges[0]);
    // A real change in a node's inputs is not reused.
    const costed = reuseFlowNodes(toFlowNodes(moved, { ...ctx2, costs: { "lb-1": 10 } }), next);
    expect(costed.find((n) => n.id === "lb-1")).not.toBe(next.find((n) => n.id === "lb-1"));
  });
});
