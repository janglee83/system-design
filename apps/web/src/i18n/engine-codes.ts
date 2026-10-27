import type {
  Arrivals,
  Calibration,
  Capabilities,
  ComponentMeta,
  EdgeKind,
  FaultKind,
  Metrics,
  Profile,
  TraceAction,
  TraceOutcome,
} from "@sd/sim";

/** Every SimEvent.code sim-core emits (checked against the source by engine-codes.test.ts). */
export const EVENT_CODES = [
  "db.no-replica",
  "db.primary-down",
  "db.promoted",
  "fault.no-target",
  "fault.traffic-surge",
  "fault.unsupported",
  "instance.down",
  "lb.node-down",
  "node.overloaded",
] as const;

/** Every ValidationIssue.code (sim-core validate::codes). */
export const VALIDATION_CODES = [
  "calibration.invalid",
  "client.no-path",
  "config.invalid",
  "edge.not-accepted",
  "edge.unknown-node",
  "graph.cycle",
  "graph.no-client",
  "limits.kind-not-allowed",
  "limits.too-many-instances",
  "limits.too-many-nodes",
  "node.duplicate-id",
  "node.unknown-kind",
  "node.unreachable",
  "workload.invalid",
] as const;

/** Compile-time check that a tuple names every member of a union. */
type Exhaustive<U, T extends readonly U[]> = [Exclude<U, T[number]>] extends [never] ? T : never;
const exhaustive =
  <U,>() =>
  <const T extends readonly U[]>(t: Exhaustive<U, T>) =>
    t;

export const ALL_FAULT_KINDS = exhaustive<FaultKind>()([
  "traffic-surge-3x",
  "instance-down",
  "instance-slow",
  "lb-node-down",
  "cache-down",
  "db-overloaded",
  "db-primary-down",
  "db-replica-down",
  "db-stalled",
  "broker-down",
  "object-storage-down",
  "kv-node-down",
  "third-party-down",
  "third-party-slow",
]);

export const METRIC_KEYS = exhaustive<keyof Metrics>()([
  "p50", "p95", "p99", "availability", "throughputRps", "costPerMonth", "spofCount", "exposedBackends",
  "peakBusy", "peakDbConnections", "cacheOps", "requestsTotal", "requestsOk", "requestsRejected",
  "requestsTimedOut", "requestsUnreachable", "duplicateIds", "outOfOrderIds", "lostUpdates",
  "writeConflicts", "duplicateWrites", "staleReads", "peakQueueDepth", "lostMessages", "statusFlaps",
  "staleOnline", "inboxWritesPerSec",
]);

export const PROFILES = exhaustive<Profile>()(["read-heavy", "write-heavy", "mixed", "chat", "feed", "jobs"]);
export const ARRIVALS = exhaustive<Arrivals>()(["poisson", "uniform"]);
export const EDGE_KINDS = exhaustive<EdgeKind>()(["http", "db", "cache", "msg"]);
export const TRACE_OUTCOMES = exhaustive<TraceOutcome>()(["delivered", "rejected", "timeout", "unreachable"]);
export const TRACE_ACTIONS = exhaustive<TraceAction>()(["send", "serve", "reject", "down"]);
/** sim-core TIMELINE_FIELDS, in order. */
export const TIMELINE_FIELDS = ["inFlight", "queued", "busy", "rejected", "up"] as const;

/** Catalog keys the UI needs for everything the engine can produce (plan ruling R8). */
export function requiredKeys(metas: ComponentMeta[], caps: Capabilities, calibration: Calibration): string[] {
  const keys = new Set<string>();
  const add = (k: string) => keys.add(k);
  EVENT_CODES.forEach((c) => add(`engine.event.${c}`));
  VALIDATION_CODES.forEach((c) => add(`engine.validation.${c}`));
  ALL_FAULT_KINDS.forEach((k) => add(`fault.${k}`));
  METRIC_KEYS.forEach((k) => add(`metric.${k}`));
  PROFILES.forEach((k) => add(`profile.${k}`));
  ARRIVALS.forEach((k) => add(`arrivals.${k}`));
  EDGE_KINDS.forEach((k) => add(`edgeKind.${k}`));
  TRACE_OUTCOMES.forEach((k) => add(`traceOutcome.${k}`));
  TRACE_ACTIONS.forEach((k) => add(`traceAction.${k}`));
  TIMELINE_FIELDS.forEach((k) => add(`timelineField.${k}`));
  for (const m of metas) {
    add(m.labelKey);
    add(`componentDescription.${m.kind}`);
    add(`category.${m.category}`);
    add(`role.${m.role}`);
    for (const f of m.fields) {
      add(`configField.${f.key}`);
      f.options.forEach((o) => add(`configOption.${f.key}.${o}`));
    }
  }
  caps.nodeOverrideKeys.forEach((k) => add(`override.${k}`));
  caps.workloadParams.forEach((k) => add(`workloadParam.${k}`));
  Object.keys(calibration).forEach((k) => add(`calibration.${k}`));
  return [...keys].sort();
}
