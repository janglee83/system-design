import { sim } from "@sd/sim/node";
import { TimelineView } from "@sd/sim";
import { describe, expect, it } from "vitest";
import { fourTier } from "../../test/engine-fixtures";
import { edgeStatesAt, liveAt, nodeState, statesAt } from "./node-state";

const view = (input: ReturnType<typeof fourTier>) => {
  const run = sim.simulate(input);
  const tl = run.timeline;
  const v = new TimelineView({ frameMs: tl.frameMs, frames: tl.frames, nodeIds: [...tl.nodeIds], fields: [...tl.fields] }, tl.data);
  run.free();
  return v;
};

describe("node state (spec §5.4, R19)", () => {
  it("applies the thresholds in order: down, overloaded, busy, normal", () => {
    expect(nodeState({ busy: 0.99, rejected: 5, up: 0 })).toBe("down");
    expect(nodeState({ busy: 0.2, rejected: 1, up: 1 })).toBe("overloaded");
    expect(nodeState({ busy: 0.95, rejected: 0, up: 1 })).toBe("overloaded");
    expect(nodeState({ busy: 0.7, rejected: 0, up: 1 })).toBe("busy");
    expect(nodeState({ busy: 0.6999, rejected: 0, up: 1 })).toBe("normal");
  });

  it("reads a real timeline: a one-replica web server goes down after instance-down", () => {
    const input = fourTier(500);
    input.graph.nodes.find((n) => n.id === "web")!.replicas = 1;
    input.faults = [{ kind: "instance-down", target: "web", atMs: 3000 }];
    const tl = view(input);
    expect(statesAt(tl, 10)["web"]).not.toBe("down");
    expect(statesAt(tl, 50)["web"]).toBe("down");
    // The live numbers say since when it is down.
    expect(liveAt(tl, 50)["web"]).toMatchObject({ state: "down", downSinceMs: 3000 });
  });

  it("marks an under-provisioned server as overloaded, with its load and rejections", () => {
    const input = fourTier(200_000);
    input.graph.nodes.find((n) => n.id === "web")!.replicas = 1;
    input.graph.nodes.find((n) => n.id === "web")!.config = { cpu: 1 };
    const tl = view(input);
    expect(statesAt(tl, 50)["web"]).toBe("overloaded");
    const live = liveAt(tl, 50)["web"]!;
    expect(live.load).toBeGreaterThanOrEqual(0.95);
    expect(live.rejected).toBeGreaterThanOrEqual(0);
  });

  it("marks edges into an overloaded node hot and edges touching a down node dead", () => {
    const states = { users: "normal", lb: "normal", web: "overloaded", pg: "down" } as const;
    const edges = [
      { id: "e1", from: "users", to: "lb" },
      { id: "e2", from: "lb", to: "web" },
      { id: "e3", from: "web", to: "pg" },
    ];
    expect(edgeStatesAt(edges, states)).toEqual({ e1: "normal", e2: "hot", e3: "dead" });
  });
});
