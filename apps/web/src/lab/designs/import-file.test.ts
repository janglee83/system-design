import { describe, expect, it } from "vitest";
import { emptyDesign } from "../model/design";
import { exportDesign } from "../model/design-file";
import { MAX_IMPORT_BYTES, readDesignFile } from "./import-file";

const file = (text: string, size?: number) => ({ size: size ?? text.length, text: () => Promise.resolve(text) });

describe("reading a design file", () => {
  it("parses a file the lab exported", async () => {
    const d = emptyDesign("Shop");
    const r = await readDesignFile(file(exportDesign(d, "0.1.0").text));
    expect(r).toEqual({ ok: true, design: d });
  });

  it("refuses a file over 2 MB without reading it", async () => {
    let read = false;
    const big = { size: MAX_IMPORT_BYTES + 1, text: () => ((read = true), Promise.resolve("{}")) };
    expect(await readDesignFile(big)).toEqual({ ok: false, issues: [{ path: "", code: "too_big" }] });
    expect(read).toBe(false);
    expect(MAX_IMPORT_BYTES).toBe(2 * 1024 * 1024);
  });

  it("reports a file it cannot read as invalid JSON", async () => {
    const broken = { size: 10, text: () => Promise.reject(new Error("io")) };
    expect(await readDesignFile(broken)).toEqual({ ok: false, issues: [{ path: "", code: "invalid_json" }] });
  });
});
