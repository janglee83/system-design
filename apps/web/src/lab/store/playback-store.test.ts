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

  it("plays, pauses, toggles and ticks; play at the end starts over; only the five speeds", () => {
    const s = createPlaybackStore();
    s.getState().reset(10_000);
    s.getState().play();
    s.getState().tick(100);
    expect([s.getState().playing, s.getState().timeMs]).toEqual([true, 100]);
    s.getState().setSpeed(4);
    s.getState().tick(100);
    expect(s.getState().timeMs).toBe(500);
    s.getState().setSpeed(3);
    expect(s.getState().speed).toBe(4);
    s.getState().toggle();
    expect(s.getState().playing).toBe(false);
    s.getState().tick(100);
    expect(s.getState().timeMs).toBe(500);
    s.getState().seek(10_000);
    s.getState().play();
    expect([s.getState().playing, s.getState().timeMs]).toEqual([true, 0]);
  });
});

