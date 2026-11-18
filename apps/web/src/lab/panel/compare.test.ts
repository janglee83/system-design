import { describe, expect, it } from "vitest";
import { METRIC_KEYS } from "@/i18n/engine-codes";
import { compareMetric, METRIC_DIRECTION } from "./compare";

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
});
