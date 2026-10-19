import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { sim } from "../src/node";
import { goldenFiles } from "./helpers";

describe("golden fixtures through wasm", () => {
  for (const file of goldenFiles()) {
    it(path.basename(file), () => {
      const report = sim.checkFixture(fs.readFileSync(file, "utf8"));
      expect(report.failures).toEqual([]);
      expect(report.validation).toEqual([]);
      expect(report.passed).toBe(true);
    });
  }
});
