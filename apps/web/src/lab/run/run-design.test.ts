import { describe, expect, it, vi } from "vitest";
import { EngineClient } from "../../engine/client";
import { designFromInput, FakeWorker, fourTier } from "../../test/engine-fixtures";
import { buildSimInput } from "../model/sim-input";
import { createCheckStore } from "../store/check-store";
import { createDesignStore } from "../store/design-store";
import { createRunStore, currentRun, runAvailable } from "../store/run-store";
import { runDesign } from "./run-design";

function setup(design = designFromInput(fourTier())) {
  let worker!: FakeWorker;
  const client = new EngineClient(() => (worker = new FakeWorker()));
  const stores = { design: createDesignStore(design), check: createCheckStore(), runs: createRunStore() };
  const seq = stores.check.getState().begin();
  stores.check.getState().finish(seq, { issues: [], costs: {} });
  return { client, stores, worker: () => worker };
}

describe("runDesign", () => {
  it("runs a valid design and makes it the current run", async () => {
    const { client, stores } = setup();
    const out = await runDesign(stores, client);
    expect(out.kind).toBe("ran");
    const r = out.kind === "ran" ? out.record : null;
    expect(r!.metrics.requestsTotal).toBeGreaterThan(0);
    expect(r!.timeline.frames).toBe(100);
    expect(currentRun(stores.runs.getState())).toBe(r);
    expect(r!.id).toBe(1);
  });

  it("sends exactly buildSimInput(design)", async () => {
    const { client, stores, worker } = setup();
    const post = vi.spyOn(worker(), "postMessage");
    await runDesign(stores, client);
    const sent = post.mock.calls.map((c) => c[0].request).find((r) => r.type === "run");
    expect(sent).toEqual({ type: "run", input: buildSimInput(stores.design.getState().design) });
  });

  it("refuses without calling the worker while a blocking issue exists", async () => {
    const { client, stores, worker } = setup();
    stores.check.getState().setRunIssues([{ code: "graph.no-client", blocking: true, nodeId: null, edgeId: null, field: null }]);
    const post = vi.spyOn(worker(), "postMessage");
    expect(await runDesign(stores, client)).toEqual({ kind: "declined", reason: "blocked" });
    expect(post).not.toHaveBeenCalled();
  });

  it("puts the engine's refusal into the problems list and leaves the history alone", async () => {
    const { client, stores } = setup();
    stores.design.setState((s) => ({ design: { ...s.design, workload: { ...s.design.workload, clientTimeoutMs: 0 } } }));
    expect(await runDesign(stores, client)).toEqual({ kind: "refused" });
    expect(stores.check.getState().runIssues.map((i) => i.code)).toContain("workload.invalid");
    expect(stores.runs.getState().runs).toEqual([]);
  });

  it("records the engine epoch; after a restart the run stays listed but is not inspectable", async () => {
    const { client, stores } = setup();
    const ran = async () => {
      const o = await runDesign(stores, client);
      if (o.kind !== "ran") throw new Error(o.kind);
      return o.record;
    };
    const first = await ran();
    client.restart();
    const second = await ran();
    expect([first.id, second.id]).toEqual([1, 2]); // local ids keep counting
    expect(first.engineRunId).toBe(second.engineRunId); // the new worker started again at 1
    expect(runAvailable(first, client.epoch)).toBe(false);
    expect(runAvailable(second, client.epoch)).toBe(true);
    expect(stores.runs.getState().runs).toHaveLength(2);
  });

  it("declines while the check is stale (a change not yet validated), without calling the worker", async () => {
    const { client, stores, worker } = setup();
    stores.check.getState().markStale();
    const post = vi.spyOn(worker(), "postMessage");
    expect(await runDesign(stores, client)).toEqual({ kind: "declined", reason: "checking" });
    expect(post).not.toHaveBeenCalled();
  });

  it("declines while a run is in progress, and without an engine", async () => {
    const { client, stores } = setup();
    const first = runDesign(stores, client);
    expect(await runDesign(stores, client)).toEqual({ kind: "declined", reason: "busy" });
    expect((await first).kind).toBe("ran");
    expect(await runDesign(stores, null)).toEqual({ kind: "declined", reason: "engine" });
  });

  it("snapshots names and warnings at run time, so later edits do not rewrite the run's story", async () => {
    const { client, stores } = setup();
    stores.design.getState().apply((d) => ({ ...d, nodes: d.nodes.map((n) => (n.id === "web" ? { ...n, label: "API" } : n)) }));
    const warning = { code: "node.unreachable", blocking: false, nodeId: "pg", edgeId: null, field: null };
    const seq = stores.check.getState().begin();
    stores.check.getState().finish(seq, { issues: [warning], costs: {} });
    const out = await runDesign(stores, client);
    if (out.kind !== "ran") throw new Error(out.kind);
    expect(out.record.snapshot.nodes.find((n) => n.id === "web")).toEqual({ id: "web", kind: "web-server", label: "API" });
    expect(out.record.snapshot.edges).toHaveLength(3);
    expect(out.record.snapshot.warnings).toEqual([warning]);
    stores.design.getState().apply((d) => ({ ...d, nodes: d.nodes.map((n) => (n.id === "web" ? { ...n, label: "Renamed" } : n)) }));
    expect(out.record.snapshot.nodes.find((n) => n.id === "web")!.label).toBe("API");
  });

  it("a design that cannot be turned into input fails cleanly, without a stuck 'running' state", async () => {
    const { client, stores } = setup();
    stores.design.setState((s) => ({ design: { ...s.design, workload: { ...s.design.workload, params: { bad: (() => 1) as never } } } }));
    const out = await runDesign(stores, client);
    expect(out.kind).toBe("failed");
    expect(stores.runs.getState().status).toBe("idle");
  });

  it("records the epoch the request was sent in, even if it changes before the reply is handled", async () => {
    const { client, stores } = setup();
    const epoch = vi.spyOn(client, "epoch", "get").mockReturnValue(41);
    const send = client.request.bind(client);
    vi.spyOn(client, "request").mockImplementation((...a: Parameters<typeof send>) => {
      epoch.mockReturnValue(42); // the engine moves on while the request is out
      return send(...a);
    });
    const out = await runDesign(stores, client);
    if (out.kind !== "ran") throw new Error(out.kind);
    expect(out.record.epoch).toBe(41);
    epoch.mockRestore();
  });
});
