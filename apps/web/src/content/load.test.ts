import { describe, expect, it } from "vitest";
import { contentIndex, loadChallenge, loadCurriculum } from "./load";

describe("content loader", () => {
  it("reads the generated curriculum", async () => {
    const c = await loadCurriculum();
    expect(c.version).toBe(2);
    const idx = contentIndex(c);
    expect(idx.lessons.find((l) => l.id === "l0-client-server")?.titleEn).toMatch(/client and server/i);
    expect(idx.challenges.find((x) => x.id === "c-l0-first-launch")?.modes).toEqual(["standard", "tight-budget", "chaos"]);
  });

  it("reads a challenge and refuses path tricks", async () => {
    expect((await loadChallenge("c-l0-first-launch"))?.lockedNodes).toEqual(["users"]);
    expect(await loadChallenge("../../package")).toBeNull();
    expect(await loadChallenge("c-does-not-exist")).toBeNull();
  });
});
