import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const css = fs.readFileSync(new URL("./tokens.css", import.meta.url), "utf8");

function block(selector: string): Record<string, string> {
  const start = css.indexOf(`${selector} {`);
  if (start < 0) throw new Error(`no block ${selector}`);
  const body = css.slice(start, css.indexOf("}", start));
  const out: Record<string, string> = {};
  for (const m of body.matchAll(/--sd-([a-z0-9-]+):\s*(#[0-9a-fA-F]{6});/g)) out[m[1]!] = m[2]!;
  return out;
}

function luminance(hex: string): number {
  const n = Number.parseInt(hex.slice(1), 16);
  const [r, g, b] = [n >> 16, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

const THEMES = { light: block(":root"), dark: block('[data-theme="dark"]') };

describe.each(Object.entries(THEMES))("%s theme tokens (design-system §1.1)", (_name, t) => {
  const pair = (fg: string, bg: string, min: number) => {
    expect(t[fg], fg).toBeDefined();
    expect(t[bg], bg).toBeDefined();
    expect(contrast(t[fg]!, t[bg]!), `${fg} on ${bg}`).toBeGreaterThanOrEqual(min);
  };

  it("text pairs reach 4.5:1", () => {
    for (const fg of ["text", "text-2", "text-3"]) for (const bg of ["surface", "bg"]) pair(fg, bg, 4.5);
    pair("accent-text", "surface", 4.5);
    pair("on-accent", "accent", 4.5);
    for (const s of ["ok", "busy", "over", "down"]) pair(s, `${s}-soft`, 4.5);
    pair("canvas", "over", 4.5);
  });

  it("non-text pairs reach 3:1", () => {
    pair("border-strong", "surface", 3);
    for (const e of ["http", "db", "cache", "msg"]) pair(`edge-${e}`, "canvas", 3);
    pair("busy-line", "surface", 3);
  });

  it("has the seven category accents and no old ones", () => {
    for (const c of ["entry", "compute", "data", "cache", "msg", "storage", "external"]) expect(t[`cat-${c}`], c).toBeDefined();
    expect(t["cat-general"]).toBeUndefined();
  });

  it("defines the same tokens in both themes", () => {
    expect(Object.keys(t).sort()).toEqual(Object.keys(THEMES.light).sort());
  });
});

describe("tokens", () => {
  it("uses the 2A accent", () => {
    expect(THEMES.light.accent).toBe("#0B6870");
    expect(THEMES.dark.accent).toBe("#3FC3CB");
  });

  it("defines the radii and motion tokens (§1.3–1.4)", () => {
    for (const name of ["r-xs", "r-sm", "r-md", "r-lg", "r-xl", "ease-out", "ease-in", "t-fast", "t-panel", "t-overlay"]) {
      expect(css, name).toMatch(new RegExp(`--sd-${name}:`));
    }
  });

  it("sets every duration token to 0 under reduced motion", () => {
    const at = css.indexOf("@media (prefers-reduced-motion: reduce)");
    expect(at).toBeGreaterThan(0);
    const body = css.slice(at);
    for (const name of ["t-fast", "t-panel", "t-overlay", "t-fill", "t-breathe"]) expect(body, name).toMatch(new RegExp(`--sd-${name}:\\s*0m?s;`));
  });
});

describe("components", () => {
  it("use tokens, never raw hex colours", () => {
    const root = fileURLToPath(new URL("../..", import.meta.url));
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) walk(p);
        else if (p.endsWith(".tsx") && /#[0-9a-fA-F]{3,8}\b/.test(fs.readFileSync(p, "utf8").replace(/^\s*\/\/.*$/gm, ""))) offenders.push(path.relative(root, p));
      }
    };
    walk(path.join(root, "src"));
    walk(path.join(root, "app"));
    expect(offenders).toEqual([]);
  });
});
