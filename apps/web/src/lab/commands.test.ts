import { describe, expect, it, vi } from "vitest";
import { emptyDesign } from "./model/design";
import { addNode, connect, groupNodes } from "./model/ops";
import type { Design } from "./model/design";
import { META_BY_KIND, meta } from "../test/metas";
import {
  autoLayout,
  connectNodes,
  copySelection,
  deleteSelection,
  duplicateSelection,
  groupSelection,
  pasteClipboard,
  redo,
  selectAll,
  undo,
  ungroupSelection,
} from "./commands";
import { createDesignStore } from "./store/design-store";

describe("connectNodes", () => {
  it("connects, selects the new edge, and records one history step", () => {
    let d = emptyDesign();
    d = addNode(d, meta("client"), { x: 0, y: 0 }).design;
    d = addNode(d, meta("web-server"), { x: 240, y: 0 }).design;
    const api = createDesignStore(d);
    expect(connectNodes(api, META_BY_KIND, "client-1", "web-server-1")).toEqual({ ok: true, edgeId: "e1" });
    expect(api.getState().selection.edges).toEqual(["e1"]);
    expect(api.getState().past).toHaveLength(1);
  });

  it("reports why a connection is refused and changes nothing", () => {
    let d = emptyDesign();
    d = addNode(d, meta("client"), { x: 0, y: 0 }).design;
    d = addNode(d, meta("web-server"), { x: 240, y: 0 }).design;
    const api = createDesignStore(d);
    expect(connectNodes(api, META_BY_KIND, "web-server-1", "client-1")).toEqual({ ok: false, reason: "not-accepted" });
    expect(api.getState().past).toHaveLength(0);
  });
});

function threeNodes(): Design {
  let d = emptyDesign();
  for (const [kind, x] of [["client", 0], ["lb", 240], ["web-server", 480]] as const) d = addNode(d, meta(kind), { x, y: 0 }).design;
  d = (connect(d, "client-1", "lb-1", META_BY_KIND) as { design: Design }).design;
  return (connect(d, "lb-1", "web-server-1", META_BY_KIND) as { design: Design }).design;
}
const pos = (api: ReturnType<typeof createDesignStore>, id: string) => api.getState().design.nodes.find((n) => n.id === id)!.position;

describe("editing commands", () => {
  it("deleteSelection removes the selection but keeps a locked node", () => {
    const api = createDesignStore({ ...threeNodes(), locked: ["client-1"] });
    api.getState().select({ nodes: ["client-1", "web-server-1"], edges: ["e1"] });
    deleteSelection(api);
    const d = api.getState().design;
    expect(d.nodes.map((n) => n.id)).toEqual(["client-1", "lb-1"]);
    expect(d.edges).toEqual([]);
    expect(api.getState().past).toHaveLength(1);
  });

  it("duplicateSelection selects the copies", () => {
    const api = createDesignStore(threeNodes());
    api.getState().select({ nodes: ["lb-1", "web-server-1"] });
    duplicateSelection(api);
    expect(api.getState().selection.nodes).toEqual(["lb-2", "web-server-2"]);
    expect(api.getState().design.edges.at(-1)).toMatchObject({ from: "lb-2", to: "web-server-2" });
  });

  it("each paste of a copy lands 32 px further away", () => {
    const api = createDesignStore(threeNodes());
    api.getState().select({ nodes: ["lb-1"] });
    copySelection(api);
    pasteClipboard(api);
    pasteClipboard(api);
    expect(pos(api, "lb-2")).toEqual({ x: 240 + 32, y: 32 });
    expect(pos(api, "lb-3")).toEqual({ x: 240 + 64, y: 64 });
    expect(api.getState().selection.nodes).toEqual(["lb-3"]);
  });

  it("selectAll selects every node, edge and group", () => {
    const api = createDesignStore(groupNodes(threeNodes(), ["lb-1"])!.design);
    selectAll(api);
    expect(api.getState().selection).toEqual({ nodes: ["client-1", "lb-1", "web-server-1"], edges: ["e1", "e2"], groups: ["g1"] });
  });

  it("undo and redo move through history", () => {
    const api = createDesignStore(threeNodes());
    api.getState().select({ nodes: ["web-server-1"] });
    deleteSelection(api);
    undo(api);
    expect(api.getState().design.nodes).toHaveLength(3);
    redo(api);
    expect(api.getState().design.nodes).toHaveLength(2);
  });
});

describe("layout and group commands", () => {
  it("groups the selected nodes and selects the frame; ungrouping a member removes it", () => {
    const api = createDesignStore(threeNodes());
    api.getState().select({ nodes: ["lb-1", "web-server-1"] });
    groupSelection(api);
    expect(api.getState().selection).toEqual({ nodes: [], edges: [], groups: ["g1"] });
    expect(api.getState().design.nodes.filter((n) => n.groupId === "g1").map((n) => n.id)).toEqual(["lb-1", "web-server-1"]);
    api.getState().select({ nodes: ["lb-1"], groups: [] });
    ungroupSelection(api);
    expect(api.getState().design.groups).toEqual([]);
  });

  it("auto-layout is one history step and refits frames", async () => {
    const api = createDesignStore(groupNodes(threeNodes(), ["lb-1", "web-server-1"])!.design);
    const before = api.getState().design.groups[0]!;
    await autoLayout(api);
    expect(api.getState().past).toHaveLength(1);
    const d = api.getState().design;
    const xs = ["client-1", "lb-1", "web-server-1"].map((id) => d.nodes.find((n) => n.id === id)!.position.x);
    expect(xs[0]).toBeLessThan(xs[1]!);
    expect(xs[1]).toBeLessThan(xs[2]!);
    const g = d.groups[0]!;
    expect(g).not.toEqual(before);
    const lb = d.nodes.find((n) => n.id === "lb-1")!.position;
    expect(g.position.x).toBe(lb.x - 32);
  });

  it("drops a layout result if the design changed while it was computed", async () => {
    const api = createDesignStore(threeNodes());
    const pending = autoLayout(api);
    api.getState().apply((d) => addNode(d, meta("postgres"), { x: 0, y: 0 }).design);
    expect(await pending).toBe(false);
    expect(api.getState().past).toHaveLength(1); // only the add
  });

  it("runs one layout at a time", async () => {
    const api = createDesignStore(threeNodes());
    expect(await Promise.all([autoLayout(api), autoLayout(api)])).toEqual([true, false]);
    expect(api.getState().past).toHaveLength(1);
    expect(await autoLayout(api)).toBe(true); // the guard is released afterwards
  });

  it("counts pastes per design store, and copying leaves the system clipboard alone", () => {
    const write = vi.fn(() => Promise.resolve());
    vi.stubGlobal("navigator", { clipboard: { writeText: write } });
    const a = createDesignStore(threeNodes());
    const b = createDesignStore(threeNodes());
    a.getState().select({ nodes: ["lb-1"] });
    b.getState().select({ nodes: ["lb-1"] });
    copySelection(a);
    pasteClipboard(a);
    copySelection(b); // another Lab tab's copy must not reset A's paste offset
    pasteClipboard(a);
    expect(pos(a, "lb-3")).toEqual({ x: 240 + 64, y: 64 });
    expect(write).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});
