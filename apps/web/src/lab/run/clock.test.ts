import { describe, expect, it } from "vitest";
import { advance, formatClock, frameAt, SPEEDS } from "./clock";

describe("playback clock", () => {
  it("plays one simulated second per real second at 1×", () => {
    expect(advance({ timeMs: 0, playing: true, speed: 1, durationMs: 10_000 }, 16)).toEqual({ timeMs: 16, playing: true });
  });
  it("scales with speed", () => {
    expect(advance({ timeMs: 0, playing: true, speed: 4, durationMs: 10_000 }, 100).timeMs).toBe(400);
    expect(advance({ timeMs: 0, playing: true, speed: 0.25, durationMs: 10_000 }, 100).timeMs).toBe(25);
  });
  it("stops at the end", () => {
    expect(advance({ timeMs: 9_990, playing: true, speed: 2, durationMs: 10_000 }, 100)).toEqual({ timeMs: 10_000, playing: false });
  });
  it("does nothing while paused", () => {
    expect(advance({ timeMs: 500, playing: false, speed: 1, durationMs: 10_000 }, 100)).toEqual({ timeMs: 500, playing: false });
  });
  it("maps time to a frame, clamped to the last frame", () => {
    expect(frameAt(0, 100, 100)).toBe(0);
    expect(frameAt(199, 100, 100)).toBe(1);
    expect(frameAt(10_000, 100, 100)).toBe(99);
    expect(frameAt(5, 100, 0)).toBe(0);
  });
  it("offers the five speeds of R19", () => {
    expect(SPEEDS).toEqual([0.25, 0.5, 1, 2, 4]);
  });
  it("formats the playhead as mm:ss with tenths, in the locale's decimal mark", () => {
    expect(formatClock(4200, "vi")).toBe("00:04,2");
    expect(formatClock(65_050, "en")).toBe("01:05.0");
  });
});
