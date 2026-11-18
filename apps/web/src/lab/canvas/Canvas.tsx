"use client";
import {
  Background,
  BackgroundVariant,
  useConnection,
  useReactFlow,
  ReactFlow,
  type Connection,
  type FinalConnectionState,
  type Edge as FlowEdge,
  type Node as FlowNode,
  type NodeChange,
  type EdgeChange,
} from "@xyflow/react";
import "@xyflow/react/dist/base.css";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "@/ui/toast-store";
import { connectNodes } from "../commands";
import { displayLabel } from "../labels";
import type { XY } from "../model/design";
import { moveGroup, moveNodes } from "../model/ops";
import { issueCounts } from "../store/check-store";
import { useCheck, useDesign, useDesignApi, useUi } from "../store/LabStores";
import { DRAG_MIME } from "../palette/Palette";
import { useMetas } from "../use-metas";
import { connectTarget } from "./edge-geometry";
import { EdgeMarkers, GhostConnection, LabEdge } from "./LabEdge";
import { GroupNode } from "./GroupNode";
import { LabNode } from "./LabNode";
import { reuseFlowEdges, reuseFlowNodes, toAbsolute, toFlowEdges, toFlowNodes, type AdapterContext } from "./rf-adapter";
import { useAddComponent } from "./use-add-component";
import { flowAriaLabels, nodeAccessibleName } from "./aria";
import { CanvasControls } from "./CanvasControls";
import { formatCombo } from "../shortcuts";
import { useIsMac } from "../use-shortcuts";

const nodeTypes = { lab: LabNode, group: GroupNode };
const edgeTypes = { lab: LabEdge };

export function Canvas({ extra }: { extra?: Partial<AdapterContext> }) {
  const t = useTranslations("lab");
  const design = useDesign((s) => s.design);
  const selection = useDesign((s) => s.selection);
  const api = useDesignApi();
  const metas = useMetas();
  const snap = useUi((s) => s.snap);
  const [drag, setDrag] = useState<Record<string, XY>>({});
  // Fit only a design that opens with nodes. On an empty canvas React Flow would otherwise
  // zoom to fit the first component added (to the max zoom), and later drops would land elsewhere.
  const [fitOnOpen] = useState(() => design.nodes.length > 0);
  const add = useAddComponent();
  const flow = useReactFlow();
  const loads = useDesign((s) => s.loads);
  // A replaced design (opened, imported, started from a challenge) is fitted once it has rendered.
  useEffect(() => {
    if (loads === 0) return;
    const id = requestAnimationFrame(() => void flow.fitView({ maxZoom: 1, padding: 0.15 }));
    return () => cancelAnimationFrame(id);
  }, [loads, flow]);
  const tAll = useTranslations();

  /** The translated reason a connection was refused, shown as a toast. Self-loops and duplicates stay silent (R13). */
  const refuse = useCallback(
    (reason: string, from: string, to: string) => {
      if (reason === "self" || reason === "duplicate") return;
      const d = api.getState().design;
      const label = (id: string) => {
        const n = d.nodes.find((x) => x.id === id);
        return n ? displayLabel(n, metas.get(n.kind) ?? null, tAll) : id;
      };
      toast(tAll(`connect.refused.${reason}`, { source: label(from), target: label(to) }), "warn");
    },
    [api, metas, tAll],
  );
  const onConnect = useCallback(
    (c: Connection) => {
      if (!c.source || !c.target) return;
      const r = connectNodes(api, metas, c.source, c.target);
      if (!r.ok) refuse(r.reason, c.source, c.target);
    },
    [api, metas, refuse],
  );
  // A drop that React Flow did not turn into a connection (for example on Users, which has no
  // input port): say why, instead of failing silently.
  const onConnectEnd = useCallback(
    (e: MouseEvent | TouchEvent, state: FinalConnectionState) => {
      if (state.isValid || !state.fromNode) return;
      const target = (e.target as Element | null)?.closest?.(".react-flow__node");
      const to = state.toNode?.id ?? target?.getAttribute("data-id");
      if (!to || to === state.fromNode.id) return;
      const r = connectTarget(api.getState().design, state.fromNode.id, to, metas);
      if (!r.valid) refuse(r.reason, state.fromNode.id, to);
    },
    [api, metas, refuse],
  );
  // The same rule as a drop: React Flow refuses an invalid target before the drop (§6.2).
  const isValidConnection = useCallback(
    (c: Connection | FlowEdge) => !!c.source && !!c.target && connectTarget(api.getState().design, c.source, c.target, metas).valid,
    [api, metas],
  );
  const connectingFrom = useConnection((c) => (c.inProgress ? (c.fromNode?.id ?? null) : null));
  const [hover, setHover] = useState<string | null>(null);
  const connecting = useMemo<AdapterContext["connecting"]>(() => {
    if (!connectingFrom) return null;
    const valid: Record<string, boolean> = {};
    for (const n of design.nodes) valid[n.id] = connectTarget(design, connectingFrom, n.id, metas).valid;
    let tip: string | null = null;
    if (hover && hover !== connectingFrom) {
      const r = connectTarget(design, connectingFrom, hover, metas);
      const label = (id: string) => {
        const n = design.nodes.find((x) => x.id === id);
        return n ? displayLabel(n, metas.get(n.kind) ?? null, tAll) : id;
      };
      tip = r.valid
        ? tAll("connect.drop", { kind: tAll(`edgeKind.${r.kind}`) })
        : tAll(`connect.refused.${r.reason}`, { source: label(connectingFrom), target: label(hover) });
    }
    return { from: connectingFrom, valid, hover, tip };
  }, [connectingFrom, hover, design, metas, tAll]);

  const ariaLabelConfig = useMemo(() => flowAriaLabels(tAll), [tAll]);
  const aria = useMemo<NonNullable<AdapterContext["aria"]>>(
    () => ({
      node: (n, meta, s) => nodeAccessibleName({ label: displayLabel(n, meta, tAll), kind: meta ? tAll(meta.labelKey) : n.kind, ...s }, tAll),
      group: (g) => tAll("canvasA11y.group", { label: g.label || tAll("group.untitled") }),
      edge: (e) => {
        const d = api.getState().design;
        const name = (id: string) => {
          const n = d.nodes.find((x) => x.id === id);
          return n ? displayLabel(n, metas.get(n.kind) ?? null, tAll) : id;
        };
        return tAll("canvasA11y.edge", { kind: tAll(`edgeKind.${e.kind}`), source: name(e.from), target: name(e.to) });
      },
    }),
    [tAll, api, metas],
  );
  const costs = useCheck((s) => s.costs);
  const issues = useCheck((s) => s.issues);
  const runIssues = useCheck((s) => s.runIssues);
  const counts = useMemo(() => issueCounts({ issues, runIssues }), [issues, runIssues]);

  const allowedKinds = design.challenge?.limits.allowedKinds ?? null;
  const baseRps = design.workload.baseRps;
  const nodeRole = t("nodeRole");
  const ctx = useMemo<AdapterContext>(
    () => ({ metas, selection, costs, issues: counts, nodeRole, aria, drag, allowedKinds, baseRps, connecting, ...extra }),
    [metas, selection, costs, counts, nodeRole, aria, drag, allowedKinds, baseRps, connecting, extra],
  );
  // Previous React Flow objects, reused when unchanged (see reuseFlowNodes).
  const lastNodes = useRef<FlowNode[]>([]);
  const lastEdges = useRef<ReturnType<typeof toFlowEdges>>([]);
  const nodes = useMemo(() => (lastNodes.current = reuseFlowNodes(toFlowNodes(design, ctx), lastNodes.current)), [design, ctx]);
  const edges = useMemo(() => (lastEdges.current = reuseFlowEdges(toFlowEdges(design, ctx), lastEdges.current)), [design, ctx]);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      const d = api.getState().design;
      const dragging: Record<string, XY> = {};
      const commit: Record<string, XY> = {};
      const groupMoves: [string, XY][] = [];
      let selNodes: string[] | null = null;
      let selGroups: string[] | null = null;
      for (const c of changes) {
        if (c.type === "position" && c.position) {
          if (d.groups.some((g) => g.id === c.id)) {
            // Groups are top-level, so their position is already absolute. A drag previews
            // through `drag` and commits in onNodeDragStop; anything else commits now.
            if (c.dragging) dragging[c.id] = c.position;
            else groupMoves.push([c.id, c.position]);
            continue;
          }
          const abs = toAbsolute(c.id, c.position, d);
          if (c.dragging) dragging[c.id] = abs;
          else commit[c.id] = abs; // keyboard arrows and drag end: one history step
        } else if (c.type === "select") {
          const isGroup = d.groups.some((g) => g.id === c.id);
          const base = isGroup ? (selGroups ??= [...api.getState().selection.groups]) : (selNodes ??= [...api.getState().selection.nodes]);
          const i = base.indexOf(c.id);
          if (c.selected && i < 0) base.push(c.id);
          if (!c.selected && i >= 0) base.splice(i, 1);
        }
      }
      if (Object.keys(dragging).length) setDrag((prev) => ({ ...prev, ...dragging }));
      if (Object.keys(commit).length || groupMoves.length) {
        // Arrow-key nudges arrive here one by one; quick repeats are one undo step.
        api.getState().apply((x) => groupMoves.reduce((acc, [id, p]) => moveGroup(acc, id, p), moveNodes(x, commit)), { coalesce: "nudge" });
        setDrag({});
      }
      if (selNodes || selGroups) {
        api.getState().select({ ...(selNodes ? { nodes: selNodes } : {}), ...(selGroups ? { groups: selGroups } : {}) });
      }
    },
    [api],
  );

  const onNodeDragStop = useCallback(
    (_e: unknown, _n: FlowNode, dragged: FlowNode[]) => {
      const d = api.getState().design;
      const commit: Record<string, XY> = {};
      const groupMoves: [string, XY][] = [];
      for (const n of dragged) {
        if (n.type === "lab") commit[n.id] = toAbsolute(n.id, n.position, d);
        else if (n.type === "group") groupMoves.push([n.id, n.position]);
      }
      // One history step for the whole drag, frames and loose nodes together.
      api.getState().apply((x) => groupMoves.reduce((acc, [id, p]) => moveGroup(acc, id, p), moveNodes(x, commit)));
      setDrag({});
    },
    [api],
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      let edgesSel: string[] | null = null;
      for (const c of changes) {
        if (c.type !== "select") continue;
        edgesSel ??= [...api.getState().selection.edges];
        const i = edgesSel.indexOf(c.id);
        if (c.selected && i < 0) edgesSel.push(c.id);
        if (!c.selected && i >= 0) edgesSel.splice(i, 1);
      }
      if (edgesSel) api.getState().select({ edges: edgesSel });
    },
    [api],
  );

  return (
    <div data-testid="lab-canvas" role="region" aria-label={t("canvas")} className="relative h-full w-full bg-canvas">
      <EdgeMarkers />
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeDragStop={onNodeDragStop}
        onConnect={onConnect}
        onConnectEnd={onConnectEnd}
        isValidConnection={isValidConnection}
        connectionLineComponent={GhostConnection}
        onNodeMouseEnter={(_e, n) => setHover(n.id)}
        onNodeMouseLeave={() => setHover(null)}
        onDragOver={(e) => {
          if (e.dataTransfer.types.includes(DRAG_MIME)) {
            e.preventDefault();
            e.dataTransfer.dropEffect = "copy";
          }
        }}
        onDrop={(e) => {
          const kind = e.dataTransfer.getData(DRAG_MIME);
          if (!kind) return;
          e.preventDefault();
          add(kind, { x: e.clientX, y: e.clientY });
        }}
        snapToGrid={snap}
        snapGrid={[16, 16]}
        deleteKeyCode={null}
        selectionKeyCode="Shift"
        // Space is play/pause (shortcuts.ts); the background still pans by dragging.
        panActivationKeyCode={null}
        multiSelectionKeyCode={["Meta", "Control", "Shift"]}
        fitView={fitOnOpen}
        fitViewOptions={{ maxZoom: 1 }}
        minZoom={0.25}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
        aria-roledescription={t("canvasRole")}
        ariaLabelConfig={ariaLabelConfig}
      >
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="var(--sd-grid)" />
      </ReactFlow>
      {connectingFrom ? (
        <p role="status" className="pointer-events-none absolute top-3 left-1/2 z-10 -translate-x-1/2 rounded-full border border-border bg-surface px-3 py-1 text-caption text-text-2 shadow-1">
          {tAll("connect.hint")}
        </p>
      ) : null}
      <div className="absolute right-4 bottom-3.5">
        <CanvasControls />
      </div>
      {design.nodes.length === 0 ? <EmptyState /> : null}
    </div>
  );
}

function EmptyState() {
  const t = useTranslations("lab.empty");
  const mac = useIsMac();
  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 text-center">
      <p className="text-heading font-semibold">{t("title")}</p>
      <p className="text-body text-text-2">{t("body", { shortcut: formatCombo("Mod+K", mac) })}</p>
    </div>
  );
}
