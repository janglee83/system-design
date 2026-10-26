import type { PlaybackStore } from "../store/playback-store";
import { currentRun, type createRunStore } from "../store/run-store";

/** Shows another run from the history: playback moves to that run, paused at 0 s (R18). */
export function selectRun(runs: ReturnType<typeof createRunStore>, playback: PlaybackStore, id: number): void {
  if (!runs.getState().runs.some((r) => r.id === id)) return;
  runs.getState().select(id);
  const run = currentRun(runs.getState());
  if (run) playback.getState().reset(run.input.durationMs);
}
