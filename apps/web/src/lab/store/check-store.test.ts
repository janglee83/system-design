import { describe, expect, it } from "vitest";
import { createCheckStore, hasBlocking, issueCounts } from "./check-store";

const issue = (code: string, blocking: boolean, nodeId: string | null = null, edgeId: string | null = null) => ({ code, blocking, nodeId, edgeId, field: null });

describe("check store", () => {
  it("drops replies older than the latest request", () => {
    const s = createCheckStore();
    const a = s.getState().begin();
    const b = s.getState().begin();
    s.getState().finish(b, { issues: [], costs: { x: 1 } });
    s.getState().finish(a, { issues: [issue("graph.no-client", true)], costs: {} });
    expect(s.getState().costs).toEqual({ x: 1 });
    expect(hasBlocking(s.getState())).toBe(false);
  });

  it("counts blocking issues and warnings per node and edge, including run-time ones", () => {
    const s = createCheckStore();
    const seq = s.getState().begin();
    s.getState().finish(seq, { issues: [issue("node.unreachable", false, "pg"), issue("edge.not-accepted", true, null, "e2")], costs: {} });
    s.getState().setRunIssues([issue("workload.invalid", true)]);
    expect(issueCounts(s.getState())).toEqual({ nodes: { pg: { blocking: 0, warnings: 1 } }, edges: { e2: 1 } });
    expect(hasBlocking(s.getState())).toBe(true);
  });

  it("markStale blocks until the next check and drops the reply in flight", () => {
    const s = createCheckStore();
    const a = s.getState().begin();
    s.getState().markStale();
    expect(s.getState().status).toBe("checking");
    s.getState().finish(a, { issues: [], costs: { x: 1 } });
    expect(s.getState().status).toBe("checking");
    expect(s.getState().costs).toEqual({});
  });
});
