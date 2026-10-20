import { describe, expect, it, vi } from "vitest";
import { EngineClient, EngineCrashError, EngineRequestError } from "./client";
import type { Envelope, Reply } from "./protocol";
import { FakeWorker, fourTier } from "./test-fixtures";

describe("EngineClient", () => {
  it("matches replies to requests", async () => {
    const client = new EngineClient(() => new FakeWorker());
    const [version, metas] = await Promise.all([
      client.request({ type: "engineVersion" }),
      client.request({ type: "listComponents" }),
    ]);
    expect(version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(metas.length).toBeGreaterThan(0);
  });

  it("rejects with the engine's typed error", async () => {
    const client = new EngineClient(() => new FakeWorker());
    const bad = fourTier();
    bad.graph.nodes = bad.graph.nodes.filter((n) => n.id !== "users");
    bad.graph.edges = bad.graph.edges.filter((e) => e.from !== "users");
    const err = await client.request({ type: "run", input: bad }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(EngineRequestError);
    expect((err as EngineRequestError).error.kind).toBe("validation");
  });

  it("rejects pending requests and notifies listeners when the worker crashes", async () => {
    let worker!: FakeWorker;
    const client = new EngineClient(() => (worker = new FakeWorker()));
    const onCrash = vi.fn();
    client.onCrash(onCrash);
    worker.terminated = true; // never answers
    const pending = client.request({ type: "engineVersion" });
    worker.crash("boom");
    await expect(pending).rejects.toBeInstanceOf(EngineCrashError);
    expect(onCrash).toHaveBeenCalledOnce();
  });

  it("restart spawns a fresh worker that answers", async () => {
    const factory = vi.fn(() => new FakeWorker());
    const client = new EngineClient(factory);
    client.restart();
    expect(factory).toHaveBeenCalledTimes(2);
    await expect(client.request({ type: "engineVersion" })).resolves.toMatch(/\d/);
  });

  it("rejects new requests at once after terminate, without posting to the dead worker", async () => {
    let worker!: FakeWorker;
    const client = new EngineClient(() => (worker = new FakeWorker()));
    client.terminate();
    const post = vi.spyOn(worker, "postMessage");
    await expect(client.request({ type: "engineVersion" })).rejects.toBeInstanceOf(EngineCrashError);
    expect(post).not.toHaveBeenCalled();
  });

  it("a run crosses structured clone: the timeline is transferred, traces and JSON still work", async () => {
    let worker!: FakeWorker;
    const client = new EngineClient(() => (worker = new FakeWorker()));
    const run = await client.request({ type: "run", input: fourTier() });
    const { header, data } = run.timeline;
    expect(data).toBeInstanceOf(Float32Array);
    expect(data.length).toBe(header.frames * header.nodeIds.length * header.fields.length);
    // The worker's buffer went with the message (transferred, not copied).
    expect(worker.lastTransfer).toHaveLength(1);
    expect((worker.lastTransfer[0] as ArrayBuffer).byteLength).toBe(0);
    expect(run.traces.length).toBeGreaterThan(0);
    const trace = await client.request({ type: "trace", runId: run.runId, index: 0 });
    expect(trace.steps[0]?.nodeId).toBe("users");
    expect(JSON.parse(await client.request({ type: "resultJson", runId: run.runId })).timeline.data.length).toBe(data.length);
  });

  it("a crash reply rejects that request and restarts the worker; the next request works", async () => {
    const crash = (msg: Envelope): Reply => ({ id: msg.id, ok: false, error: { kind: "crash", message: "unreachable" } });
    const workers: FakeWorker[] = [];
    const client = new EngineClient(() => {
      const w = workers.length === 0 ? new FakeWorker(crash) : new FakeWorker();
      workers.push(w);
      return w;
    });
    const err = await client.request({ type: "engineVersion" }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(EngineRequestError);
    expect((err as EngineRequestError).error.kind).toBe("crash");
    expect(workers).toHaveLength(2);
    expect(workers[0]!.terminated).toBe(true);
    await expect(client.request({ type: "engineVersion" })).resolves.toMatch(/^\d+\.\d+\.\d+$/);
  });
});
