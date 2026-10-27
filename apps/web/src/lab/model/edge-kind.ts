import type { ComponentMeta, EdgeKind } from "@sd/sim";

/** R13 / spec §5.1: database targets get `db`, everything else `http`; null when the target accepts nothing. */
export function inferEdgeKind(target: ComponentMeta): EdgeKind | null {
  if (target.accepts.length === 0) return null;
  return target.role === "database" ? "db" : "http";
}
