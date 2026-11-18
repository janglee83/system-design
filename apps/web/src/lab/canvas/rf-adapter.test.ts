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
    expect(nodes.find((n) => n.id === "client-1")!.measured).toEqual({ width: 172, height: 148 });
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

  it("labels nodes, groups and edges for screen readers with names, not ids", () => {
    const d = { ...design(), edges: [{ id: "e1", from: "client-1", to: "lb-1", kind: "http" as const }] };
    const aria = {
      node: (n: { id: string }) => `name of ${n.id}`,
      group: (g: { id: string }) => `frame ${g.id}`,
      edge: (e: { from: string; to: string }) => `${e.from} to ${e.to}`,
    };
    const nodes = toFlowNodes(d, { ...ctx, aria });
    expect(nodes.find((n) => n.id === "lb-1")!.ariaLabel).toBe("name of lb-1");
    expect(nodes.find((n) => n.id === "g1")!.ariaLabel).toBe("frame g1");
    expect(toFlowEdges(d, { ...ctx, aria })[0]!.ariaLabel).toBe("client-1 to lb-1");
  });

  it("passes selection, lock, issues and state to the node's name, and marks the selected node current", () => {
    const d = { ...design(), locked: ["lb-1"] };
    const seen: Record<string, unknown> = {};
    const aria = {
      node: (n: { id: string }, _m: unknown, s: unknown) => {
        seen[n.id] = s;
        return n.id;
      },
      group: () => "",
      edge: () => "",
    };
    const nodes = toFlowNodes(d, {
      ...ctx,
      aria,
      selection: { nodes: ["lb-1"], edges: [], groups: [] },
      issues: { nodes: { "lb-1": { blocking: 1, warnings: 1 } }, edges: {} },
      states: { "lb-1": "busy" },
    });
    expect(seen["lb-1"]).toEqual({ selected: true, locked: true, issues: 2, state: "busy" });
    expect(seen["client-1"]).toEqual({ selected: false, locked: false, issues: 0, state: undefined });
    expect(nodes.find((n) => n.id === "lb-1")!.domAttributes?.["aria-current"]).toBe("true");
    expect(nodes.find((n) => n.id === "client-1")!.domAttributes?.["aria-current"]).toBeUndefined();
  });

  it("gives the workload's rate to source nodes only", () => {
    const nodes = toFlowNodes(design(), { ...ctx, baseRps: 1200 });
    expect(nodes.find((n) => n.id === "client-1")!.data.baseRps).toBe(1200);
    expect(nodes.find((n) => n.id === "lb-1")!.data.baseRps).toBeUndefined();
  });

  it("marks the source, valid and invalid targets while connecting, with a tip on the hovered node only", () => {
    const connecting = { from: "lb-1", valid: { "client-1": false, "lb-1": false }, hover: "client-1", tip: "Users accept nothing" };
    const nodes = toFlowNodes(design(), { ...ctx, connecting });
    const data = (id: string) => nodes.find((n) => n.id === id)!.data;
    expect(data("lb-1").target).toBe("source");
    expect(data("client-1").target).toBe("invalid");
    expect(data("client-1").targetTip).toBe("Users accept nothing");
    expect(toFlowNodes(design(), { ...ctx, connecting: { ...connecting, hover: "lb-1" } }).find((n) => n.id === "lb-1")!.data.targetTip).toBeUndefined();
    expect(toFlowNodes(design(), ctx).find((n) => n.id === "client-1")!.data.target).toBeUndefined();
  });

  it("dims kinds the challenge does not allow", () => {
    const nodes = toFlowNodes(design(), { ...ctx, allowedKinds: ["client"] });
    expect(nodes.find((n) => n.id === "client-1")!.data.disallowed).toBe(false);
    expect(nodes.find((n) => n.id === "lb-1")!.data.disallowed).toBe(true);
  });
});
