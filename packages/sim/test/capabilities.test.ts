import { describe, expect, it } from "vitest";
import { sim } from "../src/node";

describe("capabilities", () => {
  it("lists what this engine build supports", () => {
    const c = sim.capabilities();
    expect(c.components).toEqual(["client", "lb", "postgres", "web-server"]);
    // Enum order, as sim-core sorts them.
    expect(c.faults).toEqual(["traffic-surge-3x", "instance-down", "lb-node-down", "db-primary-down"]);
    expect(c.workloadParams).toEqual([]);
    expect(c.nodeOverrideKeys).toEqual(["costPerMonth", "rpsPerInstance", "serviceMs"]);
    expect(c.configKeys["web-server"]).toEqual(["cpu", "memoryGb"]);
    expect(c.configKeys["client"]).toEqual([]);
    expect(c.calibrationFields).toEqual(Object.keys(sim.defaultCalibration()).sort());
    expect(c.metrics).toContain("p95");
    expect(c.metrics).not.toContain("staleReads");
  });

  it("returns a fresh plain object each call", () => {
    const a = sim.capabilities();
    a.components.push("mutated");
    expect(sim.capabilities().components).not.toContain("mutated");
  });
});
