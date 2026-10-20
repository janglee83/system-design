// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { formatCombo, matches, SHORTCUTS } from "./shortcuts";

const key = (k: string, mods: Partial<KeyboardEventInit> = {}) => new KeyboardEvent("keydown", { key: k, ...mods });

describe("shortcuts", () => {
  it("has unique ids and no combo bound twice", () => {
    const ids = SHORTCUTS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    const combos = SHORTCUTS.flatMap((s) => s.keys);
    expect(new Set(combos).size).toBe(combos.length);
  });

  it("maps Mod to Meta on macOS and Control elsewhere", () => {
    expect(matches(key("z", { metaKey: true }), "Mod+Z", true)).toBe(true);
    expect(matches(key("z", { ctrlKey: true }), "Mod+Z", true)).toBe(false);
    expect(matches(key("z", { ctrlKey: true }), "Mod+Z", false)).toBe(true);
    expect(matches(key("Z", { ctrlKey: true, shiftKey: true }), "Mod+Shift+Z", false)).toBe(true);
    expect(matches(key("z", { ctrlKey: true, shiftKey: true }), "Mod+Z", false)).toBe(false);
  });

  it("matches plain keys only without modifiers", () => {
    expect(matches(key("c"), "C", false)).toBe(true);
    expect(matches(key("c", { ctrlKey: true }), "C", false)).toBe(false);
    expect(matches(key("?", { shiftKey: true }), "Shift+/", false)).toBe(true);
    expect(matches(key("!", { shiftKey: true, code: "Digit1" }), "Shift+1", false)).toBe(true);
  });

  it("formats combos for each platform", () => {
    expect(formatCombo("Mod+Shift+Z", true)).toBe("⌘⇧Z");
    expect(formatCombo("Mod+Enter", false)).toBe("Ctrl+Enter");
    expect(formatCombo("Mod+Enter", true)).toBe("⌘↵");
  });
});
