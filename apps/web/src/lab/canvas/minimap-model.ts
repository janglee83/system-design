/** Above this many nodes the minimap shows itself, until the viewer chooses (owner override 2026-11-19). */
export const MINIMAP_AUTO_NODES = 20;
export const MINIMAP_KEY = "sd-minimap";

/** Whether the minimap shows: the viewer's toggle wins; otherwise only for large designs. */
export function minimapVisible(s: { nodes: number; manual: boolean | null }): boolean {
  return s.manual ?? s.nodes > MINIMAP_AUTO_NODES;
}

/** The viewer's saved choice in this browser, or null when they never toggled it. */
export function readMinimapChoice(): boolean | null {
  try {
    const v = window.localStorage.getItem(MINIMAP_KEY);
    return v === "on" ? true : v === "off" ? false : null;
  } catch {
    return null;
  }
}

export function saveMinimapChoice(on: boolean): void {
  try {
    window.localStorage.setItem(MINIMAP_KEY, on ? "on" : "off");
  } catch {
    // storage blocked: the choice holds for this page only
  }
}
