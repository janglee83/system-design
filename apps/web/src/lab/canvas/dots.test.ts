import { describe, expect, it } from "vitest";
import { DOTS_PER_EDGE, DOT_CYCLE_S, edgeDots } from "./dots";

describe("request dots (design-system §7.1)", () => {
  it("are 4 per edge per 2.4 s, faster with the playback speed", () => {
    expect([DOTS_PER_EDGE, DOT_CYCLE_S]).toEqual([4, 2.4]);
    const d = edgeDots({ playing: true, reducedMotion: false, rate: 3, state: "normal", speed: 2 })!;
    expect(d.durS).toBeCloseTo(1.2);
    expect(d.dots.map((x) => x.beginS)).toEqual([0, -0.3, -0.6, -0.9]);
    expect(d.dots.every((x) => !x.rejected)).toBe(true);
  });
  it("show a rejected (hollow) dot on a hot edge", () => {
    const d = edgeDots({ playing: true, reducedMotion: false, rate: 3, state: "hot", speed: 1 })!;
    expect(d.dots.filter((x) => x.rejected)).toHaveLength(1);
  });
  it("are not drawn when paused, without traffic, on a dead edge, or under reduced motion", () => {
    const base = { playing: true, reducedMotion: false, rate: 3, state: "normal" as const, speed: 1 };
    expect(edgeDots({ ...base, playing: false })).toBeNull();
    expect(edgeDots({ ...base, rate: 0 })).toBeNull();
    expect(edgeDots({ ...base, state: "dead" })).toBeNull();
    expect(edgeDots({ ...base, reducedMotion: true })).toBeNull();
  });
});
