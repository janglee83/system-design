import { describe, expect, it } from "vitest";
import { EngineClient } from "./client";
import { createEngineStore, type EngineState } from "./engine-store";
import type { Envelope, Reply } from "./protocol";
import { FakeWorker } from "../test/engine-fixtures";

const failLoad = (msg: Envelope): Reply => ({ id: msg.id, ok: false, error: { kind: "load", message: "x" } });

/** Resolves once the store reaches a settled status. */
function settled(store: ReturnType<typeof createEngineStore>): Promise<EngineState> {
  return new Promise((resolve) => {
    const check = (s: EngineState) => {
      if (s.status === "ready" || s.status === "error") {
        unsubscribe();
        resolve(s);
      }
    };
    const unsubscribe = store.subscribe(check);
    check(store.getState());
  });
}

describe("engine store", () => {
  it("start() goes loading -> ready and fills the engine info", async () => {
    const store = createEngineStore(() => new EngineClient(() => new FakeWorker()));
    const seen: string[] = [];
    store.subscribe((s) => seen.push(s.status));
    expect(store.getState().status).toBe("idle");
    store.getState().start();
    const s = await settled(store);
    expect(seen.filter((x, i) => x !== seen[i - 1])).toEqual(["idle", "loading", "ready"]);
    expect(s.status).toBe("ready");
    expect(s.info?.components.map((m) => m.kind)).toContain("web-server");
    expect(s.info?.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(s.info?.capabilities.faults).toContain("instance-down");
  });

  it("ends in error when the worker cannot load the engine, and retry recovers", async () => {
    let broken = true;
    const store = createEngineStore(
      () => new EngineClient(() => (broken ? new FakeWorker(failLoad) : new FakeWorker())),
    );
    store.getState().start();
    const failed = await settled(store);
    expect(failed.status).toBe("error");
    expect(failed.error).toBe("load");
    expect(failed.info).toBeNull();

    broken = false;
    store.getState().retry();
    expect(store.getState().status).toBe("loading");
    const s = await settled(store);
    expect(s.status).toBe("ready");
    expect(s.error).toBeNull();
  });

  it("a worker crash after start puts the store in error", async () => {
    let worker!: FakeWorker;
    const store = createEngineStore(() => new EngineClient(() => (worker = new FakeWorker())));
    store.getState().start();
    await settled(store);
    worker.crash("boom");
    expect(store.getState()).toMatchObject({ status: "error", error: "boom" });
  });

  it("stop() terminates the client and resets; start() works again (StrictMode remount)", async () => {
    const clients: EngineClient[] = [];
    const store = createEngineStore(() => {
      const c = new EngineClient(() => new FakeWorker());
      clients.push(c);
      return c;
    });
    store.getState().start();
    store.getState().stop(); // unmount before the first load finished
    expect(store.getState()).toMatchObject({ status: "idle", client: null, info: null, error: null });
    store.getState().start(); // remount
    const s = await settled(store);
    expect(s.status).toBe("ready");
    expect(clients).toHaveLength(2);
    expect(s.client).toBe(clients[1]);
    // The first client's load was cut short; it must not have left an error behind.
    await new Promise((r) => setTimeout(r, 0));
    expect(store.getState()).toMatchObject({ status: "ready", error: null });
  });

  it("a retry while a load is in flight is not overturned by the old load's failure", async () => {
    const store = createEngineStore(() => new EngineClient(() => new FakeWorker()));
    store.getState().start();
    const seen: string[] = [];
    store.subscribe((s) => seen.push(s.status));
    store.getState().retry(); // the first load's requests reject with "engine restarted"
    const s = await settled(store);
    await new Promise((r) => setTimeout(r, 0));
    expect(s.status).toBe("ready");
    expect(seen).not.toContain("error");
    expect(store.getState()).toMatchObject({ status: "ready", error: null });
  });
});
