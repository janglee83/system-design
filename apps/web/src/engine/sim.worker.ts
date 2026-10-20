// Engine worker: owns the wasm instance (spec §6). Loaded by client.ts with
// new Worker(new URL("./sim.worker.ts", import.meta.url), { type: "module" }).
import { loadSim } from "@sd/sim/web";
import type { Envelope, Reply } from "./protocol";
import { createHandler } from "./worker-core";

type Scope = {
  onmessage: ((e: MessageEvent<Envelope>) => void) | null;
  postMessage(message: Reply, transfer: Transferable[]): void;
};
const scope = self as unknown as Scope;

// loadSim() without a URL: the wasm-bindgen glue resolves sim_wasm_bg.wasm with
// new URL(..., import.meta.url), which webpack emits as a hashed asset (plan ruling R2).
const ready = loadSim().then((sim) => createHandler(sim));

scope.onmessage = async (e) => {
  let handle: Awaited<typeof ready>;
  try {
    handle = await ready;
  } catch (err) {
    scope.postMessage({ id: e.data.id, ok: false, error: { kind: "load", message: String(err) } }, []);
    return;
  }
  const { reply, transfer } = handle(e.data);
  scope.postMessage(reply, transfer);
};
