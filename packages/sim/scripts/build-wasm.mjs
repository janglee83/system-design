// Builds crates/sim-wasm for Node (CommonJS) and the web (ES module + init), then runs a
// pinned wasm-opt. Output goes to packages/sim/wasm/{node,web} (gitignored).
// With --if-stale it does nothing when the wasm is newer than the engine sources.
// Each target is built in a temporary directory and swapped into place when complete, so a
// failed or concurrent build never leaves a half-written directory behind.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { wasmIsStale } from "./freshness.mjs";

const pkg = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const crate = path.resolve(pkg, "../../crates/sim-wasm");
const wasmOpt = path.join(pkg, "node_modules/.bin/wasm-opt");
const features = [
  "--enable-bulk-memory",
  "--enable-reference-types",
  "--enable-multivalue",
  "--enable-mutable-globals",
  "--enable-sign-ext",
  "--enable-nontrapping-float-to-int",
];

/** Moves a finished build directory over `final`; the old one is removed after the swap. */
export function replaceDir(tmp, final) {
  const old = `${final}.old-${process.pid}`;
  const hadOld = fs.existsSync(final);
  if (hadOld) fs.renameSync(final, old);
  fs.renameSync(tmp, final);
  if (hadOld) fs.rmSync(old, { recursive: true, force: true });
}

function build() {
  for (const [target, dir] of [["nodejs", "node"], ["web", "web"]]) {
    const final = path.join(pkg, "wasm", dir);
    const out = path.join(pkg, "wasm", `.${dir}-tmp-${process.pid}`);
    fs.rmSync(out, { recursive: true, force: true });
    try {
      execFileSync(
        "wasm-pack",
        ["build", crate, "--release", "--target", target, "--out-dir", out, "--out-name", "sim_wasm", "--no-pack"],
        { stdio: "inherit" },
      );
      const wasm = path.join(out, "sim_wasm_bg.wasm");
      execFileSync(wasmOpt, ["-O3", ...features, wasm, "-o", wasm], { stdio: "inherit" });
      if (target === "nodejs") {
        // The nodejs target is CommonJS; without this marker Node would treat it as ESM because
        // this package declares "type": "module".
        fs.writeFileSync(path.join(out, "package.json"), '{ "type": "commonjs" }\n');
      }
      replaceDir(out, final);
    } finally {
      fs.rmSync(out, { recursive: true, force: true });
    }
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.argv.includes("--if-stale") && !wasmIsStale()) console.log("wasm is up to date");
  else build();
}
