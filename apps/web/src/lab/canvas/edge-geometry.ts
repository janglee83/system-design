import type { ComponentMeta, EdgeKind } from "@sd/sim";
import { EDGE_KINDS } from "@/i18n/engine-codes";
import type { Design, LabEdge } from "../model/design";
import { connect, type ConnectRefusal } from "../model/ops";

/** A cubic Bézier from an out-port to an in-port, control points max(40, dx/2) out (design-system §6.1). */
export function bezierPath(sx: number, sy: number, tx: number, ty: number): string {
  const c = Math.max(40, Math.abs(tx - sx) / 2);
  const r = (v: number) => Math.round(v * 100) / 100;
  return `M${r(sx)},${r(sy)} C${r(sx + c)},${r(sy)} ${r(tx - c)},${r(ty)} ${r(tx)},${r(ty)}`;
}

/** The point halfway along that curve (where a rate pill sits). */
export function bezierMidpoint(sx: number, sy: number, tx: number, ty: number): { x: number; y: number } {
  const c = Math.max(40, Math.abs(tx - sx) / 2);
  // B(0.5) = (P0 + 3 P1 + 3 P2 + P3) / 8
  return { x: (sx + 3 * (sx + c) + 3 * (tx - c) + tx) / 8, y: (sy + 3 * sy + 3 * ty + ty) / 8 };
}

export type ConnectTarget = { valid: true; kind: EdgeKind } | { valid: false; reason: ConnectRefusal };

/** Whether dropping a connection from `from` on `to` would connect, and as which kind (§6.2). */
export function connectTarget(d: Design, from: string, to: string, metas: ReadonlyMap<string, ComponentMeta>): ConnectTarget {
  const r = connect(d, from, to, metas);
  if ("refused" in r) return { valid: false, reason: r.refused };
  const kind = r.design.edges.find((e) => e.id === r.edgeId)!.kind;
  return { valid: true, kind };
}

/** Edges per kind, every kind present (the legend popover, §6.3). */
export function legendCounts(edges: readonly Pick<LabEdge, "kind">[]): Record<EdgeKind, number> {
  const out = Object.fromEntries(EDGE_KINDS.map((k) => [k, 0])) as Record<EdgeKind, number>;
  for (const e of edges) out[e.kind] += 1;
  return out;
}
