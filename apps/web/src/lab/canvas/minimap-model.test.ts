// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { MINIMAP_AUTO_NODES, minimapVisible, readMinimapChoice, saveMinimapChoice } from "./minimap-model";

afterEach(() => window.localStorage.clear());

describe("minimap visibility (owner override 2026-11-19)", () => {
  it("is hidden by default and shows itself above 20 nodes", () => {
    expect(MINIMAP_AUTO_NODES).toBe(20);
    expect(minimapVisible({ nodes: 0, manual: null })).toBe(false);
    expect(minimapVisible({ nodes: 20, manual: null })).toBe(false);
    expect(minimapVisible({ nodes: 21, manual: null })).toBe(true);
  });

  it("follows the viewer's own choice once they toggle it, whatever the size", () => {
    expect(minimapVisible({ nodes: 30, manual: false })).toBe(false);
    expect(minimapVisible({ nodes: 2, manual: true })).toBe(true);
  });

  it("keeps the choice in this browser", () => {
    expect(readMinimapChoice()).toBeNull();
    saveMinimapChoice(false);
    expect(readMinimapChoice()).toBe(false);
    saveMinimapChoice(true);
    expect(readMinimapChoice()).toBe(true);
  });
});
