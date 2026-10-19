import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { repoRoot } from "./helpers";

// Runtime code must never reach the reference site. Tools and fixtures are excluded on purpose.
const RUNTIME_DIRS = ["crates", "packages", "apps"];
const SKIP = new Set(["node_modules", "wasm", "target", "generated", "snapshots"]);
const BINARY = /\.(png|jpe?g|gif|webp|avif|ico|bmp|wasm|woff2?|ttf|otf|eot|pdf|zip|gz|tgz|tar|br|mp3|mp4|webm|ogg|wav|bin|so|dylib|dll|exe|rlib|a|o)$/i;
// Any URL to the site, or its bare domain (e.g. in a fetch target built from parts).
const FORBIDDEN = [/https?:\/\/[^\s"'`]*syscraft/i, /syscraft\./i];

/** Every non-binary file under dir. Symlinks to files are followed; dangling or directory
 *  symlinks are skipped so the scan neither throws nor loops. */
function* files(dir: string): Generator<string> {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isSymbolicLink()) {
      let target: fs.Stats;
      try {
        target = fs.statSync(full);
      } catch {
        continue;
      }
      if (target.isFile() && !BINARY.test(entry.name)) yield full;
    } else if (entry.isDirectory()) {
      yield* files(full);
    } else if (entry.isFile() && !BINARY.test(entry.name)) {
      yield full;
    }
  }
}

const mentionsSite = (text: string) => FORBIDDEN.some((re) => re.test(text));

describe("no runtime calls to the reference site", () => {
  it("has no reference-site URLs or domain in crates/, packages/ or apps/", () => {
    const offenders: string[] = [];
    for (const d of RUNTIME_DIRS) {
      const root = path.join(repoRoot, d);
      if (!fs.existsSync(root)) continue;
      const scanned = [...files(root)];
      // An empty scan would pass vacuously (wrong root, over-eager skip list).
      expect(scanned.length, `${d}/ scanned no files`).toBeGreaterThan(0);
      offenders.push(...scanned.filter((f) => mentionsSite(fs.readFileSync(f, "utf8"))));
    }
    expect(offenders).toEqual([]);
  });

  it("matches URLs and the bare domain, not unrelated words", () => {
    const host = ["syscraft", "example"].join(".");
    expect(mentionsSite(`fetch("https://${host}/api")`)).toBe(true);
    expect(mentionsSite(`const base = "${host}";`)).toBe(true);
    expect(mentionsSite("a system design lab")).toBe(false);
  });

  it("skips dangling symlinks and binary files without throwing", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "no-external-"));
    fs.writeFileSync(path.join(dir, "code.rs"), "fn main() {}");
    fs.writeFileSync(path.join(dir, "logo.png"), Buffer.from([0x89, 0x50]));
    fs.symlinkSync(path.join(dir, "missing.ts"), path.join(dir, "dangling.ts"));
    fs.symlinkSync(path.join(dir, "code.rs"), path.join(dir, "alias.rs"));
    expect([...files(dir)].map((f) => path.basename(f)).sort()).toEqual(["alias.rs", "code.rs"]);
  });
});
