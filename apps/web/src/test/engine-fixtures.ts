import type { Node, SimInput } from "@sd/sim";
import { emptyDesign, type Design } from "../lab/model/design";
import { sim } from "@sd/sim/node";
import type { WorkerLike } from "../engine/client";
import type { Envelope, Reply } from "../engine/protocol";
import { createHandler } from "../engine/worker-core";

const node = (id: string, kind: string, replicas = 1, config: Node["config"] = {}): Node => ({
  id,
  kind,
  label: "",
  replicas,
  config,
});

/** users -> lb -> web -> pg, all valid. */
export function fourTier(baseRps = 2000): SimInput {
  return {
    graph: {
      nodes: [
        node("users", "client"),
        node("lb", "lb", 2),
        node("web", "web-server", 3, { cpu: 2 }),
        node("pg", "postgres", 1, { readReplicas: 1 }),
      ],
      edges: [
        { id: "e1", from: "users", to: "lb", kind: "http" },
        { id: "e2", from: "lb", to: "web", kind: "http" },
        { id: "e3", from: "web", to: "pg", kind: "db" },
      ],
    },
    workload: { profile: "mixed", baseRps, writeRatio: 0.2, clients: 1000, clientTimeoutMs: 1000, surge: null, params: {} },
    faults: [],
    durationMs: 10_000,
    seed: 1,
  };
}

/** An in-process stand-in for the engine worker. `answer` overrides the real handler. */
export class FakeWorker implements WorkerLike {
  onmessage: ((e: MessageEvent<Reply>) => void) | null = null;
  onerror: ((e: ErrorEvent) => void) | null = null;
  onmessageerror: ((e: MessageEvent) => void) | null = null;
  terminated = false;
  /** Transfer list of the last reply (its buffers are detached once delivered). */
  lastTransfer: Transferable[] = [];
  private handle = createHandler(sim, () => 0);
  constructor(private readonly answer?: (msg: Envelope) => Reply) {}
  postMessage(msg: Envelope, transfer: Transferable[] = []) {
    // Both directions go through structured clone, as with a real Worker.
    const inbound = structuredClone(msg, { transfer });
    queueMicrotask(() => {
      if (this.terminated) return;
      const { reply, transfer: out } = this.answer ? { reply: this.answer(inbound), transfer: [] } : this.handle(inbound);
      this.lastTransfer = out;
      const data = structuredClone(reply, { transfer: out });
      this.onmessage?.({ data } as MessageEvent<Reply>);
    });
  }
  terminate() {
    this.terminated = true;
  }
  crash(message: string) {
    this.onerror?.({ message, preventDefault() {} } as ErrorEvent);
  }
}

/** A Lab design holding a SimInput's graph and workload, nodes laid out on one row. */
export function designFromInput(input: SimInput): Design {
  return {
    ...emptyDesign(),
    nodes: input.graph.nodes.map((n, i) => ({
      id: n.id,
      kind: n.kind,
      label: n.label,
      replicas: n.replicas,
      config: { ...n.config } as Design["nodes"][number]["config"],
      position: { x: 240 * i, y: 0 },
      groupId: null,
    })),
    edges: input.graph.edges.map((e) => ({ ...e })),
    workload: structuredClone(input.workload),
    faults: input.faults.map((f) => ({ ...f })),
    durationMs: input.durationMs,
    seed: input.seed,
    calibration: { ...(input.calibration ?? {}) },
  };
}
