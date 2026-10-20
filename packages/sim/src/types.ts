export type { SimInput } from "./generated/SimInput";
export type { SimResult } from "./generated/SimResult";
export type { Metrics } from "./generated/Metrics";
export type { Graph } from "./generated/Graph";
export type { Node } from "./generated/Node";
export type { Edge } from "./generated/Edge";
export type { EdgeKind } from "./generated/EdgeKind";
export type { Workload } from "./generated/Workload";
export type { Arrivals } from "./generated/Arrivals";
export type { Profile } from "./generated/Profile";
export type { Fault } from "./generated/Fault";
export type { FaultKind } from "./generated/FaultKind";
export type { Goal } from "./generated/Goal";
export type { GoalOp } from "./generated/GoalOp";
export type { Verdict } from "./generated/Verdict";
export type { ValidationIssue } from "./generated/ValidationIssue";
export type { GraphLimits } from "./generated/GraphLimits";
export type { Trace } from "./generated/Trace";
export type { TraceStep } from "./generated/TraceStep";
export type { TraceOutcome } from "./generated/TraceOutcome";
export type { TraceAction } from "./generated/TraceAction";
export type { RequestClass } from "./generated/RequestClass";
export type { SimEvent } from "./generated/SimEvent";
export type { ComponentMeta } from "./generated/ComponentMeta";
export type { Calibration } from "./generated/Calibration";
export type { CalibrationOverrides } from "./generated/CalibrationOverrides";
export type { Fixture } from "./generated/Fixture";
export type { FixtureReport } from "./generated/FixtureReport";

import type { FaultKind as FaultKindT } from "./generated/FaultKind";

/** What this engine build supports. Hand-written: sim-wasm serializes sim-core's struct. */
export interface Capabilities {
  /** Component kinds in the registry, sorted. */
  components: string[];
  /** Fault kinds the engine applies, in enum order. The others only emit `fault.unsupported`. */
  faults: FaultKindT[];
  /** Metric keys every run reports. The rest of `Metrics` stays null. */
  metrics: string[];
  /** `workload.params` keys the engine reads. */
  workloadParams: string[];
  /** `calibration` override keys. */
  calibrationFields: string[];
  /** Component kind -> its config keys. */
  configKeys: Record<string, string[]>;
  /** Config keys every node accepts as per-node overrides. */
  nodeOverrideKeys: string[];
}
