import type { Goal, Verdict } from "@sd/sim";
import { describe, expect, it } from "vitest";
import { verdictView } from "./verdict-model";

const GOALS: Goal[] = [
  { id: "fast", metric: "p95", op: "<=", value: 50 },
  { id: "no-drops", metric: "requestsRejected", op: "<=", value: 0 },
  { id: "up", metric: "availability", op: ">=", value: 0.98 },
];
const busy: Record<string, number[]> = { "client-1": [0, 0], "web-server-1": [0.6, 1.3], "postgres-1": [0.4, 0.9] };
const timeline = { nodeIds: Object.keys(busy), series: (id: string) => Float32Array.from(busy[id] ?? []) };

describe("verdictView (design-system §7.3)", () => {
  it("is neutral without goals (the free Lab)", () => {
    expect(verdictView({ goals: [], verdict: null, timeline })).toEqual({ kind: "neutral" });
  });

  it("counts met goals and keeps the goal order for the chips", () => {
    const verdict: Verdict = {
      passed: false,
      score: 40,
      stars: 1,
      goals: [
        { id: "up", passed: true, measured: 0.99 },
        { id: "fast", passed: false, measured: 184 },
        { id: "no-drops", passed: false, measured: 2000 },
      ],
    };
    const v = verdictView({ goals: GOALS, verdict, timeline });
    if (v.kind !== "graded") throw new Error(v.kind);
    expect(v.passed).toBe(false);
    expect([v.met, v.total]).toEqual([1, 3]);
    expect(v.chips.map((c) => [c.id, c.passed, c.measured])).toEqual([
      ["fast", false, 184],
      ["no-drops", false, 2000],
      ["up", true, 0.99],
    ]);
    // The first failed goal, pinned on the node with the highest peak busy.
    expect(v.failing).toEqual({ goalId: "fast", nodeId: "web-server-1", peakBusy: expect.closeTo(1.3, 5) });
  });

  it("has no failing node when every goal is met", () => {
    const verdict: Verdict = { passed: true, score: 100, stars: 3, goals: GOALS.map((g) => ({ id: g.id, passed: true, measured: 1 })) };
    const v = verdictView({ goals: GOALS, verdict, timeline });
    expect(v).toMatchObject({ kind: "graded", passed: true, met: 3, total: 3, failing: null });
  });

  it("is deterministic when two nodes peak equally: the first in timeline order", () => {
    const flat = { nodeIds: ["a", "b"], series: () => Float32Array.from([0.5]) };
    const verdict: Verdict = { passed: false, score: 0, stars: 0, goals: [{ id: "fast", passed: false, measured: 90 }] };
    const v = verdictView({ goals: GOALS.slice(0, 1), verdict, timeline: flat });
    expect(v).toMatchObject({ failing: { goalId: "fast", nodeId: "a" } });
  });
});
