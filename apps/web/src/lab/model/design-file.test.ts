import { describe, expect, it } from "vitest";
import { emptyDesign } from "./design";
import { DESIGN_FILE_LIMITS, exportDesign, parseDesignFile } from "./design-file";
import { addNode, connect, groupNodes } from "./ops";
import { META_BY_KIND, meta } from "../../test/metas";

function sample() {
  let d = emptyDesign("Shop");
  d = addNode(d, meta("client"), { x: 0, y: 0 }).design;
  d = addNode(d, meta("web-server"), { x: 240, y: 0 }).design;
  d = (connect(d, "client-1", "web-server-1", META_BY_KIND) as { design: typeof d }).design;
  d = groupNodes(d, ["web-server-1"])!.design;
  return { ...d, faults: [{ kind: "instance-down" as const, target: "web-server-1", atMs: 3000 }], calibration: { webServiceMs: 6 }, locked: ["client-1"] };
}
const codes = (text: string) => {
  const r = parseDesignFile(text);
  return r.ok ? [] : r.issues.map((i) => `${i.path}|${i.code}`);
};

describe("design file", () => {
  it("round-trips a design exactly", () => {
    const d = sample();
    const { filename, text } = exportDesign(d, "0.1.0");
    expect(filename).toBe("shop.sdlab.json");
    expect(JSON.parse(text)).toMatchObject({ designFormatVersion: 1, engineVersion: "0.1.0" });
    expect(parseDesignFile(text)).toEqual({ ok: true, design: d });
  });

  it("reports broken JSON and unknown versions", () => {
    expect(codes("{")).toEqual(["|invalid_json"]);
    const v2 = JSON.parse(exportDesign(sample(), "x").text);
    v2.designFormatVersion = 2;
    expect(codes(JSON.stringify(v2))).toEqual(["designFormatVersion|unsupported_version"]);
  });

  it("names the path of each problem", () => {
    const doc = JSON.parse(exportDesign(sample(), "x").text);
    doc.nodes[0].replicas = "two";
    doc.edges[0].kind = "carrier-pigeon";
    doc.extra = true;
    expect(codes(JSON.stringify(doc))).toEqual(
      expect.arrayContaining(["nodes.0.replicas|invalid_type", "edges.0.kind|invalid_value", "|unrecognized_keys"]),
    );
  });

  it("rejects dangling references and duplicate ids", () => {
    const doc = JSON.parse(exportDesign(sample(), "x").text);
    doc.edges[0].to = "ghost";
    doc.nodes.push({ ...doc.nodes[0] });
    doc.locked = ["nobody"];
    expect(codes(JSON.stringify(doc))).toEqual(
      expect.arrayContaining(["edges.0.to|dangling_ref", "nodes.2.id|duplicate_id", "locked.0|dangling_ref"]),
    );
  });

  it("rejects oversized designs before doing work on them", () => {
    const doc = JSON.parse(exportDesign(sample(), "x").text);
    doc.nodes = Array.from({ length: DESIGN_FILE_LIMITS.nodes + 1 }, (_, i) => ({ ...doc.nodes[0], id: `n${i}` }));
    expect(codes(JSON.stringify(doc))).toContain("nodes|too_big");
  });

  it("cannot be used to set prototypes", () => {
    const doc = JSON.parse(exportDesign(sample(), "x").text);
    const text = JSON.stringify(doc).replace('"config":{}', '"config":{"__proto__":{"polluted":1}}');
    const r = parseDesignFile(text);
    expect(r.ok).toBe(false);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });

  it("accepts an unknown component kind (validation reports it later)", () => {
    const doc = JSON.parse(exportDesign(sample(), "x").text);
    doc.nodes[1].kind = "quantum-cache";
    expect(parseDesignFile(JSON.stringify(doc)).ok).toBe(true);
  });
});
