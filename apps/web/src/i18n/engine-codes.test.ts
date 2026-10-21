import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { repoRoot } from "../test/paths";
import { EVENT_CODES, TIMELINE_FIELDS, VALIDATION_CODES } from "./engine-codes";

/** Non-test Rust source under crates/sim-core/src (everything before #[cfg(test)]). */
function engineSource(): string {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith(".rs")) out.push(fs.readFileSync(p, "utf8").split("#[cfg(test)]")[0]!);
    }
  };
  walk(path.join(repoRoot, "crates/sim-core/src"));
  return out.join("\n");
}

const sorted = (s: Iterable<string>) => [...new Set(s)].sort();

describe("engine code registry", () => {
  const src = engineSource();

  it("lists exactly the event codes the engine emits", () => {
    const found = [
      ...[...src.matchAll(/event\([^;]*?"([a-z]+\.[a-z0-9-]+)"/g)].map((m) => m[1]!),
      ...[...src.matchAll(/code:\s*"([a-z]+\.[a-z0-9-]+)"/g)].map((m) => m[1]!),
    ];
    expect(found.length).toBeGreaterThan(0);
    expect(sorted(EVENT_CODES)).toEqual(sorted(found));
  });

  it("lists exactly the validation codes in sim-core's codes module", () => {
    const mod = src.slice(src.indexOf("pub mod codes {"));
    const body = mod.slice(0, mod.indexOf("}"));
    const found = [...body.matchAll(/pub const [A-Z_]+: &str = "([^"]+)";/g)].map((m) => m[1]!);
    expect(found.length).toBeGreaterThan(0);
    expect(sorted(VALIDATION_CODES)).toEqual(sorted(found));
  });

  it("lists sim-core's timeline fields, in order", () => {
    const decl = src.match(/pub const TIMELINE_FIELDS: \[&str; \d+\] = \[([^\]]*)\];/);
    expect(decl).not.toBeNull();
    const found = [...decl![1]!.matchAll(/"([^"]+)"/g)].map((m) => m[1]);
    expect([...TIMELINE_FIELDS]).toEqual(found);
  });
});
