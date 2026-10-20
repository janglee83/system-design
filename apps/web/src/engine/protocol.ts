import type {
  Calibration,
  CalibrationOverrides,
  Capabilities,
  ComponentMeta,
  Graph,
  GraphLimits,
  Metrics,
  SimEvent,
  SimInput,
  TimelineHeader,
  Trace,
  TraceSummary,
  ValidationIssue,
} from "@sd/sim";

/** Messages the main thread sends to the engine worker (spec §6). */
export type EngineRequest =
  | { type: "engineVersion" }
  | { type: "listComponents" }
  | { type: "defaultCalibration" }
  | { type: "capabilities" }
  | { type: "validate"; graph: Graph; limits: GraphLimits | null; calibration: CalibrationOverrides }
  | { type: "run"; input: SimInput }
  | { type: "trace"; runId: number; index: number }
  | { type: "resultJson"; runId: number }
  | { type: "dropRun"; runId: number };

export interface ValidateResult {
  issues: ValidationIssue[];
  /** Monthly cost per node id; null when the engine rejects the node's config (R10). */
  costs: Record<string, number | null>;
}

export interface RunResult {
  runId: number;
  metrics: Metrics;
  events: SimEvent[];
  timeline: { header: TimelineHeader; data: Float32Array };
  traces: TraceSummary[];
  /** Time the worker spent in simulate() and copying results out. */
  elapsedMs: number;
}

export interface ResultOf {
  engineVersion: string;
  listComponents: ComponentMeta[];
  defaultCalibration: Calibration;
  capabilities: Capabilities;
  validate: ValidateResult;
  run: RunResult;
  trace: Trace;
  resultJson: string;
  dropRun: null;
}

export type EngineError =
  | { kind: "validation"; issues: ValidationIssue[] }
  | { kind: "input"; message: string }
  | { kind: "load"; message: string }
  | { kind: "internal"; message: string }
  /** The wasm instance trapped (a panic or `unreachable`); the client replaces the worker. */
  | { kind: "crash"; message: string };

export interface Envelope {
  id: number;
  request: EngineRequest;
}

export type Reply = { id: number; ok: true; value: unknown } | { id: number; ok: false; error: EngineError };
