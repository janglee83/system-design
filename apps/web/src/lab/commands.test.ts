import { describe, expect, it } from "vitest";
import { emptyDesign } from "./model/design";
import { addNode } from "./model/ops";
import { META_BY_KIND, meta } from "../test/metas";
import { connectNodes } from "./commands";
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
