import { describe, expect, it } from "vitest";
import { emptyDesign } from "./design";
import { addNode, connect, groupNodes, setConfig } from "./ops";
import { toEngineGraph } from "./sim-input";
import { META_BY_KIND, meta } from "../../test/metas";

describe("toEngineGraph", () => {
  it("keeps only engine fields (Review Focus 4)", () => {
    let d = emptyDesign();
    d = addNode(d, meta("client"), { x: 5, y: 5 }).design;
    d = addNode(d, meta("web-server"), { x: 300, y: 5 }).design;
    d = setConfig(d, "web-server-1", "cpu", 2);
    d = (connect(d, "client-1", "web-server-1", META_BY_KIND) as { design: typeof d }).design;
    d = groupNodes(d, ["web-server-1"])!.design;
    expect(toEngineGraph(d)).toEqual({
      nodes: [
        { id: "client-1", kind: "client", label: "", replicas: 1, config: {} },
        { id: "web-server-1", kind: "web-server", label: "", replicas: 1, config: { cpu: 2 } },
      ],
      edges: [{ id: "e1", from: "client-1", to: "web-server-1", kind: "http" }],
    });
  });
});
