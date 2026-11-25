import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { sim } from "../src/node";
import type { Capabilities } from "../src/types";

/** Every key of the hand-written TS type (a missing or extra key is a compile error). */
const TS_KEYS: Record<keyof Capabilities, true> = {
  components: true,
  faults: true,
  metrics: true,
  workloadParams: true,
  calibrationFields: true,
  configKeys: true,
  nodeOverrideKeys: true,
};

const camel = (s: string) => s.replace(/_([a-z])/g, (_m, c: string) => c.toUpperCase());
/** Field names of a Rust struct, camelCased as serde renames them. */
function rustFields(file: string, struct: string): string[] {
  const src = fs.readFileSync(new URL(file, import.meta.url), "utf8");
  const start = src.indexOf(`pub struct ${struct}`) >= 0 ? src.indexOf(`pub struct ${struct}`) : src.indexOf(`struct ${struct}`);
  expect(start, struct).toBeGreaterThanOrEqual(0);
  const body = src.slice(src.indexOf("{", start) + 1, src.indexOf("}", start));
  return [...body.matchAll(/^\s*(?:pub )?([a-z_]+):/gm)].map((m) => camel(m[1]!)).sort();
}

describe("capabilities", () => {
  it("has the same keys in sim-core, sim-wasm, the TS type and at runtime", () => {
    const keys = Object.keys(TS_KEYS).sort();
    expect(rustFields("../../../crates/sim-core/src/capabilities.rs", "Capabilities")).toEqual(keys);
    expect(rustFields("../../../crates/sim-wasm/src/lib.rs", "CapabilitiesJs")).toEqual(keys);
    expect(Object.keys(sim.capabilities()).sort()).toEqual(keys);
  });

  // The lists below are exact on purpose: this test pins what this engine build supports. When
  // the engine gains a component, fault or workload param, update them together with the UI.
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
