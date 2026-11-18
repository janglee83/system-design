import { describe, expect, it } from "vitest";
import { META_BY_KIND, meta } from "../../test/metas";
import { emptyDesign, type Design } from "../model/design";
import { addNode, connect } from "../model/ops";
import { bezierPath, connectTarget, legendCounts } from "./edge-geometry";

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
    expect(bezierPath(100, 10, 0, 10)).toBe("M100,10 C150,10 -50,10 0,10");
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
});
