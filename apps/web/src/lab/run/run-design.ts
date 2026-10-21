import { TimelineView } from "@sd/sim";
import { EngineRequestError, type EngineClient } from "@/engine/client";
import { buildSimInput } from "../model/sim-input";
import { hasBlocking, type CheckState } from "../store/check-store";
import type { DesignState } from "../store/design-store";
import type { StoreApi } from "zustand/vanilla";
import type { RunRecord, RunState } from "../store/run-store";

export interface RunStores {
  design: StoreApi<DesignState>;
  check: StoreApi<CheckState>;
  runs: StoreApi<RunState>;
  /** Called with the new record (Task 25 resets playback here). */
  onRun?: (r: RunRecord) => void;
}

export async function runDesign(stores: RunStores, client: EngineClient): Promise<RunRecord | null> {
  const { design, check, runs } = stores;
  if (runs.getState().status === "running" || hasBlocking(check.getState())) return null;
  const input = buildSimInput(design.getState().design);
  runs.getState().begin();
  try {
    const r = await client.request({ type: "run", input });
    const record: RunRecord = {
      id: runs.getState().nextId(),
      engineRunId: r.runId,
      epoch: client.epoch,
      startedAt: Date.now(),
      input,
      metrics: r.metrics,
      events: r.events,
      timeline: new TimelineView(r.timeline.header, r.timeline.data),
      traces: r.traces,
      elapsedMs: r.elapsedMs,
    };
    runs.getState().finish(record);
    check.getState().setRunIssues([]);
    stores.onRun?.(record);
    return record;
  } catch (e) {
    if (e instanceof EngineRequestError && e.error.kind === "validation") {
      check.getState().setRunIssues(e.error.issues);
      runs.getState().fail(null);
    } else {
      runs.getState().fail(e instanceof Error ? e.message : String(e));
    }
    return null;
  }
}
