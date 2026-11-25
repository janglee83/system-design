import { describe, expect, it } from "vitest";
import { META_BY_KIND, meta } from "../../test/metas";
import { emptyDesign, type Design } from "../model/design";
import { addNode, connect } from "../model/ops";
import { bezierMidpoint, bezierPath, BACK_DROP, connectTarget, legendCounts } from "./edge-geometry";

function design(): Design {
  let d = emptyDesign();
  d = addNode(d, meta("client"), { x: 0, y: 0 }).design;
  d = addNode(d, meta("web-server"), { x: 300, y: 0 }).design;
  d = addNode(d, meta("postgres"), { x: 600, y: 0 }).design;
  d = (connect(d, "client-1", "web-server-1", META_BY_KIND) as { design: Design }).design;
  return d;
}

describe("edges (design-system §6)", () => {
  it("draw a cubic Bézier with control points max(40, dx/2) out horizontally", () => {
    expect(bezierPath(0, 0, 200, 50)).toBe("M0,0 C100,0 100,50 200,50");
    expect(bezierPath(0, 0, 30, 0)).toBe("M0,0 C40,0 -10,0 30,0");
    // A target to the left is routed under the tiles instead (see the backward-edge test).
    expect(bezierPath(100, 10, 0, 10)).toBe("M100,10 C172,10 172,140 50,140 C-72,140 -72,10 0,10");
  });

  it("say whether a node is a valid target while connecting, with the kind or the reason", () => {
    const d = design();
    expect(connectTarget(d, "web-server-1", "postgres-1", META_BY_KIND)).toEqual({ valid: true, kind: "db" });
    expect(connectTarget(d, "web-server-1", "client-1", META_BY_KIND)).toEqual({ valid: false, reason: "not-accepted" });
    expect(connectTarget(d, "client-1", "web-server-1", META_BY_KIND)).toEqual({ valid: false, reason: "duplicate" });
    expect(connectTarget(d, "web-server-1", "web-server-1", META_BY_KIND)).toEqual({ valid: false, reason: "self" });
  });

  it("count edges per kind for the legend, every kind listed", () => {
    const d = design();
    expect(legendCounts(d.edges)).toEqual({ http: 1, db: 0, cache: 0, msg: 0 });
  });

  it("routes a backward edge (target left of the source) under the tiles, without looping back", () => {
    // Source port at (500, 100), target port at (100, 100): the target is to the left.
    const d = bezierPath(500, 100, 100, 100);
    const nums = d.match(/-?\d+(\.\d+)?/g)!.map(Number);
    const xs = nums.filter((_, i) => i % 2 === 0);
    const ys = nums.filter((_, i) => i % 2 === 1);
    expect(d.match(/C/g)).toHaveLength(2); // out and down, then across and up into the target
    expect(Math.max(...ys)).toBeGreaterThanOrEqual(100 + BACK_DROP); // it passes below the tiles
    expect(Math.min(...ys)).toBeGreaterThanOrEqual(100); // never above the ports
    expect(Math.max(...xs)).toBeLessThanOrEqual(500 + 80); // leaves the source to the right, a little
    expect(Math.min(...xs)).toBeGreaterThanOrEqual(100 - 80);
    // Its midpoint (for the traffic pill) sits on the low run between the tiles.
    expect(bezierMidpoint(500, 100, 100, 100)).toEqual({ x: 300, y: 100 + BACK_DROP });
  });
});

