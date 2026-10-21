import type { Metrics, SimEvent, SimInput, TimelineView, TraceSummary } from "@sd/sim";
import { createStore } from "zustand/vanilla";

export const MAX_HISTORY = 10;

export interface RunRecord {
  /** The Lab's run number: increases for the whole session, also across engine restarts. */
  id: number;
  /** The worker's run id, used for trace and export requests while `epoch` is current. */
  engineRunId: number;
  /** The engine epoch the run was made in (EngineClient.epoch). */
  epoch: number;
  startedAt: number;
  input: SimInput;
  metrics: Metrics;
  events: SimEvent[];
  timeline: TimelineView;
  traces: TraceSummary[];
  elapsedMs: number;
}

export interface RunState {
  runs: RunRecord[];
  currentId: number | null;
  status: "idle" | "running";
  error: string | null;
  begin(): void;
  finish(r: RunRecord): void;
  fail(message: string | null): void;
  select(id: number): void;
  /** The next local run id. */
  nextId(): number;
}

export function createRunStore() {
  let ids = 0;
  return createStore<RunState>()((set, get) => ({
    nextId: () => ++ids,
    runs: [],
    currentId: null,
    status: "idle",
    error: null,
    begin: () => set({ status: "running", error: null }),
    finish: (r) => set({ runs: [...get().runs, r].slice(-MAX_HISTORY), currentId: r.id, status: "idle" }),
    fail: (message) => set({ status: "idle", error: message }),
    select: (id) => {
      if (get().runs.some((r) => r.id === id)) set({ currentId: id });
    },
  }));
}

export const currentRun = (s: Pick<RunState, "runs" | "currentId">): RunRecord | null =>
  s.runs.find((r) => r.id === s.currentId) ?? null;

export function previousRun(s: Pick<RunState, "runs" | "currentId">): RunRecord | null {
  const i = s.runs.findIndex((r) => r.id === s.currentId);
  return i > 0 ? s.runs[i - 1]! : null;
}

/**
 * Whether the worker still holds this run (trace, JSON export). After an engine restart older runs
 * stay in the history with their metrics, events and timeline, but say "run again to inspect".
 */
export const runAvailable = (r: Pick<RunRecord, "epoch">, epoch: number): boolean => r.epoch === epoch;
