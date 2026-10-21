import { createTranslator } from "next-intl";
import { describe, expect, it } from "vitest";
import en from "../../messages/en.json";
import vi from "../../messages/vi.json";
import { emptyDesign } from "./model/design";
import { addNode, connect, setEdgeKind } from "./model/ops";
import { META_BY_KIND, meta } from "../test/metas";
import { issueText } from "./issue-text";

function design() {
  let d = emptyDesign();
  d = addNode(d, meta("client"), { x: 0, y: 0 }).design;
  d = addNode(d, meta("postgres"), { x: 0, y: 0 }).design;
  d = (connect(d, "client-1", "postgres-1", META_BY_KIND) as { design: typeof d }).design;
  return setEdgeKind(d, "e1", "http");
}

describe("issueText", () => {
  it("names the target and kind of a refused edge, in both languages", () => {
    const issue = { code: "edge.not-accepted", nodeId: null, edgeId: "e1", field: null, blocking: true };
    const ctx = { design: design(), metas: META_BY_KIND };
    expect(issueText(issue, { ...ctx, t: createTranslator({ locale: "en", messages: en }) })).toBe("PostgreSQL 1 does not accept HTTP connections.");
    expect(issueText(issue, { ...ctx, t: createTranslator({ locale: "vi", messages: vi }) })).toBe("PostgreSQL 1 không nhận kết nối kiểu HTTP.");
  });

  it("translates field names for config and workload issues", () => {
    const t = createTranslator({ locale: "en", messages: en });
    const ctx = { design: design(), metas: META_BY_KIND, t };
    expect(issueText({ code: "config.invalid", nodeId: "postgres-1", edgeId: null, field: "readReplicas", blocking: true }, ctx)).toBe(
      "PostgreSQL 1: “Read replicas” is outside the allowed range.",
    );
    expect(issueText({ code: "config.invalid", nodeId: "postgres-1", edgeId: null, field: "replicas", blocking: true }, ctx)).toContain("“Replicas”");
    expect(issueText({ code: "calibration.invalid", nodeId: null, edgeId: null, field: "pgFailoverMs", blocking: true }, ctx)).toContain("time to promote a replica");
  });

  it("falls back to the code for an unknown code instead of throwing", () => {
    const t = createTranslator({ locale: "en", messages: en, onError: () => {} });
    expect(issueText({ code: "brand.new", nodeId: null, edgeId: null, field: null, blocking: true }, { design: design(), metas: META_BY_KIND, t })).toBe("brand.new");
  });
});
