import type { Goal, Verdict } from "@sd/sim";

export interface GoalChip extends Goal {
  passed: boolean;
  measured: number | null;
}

export type VerdictView =
  | { kind: "neutral" }
  | {
      kind: "graded";
      passed: boolean;
      met: number;
      total: number;
      /** In the challenge's goal order. */
      chips: GoalChip[];
      /** The first failed goal and the node to blame: the one with the highest peak busy. */
      failing: { goalId: string; nodeId: string | null; peakBusy: number } | null;
    };

/** What the verdict strip shows after a run (design-system §7.3). Pure and deterministic. */
export function verdictView(input: {
  goals: readonly Goal[];
  verdict: Verdict | null;
  timeline: { nodeIds: readonly string[]; series(nodeId: string, field: string): Float32Array };
}): VerdictView {
  const { goals, verdict, timeline } = input;
  if (goals.length === 0 || !verdict) return { kind: "neutral" };
  const byId = new Map(verdict.goals.map((g) => [g.id, g]));
  const chips = goals.map((g) => ({ ...g, passed: byId.get(g.id)?.passed ?? false, measured: byId.get(g.id)?.measured ?? null }));
  const met = chips.filter((c) => c.passed).length;
  const first = chips.find((c) => !c.passed);
  let failing: { goalId: string; nodeId: string | null; peakBusy: number } | null = null;
  if (first) {
    let best: string | null = null;
    let peak = -Infinity;
    for (const id of timeline.nodeIds) {
      let p = 0;
      for (const v of timeline.series(id, "busy")) if (v > p) p = v;
      if (p > peak) [best, peak] = [id, p]; // strictly greater: ties keep timeline order
    }
    failing = { goalId: first.id, nodeId: best, peakBusy: best === null ? 0 : peak };
  }
  return { kind: "graded", passed: verdict.passed, met, total: chips.length, chips, failing };
}
