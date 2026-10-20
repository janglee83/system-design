import {
  SimInputError,
  SimValidationError,
  type CalibrationOverrides,
  type Node,
  type Sim,
  type SimInput,
  type SimRun,
} from "@sd/sim";
import type { EngineError, EngineRequest, Envelope, Reply, RunResult, ValidateResult } from "./protocol";

/** Runs whose handles the worker keeps for trace(i) and JSON export (R18). */
export const MAX_RUNS = 10;
const COST_CLIENT = "__cost-client";
const COST_EDGE = "__cost-edge";

export interface Handled {
  reply: Reply;
  transfer: Transferable[];
}

function toEngineError(e: unknown): EngineError {
  if (e instanceof SimValidationError) return { kind: "validation", issues: e.issues };
  if (e instanceof SimInputError) return { kind: "input", message: e.message };
  // After a trap the instance's memory may be inconsistent: never reuse it.
  if (e instanceof WebAssembly.RuntimeError) return { kind: "crash", message: e.message };
  return { kind: "internal", message: e instanceof Error ? e.message : String(e) };
}

export function createHandler(sim: Sim, now: () => number = () => performance.now()) {
  const runs = new Map<number, SimRun>();
  let nextRunId = 1;
  const metas = sim.listComponents();
  const metaByKind = new Map(metas.map((m) => [m.kind, m]));
  const clientKind = metas.find((m) => m.role === "client")?.kind ?? "client";

  /** Node prices by (kind, replicas, config, calibration); ids and labels do not change a price. */
  const costCache = new Map<string, number | null>();
  const COST_CACHE_LIMIT = 2000;
  const sortedEntries = (o: object) => Object.entries(o).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));

  function nodeCost(node: Node, calibration: CalibrationOverrides): number | null {
    const key = JSON.stringify([node.kind, node.replicas, sortedEntries(node.config), sortedEntries(calibration)]);
    const hit = costCache.get(key);
    if (hit !== undefined || costCache.has(key)) return hit ?? null;
    const cost = priceNode(node, calibration);
    if (costCache.size >= COST_CACHE_LIMIT) costCache.clear();
    costCache.set(key, cost);
    return cost;
  }

  /** Plan ruling R10: a 100 ms, zero-traffic run of client -> node prices the node alone. */
  function priceNode(node: Node, calibration: CalibrationOverrides): number | null {
    const meta = metaByKind.get(node.kind);
    if (!meta) return null;
    const kind = meta.accepts[0];
    if (meta.role === "client" || kind === undefined) return 0;
    const input: SimInput = {
      graph: {
        nodes: [{ id: COST_CLIENT, kind: clientKind, label: "", replicas: 1, config: {} }, node],
        edges: [{ id: COST_EDGE, from: COST_CLIENT, to: node.id, kind }],
      },
      workload: { profile: "mixed", baseRps: 0, writeRatio: 0, clients: 1, clientTimeoutMs: 1000, surge: null, params: {} },
      faults: [],
      durationMs: 100,
      seed: 0,
      calibration,
    };
    try {
      const run = sim.simulate(input);
      try {
        return run.metrics.costPerMonth;
      } finally {
        run.free();
      }
    } catch (e) {
      // The engine rejecting this node's config means "no price" (R10). A trap or any other
      // error is a real failure and must reach the caller (a trap replaces the worker).
      if (e instanceof SimValidationError || e instanceof SimInputError) return null;
      throw e;
    }
  }

  function kept(runId: number): SimRun {
    const run = runs.get(runId);
    if (!run) throw new Error(`unknown run ${runId}`);
    return run;
  }

  function dispatch(r: EngineRequest): [unknown, Transferable[]] {
    switch (r.type) {
      case "engineVersion":
        return [sim.engineVersion(), []];
      case "listComponents":
        return [metas, []];
      case "defaultCalibration":
        return [sim.defaultCalibration(), []];
      case "capabilities":
        return [sim.capabilities(), []];
      case "validate": {
        const issues = sim.validateGraph(r.graph, r.limits ?? undefined);
        const costs: Record<string, number | null> = {};
        for (const n of r.graph.nodes) costs[n.id] = nodeCost(n, r.calibration);
        return [{ issues, costs } satisfies ValidateResult, []];
      }
      case "run": {
        const t0 = now();
        const run = sim.simulate(r.input);
        let result: RunResult;
        try {
          const tl = run.timeline;
          result = {
            runId: nextRunId,
            metrics: run.metrics,
            events: run.events,
            timeline: {
              header: { frameMs: tl.frameMs, frames: tl.frames, nodeIds: [...tl.nodeIds], fields: [...tl.fields] },
              // A JS-owned copy (sim-wasm copies it out of wasm memory). Its buffer is transferred
              // with the reply, which detaches it: this run's `timeline` must not be read again in
              // the worker. trace() and resultJson() read wasm memory, so they keep working.
              data: tl.data,
            },
            traces: run.traceSummaries(),
            elapsedMs: 0,
          };
        } catch (e) {
          run.free(); // never kept, so nothing else would free it
          throw e;
        }
        nextRunId++;
        result.elapsedMs = now() - t0;
        runs.set(result.runId, run);
        while (runs.size > MAX_RUNS) {
          const [oldestId, oldest] = runs.entries().next().value as [number, SimRun];
          oldest.free();
          runs.delete(oldestId);
        }
        return [result, [result.timeline.data.buffer]];
      }
      case "trace":
        return [kept(r.runId).trace(r.index), []];
      case "resultJson":
        return [kept(r.runId).resultJson(), []];
      case "dropRun": {
        runs.get(r.runId)?.free();
        runs.delete(r.runId);
        return [null, []];
      }
    }
  }

  return function handle({ id, request }: Envelope): Handled {
    try {
      const [value, transfer] = dispatch(request);
      return { reply: { id, ok: true, value }, transfer };
    } catch (e) {
      return { reply: { id, ok: false, error: toEngineError(e) }, transfer: [] };
    }
  };
}

/** The parts of a worker's global scope the serve loop uses. */
export interface WorkerScope {
  onmessage: ((e: MessageEvent<Envelope>) => void | Promise<void>) | null;
  postMessage(message: Reply, transfer: Transferable[]): void;
}

/** Answers every message with `ready`'s handler; never throws and never leaves a rejection unhandled. */
export function serve(scope: WorkerScope, ready: Promise<(envelope: Envelope) => Handled>): void {
  // Observed here so a failed load is not an unhandled rejection; each request reports it below.
  ready.catch(() => {});
  const post = (reply: Reply, transfer: Transferable[]) => {
    try {
      scope.postMessage(reply, transfer);
    } catch (e) {
      // For example a value structured clone cannot copy. The caller must still get an answer.
      const message = e instanceof Error ? e.message : String(e);
      scope.postMessage({ id: reply.id, ok: false, error: { kind: "internal", message } }, []);
    }
  };
  scope.onmessage = async (e) => {
    let handle: (envelope: Envelope) => Handled;
    try {
      handle = await ready;
    } catch (err) {
      post({ id: e.data.id, ok: false, error: { kind: "load", message: String(err) } }, []);
      return;
    }
    const { reply, transfer } = handle(e.data);
    post(reply, transfer);
  };
}
