import { describe, expect, it } from "vitest";
import { formatNumber, formatMetric, formatSignedPercent, formatSignedPoints } from "./format";

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

describe("signed changes and plain numbers", () => {
  it("never shows -0.0%, and signs real changes", () => {
    expect(formatSignedPercent(-0.00001, "en")).toBe("0.0%");
    expect(formatSignedPercent(0, "en")).toBe("0.0%");
    expect(formatSignedPercent(0.123, "en")).toBe("+12.3%");
    expect(formatSignedPercent(-0.05, "vi")).toBe("-5,0%");
  });

  it("shows availability changes in percentage points", () => {
    expect(formatSignedPoints(0.9995 - 0.998, "en")).toBe("+0.15");
    expect(formatSignedPoints(-0.0000001, "en")).toBe("0");
  });

  it("never rounds a not-quite-perfect availability up to 100%", () => {
    expect(formatMetric("availability", 0.99996, "en")).toBe("99.99%");
    expect(formatMetric("availability", 1, "en")).toBe("100.00%");
  });

  it("formats plain numbers for the locale", () => {
    expect(formatNumber(3, "en", 1)).toBe("3.0");
    expect(formatNumber(3, "vi", 1)).toBe("3,0");
  });
});
