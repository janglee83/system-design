import { describe, expect, it } from "vitest";
import { emptyDesign } from "./design";
import { applyPreset, BUILT_IN_PRESETS } from "./presets";

describe("presets", () => {
  it("has the four built-in presets of R21", () => {
    expect(BUILT_IN_PRESETS.map((p) => p.id)).toEqual(["quiet", "lunch", "flashSale", "writeStorm"]);
    expect(BUILT_IN_PRESETS.find((p) => p.id === "flashSale")!.workload.surge).toEqual({ factor: 3, atMs: 4000, durationMs: 3000 });
  });

  it("replaces the traffic but keeps params, duration and seed", () => {
    const d = { ...emptyDesign(), durationMs: 30_000, seed: 9 };
    d.workload = { ...d.workload, params: { consumersPerPublisher: 4 } };
    const next = applyPreset(d, BUILT_IN_PRESETS.find((p) => p.id === "writeStorm")!);
    expect(next.workload).toMatchObject({ baseRps: 2000, writeRatio: 0.7, params: { consumersPerPublisher: 4 } });
    expect([next.durationMs, next.seed]).toEqual([30_000, 9]);
  });
});
