import { describe, expect, it } from "vitest";
import { createPlaybackStore } from "../store/playback-store";
import { createRunStore, type RunRecord } from "../store/run-store";
import { selectRun } from "./select-run";

const rec = (id: number, durationMs: number) =>
  ({ id, input: { durationMs }, snapshot: { nodes: [], edges: [], warnings: [] } }) as unknown as RunRecord;

describe("selectRun", () => {
  it("selects the run and puts playback at 0 s of that run, paused", () => {
    const runs = createRunStore();
    const playback = createPlaybackStore();
    runs.getState().finish(rec(1, 30_000));
    runs.getState().finish(rec(2, 10_000));
    playback.getState().reset(10_000);
    playback.getState().seek(8000);
    selectRun(runs, playback, 1);
    expect(runs.getState().currentId).toBe(1);
    expect(playback.getState()).toMatchObject({ timeMs: 0, playing: false, durationMs: 30_000 });
  });

  it("does nothing for a run that is no longer in the history", () => {
    const runs = createRunStore();
    const playback = createPlaybackStore();
    runs.getState().finish(rec(1, 30_000));
    playback.getState().reset(30_000);
    playback.getState().seek(5000);
    selectRun(runs, playback, 9);
    expect(runs.getState().currentId).toBe(1);
    expect(playback.getState().timeMs).toBe(5000);
  });
});
