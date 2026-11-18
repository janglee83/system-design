export type SaveLine = { key: "saved"; at: number } | { key: "unsaved" } | { key: "never" } | { key: "ran"; run: number; at: number };

/** The line under the design name: the latest of "saved in this browser" and "run #N done". */
export function saveLine(s: { savedAt: number | null; dirty: boolean; lastRun: { id: number; at: number } | null }): SaveLine {
  if (s.lastRun && (s.savedAt === null || s.lastRun.at > s.savedAt)) return { key: "ran", run: s.lastRun.id, at: s.lastRun.at };
  if (s.dirty) return { key: "unsaved" };
  if (s.savedAt === null) return { key: "never" };
  return { key: "saved", at: s.savedAt };
}
