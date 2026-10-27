// Is packages/sim/wasm older than the engine sources? Shared by build-wasm.mjs (--if-stale)
// and apps/web/scripts/ensure-wasm.mjs (plan ruling R3).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** Repository root. */
export const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
/** Built files, relative to the repository root. */
export const OUTPUTS = ["packages/sim/wasm/web/sim_wasm_bg.wasm", "packages/sim/wasm/node/sim_wasm_bg.wasm"];
/** Sources the build depends on, relative to the repository root. */
export const SOURCES = [
  "crates/sim-core/src",
  "crates/sim-wasm/src",
  "crates/sim-core/Cargo.toml",
  "crates/sim-wasm/Cargo.toml",
  "Cargo.lock",
];

/** Newest modification time (ms) of a file, or of any file under a directory. */
export function newestMtime(p) {
  const st = fs.statSync(p);
  if (!st.isDirectory()) return st.mtimeMs;
  let max = 0;
  for (const entry of fs.readdirSync(p)) max = Math.max(max, newestMtime(path.join(p, entry)));
  return max;
}

/** True when any output is missing or any source changed after the oldest output was built. */
export function isStale(outputs, sources) {
  if (!outputs.every((o) => fs.existsSync(o))) return true;
  const built = Math.min(...outputs.map((o) => fs.statSync(o).mtimeMs));
  return Math.max(...sources.filter((s) => fs.existsSync(s)).map(newestMtime)) > built;
}

/** isStale for this repository's wasm build. */
export const wasmIsStale = () =>
  isStale(
    OUTPUTS.map((p) => path.join(REPO, p)),
    SOURCES.map((p) => path.join(REPO, p)),
  );
