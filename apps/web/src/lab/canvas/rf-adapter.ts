import type { ComponentMeta, EdgeKind } from "@sd/sim";
import type { Edge as FlowEdge, Node as FlowNode } from "@xyflow/react";
import { NODE_SIZE, type Design, type LabEdge, type LabGroup, type LabNode, type XY } from "../model/design";
import type { Selection } from "../store/design-store";

export type NodeState = "normal" | "busy" | "overloaded" | "down";

export interface LabNodeData extends Record<string, unknown> {
  node: LabNode;
  meta: ComponentMeta | null;
  locked: boolean;
  cost: number | null | undefined;
  issues: { blocking: number; warnings: number };
  state?: NodeState;
  /** Trace highlight (Task 28): true = on the path, false = dimmed, undefined = no trace. */
  onPath?: boolean;
  disallowed?: boolean;
}
export interface LabEdgeData extends Record<string, unknown> {
  kind: EdgeKind;
  issues: number;
  onPath?: boolean;
}
export interface GroupData extends Record<string, unknown> {
  group: LabGroup;
}

export interface AdapterContext {
  metas: ReadonlyMap<string, ComponentMeta>;
  selection: Selection;
  costs: Readonly<Record<string, number | null>>;
  issues: { nodes: Readonly<Record<string, { blocking: number; warnings: number }>>; edges: Readonly<Record<string, number>> };
  /** Absolute positions of nodes being dragged (not yet committed). */
  drag: Readonly<Record<string, XY>>;
  states?: Readonly<Record<string, NodeState>>;
  path?: { nodes: ReadonlySet<string>; edges: ReadonlySet<string> } | null;
  allowedKinds?: readonly string[] | null;
  /** Translated aria-roledescription for node cards ("component"). */
  nodeRole?: string;
  /** Translated accessible names, built from display labels (never raw ids). */
  aria?: { node(n: LabNode, meta: ComponentMeta | null): string; group(g: LabGroup): string; edge(e: LabEdge): string };
}

const NO_ISSUES = { blocking: 0, warnings: 0 };

export function toFlowNodes(d: Design, ctx: AdapterContext): FlowNode[] {
  const groupPos = new Map(d.groups.map((g) => [g.id, g.position]));
  const sel = new Set(ctx.selection.nodes);
  const selGroups = new Set(ctx.selection.groups);
  const groups: FlowNode<GroupData>[] = d.groups.map((g) => ({
    id: g.id,
    type: "group",
    position: ctx.drag[g.id] ?? g.position,
    data: { group: g },
    style: { width: g.size.width, height: g.size.height },
    measured: { width: g.size.width, height: g.size.height },
    selected: selGroups.has(g.id),
    zIndex: -1,
    ariaLabel: ctx.aria?.group(g),
  }));
  const nodes: FlowNode<LabNodeData>[] = d.nodes.map((n) => {
    const abs = ctx.drag[n.id] ?? n.position;
    const parent = n.groupId ? groupPos.get(n.groupId) : undefined;
    const locked = d.locked.includes(n.id);
    return {
      id: n.id,
      type: "lab",
      position: parent ? { x: abs.x - parent.x, y: abs.y - parent.y } : abs,
      parentId: parent ? (n.groupId as string) : undefined,
      selected: sel.has(n.id),
      deletable: !locked,
      ariaLabel: ctx.aria?.node(n, ctx.metas.get(n.kind) ?? null),
      // Node cards have a fixed size (R14); telling React Flow keeps it from hiding them to re-measure.
      measured: { width: NODE_SIZE.width, height: NODE_SIZE.height },
      domAttributes: ctx.nodeRole ? { "aria-roledescription": ctx.nodeRole } : undefined,
      data: {
        node: n,
        meta: ctx.metas.get(n.kind) ?? null,
        locked,
        cost: ctx.costs[n.id],
        issues: ctx.issues.nodes[n.id] ?? NO_ISSUES,
        state: ctx.states?.[n.id],
        onPath: ctx.path ? ctx.path.nodes.has(n.id) : undefined,
        disallowed: ctx.allowedKinds ? !ctx.allowedKinds.includes(n.kind) : false,
      },
    };
  });
  return [...groups, ...nodes];
}

export function toFlowEdges(d: Design, ctx: AdapterContext): FlowEdge<LabEdgeData>[] {
  const sel = new Set(ctx.selection.edges);
  return d.edges.map((e) => ({
    id: e.id,
    source: e.from,
    target: e.to,
    sourceHandle: "out",
    targetHandle: "in",
    type: "lab",
    selected: sel.has(e.id),
    ariaLabel: ctx.aria?.edge(e),
    data: { kind: e.kind, issues: ctx.issues.edges[e.id] ?? 0, onPath: ctx.path ? ctx.path.edges.has(e.id) : undefined },
  }));
}

/** A React Flow position (relative for group members) as an absolute canvas position. */
export function toAbsolute(id: string, pos: XY, d: Design): XY {
  const n = d.nodes.find((x) => x.id === id);
  const g = n?.groupId ? d.groups.find((x) => x.id === n.groupId) : undefined;
  return g ? { x: g.position.x + pos.x, y: g.position.y + pos.y } : { x: pos.x, y: pos.y };
}

const sameXY = (a: { x: number; y: number } | undefined, b: { x: number; y: number } | undefined) => a?.x === b?.x && a?.y === b?.y;

function sameData(a: Record<string, unknown>, b: Record<string, unknown>): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of keys) {
    const x = a[k];
    const y = b[k];
    if (k === "issues" && typeof x === "object" && typeof y === "object" && x && y) {
      const i = x as { blocking?: number; warnings?: number };
      const j = y as { blocking?: number; warnings?: number };
      if (i.blocking !== j.blocking || i.warnings !== j.warnings) return false;
    } else if (!Object.is(x, y)) return false;
  }
  return true;
}

function sameNode(a: FlowNode, b: FlowNode): boolean {
  return (
    a.type === b.type &&
    a.parentId === b.parentId &&
    a.selected === b.selected &&
    a.deletable === b.deletable &&
    a.zIndex === b.zIndex &&
    a.ariaLabel === b.ariaLabel &&
    sameXY(a.position, b.position) &&
    a.measured?.width === b.measured?.width &&
    a.measured?.height === b.measured?.height &&
    a.style?.width === b.style?.width &&
    a.style?.height === b.style?.height &&
    a.domAttributes?.["aria-roledescription"] === b.domAttributes?.["aria-roledescription"] &&
    sameData(a.data, b.data)
  );
}

/**
 * Hands back the previous object for every node whose inputs did not change, so React Flow and
 * the memoized node components skip it (a drag re-renders only the dragged node).
 */
export function reuseFlowNodes(next: FlowNode[], prev: readonly FlowNode[]): FlowNode[] {
  const before = new Map(prev.map((n) => [n.id, n]));
  return next.map((n) => {
    const p = before.get(n.id);
    return p && sameNode(p, n) ? p : n;
  });
}

export function reuseFlowEdges(next: FlowEdge<LabEdgeData>[], prev: readonly FlowEdge<LabEdgeData>[]): FlowEdge<LabEdgeData>[] {
  const before = new Map(prev.map((e) => [e.id, e]));
  return next.map((e) => {
    const p = before.get(e.id);
    const same =
      p &&
      p.source === e.source &&
      p.target === e.target &&
      p.type === e.type &&
      p.selected === e.selected &&
      p.ariaLabel === e.ariaLabel &&
      p.data?.kind === e.data?.kind &&
      p.data?.issues === e.data?.issues &&
      p.data?.onPath === e.data?.onPath;
    return same ? p : e;
  });
}
