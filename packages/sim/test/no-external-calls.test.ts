import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { repoRoot } from "./helpers";

// Runtime code must never reach the reference site. Tools and fixtures are excluded on purpose.
const RUNTIME_DIRS = ["crates", "packages", "apps"];
const SKIP = new Set(["node_modules", "wasm", "target", "generated", "snapshots"]);
const FORBIDDEN = /https?:\/\/[^\s"'`]*syscraft/i;

function* files(dir: string): Generator<string> {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* files(full);
    else if (/\.(rs|ts|tsx|js|mjs|json|toml)$/.test(entry.name)) yield full;
  }
}

describe("no runtime calls to the reference site", () => {
  it("has no reference-site URLs in crates/, packages/ or apps/", () => {
    const offenders = RUNTIME_DIRS.flatMap((d) => [...files(path.join(repoRoot, d))]).filter((f) =>
      FORBIDDEN.test(fs.readFileSync(f, "utf8")),
    );
    expect(offenders).toEqual([]);
  });
});
