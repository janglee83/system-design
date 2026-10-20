"use client";
import { useEffect, useRef, useSyncExternalStore } from "react";
import { isMacPlatform, matches, SHORTCUTS, type ShortcutId } from "./shortcuts";

const TYPING = "input, textarea, select, [contenteditable=''], [contenteditable='true'], [role='combobox'], [role='spinbutton']";
const ALWAYS: ReadonlySet<ShortcutId> = new Set(["escape", "run", "palette"]);

export function useLabShortcuts(handlers: Partial<Record<ShortcutId, () => void>>): void {
  const ref = useRef(handlers);
  ref.current = handlers;
  useEffect(() => {
    const mac = isMacPlatform();
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as Element | null;
      const typing = !!target?.closest?.(TYPING);
      const inDialog = !!document.querySelector("[role='dialog'][data-state='open']");
      for (const s of SHORTCUTS) {
        const h = ref.current[s.id];
        if (!h || !s.keys.some((k) => matches(e, k, mac))) continue;
        // Enter inspects only a focused canvas node; anywhere else it must keep activating buttons.
        if (s.id === "inspect" && !target?.closest?.(".react-flow__node")) return;
        // Mod+C with text selected on the page is an ordinary text copy, not a component copy.
        if (s.id === "copy" && window.getSelection()?.isCollapsed === false) return;
        if ((typing || inDialog) && !ALWAYS.has(s.id)) return;
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
