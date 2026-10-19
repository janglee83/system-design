import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { sim } from "../src/node";
import { goldenFiles, repoRoot } from "./helpers";

const cli = path.join(repoRoot, "target/release/sim-cli");

describe("native and wasm produce byte-identical results", () => {
  beforeAll(() => {
    execFileSync("cargo", ["build", "--release", "-p", "sim-cli"], { cwd: repoRoot, stdio: "inherit" });
  });

  for (const file of goldenFiles()) {
    it(path.basename(file), () => {
      const native = execFileSync(cli, ["result", file], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }).trimEnd();
      const text = fs.readFileSync(file, "utf8");
      const wasm = sim.simulateJson(text);
      expect(wasm.length).toBe(native.length);
      expect(wasm === native).toBe(true);
      // The object path (serde_wasm_bindgen input, live run handle) must agree byte for byte too.
      const run = sim.simulate(JSON.parse(text).input);
      try {
        const viaObject = run.resultJson();
        expect(viaObject.length).toBe(native.length);
        expect(viaObject === native).toBe(true);
      } finally {
        run.free();
      }
    });
  }
});
