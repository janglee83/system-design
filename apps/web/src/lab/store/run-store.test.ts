import { TimelineView } from "@sd/sim";
import { describe, expect, it } from "vitest";
import { createRunStore, currentRun, MAX_HISTORY, previousRun, runAvailable, type RunRecord } from "./run-store";

const rec = (id: number, epoch = 0): RunRecord => ({
  id,
  engineRunId: id,
  epoch,
  startedAt: id,
  input: {} as never,
  metrics: { p95: id } as never,
  events: [],
  timeline: new TimelineView({ frameMs: 100, frames: 0, nodeIds: [], fields: [] }, new Float32Array()),
  traces: [],
  elapsedMs: 1,
  snapshot: { nodes: [], edges: [], warnings: [] },
});

describe("run store", () => {
  it(`keeps the last ${MAX_HISTORY} runs and selects the newest`, () => {
    const s = createRunStore();
    for (let i = 1; i <= 12; i++) {
      s.getState().begin();
      s.getState().finish(rec(i));
    }
    expect(s.getState().runs.map((r) => r.id)).toEqual([3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    expect(currentRun(s.getState())!.id).toBe(12);
    expect(previousRun(s.getState())!.id).toBe(11);
    expect(s.getState().status).toBe("idle");
  });

  it("compares a selected older run with the one before it", () => {
    const s = createRunStore();
    for (let i = 1; i <= 3; i++) s.getState().finish(rec(i));
    s.getState().select(2);
    expect(previousRun(s.getState())!.id).toBe(1);
    s.getState().select(1);
    expect(previousRun(s.getState())).toBeNull();
  });

  it("hands out increasing local run ids, independent of the worker's", () => {
    const s = createRunStore();
    expect([s.getState().nextId(), s.getState().nextId(), s.getState().nextId()]).toEqual([1, 2, 3]);
  });

  it("a run from an older engine epoch stays in the history but cannot be inspected", () => {
    const s = createRunStore();
    s.getState().finish(rec(1, 0));
    s.getState().finish(rec(2, 1));
    expect(s.getState().runs.map((r) => r.id)).toEqual([1, 2]);
    expect(runAvailable(s.getState().runs[0]!, 1)).toBe(false);
    expect(runAvailable(s.getState().runs[1]!, 1)).toBe(true);
  });
});
