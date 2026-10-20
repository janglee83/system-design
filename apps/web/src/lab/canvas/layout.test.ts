import { describe, expect, it } from "vitest";
import { emptyDesign, type Design } from "../model/design";
import { addNode, connect } from "../model/ops";
import { META_BY_KIND, meta } from "../../test/metas";
import { layoutPositions } from "./layout";

function chain(): Design {
  let d = emptyDesign();
  // Added in a scrambled order and position on purpose.
  for (const k of ["postgres", "client", "web-server", "lb"]) d = addNode(d, meta(k), { x: 0, y: 0 }).design;
  for (const [a, b] of [["client-1", "lb-1"], ["lb-1", "web-server-1"], ["web-server-1", "postgres-1"]] as const) {
    d = (connect(d, a, b, META_BY_KIND) as { design: Design }).design;
  }
  return d;
}

describe("auto-layout", () => {
  it("lays the request path out left to right on the 16 px grid", async () => {
    const p = await layoutPositions(chain());
    expect(p["client-1"]!.x).toBeLessThan(p["lb-1"]!.x);
    expect(p["lb-1"]!.x).toBeLessThan(p["web-server-1"]!.x);
    expect(p["web-server-1"]!.x).toBeLessThan(p["postgres-1"]!.x);
    for (const v of Object.values(p)) {
      expect(v.x % 16).toBe(0);
      expect(v.y % 16).toBe(0);
    }
  });

  it("is deterministic", async () => {
    expect(await layoutPositions(chain())).toEqual(await layoutPositions(chain()));
  });

  it("handles an empty design", async () => {
    expect(await layoutPositions(emptyDesign())).toEqual({});
  });
});
