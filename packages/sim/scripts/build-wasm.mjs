// Builds crates/sim-wasm for Node (CommonJS) and the web (ES module + init), then runs a
// pinned wasm-opt. Output goes to packages/sim/wasm/{node,web} (gitignored).
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

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

for (const [target, dir] of [["nodejs", "node"], ["web", "web"]]) {
  const out = path.join(pkg, "wasm", dir);
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
}
