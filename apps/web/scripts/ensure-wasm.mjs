// Builds packages/sim/wasm (node + web targets) when it is missing or older than the engine
// sources. Runs before `dev`, `build`, `test` and `typecheck` (plan ruling R3).
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const OUTPUTS = ["packages/sim/wasm/web/sim_wasm_bg.wasm", "packages/sim/wasm/node/sim_wasm_bg.wasm"];
const SOURCES = [
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

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const outputs = OUTPUTS.map((p) => path.join(repo, p));
  const sources = SOURCES.map((p) => path.join(repo, p));
  if (isStale(outputs, sources)) {
    execFileSync("pnpm", ["--filter", "@sd/sim", "build:wasm"], { cwd: repo, stdio: "inherit" });
  } else {
    console.log("wasm is up to date");
  }
}
