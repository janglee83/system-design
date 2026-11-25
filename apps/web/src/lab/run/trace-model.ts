import type { RequestClass, Trace, TraceOutcome, TraceSummary } from "@sd/sim";
import type { Design } from "../model/design";

/** Sampled requests, slowest first (ties by id), optionally of one outcome. */
export function filterTraces(s: readonly TraceSummary[], outcome: TraceOutcome | null): TraceSummary[] {
  return s.filter((x) => outcome === null || x.outcome === outcome).sort((a, b) => b.latencyMs - a.latencyMs || a.id - b.id);
}

/** The nodes a request visited and the design edges between consecutive steps. */
export function tracePath(trace: Trace, d: Pick<Design, "edges">): { nodes: Set<string>; edges: Set<string> } {
  const nodes = new Set(trace.steps.map((s) => s.nodeId));
  const edges = new Set<string>();
  for (let i = 1; i < trace.steps.length; i++) {
    const from = trace.steps[i - 1]!.nodeId;
    const to = trace.steps[i]!.nodeId;
    if (from === to) continue;
    const e = d.edges.find((x) => x.from === from && x.to === to);
    if (e) edges.add(e.id);
  }
  return { nodes, edges };
}

export const hopList = (trace: Trace) =>
  trace.steps.map((s) => ({ nodeId: s.nodeId, action: s.action, tMs: s.tMs, waitMs: s.waitMs, serviceMs: s.serviceMs }));

/** "Yêu cầu tiếp theo cùng loại": the next sampled request of the same class, wrapping around. */
export function nextSameClass<T extends { id: number; class: RequestClass }>(list: readonly T[], id: number): T | null {
  const i = list.findIndex((x) => x.id === id);
  if (i < 0) return null;
  for (let k = 1; k < list.length; k++) {
    const c = list[(i + k) % list.length]!;
    if (c.class === list[i]!.class) return c;
  }
  return null;
}
