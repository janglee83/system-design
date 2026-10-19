import { createRequire } from "node:module";
import type { WasmBinding } from "./binding";
import { createSim } from "./sim";

const require = createRequire(import.meta.url);
const binding = require("../wasm/node/sim_wasm.js") as WasmBinding;

export const sim = createSim(binding);
