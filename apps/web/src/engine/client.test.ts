import { describe, expect, it, vi } from "vitest";
import { EngineClient, EngineCrashError, EngineRequestError } from "./client";
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
});
