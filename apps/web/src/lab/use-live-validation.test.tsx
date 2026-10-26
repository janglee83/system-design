// @vitest-environment jsdom
import { act, render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { WorkerLike } from "../engine/client";
import type { Envelope, Reply } from "../engine/protocol";
import { FakeWorker } from "../test/engine-fixtures";
import { meta } from "../test/metas";
import { LabHarness, type Handles } from "../test/lab-harness";
import { emptyDesign } from "./model/design";
import { addNode, moveNodes, updateNode } from "./model/ops";
import { useLiveValidation } from "./use-live-validation";

function Live() {
  useLiveValidation();
  return null;
}

function design() {
  let d = emptyDesign();
  d = addNode(d, meta("client"), { x: 0, y: 0 }).design;
  d = addNode(d, meta("web-server"), { x: 240, y: 0 }).design;
  return { ...d, edges: [{ id: "e1", from: "client-1", to: "web-server-1", kind: "http" as const }] };
}

/** Holds validate requests until release(), and counts them. Other requests pass through. */
class HoldingWorker implements WorkerLike {
  onmessage: ((e: MessageEvent<Reply>) => void) | null = null;
  onerror: ((e: ErrorEvent) => void) | null = null;
  onmessageerror: ((e: MessageEvent) => void) | null = null;
  inner = new FakeWorker();
  held: Envelope[] = [];
  validates = 0;
  hold = false;
  constructor() {
    this.inner.onmessage = (e) => this.onmessage?.(e);
  }
  postMessage(msg: Envelope, transfer?: Transferable[]) {
    if (msg.request.type === "validate") {
      this.validates++;
      if (this.hold) {
        this.held.push(msg);
        return;
      }
    }
    this.inner.postMessage(msg, transfer);
  }
  release() {
    const all = this.held;
    this.held = [];
    for (const m of all) this.inner.postMessage(m);
  }
  terminate() {
    this.inner.terminate();
  }
}

async function setup(worker?: HoldingWorker | (() => HoldingWorker)) {
  const h: Partial<Handles> = {};
  const factory = worker === undefined ? undefined : typeof worker === "function" ? worker : () => worker;
  render(
    <LabHarness initial={design()} h={h} worker={factory}>
      <Live />
    </LabHarness>,
  );
  await expect.poll(() => h.check!.getState().status).toBe("done");
  return h as Handles;
}

describe("useLiveValidation", () => {
  it("marks the check stale at once on a change, so Run is blocked until the new result", async () => {
    const h = await setup();
    expect(h.canRun()).toBe(true);
    act(() => h.design.getState().apply((d) => ({ ...d, nodes: d.nodes.filter((n) => n.id !== "client-1"), edges: [] })));
    // Before the 150 ms debounce has fired:
    expect(h.check.getState().status).toBe("checking");
    expect(h.canRun()).toBe(false);
    await expect.poll(() => h.check.getState().status).toBe("done");
    expect(h.check.getState().issues.map((i) => i.code)).toContain("graph.no-client");
    expect(h.canRun()).toBe(false);
  });

  it("ignores changes the engine does not see (moving a node)", async () => {
    const w = new HoldingWorker();
    const h = await setup(w);
    const before = w.validates;
    act(() => h.design.getState().apply((d) => moveNodes(d, { "client-1": { x: 320, y: 320 } })));
    expect(h.check.getState().status).toBe("done");
    await new Promise((r) => setTimeout(r, 250));
    expect(w.validates).toBe(before);
    expect(h.canRun()).toBe(true);
  });

  it("keeps one request in flight plus one trailing request for the latest design", async () => {
    const w = new HoldingWorker();
    const h = await setup(w);
    w.hold = true;
    const before = w.validates;
    act(() => h.design.getState().apply((d) => updateNode(d, "web-server-1", { replicas: 2 })));
    await expect.poll(() => w.validates).toBe(before + 1); // the debounced request, held in flight
    for (const n of [3, 4, 5]) {
      act(() => h.design.getState().apply((d) => updateNode(d, "web-server-1", { replicas: n })));
      await new Promise((r) => setTimeout(r, 200)); // each debounce fires while one is in flight
    }
    expect(w.validates).toBe(before + 1);
    w.hold = false;
    w.release();
    await expect.poll(() => w.validates).toBe(before + 2); // exactly one trailing request
    await expect.poll(() => h.check.getState().status).toBe("done");
    // The result is for the latest design.
    expect(h.design.getState().design.nodes.find((n) => n.id === "web-server-1")!.replicas).toBe(5);
    expect(h.check.getState().costs["web-server-1"]).toBeGreaterThan(0);
    await new Promise((r) => setTimeout(r, 250));
    expect(w.validates).toBe(before + 2);
  });

  it("drops a reply for an older design that arrives after a newer one", async () => {
    const w = new HoldingWorker();
    const h = await setup(w);
    w.hold = true;
    act(() => h.design.getState().apply((d) => ({ ...d, nodes: d.nodes.filter((n) => n.id !== "client-1"), edges: [] })));
    await expect.poll(() => w.held.length).toBe(1);
    act(() => h.design.getState().apply((d) => updateNode(d, "web-server-1", { replicas: 2 })));
    w.hold = false;
    w.release(); // the old reply lands while the design has already moved on: it must not count
    await expect.poll(() => h.check.getState().status).toBe("done");
    expect(h.check.getState().issues.map((i) => i.code)).toContain("graph.no-client");
    expect(h.design.getState().design.nodes.find((n) => n.id === "web-server-1")!.replicas).toBe(2);
  });

  it("clears the engine's run-time refusal on any design change, even one the check ignores", async () => {
    const h = await setup();
    const refused = { code: "workload.invalid", blocking: true, nodeId: null, edgeId: null, field: "clientTimeoutMs" };
    act(() => h.check.getState().setRunIssues([refused]));
    expect(h.canRun()).toBe(false);
    act(() => h.design.getState().apply((d) => ({ ...d, workload: { ...d.workload, clientTimeoutMs: 900 } })));
    expect(h.check.getState().runIssues).toEqual([]);
    await expect.poll(() => h.canRun()).toBe(true);
  });

  it("validates again after the engine replaces its worker (a timeout or a trap), instead of staying blocked", async () => {
    const made: HoldingWorker[] = [];
    const h = await setup(() => {
      const w = new HoldingWorker();
      made.push(w);
      return w;
    });
    made[0]!.hold = true;
    act(() => h.design.getState().apply((d) => updateNode(d, "web-server-1", { replicas: 3 })));
    await expect.poll(() => made[0]!.held.length).toBe(1); // stuck in the old worker
    act(() => h.engine().client!.restart());
    await expect.poll(() => h.check.getState().status).toBe("done");
    expect(made).toHaveLength(2);
    expect(made[1]!.validates).toBeGreaterThan(0);
    expect(h.canRun()).toBe(true);
  });
});
