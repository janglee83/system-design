import type { Goal, Metrics } from "@sd/sim";
import { formatMetric } from "../format";

export const METRIC_DIRECTION: Record<keyof Metrics, "lower" | "higher" | "neutral"> = {
  p50: "lower", p95: "lower", p99: "lower",
  availability: "higher", throughputRps: "higher", costPerMonth: "lower",
  spofCount: "lower", exposedBackends: "lower", peakBusy: "lower", peakDbConnections: "lower",
  cacheOps: "neutral", requestsTotal: "neutral", requestsOk: "higher", requestsRejected: "lower",
  requestsTimedOut: "lower", requestsUnreachable: "lower",
  duplicateIds: "lower", outOfOrderIds: "lower", lostUpdates: "lower", writeConflicts: "lower",
  duplicateWrites: "lower", staleReads: "lower", peakQueueDepth: "lower", lostMessages: "lower",
  statusFlaps: "lower", staleOnline: "lower", inboxWritesPerSec: "neutral",
};

export function compareMetric(key: keyof Metrics, now: number | null | undefined, prev: number | null | undefined) {
  if (now == null || prev == null) return { delta: null, ratio: null, verdict: null } as const;
  const delta = now - prev;
  const ratio = prev === 0 ? null : delta / Math.abs(prev);
  const dir = METRIC_DIRECTION[key];
  const verdict = Math.abs(delta) < 1e-9 || dir === "neutral" ? "same" : (delta < 0) === (dir === "lower") ? "better" : "worse";
  return { delta, ratio, verdict } as const;
}

/** "▲ 146 ms": the change since the compared run, in the metric's own unit (availability in points). */
export function deltaText(
  key: keyof Metrics,
  now: number | null | undefined,
  prev: number | null | undefined,
  locale: string,
  /** The translated unit for availability points ("điểm %"). */
  pointsUnit = "pts",
): string | null {
  if (now == null || prev == null) return null;
  const d = now - prev;
  const arrow = Math.abs(d) < 1e-9 ? "=" : d > 0 ? "▲" : "▼";
  if (key === "availability") {
    const points = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(Math.abs(d) * 100);
    return `${arrow} ${points} ${pointsUnit}`;
  }
  return `${arrow} ${formatMetric(key, Math.abs(d), locale)}`;
}

/** Whether a metric misses one of the run's goals (the KPI value then shows in `over`). */
export function failsGoal(key: string, value: number | null | undefined, goals: readonly Goal[]): boolean {
  if (value == null) return false;
  return goals.some((g) => g.metric === key && !(g.op === "<=" ? value <= g.value : g.op === ">=" ? value >= g.value : value === g.value));
}
