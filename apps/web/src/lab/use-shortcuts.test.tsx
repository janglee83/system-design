// @vitest-environment jsdom
import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useLabShortcuts } from "./use-shortcuts";

function dom() {
  document.body.innerHTML = `
    <aside><button id="palette-btn">Add</button><input id="search" /></aside>
    <div data-testid="lab-canvas"><div class="react-flow__pane" tabindex="0" id="pane"></div>
      <div class="react-flow__node" data-id="n1" tabindex="0" id="node"></div></div>
    <div role="dialog" data-state="closed" id="closed-dialog"></div>`;
}
const press = (target: Element, init: KeyboardEventInit) => {
  const e = new KeyboardEvent("keydown", { bubbles: true, cancelable: true, ...init });
  target.dispatchEvent(e);
  return e;
};
const $ = (id: string) => document.getElementById(id)!;

afterEach(() => {
  document.body.innerHTML = "";
});

describe("useLabShortcuts", () => {
  it("fires edit shortcuts only with focus on the canvas or the page itself", () => {
    dom();
    const del = vi.fn();
    renderHook(() => useLabShortcuts({ delete: del }));
    press(document.body, { key: "Delete" });
    press($("pane"), { key: "Delete" });
    press($("node"), { key: "Backspace" });
    expect(del).toHaveBeenCalledTimes(3);
    const e = press($("palette-btn"), { key: "Delete" });
    expect(del).toHaveBeenCalledTimes(3);
    expect(e.defaultPrevented).toBe(false);
  });

  it("never fires while typing, but the palette shortcut always does", () => {
    dom();
    const del = vi.fn();
    const palette = vi.fn();
    renderHook(() => useLabShortcuts({ delete: del, palette }));
    press($("search"), { key: "Backspace" });
    press($("search"), { key: "k", ctrlKey: true });
    expect(del).not.toHaveBeenCalled();
    expect(palette).toHaveBeenCalledOnce();
  });

  it("skips Escape while typing, in an open dialog, or when already handled", () => {
    dom();
    const escape = vi.fn();
    renderHook(() => useLabShortcuts({ escape }));
    press($("search"), { key: "Escape" });
    const handled = new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true });
    handled.preventDefault();
    document.body.dispatchEvent(handled);
    expect(escape).not.toHaveBeenCalled();
    $("closed-dialog").setAttribute("data-state", "open");
    press(document.body, { key: "Escape" });
    expect(escape).not.toHaveBeenCalled();
    $("closed-dialog").setAttribute("data-state", "closed");
    press(document.body, { key: "Escape" });
    expect(escape).toHaveBeenCalledOnce();
  });

  it("ignores keys that are part of an IME composition", () => {
    dom();
    const connect = vi.fn();
    renderHook(() => useLabShortcuts({ connect }));
    press(document.body, { key: "c", isComposing: true });
    expect(connect).not.toHaveBeenCalled();
    press(document.body, { key: "c" });
    expect(connect).toHaveBeenCalledOnce();
  });

  it("uses the latest handlers without re-subscribing", () => {
    dom();
    const a = vi.fn();
    const b = vi.fn();
    const { rerender } = renderHook(({ h }) => useLabShortcuts({ undo: h }), { initialProps: { h: a } });
    rerender({ h: b });
    press(document.body, { key: "z", ctrlKey: true });
    expect(a).not.toHaveBeenCalled();
    expect(b).toHaveBeenCalledOnce();
  });

  it("runs once per press (no key repeat), while typing too, but not behind an open dialog", () => {
    dom();
    const run = vi.fn();
    renderHook(() => useLabShortcuts({ run }));
    press(document.body, { key: "Enter", ctrlKey: true, repeat: true });
    expect(run).not.toHaveBeenCalled();
    press($("search"), { key: "Enter", ctrlKey: true });
    expect(run).toHaveBeenCalledOnce();
    $("closed-dialog").setAttribute("data-state", "open");
    press(document.body, { key: "Enter", ctrlKey: true });
    expect(run).toHaveBeenCalledOnce();
  });
});
