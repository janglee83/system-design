export const SHORTCUTS = [
  { id: "run", keys: ["Mod+Enter"], group: "run" },
  { id: "playPause", keys: ["Space"], group: "run" },
  { id: "prevHop", keys: ["["], group: "run" },
  { id: "nextHop", keys: ["]"], group: "run" },
  { id: "undo", keys: ["Mod+Z"], group: "edit" },
  { id: "redo", keys: ["Mod+Shift+Z", "Mod+Y"], group: "edit" },
  { id: "delete", keys: ["Delete", "Backspace"], group: "edit" },
  { id: "duplicate", keys: ["Mod+D"], group: "edit" },
  { id: "copy", keys: ["Mod+C"], group: "edit" },
  { id: "paste", keys: ["Mod+V"], group: "edit" },
  { id: "selectAll", keys: ["Mod+A"], group: "edit" },
  { id: "connect", keys: ["C"], group: "edit" },
  { id: "inspect", keys: ["Enter"], group: "edit" },
  { id: "group", keys: ["Mod+G"], group: "edit" },
  { id: "ungroup", keys: ["Mod+Shift+G"], group: "edit" },
  { id: "layout", keys: ["Shift+L"], group: "view" },
  { id: "fitView", keys: ["Shift+1"], group: "view" },
  { id: "zoomIn", keys: ["=", "+"], group: "view" },
  { id: "zoomOut", keys: ["-"], group: "view" },
  { id: "toggleSnap", keys: ["Shift+G"], group: "view" },
  { id: "palette", keys: ["Mod+K"], group: "general" },
  { id: "shortcuts", keys: ["Shift+/"], group: "general" },
  { id: "escape", keys: ["Escape"], group: "general" },
] as const;

export type ShortcutId = (typeof SHORTCUTS)[number]["id"];

export const isMacPlatform = (): boolean =>
  typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

const NAMED: Record<string, string> = { Space: " ", Enter: "Enter", Escape: "Escape", Delete: "Delete", Backspace: "Backspace" };

const splitCombo = (combo: string): string[] => (combo === "+" ? ["+"] : combo.split("+"));

export function matches(e: KeyboardEvent, combo: string, isMac: boolean): boolean {
  const parts = splitCombo(combo);
  const keyPart = parts[parts.length - 1]!;
  const mods = new Set(parts.slice(0, -1));
  const mod = isMac ? e.metaKey : e.ctrlKey;
  const other = isMac ? e.ctrlKey : e.metaKey;
  if (mod !== mods.has("Mod") || other || e.altKey !== mods.has("Alt")) return false;
  const wantShift = mods.has("Shift");
  // Symbol keys ("+", "?", "[") need Shift on some layouts, so Shift is only checked for them
  // when the combo names it. Letters, digits and named keys must match Shift exactly.
  const symbol = keyPart.length === 1 && !/[a-z0-9]/i.test(keyPart);
  if (symbol ? wantShift && !e.shiftKey : e.shiftKey !== wantShift) return false;
  if (NAMED[keyPart]) return e.key === NAMED[keyPart];
  if (/^\d$/.test(keyPart)) return e.code === `Digit${keyPart}`;
  if (keyPart === "/" && wantShift) return e.key === "?" || e.code === "Slash";
  return e.key.toLowerCase() === keyPart.toLowerCase();
}

const MAC: Record<string, string> = { Mod: "⌘", Shift: "⇧", Alt: "⌥", Enter: "↵", Escape: "Esc", Backspace: "⌫", Delete: "⌦", Space: "Space" };

export function formatCombo(combo: string, isMac: boolean): string {
  const parts = splitCombo(combo);
  if (isMac) return parts.map((p) => MAC[p] ?? p.toUpperCase()).join("");
  return parts.map((p) => (p === "Mod" ? "Ctrl" : p)).join("+");
}
