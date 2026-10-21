import { describe, expect, it } from "vitest";
import { formatMetric } from "./format";

describe("formatMetric", () => {
  it("formats per metric kind and locale", () => {
    expect(formatMetric("p95", 4.678, "en")).toBe("4.7 ms");
    expect(formatMetric("p95", 123.4, "en")).toBe("123 ms");
    expect(formatMetric("availability", 0.99871, "en")).toBe("99.87%");
    expect(formatMetric("availability", 0.99871, "vi")).toBe("99,87%");
    expect(formatMetric("requestsTotal", 21391, "en")).toBe("21,391");
    expect(formatMetric("requestsTotal", 21391, "vi")).toBe("21.391");
    expect(formatMetric("costPerMonth", 162.5, "en")).toBe("$163");
    expect(formatMetric("throughputRps", 2000.4, "en")).toBe("2,000 rps");
    expect(formatMetric("staleReads", null, "en")).toBe("—");
  });
});
