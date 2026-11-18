import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { isStale } from "./ensure-wasm.mjs";

function tmp(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "ensure-wasm-"));
}
function touch(file: string, secondsAgo: number): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, "x");
  const t = Date.now() / 1000 - secondsAgo;
  fs.utimesSync(file, t, t);
}

describe("ensure-wasm", () => {
  it("is stale when an output is missing", () => {
    const d = tmp();
    touch(path.join(d, "src/lib.rs"), 100);
    expect(isStale([path.join(d, "out/a.wasm")], [path.join(d, "src")])).toBe(true);
  });

  it("is stale when any source is newer than the oldest output", () => {
    const d = tmp();
    touch(path.join(d, "out/a.wasm"), 50);
    touch(path.join(d, "out/b.wasm"), 10);
    touch(path.join(d, "src/deep/lib.rs"), 20);
    expect(isStale([path.join(d, "out/a.wasm"), path.join(d, "out/b.wasm")], [path.join(d, "src")])).toBe(true);
  });

  it("is fresh when every output is newer than every source", () => {
    const d = tmp();
    touch(path.join(d, "out/a.wasm"), 5);
    touch(path.join(d, "src/lib.rs"), 100);
    touch(path.join(d, "Cargo.lock"), 100);
    expect(isStale([path.join(d, "out/a.wasm")], [path.join(d, "src"), path.join(d, "Cargo.lock")])).toBe(false);
  });
});
