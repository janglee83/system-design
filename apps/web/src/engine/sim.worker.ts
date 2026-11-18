// Engine worker: owns the wasm instance (spec §6). Loaded by client.ts with
// new Worker(new URL("./sim.worker.ts", import.meta.url), { type: "module" }).
import { loadSim } from "@sd/sim/web";
import { createHandler, serve, type WorkerScope } from "./worker-core";

// loadSim() without a URL: the wasm-bindgen glue resolves sim_wasm_bg.wasm with
// new URL(..., import.meta.url), which webpack emits as a hashed asset (plan ruling R2).
serve(self as unknown as WorkerScope, loadSim().then((sim) => createHandler(sim)));
