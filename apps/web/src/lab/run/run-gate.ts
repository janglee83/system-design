/** Why Run is unavailable, in the order the person should fix it (design-system §2.2). */
export type RunBlock = { key: "engine" } | { key: "needsNodes" } | { key: "problems"; count: number } | { key: "checking" };

export function runBlockReason(s: {
  engine: "idle" | "loading" | "ready" | "error";
  /** The kinds of the design's nodes. */
  kinds: readonly string[];
  /** Blocking problems from the latest check. */
  blocking: number;
  /** The latest check is for the current design. */
  checked: boolean;
}): RunBlock | null {
  if (s.engine !== "ready") return { key: "engine" };
  const hasClient = s.kinds.includes("client");
  const hasServer = s.kinds.some((k) => k !== "client");
  if (!hasClient || !hasServer) return { key: "needsNodes" };
  if (s.blocking > 0) return { key: "problems", count: s.blocking };
  if (!s.checked) return { key: "checking" };
  return null;
}
