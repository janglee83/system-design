import { describe, expect, it } from "vitest";
import type { Envelope, Reply } from "./protocol";
import { serve, type Handled, type WorkerScope } from "./worker-core";

class FakeScope implements WorkerScope {
  onmessage: ((e: MessageEvent<Envelope>) => void | Promise<void>) | null = null;
  posted: Reply[] = [];
  failNext = 0;
  postMessage(message: Reply): void {
    if (this.failNext > 0) {
      this.failNext--;
      throw new DOMException("could not be cloned", "DataCloneError");
    }
    this.posted.push(message);
  }
  async send(id: number): Promise<void> {
    await this.onmessage?.({ data: { id, request: { type: "engineVersion" } } } as MessageEvent<Envelope>);
  }
}

const ok = (value: unknown) => async () => (env: Envelope): Handled => ({ reply: { id: env.id, ok: true, value }, transfer: [] });

describe("worker serve loop", () => {
  it("answers through the handler", async () => {
    const scope = new FakeScope();
    serve(scope, ok("1.2.3")());
    await scope.send(1);
    expect(scope.posted).toEqual([{ id: 1, ok: true, value: "1.2.3" }]);
  });

  it("answers every request with a load error when the engine failed to load, without an unhandled rejection", async () => {
    const scope = new FakeScope();
    serve(scope, Promise.reject(new Error("no wasm")));
    await new Promise((r) => setTimeout(r, 0)); // an unhandled rejection would fail the run here
    await scope.send(7);
    expect(scope.posted).toEqual([{ id: 7, ok: false, error: { kind: "load", message: "Error: no wasm" } }]);
  });

  it("turns a failed postMessage into an internal error for the same request", async () => {
    const scope = new FakeScope();
    serve(scope, ok({ fn: "not cloneable" })());
    scope.failNext = 1;
    await scope.send(3);
    expect(scope.posted).toEqual([{ id: 3, ok: false, error: { kind: "internal", message: expect.stringContaining("could not be cloned") } }]);
  });
});
