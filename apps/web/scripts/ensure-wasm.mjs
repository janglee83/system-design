// Builds packages/sim/wasm (node + web targets) when it is missing or older than the engine
// sources. Runs before `dev`, `build`, `test` and `typecheck` (plan ruling R3). The freshness
// check lives with the build script in @sd/sim.
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { REPO, wasmIsStale } from "../../../packages/sim/scripts/freshness.mjs";

export { isStale, newestMtime } from "../../../packages/sim/scripts/freshness.mjs";

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (wasmIsStale()) {
    execFileSync("pnpm", ["--filter", "@sd/sim", "build:wasm"], { cwd: REPO, stdio: "inherit" });
  } else {
    console.log("wasm is up to date");
  }
}
