import { describe, expect, it } from "vitest";
import { emptyDesign } from "../model/design";
import { addNode, groupNodes } from "../model/ops";
import { META_BY_KIND, meta } from "../../test/metas";
import { toAbsolute, toFlowEdges, toFlowNodes } from "./rf-adapter";

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
});
