// Shape of the wasm-bindgen module (identical for the nodejs and web targets).
export interface TimelineHeader {
  frameMs: number;
  frames: number;
  nodeIds: string[];
  fields: string[];
}

export interface TraceSummary {
  id: number;
  class: "read" | "write";
  outcome: "delivered" | "rejected" | "timeout" | "unreachable";
  latencyMs: number;
}

export interface RawRun {
  metrics(): unknown;
  events(): unknown;
  timelineHeader(): TimelineHeader;
  timelineData(): Float32Array;
  traceCount(): number;
  trace(i: number): unknown;
  traceSummaries(): TraceSummary[];
  resultJson(): string;
  free(): void;
}

export interface WasmBinding {
  simulate(input: unknown): RawRun;
  simulateJson(json: string): string;
  validateGraph(graph: unknown, limits: unknown): unknown;
  grade(run: RawRun, goals: unknown): unknown;
  listComponents(): unknown;
  defaultCalibration(): unknown;
  checkFixture(json: string): unknown;
  engineVersion(): string;
}
