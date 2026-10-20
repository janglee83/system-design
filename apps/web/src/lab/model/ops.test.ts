import { describe, expect, it } from "vitest";
import { emptyDesign, type Design } from "./design";
import { nodeNumber } from "./ids";
import {
  addNode,
  connect,
  copyItems,
  deleteItems,
  duplicateItems,
  groupNodes,
  moveGroup,
  moveNodes,
  pasteItems,
  setCalibration,
  setConfig,
  setWorkload,
  freeSpot,
  ungroup,
  updateNode,
} from "./ops";
import { META_BY_KIND, meta } from "../../test/metas";

function build(): Design {
  let d = emptyDesign();
  for (const [kind, x] of [["client", 0], ["lb", 240], ["web-server", 480], ["postgres", 720]] as const) {
    d = addNode(d, meta(kind), { x, y: 0 }).design;
  }
  return d;
}

describe("design ops", () => {
  it("numbers new nodes per kind and reuses the lowest free number", () => {
    let d = emptyDesign();
    const a = addNode(d, meta("web-server"), { x: 3, y: 9 });
    const b = addNode(a.design, meta("web-server"), { x: 0, y: 0 });
    expect([a.id, b.id]).toEqual(["web-server-1", "web-server-2"]);
    expect(a.design.nodes[0]!.position).toEqual({ x: 0, y: 16 }); // snapped to 16
    d = deleteItems(b.design, { nodes: ["web-server-1"], edges: [], groups: [] });
    expect(addNode(d, meta("web-server"), { x: 0, y: 0 }).id).toBe("web-server-1");
    expect(nodeNumber("web-server-12", "web-server")).toBe(12);
    expect(nodeNumber("custom", "web-server")).toBeNull();
  });

  it("connects with the inferred kind and refuses bad connections", () => {
    const d = build();
    const r1 = connect(d, "client-1", "lb-1", META_BY_KIND);
    expect("edgeId" in r1 && r1.design.edges[0]).toEqual({ id: "e1", from: "client-1", to: "lb-1", kind: "http" });
    const r2 = connect(d, "web-server-1", "postgres-1", META_BY_KIND);
    expect("edgeId" in r2 && r2.design.edges[0]!.kind).toBe("db");
    expect(connect(d, "lb-1", "client-1", META_BY_KIND)).toMatchObject({ refused: "not-accepted", design: d });
    expect(connect(d, "lb-1", "lb-1", META_BY_KIND)).toMatchObject({ refused: "self" });
    const once = (r1 as { design: Design }).design;
    expect(connect(once, "client-1", "lb-1", META_BY_KIND)).toMatchObject({ refused: "duplicate", design: once });
  });

  it("deletes nodes with their edges but never a locked node", () => {
    let d = build();
    for (const [a, b] of [["client-1", "lb-1"], ["lb-1", "web-server-1"], ["web-server-1", "postgres-1"]]) {
      d = (connect(d, a!, b!, META_BY_KIND) as { design: Design }).design;
    }
    d = { ...d, locked: ["client-1"] };
    const after = deleteItems(d, { nodes: ["client-1", "web-server-1"], edges: [], groups: [] });
    expect(after.nodes.map((n) => n.id)).toEqual(["client-1", "lb-1", "postgres-1"]);
    expect(after.edges.map((e) => e.id)).toEqual(["e1"]);
    // An edge touching a locked node can still be deleted (R12).
    expect(deleteItems(after, { nodes: [], edges: ["e1"], groups: [] }).edges).toEqual([]);
    expect(deleteItems(after, { nodes: ["client-1"], edges: [], groups: [] })).toBe(after);
  });

  it("leaves locked nodes' label, replicas and config alone, but lets them move", () => {
    const d = { ...build(), locked: ["web-server-1"] };
    expect(updateNode(d, "web-server-1", { replicas: 3 })).toBe(d);
    expect(setConfig(d, "web-server-1", "cpu", 4)).toBe(d);
    const moved = moveNodes(d, { "web-server-1": { x: 496, y: 32 } });
    expect(moved.nodes.find((n) => n.id === "web-server-1")!.position).toEqual({ x: 496, y: 32 });
  });

  it("clamps replicas to 1..1000 whole numbers and removes unset config keys", () => {
    let d = build();
    d = updateNode(d, "web-server-1", { replicas: 2.7 });
    expect(d.nodes.find((n) => n.id === "web-server-1")!.replicas).toBe(3);
    expect(updateNode(d, "web-server-1", { replicas: 0 }).nodes.find((n) => n.id === "web-server-1")!.replicas).toBe(1);
    d = setConfig(d, "web-server-1", "cpu", 4);
    expect(d.nodes.find((n) => n.id === "web-server-1")!.config).toEqual({ cpu: 4 });
    d = setConfig(d, "web-server-1", "cpu", undefined);
    expect(d.nodes.find((n) => n.id === "web-server-1")!.config).toEqual({});
  });

  it("duplicates nodes with the edges between them, offset by 32 px", () => {
    let d = build();
    d = (connect(d, "lb-1", "web-server-1", META_BY_KIND) as { design: Design }).design;
    d = (connect(d, "web-server-1", "postgres-1", META_BY_KIND) as { design: Design }).design;
    const { design, ids } = duplicateItems(d, ["lb-1", "web-server-1"]);
    expect(ids).toEqual(["lb-2", "web-server-2"]);
    expect(design.edges.at(-1)).toEqual({ id: "e3", from: "lb-2", to: "web-server-2", kind: "http" });
    expect(design.nodes.find((n) => n.id === "lb-2")!.position).toEqual({ x: 272, y: 32 });
  });

  it("pastes a clipboard into another design", () => {
    const clip = copyItems(build(), ["postgres-1"]);
    const { design, ids } = pasteItems(emptyDesign(), clip, { x: 0, y: 0 });
    expect(ids).toEqual(["postgres-1"]);
    expect(design.nodes[0]!.groupId).toBeNull();
  });

  it("groups, moves the group with its members, and ungroups", () => {
    const g = groupNodes(build(), ["lb-1", "web-server-1"])!;
    expect(g.id).toBe("g1");
    const frame = g.design.groups[0]!;
    expect(frame.position).toEqual({ x: 240 - 32, y: 0 - 32 - 24 });
    expect(frame.size).toEqual({ width: 480 + 184 - 240 + 64, height: 76 + 64 + 24 });
    const moved = moveGroup(g.design, "g1", { x: frame.position.x + 100, y: frame.position.y + 50 });
    expect(moved.nodes.find((n) => n.id === "lb-1")!.position).toEqual({ x: 340, y: 50 });
    expect(moved.nodes.find((n) => n.id === "client-1")!.position).toEqual({ x: 0, y: 0 });
    const flat = ungroup(moved, "g1");
    expect(flat.groups).toEqual([]);
    expect(flat.nodes.every((n) => n.groupId === null)).toBe(true);
    expect(flat.nodes.find((n) => n.id === "lb-1")!.position).toEqual({ x: 340, y: 50 });
  });

  it("stores only changed world parameters", () => {
    const defaults = { webServiceMs: 5 } as never;
    let d = setCalibration(emptyDesign(), "webServiceMs", 8, defaults);
    expect(d.calibration).toEqual({ webServiceMs: 8 });
    d = setCalibration(d, "webServiceMs", 5, defaults);
    expect(d.calibration).toEqual({});
  });

  it("setWorkload removes an optional field patched to undefined", () => {
    let d = setWorkload(emptyDesign(), { trafficEndMs: 4000 });
    expect(d.workload.trafficEndMs).toBe(4000);
    d = setWorkload(d, { trafficEndMs: undefined });
    expect("trafficEndMs" in d.workload).toBe(false);
    expect(setWorkload(d, { trafficEndMs: undefined })).toBe(d);
  });

  it("freeSpot steps a new node right until it covers no other card", () => {
    let d = emptyDesign();
    expect(freeSpot(d, { x: 100, y: 100 })).toEqual({ x: 96, y: 96 });
    d = addNode(d, meta("web-server"), { x: 96, y: 96 }).design;
    expect(freeSpot(d, { x: 100, y: 100 })).toEqual({ x: 320, y: 96 }); // one card width + 32 px, snapped
    d = addNode(d, meta("web-server"), { x: 320, y: 96 }).design;
    expect(freeSpot(d, { x: 96, y: 96 })).toEqual({ x: 544, y: 96 });
    expect(freeSpot(d, { x: 1200, y: 600 })).toEqual({ x: 1200, y: 608 }); // already free (600 snaps to 608)
  });
});
