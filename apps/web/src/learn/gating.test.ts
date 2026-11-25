import { describe, expect, it } from "vitest";
import { isUnlocked, lockReasonLevel, readiness } from "./gating";

const levels = [
  { id: "L0", exitChallenge: "c-l0-exit" },
  { id: "L1", exitChallenge: "c-l1-exit" },
  { id: "L2", exitChallenge: "c-l2-exit" },
];
const empty = { doneLessons: [], passedChallenges: [] };

describe("level gating (default 5)", () => {
  it("opens L0 on a fresh browser and locks the rest behind the previous exit check", () => {
    expect(isUnlocked("L0", levels, empty)).toBe(true);
    expect(isUnlocked("L1", levels, empty)).toBe(false);
    expect(lockReasonLevel("L1", levels, empty)).toBe("L0");
    expect(lockReasonLevel("L2", levels, empty)).toBe("L0"); // the first gate still closed
  });
  it("opens a level once the previous level's exit challenge is passed", () => {
    const p = { doneLessons: [], passedChallenges: ["c-l0-exit"] };
    expect(isUnlocked("L1", levels, p)).toBe(true);
    expect(isUnlocked("L2", levels, p)).toBe(false);
    expect(lockReasonLevel("L2", levels, p)).toBe("L1");
    expect(lockReasonLevel("L0", levels, p)).toBeNull();
  });
});

describe("challenge readiness", () => {
  const engine = ["client", "lb", "web-server", "postgres"];
  it("is runnable when its content exists and the engine has every allowed kind", () => {
    expect(readiness({ hasFolder: true, allowedKinds: ["client", "web-server"] }, engine)).toBe("ready");
    expect(readiness({ hasFolder: true, allowedKinds: ["client", "redis"] }, engine)).toBe("waiting");
    expect(readiness({ hasFolder: false, allowedKinds: ["client"] }, engine)).toBe("waiting");
    expect(readiness({ hasFolder: true, allowedKinds: [] }, engine)).toBe("noLab");
  });
});
