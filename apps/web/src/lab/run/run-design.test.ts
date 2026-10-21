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
    const r = await runDesign(stores, client);
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
    expect(await runDesign(stores, client)).toBeNull();
    expect(post).not.toHaveBeenCalled();
  });

  it("puts the engine's refusal into the problems list and leaves the history alone", async () => {
    const { client, stores } = setup();
    stores.design.setState((s) => ({ design: { ...s.design, workload: { ...s.design.workload, clientTimeoutMs: 0 } } }));
    expect(await runDesign(stores, client)).toBeNull();
    expect(stores.check.getState().runIssues.map((i) => i.code)).toContain("workload.invalid");
    expect(stores.runs.getState().runs).toEqual([]);
  });

  it("records the engine epoch; after a restart the run stays listed but is not inspectable", async () => {
    const { client, stores } = setup();
    const first = (await runDesign(stores, client))!;
    client.restart();
    const second = (await runDesign(stores, client))!;
    expect([first.id, second.id]).toEqual([1, 2]); // local ids keep counting
    expect(first.engineRunId).toBe(second.engineRunId); // the new worker started again at 1
    expect(runAvailable(first, client.epoch)).toBe(false);
    expect(runAvailable(second, client.epoch)).toBe(true);
    expect(stores.runs.getState().runs).toHaveLength(2);
  });
});
