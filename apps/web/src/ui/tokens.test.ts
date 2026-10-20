import fs from "node:fs";
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
const SURFACES = ["bg", "canvas", "surface", "surface-2", "surface-3"];

describe.each(Object.entries(THEMES))("%s theme tokens", (_name, t) => {
  const pair = (fg: string, bg: string, min: number) => {
    expect(t[fg], fg).toBeDefined();
    expect(t[bg], bg).toBeDefined();
    expect(contrast(t[fg]!, t[bg]!), `${fg} on ${bg}`).toBeGreaterThanOrEqual(min);
  };

  it("text is readable on every surface (4.5:1)", () => {
    for (const fg of ["text", "text-2", "text-3"]) for (const bg of SURFACES) pair(fg, bg, 4.5);
    pair("on-accent", "accent", 4.5);
    pair("accent", "surface", 4.5);
    for (const fg of ["ok", "busy", "over", "info"]) pair(fg, "surface", 4.5);
  });

  it("meaningful non-text colours stand out (3:1)", () => {
    const colours = ["down", "border-strong", "edge-http", "edge-db", "edge-cache", "edge-msg", "cat-general", "cat-compute", "cat-data"];
    for (const fg of colours) for (const bg of ["surface", "canvas"]) pair(fg, bg, 3);
    pair("busy", "busy-soft", 3);
    pair("over", "over-soft", 3);
    pair("down", "down-soft", 3);
    pair("focus", "bg", 3);
  });

  it("defines the same tokens in both themes", () => {
    expect(Object.keys(t).sort()).toEqual(Object.keys(THEMES.light).sort());
  });
});
