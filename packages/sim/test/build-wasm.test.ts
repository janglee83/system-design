import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { replaceDir } from "../scripts/build-wasm.mjs";
import { isStale, OUTPUTS, SOURCES } from "../scripts/freshness.mjs";

const pkg = JSON.parse(fs.readFileSync(new URL("../package.json", import.meta.url), "utf8")) as { scripts: Record<string, string> };

describe("wasm build script", () => {
  it("pretest builds only when the wasm is missing or stale", () => {
    expect(pkg.scripts.pretest).toBe("node scripts/build-wasm.mjs --if-stale");
    expect(pkg.scripts["build:wasm"]).toBe("node scripts/build-wasm.mjs");
  });

  it("checks both targets against the engine sources", () => {
    expect(OUTPUTS).toEqual(["packages/sim/wasm/web/sim_wasm_bg.wasm", "packages/sim/wasm/node/sim_wasm_bg.wasm"]);
    expect(SOURCES).toContain("crates/sim-core/src");
    expect(SOURCES).toContain("Cargo.lock");
    expect(typeof isStale).toBe("function");
  });

  it("swaps a finished build into place, so readers never see a half-written directory", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "replace-dir-"));
    const final = path.join(root, "web");
    const tmp = path.join(root, ".web-tmp");
    fs.mkdirSync(final);
    fs.writeFileSync(path.join(final, "old.wasm"), "old");
    fs.mkdirSync(tmp);
    fs.writeFileSync(path.join(tmp, "new.wasm"), "new");
    replaceDir(tmp, final);
    expect(fs.readdirSync(final)).toEqual(["new.wasm"]);
    expect(fs.existsSync(tmp)).toBe(false);
    expect(fs.readdirSync(root)).toEqual(["web"]);
  });

  it("swaps into place when there was no previous build", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "replace-dir-"));
    const tmp = path.join(root, ".node-tmp");
    fs.mkdirSync(tmp);
    fs.writeFileSync(path.join(tmp, "a"), "a");
    replaceDir(tmp, path.join(root, "node"));
    expect(fs.readdirSync(path.join(root, "node"))).toEqual(["a"]);
  });
});
