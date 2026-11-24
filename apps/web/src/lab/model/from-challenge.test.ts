import { describe, expect, it } from "vitest";
import { loadChallenge } from "@/content/load";
import { designFromChallenge } from "./from-challenge";
import { buildSimInput } from "./sim-input";

describe("design from a challenge (R24)", () => {
  it("normalizes the start with the engine's defaults and seed 1", async () => {
    const c = (await loadChallenge("c-l0-first-launch"))!;
    const d = designFromChallenge(c)!;
    expect(d.nodes).toEqual([{ id: "users", kind: "client", label: "", replicas: 1, config: {}, position: { x: 64, y: 64 }, groupId: null }]);
    expect(d.locked).toEqual(["users"]);
    expect(d.workload).toEqual({ profile: "mixed", baseRps: 3000, writeRatio: 0.2, clients: 1000, clientTimeoutMs: 1000, surge: null, params: {} });
    expect([d.seed, d.durationMs]).toEqual([1, 10_000]);
    expect(d.challenge).toEqual({
      id: "c-l0-first-launch",
      mode: "standard",
      limits: { maxNodes: 5, maxInstances: 8, allowedKinds: ["client", "web-server", "postgres"] },
      // The challenge's goals, then the mode's budget as a cost goal.
      goals: [
        { id: "fast", metric: "p95", op: "<=", value: 50 },
        { id: "no-drops", metric: "requestsRejected", op: "<=", value: 0 },
        { id: "up", metric: "availability", op: ">=", value: 0.98 },
        { id: "budget", metric: "costPerMonth", op: "<=", value: 300 },
      ],
    });
    expect(buildSimInput(d).seed).toBe(1);
  });

  it("applies the chosen mode's faults", async () => {
    const c = (await loadChallenge("c-l0-first-launch"))!;
    expect(designFromChallenge(c, "chaos")!.faults).toEqual([
      { kind: "instance-down", target: "web", atMs: 3000 },
      { kind: "db-primary-down", target: "pg", atMs: 6000 },
    ]);
    expect(designFromChallenge(c, "no-such-mode")).toBeNull();
  });

  it("applies workloadOverride as a shallow merge where null removes a key", () => {
    const c = {
      id: "c-x",
      start: { graph: { nodes: [{ id: "u", kind: "client" }], edges: [] }, workload: { baseRps: 100, surge: { factor: 2, atMs: 0, durationMs: 1 } } },
      lockedNodes: [],
      limits: {},
      modes: [{ id: "m1", workloadOverride: { baseRps: 900, surge: null } }],
    };
    const d = designFromChallenge(c as never, "m1")!;
    expect(d.workload.baseRps).toBe(900);
    expect(d.workload.surge).toBeNull();
  });

  it("ignores __proto__, constructor and prototype keys in a workloadOverride (review)", () => {
    const override = JSON.parse('{"__proto__": {"polluted": 1}, "constructor": 5, "prototype": 6, "baseRps": 700}') as Record<string, unknown>;
    const c = {
      id: "c-y",
      start: { graph: { nodes: [{ id: "u", kind: "client" }], edges: [] }, workload: { baseRps: 100 } },
      lockedNodes: [],
      limits: {},
      modes: [{ id: "m1", workloadOverride: override }],
    };
    const d = designFromChallenge(c as never, "m1")!;
    expect(d.workload.baseRps).toBe(700);
    expect(Object.getPrototypeOf(d.workload)).toBe(Object.prototype);
    expect((d.workload as unknown as Record<string, unknown>).polluted).toBeUndefined();
    expect(Object.keys(d.workload)).not.toContain("constructor");
    expect(Object.keys(d.workload)).not.toContain("prototype");
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });
});

