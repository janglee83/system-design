import type { Calibration } from "@sd/sim";

type Field = keyof Calibration;

export const CALIBRATION_GROUPS: readonly { id: "web" | "lb" | "pg" | "network"; fields: readonly Field[] }[] = [
  { id: "web", fields: ["webRpsPerVcpu", "webServiceMs", "webQueuePerGb", "webCostPerVcpu", "webCostPerExtraVcpu"] },
  { id: "lb", fields: ["lbRpsPerReplica", "lbServiceMs", "lbQueueSeconds", "lbCostPerReplica", "lbMaxUtilizationForLatency"] },
  { id: "pg", fields: ["pgQpsPerInstance", "pgServiceMs", "pgQueueSeconds", "pgCostPerInstance", "pgFailoverMs", "pgMaxUtilizationForLatency"] },
  { id: "network", fields: ["edgeDelayHttpMs", "edgeDelayDbMs", "edgeDelayCacheMs", "edgeDelayMsgMs"] },
];

const POSITIVE: ReadonlySet<Field> = new Set(["webRpsPerVcpu", "lbRpsPerReplica", "pgQpsPerInstance"]);
const UNIT_OPEN: ReadonlySet<Field> = new Set(["lbMaxUtilizationForLatency", "pgMaxUtilizationForLatency"]);

/** Input bounds that match sim-core's invalid_overrides (calibration.rs). */
export function calibrationBounds(f: Field): { min: number; max: number | null; step: number } {
  if (UNIT_OPEN.has(f)) return { min: 0.05, max: 0.99, step: 0.01 };
  if (POSITIVE.has(f)) return { min: 1, max: null, step: 100 };
  if (f.endsWith("Ms")) return { min: 0, max: null, step: 0.5 };
  return { min: 0, max: null, step: f.includes("Cost") ? 0.5 : 1 };
}
