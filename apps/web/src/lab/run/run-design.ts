import { TimelineView } from "@sd/sim";
import type { StoreApi } from "zustand/vanilla";
import { EngineRequestError, type EngineClient } from "@/engine/client";
import { buildSimInput } from "../model/sim-input";
import { hasBlocking, type CheckState } from "../store/check-store";
import type { DesignState } from "../store/design-store";
import type { RunRecord, RunState } from "../store/run-store";

export interface RunStores {
  design: StoreApi<DesignState>;
  check: StoreApi<CheckState>;
  runs: StoreApi<RunState>;
  /** Called with the new record (Task 25 resets playback here). */
  onRun?: (r: RunRecord) => void;
}

/** Why a run did not start: no engine yet, the design is being re-checked, it has blocking problems, or a run is on. */
export type DeclineReason = "engine" | "checking" | "blocked" | "busy";

export type RunOutcome =
  | { kind: "ran"; record: RunRecord }
  | { kind: "declined"; reason: DeclineReason }
  /** The engine refused the input; its issues are in check.runIssues. */
  | { kind: "refused" }
  | { kind: "failed"; message: string };

/**
 * The single run gate (R11, Phase 3 review): the button and Mod+Enter both come here.
 * Runs only with a ready engine, a current check (not stale after an edit) and no blocking issue.
 */
export async function runDesign(stores: RunStores, client: EngineClient | null): Promise<RunOutcome> {
  const { design, check, runs } = stores;
  if (runs.getState().status === "running") return { kind: "declined", reason: "busy" };
  if (!client) return { kind: "declined", reason: "engine" };
  const c = check.getState();
  if (hasBlocking(c)) return { kind: "declined", reason: "blocked" };
  if (c.status !== "done") return { kind: "declined", reason: "checking" };
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
    return { kind: "ran", record };
  } catch (e) {
    if (e instanceof EngineRequestError && e.error.kind === "validation") {
      check.getState().setRunIssues(e.error.issues);
      runs.getState().fail(null);
      return { kind: "refused" };
    }
    const message = e instanceof Error ? e.message : String(e);
    runs.getState().fail(message);
    return { kind: "failed", message };
  }
}
