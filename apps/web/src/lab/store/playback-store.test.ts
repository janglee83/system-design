import { describe, expect, it } from "vitest";
import { createPlaybackStore } from "./playback-store";

describe("playback store", () => {
  it("reset starts paused at 0 for the run's duration; seek clamps to the run", () => {
    const s = createPlaybackStore();
    s.getState().seek(500);
    s.getState().reset(10_000);
    expect(s.getState()).toMatchObject({ timeMs: 0, playing: false, durationMs: 10_000 });
    s.getState().seek(-5);
    expect(s.getState().timeMs).toBe(0);
    s.getState().seek(99_999);
    expect(s.getState().timeMs).toBe(10_000);
    s.getState().seek(4321);
    expect(s.getState().timeMs).toBe(4321);
  });
});
