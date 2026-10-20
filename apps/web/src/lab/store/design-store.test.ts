import { describe, expect, it } from "vitest";
import { emptyDesign } from "../model/design";
import { addNode, moveNodes } from "../model/ops";
import { meta } from "../../test/metas";
import { createDesignStore, HISTORY_LIMIT } from "./design-store";

describe("design store", () => {
  it("records one step per change and restores exact snapshots", () => {
    const s = createDesignStore();
    const d0 = s.getState().design;
    s.getState().apply((d) => addNode(d, meta("client"), { x: 0, y: 0 }).design);
    const d1 = s.getState().design;
    s.getState().apply((d) => moveNodes(d, { "client-1": { x: 64, y: 64 } })); // a whole drag is one apply
    expect(s.getState().past).toHaveLength(2);
    s.getState().undo();
    expect(s.getState().design).toBe(d1);
    s.getState().undo();
    expect(s.getState().design).toBe(d0);
    s.getState().redo();
    expect(s.getState().design).toBe(d1);
  });

  it("ignores no-op changes and clears redo on a new change", () => {
    const s = createDesignStore();
    s.getState().apply((d) => d);
    expect(s.getState().past).toHaveLength(0);
    s.getState().apply((d) => addNode(d, meta("client"), { x: 0, y: 0 }).design);
    s.getState().undo();
    s.getState().apply((d) => addNode(d, meta("lb"), { x: 0, y: 0 }).design);
    expect(s.getState().future).toHaveLength(0);
  });

  it(`keeps the last ${HISTORY_LIMIT} steps`, () => {
    const s = createDesignStore();
    for (let i = 0; i < HISTORY_LIMIT + 50; i++) s.getState().apply((d) => ({ ...d, seed: i + 2 }));
    expect(s.getState().past).toHaveLength(HISTORY_LIMIT);
    for (let i = 0; i < HISTORY_LIMIT; i++) s.getState().undo();
    expect(s.getState().design.seed).toBe(51);
  });

  it("drops selected ids that no longer exist", () => {
    const s = createDesignStore();
    s.getState().apply((d) => addNode(d, meta("client"), { x: 0, y: 0 }).design);
    s.getState().select({ nodes: ["client-1"] });
    s.getState().undo();
    expect(s.getState().selection.nodes).toEqual([]);
  });

  it("replace loads a design and clears history", () => {
    const s = createDesignStore();
    s.getState().apply((d) => ({ ...d, seed: 9 }));
    s.getState().replace(emptyDesign("x"));
    expect(s.getState()).toMatchObject({ past: [], future: [], design: { name: "x" } });
  });
});
