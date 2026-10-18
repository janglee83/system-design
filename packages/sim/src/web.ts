import init, * as binding from "../wasm/web/sim_wasm.js";
import type { WasmBinding } from "./binding";
import { createSim, type Sim } from "./sim";

let ready: Promise<Sim> | null = null;

/** Loads the wasm once (in a page or a Web Worker) and returns the API. */
export function loadSim(wasmUrl?: string | URL): Promise<Sim> {
  ready ??= init(wasmUrl ? { module_or_path: wasmUrl } : undefined).then(() =>
    createSim(binding as unknown as WasmBinding),
  );
  return ready;
}
