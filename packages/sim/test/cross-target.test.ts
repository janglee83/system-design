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
      const wasm = sim.simulateJson(fs.readFileSync(file, "utf8"));
      expect(wasm.length).toBe(native.length);
      expect(wasm === native).toBe(true);
    });
  }
});
