import { sim } from "@sd/sim/node";
import { describe, expect, it } from "vitest";
import { META_BY_KIND } from "../../test/metas";
import { buildSimInput } from "./sim-input";
import { designFromTemplate, TEMPLATES } from "./templates";

describe("templates", () => {
  it("lists the empty design and the web-and-database starter", () => {
    expect(TEMPLATES).toEqual(["empty", "webDb"]);
    expect(designFromTemplate("empty", META_BY_KIND).nodes).toEqual([]);
  });

  it("webDb is users → web server → database, left to right, with http and db edges, and runs clean", () => {
    const d = designFromTemplate("webDb", META_BY_KIND);
    expect(d.nodes.map((n) => n.id)).toEqual(["client-1", "web-server-1", "postgres-1"]);
    const xs = d.nodes.map((n) => n.position.x);
    expect(xs[0]).toBeLessThan(xs[1]!);
    expect(xs[1]).toBeLessThan(xs[2]!);
    expect(d.edges).toEqual([
      { id: "e1", from: "client-1", to: "web-server-1", kind: "http" },
      { id: "e2", from: "web-server-1", to: "postgres-1", kind: "db" },
    ]);
    expect(sim.validateGraph(buildSimInput(d).graph).filter((i) => i.blocking)).toEqual([]);
    const run = sim.simulate(buildSimInput(d));
    expect(run.metrics.requestsTotal).toBeGreaterThan(0);
    run.free();
  });
});
