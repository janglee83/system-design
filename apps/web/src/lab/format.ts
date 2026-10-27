import type { Metrics } from "@sd/sim";

const nf = (locale: string, opts: Intl.NumberFormatOptions) => new Intl.NumberFormat(locale, opts);
const MS = new Set(["p50", "p95", "p99"]);
const PERCENT = new Set(["availability", "peakBusy"]);

/** Locale-aware display of a metric value; units are symbols, not words. */
export function formatMetric(key: keyof Metrics | string, value: number | null | undefined, locale: string): string {
  if (value == null || !Number.isFinite(value)) return "—";
  if (MS.has(key)) return `${nf(locale, { maximumFractionDigits: value < 10 ? 1 : 0 }).format(value)} ms`;
  if (key === "availability") {
    // Rounded down: 99.996% shows as 99.99%, never as a perfect 100.00% it did not reach.
    return nf(locale, { style: "percent", minimumFractionDigits: 2, maximumFractionDigits: 2, roundingMode: "floor" }).format(value).replace(/\s/g, "");
  }
  if (PERCENT.has(key)) return nf(locale, { style: "percent", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value).replace(/\s/g, "");
  if (key === "costPerMonth") return `$${nf(locale, { maximumFractionDigits: 0 }).format(value)}`;
  if (key === "throughputRps") return `${nf(locale, { maximumFractionDigits: 0 }).format(value)} rps`;
  return nf(locale, { maximumFractionDigits: 0 }).format(value);
}

/** A relative change as a signed percent ("+12.3%"); a change that rounds to zero has no sign. */
export function formatSignedPercent(ratio: number, locale: string): string {
  const v = Math.abs(ratio) < 0.0005 ? 0 : ratio; // never "-0.0%"
  return nf(locale, { style: "percent", minimumFractionDigits: 1, maximumFractionDigits: 1, signDisplay: "exceptZero" })
    .format(v)
    .replace(/\s/g, "");
}

/** A change between two fractions (availability) in percentage points, signed ("+0.15"). */
export function formatSignedPoints(deltaFraction: number, locale: string): string {
  const points = deltaFraction * 100;
  const v = Math.abs(points) < 0.005 ? 0 : points;
  return nf(locale, { maximumFractionDigits: 2, signDisplay: "exceptZero" }).format(v);
}

/** A plain number with a fixed number of decimals, for the locale ("3.0", "3,0"). */
export function formatNumber(value: number, locale: string, decimals: number): string {
  return nf(locale, { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(value);
}
