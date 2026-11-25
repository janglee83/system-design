import type { ValidationIssue } from "@sd/sim";
import { createStore } from "zustand/vanilla";
import type { ValidateResult } from "@/engine/protocol";

export interface CheckState {
  seq: number;
  status: "idle" | "checking" | "done" | "error";
  issues: ValidationIssue[];
  /** Issues the engine raised when a run was refused (workload.invalid, calibration.invalid). */
  runIssues: ValidationIssue[];
  costs: Record<string, number | null>;
  begin(): number;
  /** The design changed: the current result no longer applies (blocks Run until the next check). */
  markStale(): void;
  finish(seq: number, r: ValidateResult): void;
  fail(seq: number): void;
  setRunIssues(issues: ValidationIssue[]): void;
}

export function createCheckStore() {
  return createStore<CheckState>()((set, get) => ({
    seq: 0,
    status: "idle",
    issues: [],
    runIssues: [],
    costs: {},
    begin() {
      const seq = get().seq + 1;
      set({ seq, status: "checking", runIssues: [] });
      return seq;
    },
    markStale() {
      // Bumping seq also drops a reply still in flight for the old design.
      set({ seq: get().seq + 1, status: "checking" });
    },
    finish(seq, r) {
      if (seq !== get().seq) return; // a newer request is in flight (Review Focus 5)
      set({ status: "done", issues: r.issues, costs: r.costs });
    },
    fail(seq) {
      if (seq === get().seq) set({ status: "error" });
    },
    setRunIssues(issues) {
      set({ runIssues: issues });
    },
  }));
}

export const allIssues = (s: Pick<CheckState, "issues" | "runIssues">): ValidationIssue[] => [...s.issues, ...s.runIssues];
export const hasBlocking = (s: Pick<CheckState, "issues" | "runIssues">): boolean => allIssues(s).some((i) => i.blocking);

export function issueCounts(s: Pick<CheckState, "issues" | "runIssues">) {
  const nodes: Record<string, { blocking: number; warnings: number }> = {};
  const edges: Record<string, number> = {};
  for (const i of allIssues(s)) {
    if (i.nodeId) {
      const c = (nodes[i.nodeId] ??= { blocking: 0, warnings: 0 });
      if (i.blocking) c.blocking++;
      else c.warnings++;
    }
    if (i.edgeId) edges[i.edgeId] = (edges[i.edgeId] ?? 0) + 1;
  }
  return { nodes, edges };
}
