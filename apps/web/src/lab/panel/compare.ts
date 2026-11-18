import type { Metrics } from "@sd/sim";

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
