import type { ComponentMeta, EdgeKind } from "@sd/sim";
import type { Edge as FlowEdge, Node as FlowNode } from "@xyflow/react";
import type { Design, LabGroup, LabNode, XY } from "../model/design";
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
}

const NO_ISSUES = { blocking: 0, warnings: 0 };

export function toFlowNodes(d: Design, ctx: AdapterContext): FlowNode[] {
  const groupPos = new Map(d.groups.map((g) => [g.id, g.position]));
  const sel = new Set(ctx.selection.nodes);
  const selGroups = new Set(ctx.selection.groups);
  const groups: FlowNode<GroupData>[] = d.groups.map((g) => ({
    id: g.id,
    type: "group",
    position: g.position,
    data: { group: g },
    style: { width: g.size.width, height: g.size.height },
    selected: selGroups.has(g.id),
    zIndex: -1,
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
    data: { kind: e.kind, issues: ctx.issues.edges[e.id] ?? 0, onPath: ctx.path ? ctx.path.edges.has(e.id) : undefined },
  }));
}

/** A React Flow position (relative for group members) as an absolute canvas position. */
export function toAbsolute(id: string, pos: XY, d: Design): XY {
  const n = d.nodes.find((x) => x.id === id);
  const g = n?.groupId ? d.groups.find((x) => x.id === n.groupId) : undefined;
  return g ? { x: g.position.x + pos.x, y: g.position.y + pos.y } : { x: pos.x, y: pos.y };
}
