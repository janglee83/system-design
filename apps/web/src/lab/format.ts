import type { Metrics } from "@sd/sim";

const nf = (locale: string, opts: Intl.NumberFormatOptions) => new Intl.NumberFormat(locale, opts);
const MS = new Set(["p50", "p95", "p99"]);
const PERCENT = new Set(["availability", "peakBusy"]);

/** Locale-aware display of a metric value; units are symbols, not words. */
export function formatMetric(key: keyof Metrics | string, value: number | null | undefined, locale: string): string {
  if (value == null || !Number.isFinite(value)) return "—";
  if (MS.has(key)) return `${nf(locale, { maximumFractionDigits: value < 10 ? 1 : 0 }).format(value)} ms`;
  if (PERCENT.has(key)) return nf(locale, { style: "percent", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value).replace(/\s/g, "");
  if (key === "costPerMonth") return `$${nf(locale, { maximumFractionDigits: 0 }).format(value)}`;
  if (key === "throughputRps") return `${nf(locale, { maximumFractionDigits: 0 }).format(value)} rps`;
  return nf(locale, { maximumFractionDigits: 0 }).format(value);
}
