import { sim } from "@sd/sim/node";
import { describe, expect, it } from "vitest";
import { designFromInput, fourTier } from "../../test/engine-fixtures";
import { filterTraces, hopList, nextSameClass, tracePath } from "./trace-model";

describe("trace model (design-system §7.4)", () => {
  const input = fourTier(3000);
  const run = sim.simulate(input);
  const summaries = run.traceSummaries();

  it("sorts the slowest first and filters by outcome", () => {
    const all = filterTraces(summaries, null);
    expect(all).toHaveLength(summaries.length);
    for (let i = 1; i < all.length; i++) expect(all[i - 1]!.latencyMs).toBeGreaterThanOrEqual(all[i]!.latencyMs);
    expect(filterTraces(summaries, "delivered").every((s) => s.outcome === "delivered")).toBe(true);
  });

  it("maps a delivered request onto the design's nodes and edges, with its hops", () => {
    const delivered = filterTraces(summaries, "delivered")[0]!;
    const trace = run.trace(summaries.indexOf(delivered));
    const path = tracePath(trace, designFromInput(input));
    expect([...path.nodes]).toEqual(expect.arrayContaining(["users", "lb", "web"]));
    expect(path.edges.has("e1")).toBe(true);
    expect(path.edges.has("e2")).toBe(true);
    const hops = hopList(trace);
    expect(hops[0]).toMatchObject({ nodeId: "users", action: "send" });
    expect(hops.every((h) => h.waitMs >= 0 && h.serviceMs >= 0)).toBe(true);
  });

  it("finds the next sampled request of the same class, wrapping around", () => {
    const list = [
      { id: 1, class: "read" as const },
      { id: 2, class: "write" as const },
      { id: 3, class: "read" as const },
    ];
    expect(nextSameClass(list, 1)?.id).toBe(3);
    expect(nextSameClass(list, 3)?.id).toBe(1);
    expect(nextSameClass(list, 2)).toBeNull();
  });
});
