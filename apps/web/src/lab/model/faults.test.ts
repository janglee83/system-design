import type { FaultKind } from "@sd/sim";
import { describe, expect, it } from "vitest";
import { ALL_FAULT_KINDS } from "@/i18n/engine-codes";
import { emptyDesign, type Design } from "./design";
import { FAULT_TARGETS, randomFault, targetsFor } from "./faults";
import { addNode } from "./ops";
import { mulberry32 } from "./rng";
import { META_BY_KIND, meta } from "../../test/metas";

const SUPPORTED: FaultKind[] = ["traffic-surge-3x", "instance-down", "lb-node-down", "db-primary-down"];

function design(): Design {
  let d = emptyDesign();
  for (const k of ["client", "lb", "web-server", "web-server", "postgres"]) d = addNode(d, meta(k), { x: 0, y: 0 }).design;
  return d;
}

describe("faults", () => {
  it("has a target rule for every fault kind", () => {
    expect(Object.keys(FAULT_TARGETS).sort()).toEqual([...ALL_FAULT_KINDS].sort());
  });

  it("offers only nodes of the matching role", () => {
    const d = design();
    expect(targetsFor("instance-down", d, META_BY_KIND)).toEqual(["web-server-1", "web-server-2"]);
    expect(targetsFor("lb-node-down", d, META_BY_KIND)).toEqual(["lb-1"]);
    expect(targetsFor("db-primary-down", d, META_BY_KIND)).toEqual(["postgres-1"]);
    expect(targetsFor("traffic-surge-3x", d, META_BY_KIND)).toEqual([]);
    expect(targetsFor("cache-down", d, META_BY_KIND)).toEqual([]);
  });

  it("mulberry32 is deterministic and in [0, 1)", () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    const xs = Array.from({ length: 100 }, () => a());
    expect(xs).toEqual(Array.from({ length: 100 }, () => b()));
    expect(xs.every((x) => x >= 0 && x < 1)).toBe(true);
  });

  it("draws the same random fault for the same design, and a new one after adding it", () => {
    const d = design();
    const f1 = randomFault(d, META_BY_KIND, SUPPORTED)!;
    expect(randomFault(d, META_BY_KIND, SUPPORTED)).toEqual(f1);
    expect(SUPPORTED).toContain(f1.kind);
    expect(f1.atMs % 100).toBe(0);
    expect(f1.atMs).toBeGreaterThanOrEqual(2000);
    expect(f1.atMs).toBeLessThanOrEqual(7000);
    if (f1.kind !== "traffic-surge-3x") expect(targetsFor(f1.kind, d, META_BY_KIND)).toContain(f1.target);
    const seq = [f1];
    let cur = { ...d, faults: [f1] };
    for (let i = 0; i < 5; i++) {
      const f = randomFault(cur, META_BY_KIND, SUPPORTED)!;
      seq.push(f);
      cur = { ...cur, faults: [...cur.faults, f] };
    }
    expect(new Set(seq.map((f) => JSON.stringify(f))).size).toBeGreaterThan(1);
  });

  it("never picks an unsupported kind or a kind without targets", () => {
    let d = emptyDesign();
    d = addNode(d, meta("client"), { x: 0, y: 0 }).design;
    for (let seed = 0; seed < 50; seed++) {
      expect(randomFault({ ...d, seed }, META_BY_KIND, SUPPORTED)!.kind).toBe("traffic-surge-3x");
    }
    expect(randomFault(d, META_BY_KIND, ["instance-down"])).toBeNull();
  });
});
