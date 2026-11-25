import { describe, expect, it } from "vitest";
import { METRIC_KEYS } from "@/i18n/engine-codes";
import { compareMetric, deltaText, failsGoal, METRIC_DIRECTION } from "./compare";

describe("compareMetric", () => {
  it("knows a direction for every metric", () => {
    expect(Object.keys(METRIC_DIRECTION).sort()).toEqual([...METRIC_KEYS].sort());
  });
  it("lower is better for latency and cost, higher for availability", () => {
    expect(compareMetric("p95", 8, 10)).toMatchObject({ delta: -2, verdict: "better" });
    expect(compareMetric("costPerMonth", 120, 100)).toMatchObject({ delta: 20, ratio: 0.2, verdict: "worse" });
    expect(compareMetric("availability", 0.999, 0.98).verdict).toBe("better");
    expect(compareMetric("p95", 10, 10).verdict).toBe("same");
  });
  it("has no verdict without a previous value", () => {
    expect(compareMetric("p95", 10, undefined).verdict).toBeNull();
    expect(compareMetric("staleReads", null, null).verdict).toBeNull();
  });
  it("writes the delta with an arrow in the metric's unit (design-system §8)", () => {
    expect(deltaText("p95", 300, 154, "en")).toBe("▲ 146 ms");
    expect(deltaText("throughputRps", 900, 1000, "en")).toBe("▼ 100 rps");
    expect(deltaText("availability", 0.97, 0.99, "vi", "điểm %")).toBe("▼ 2 điểm %");
    expect(deltaText("p95", 10, 10, "en")).toBe("= 0 ms");
    expect(deltaText("p95", 10, undefined, "en")).toBeNull();
  });
});

describe("failsGoal", () => {
  const goals = [
    { id: "fast", metric: "p95", op: "<=" as const, value: 50 },
    { id: "up", metric: "availability", op: ">=" as const, value: 0.98 },
  ];
  it("says whether a metric misses one of the run's goals", () => {
    expect(failsGoal("p95", 60, goals)).toBe(true);
    expect(failsGoal("p95", 40, goals)).toBe(false);
    expect(failsGoal("availability", 0.9, goals)).toBe(true);
    expect(failsGoal("throughputRps", 1, goals)).toBe(false);
  });
});

