import { describe, expect, it } from "vitest";
import { runExportFile } from "./export";

describe("run export", () => {
  it("wraps the engine's result with the input and engine version", () => {
    const text = runExportFile({ engineVersion: "0.1.0", input: { seed: 1 } as never, resultJson: '{"metrics":{"p95":4}}' });
    const doc = JSON.parse(text);
    expect(doc).toEqual({ kind: "sd-lab-run", formatVersion: 1, engineVersion: "0.1.0", input: { seed: 1 }, result: { metrics: { p95: 4 } } });
    expect(text.endsWith("\n")).toBe(true);
  });
});
