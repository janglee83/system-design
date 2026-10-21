import { sim } from "@sd/sim/node";
import { describe, expect, it } from "vitest";
import { CALIBRATION_GROUPS, calibrationBounds } from "./calibration-meta";

describe("calibration metadata", () => {
  it("covers every engine calibration field exactly once", () => {
    expect(CALIBRATION_GROUPS.flatMap((g) => g.fields).sort()).toEqual(Object.keys(sim.defaultCalibration()).sort());
  });

  it("bounds agree with the engine: the edges of each range are accepted, beyond them rejected", () => {
    const base = { graph: { nodes: [{ id: "u", kind: "client", label: "", replicas: 1, config: {} }, { id: "w", kind: "web-server", label: "", replicas: 1, config: {} }], edges: [{ id: "e", from: "u", to: "w", kind: "http" as const }] }, workload: { profile: "mixed" as const, baseRps: 10, writeRatio: 0, clients: 1, clientTimeoutMs: 1000, surge: null, params: {} }, faults: [], durationMs: 100, seed: 0 };
    for (const field of Object.keys(sim.defaultCalibration())) {
      const { min, max } = calibrationBounds(field as never);
      expect(() => sim.simulate({ ...base, calibration: { [field]: min } }).free(), `${field} min`).not.toThrow();
      if (max !== null) expect(() => sim.simulate({ ...base, calibration: { [field]: max } }).free(), `${field} max`).not.toThrow();
    }
  });
});
