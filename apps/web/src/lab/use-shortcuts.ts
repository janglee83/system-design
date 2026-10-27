"use client";
import { useEffect, useRef, useSyncExternalStore } from "react";
import { isMacPlatform, matches, SHORTCUTS, type ShortcutId } from "./shortcuts";

const TYPING = "input, textarea, select, [contenteditable=''], [contenteditable='true'], [role='combobox'], [role='spinbutton']";
/** Fire even while typing or in a dialog. */
// Save and Open also replace the browser's own Mod+S / Mod+O, so they work while typing too.
const ALWAYS: ReadonlySet<ShortcutId> = new Set(["run", "palette", "save", "open"]);
/** Edit and view shortcuts act on the canvas, so they need focus on the canvas or on the page itself. */
const CANVAS_GROUPS: ReadonlySet<string> = new Set(["edit", "view"]);
const CANVAS = "[data-testid='lab-canvas']";

export function useLabShortcuts(handlers: Partial<Record<ShortcutId, () => void>>): void {
  const ref = useRef(handlers);
  useEffect(() => {
    ref.current = handlers;
  });
  useEffect(() => {
    const mac = isMacPlatform();
    const onKey = (e: KeyboardEvent) => {
      if (e.isComposing) return; // an IME is building a character
      const target = e.target instanceof Element ? e.target : null;
      const typing = !!target?.closest(TYPING);
      const inDialog = !!document.querySelector("[role='dialog'][data-state='open']");
      const onCanvas = !target || target === document.body || target === document.documentElement || !!target.closest(CANVAS);
      for (const s of SHORTCUTS) {
        const h = ref.current[s.id];
        if (!h || !s.keys.some((k) => matches(e, k, mac))) continue;
        if (s.id === "run" && (e.repeat || inDialog)) return; // one run per press, never behind a modal
        if (ALWAYS.has(s.id)) {
          // fall through: always handled
        } else if (typing || inDialog) {
          return;
        } else if (s.id === "escape") {
          if (e.defaultPrevented) return; // a menu or popover already closed itself
        } else if (CANVAS_GROUPS.has(s.group) && !onCanvas) {
          return;
        }
        // Enter inspects only a focused canvas node; anywhere else it must keep activating buttons.
        if (s.id === "inspect" && !target?.closest(".react-flow__node")) return;
        // Mod+C with text selected on the page is an ordinary text copy, not a component copy.
        if (s.id === "copy" && window.getSelection()?.isCollapsed === false) return;
        e.preventDefault();
        h();
        return;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}

const noSubscribe = () => () => {};
/** True on macOS. False during server rendering and hydration, so markup always matches. */
export function useIsMac(): boolean {
  return useSyncExternalStore(noSubscribe, isMacPlatform, () => false);
}
