import { describe, expect, it } from "vitest";
import { focusViewport } from "./focus-viewport";

const size = { width: 172, height: 148 };
const node = (id: string, x: number, y: number) => ({ id, position: { x, y } });
const canvas = { width: 1000, height: 560 };
const area = { top: 120, side: 48, bottom: 48 };
/** A node's on-screen box for a viewport. */
const box = (n: { position: { x: number; y: number } }, v: { x: number; y: number; zoom: number }) => ({
  left: n.position.x * v.zoom + v.x,
  top: n.position.y * v.zoom + v.y,
  right: (n.position.x + size.width) * v.zoom + v.x,
  bottom: (n.position.y + size.height) * v.zoom + v.y,
});

describe("focusViewport (where it broke)", () => {
  const nodes = [node("users", 64, 64), node("web", 336, 64), node("pg", 608, 64), node("far", 3000, 3000)];
  const edges = [
    { from: "users", to: "web" },
    { from: "web", to: "pg" },
  ];

  it("fits the failing node and its direct neighbours below the strip, at most 100 %", () => {
    const v = focusViewport({ nodes, edges, failingId: "web", nodeSize: size, canvas, area, calloutHeight: 120 });
    expect(v.zoom).toBeLessThanOrEqual(1);
    for (const id of ["users", "web", "pg"]) {
      const b = box(nodes.find((n) => n.id === id)!, v);
      expect(b.left, id).toBeGreaterThanOrEqual(area.side - 0.5);
      expect(b.right, id).toBeLessThanOrEqual(canvas.width - area.side + 0.5);
      expect(b.top, id).toBeGreaterThanOrEqual(area.top - 0.5);
      expect(b.bottom, id).toBeLessThanOrEqual(canvas.height - area.bottom + 0.5);
    }
    // The callout under the failing node fits too.
    expect(box(nodes[1]!, v).bottom + 120 * v.zoom).toBeLessThanOrEqual(canvas.height - area.bottom + 0.5);
  });

  it("fits exactly the given nodes when told to (a followed path)", () => {
    const v = focusViewport({ nodes, edges: [], failingId: "users", only: ["users", "web", "pg"], nodeSize: size, canvas, area, calloutHeight: 0 });
    for (const id of ["users", "pg"]) {
      const b = box(nodes.find((n) => n.id === id)!, v);
      expect(b.left, id).toBeGreaterThanOrEqual(area.side - 0.5);
      expect(b.right, id).toBeLessThanOrEqual(canvas.width - area.side + 0.5);
    }
  });

  it("does not zoom in past 100 % for a lone node", () => {
    const v = focusViewport({ nodes, edges: [], failingId: "web", nodeSize: size, canvas, area, calloutHeight: 120 });
    expect(v.zoom).toBe(1);
  });

  it("centres the failing node below the strip when the group would need under 50 %", () => {
    const wide = [...nodes, node("x", -4000, 64)];
    const v = focusViewport({ nodes: wide, edges: [...edges, { from: "x", to: "web" }], failingId: "web", nodeSize: size, canvas, area, calloutHeight: 120 });
    expect(v.zoom).toBe(1);
    const b = box(nodes[1]!, v);
    expect((b.left + b.right) / 2).toBeCloseTo(canvas.width / 2, 0);
    expect(b.top).toBeGreaterThanOrEqual(area.top);
  });
});
