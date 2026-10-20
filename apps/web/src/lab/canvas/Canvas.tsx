"use client";
import {
  Background,
  BackgroundVariant,
  ConnectionLineType,
  MiniMap,
  ReactFlow,
  type Connection,
  type Edge as FlowEdge,
  type Node as FlowNode,
  type NodeChange,
  type EdgeChange,
} from "@xyflow/react";
import "@xyflow/react/dist/base.css";
import { useTranslations } from "next-intl";
import { useCallback, useMemo, useState } from "react";
import { toast } from "@/ui/toast-store";
import { connectNodes } from "../commands";
import { displayLabel } from "../labels";
import type { XY } from "../model/design";
import { moveGroup, moveNodes } from "../model/ops";
import { issueCounts } from "../store/check-store";
import { useCheck, useDesign, useDesignApi, useUi } from "../store/LabStores";
import { DRAG_MIME } from "../palette/Palette";
import { useMetas } from "../use-metas";
import { EdgeLegend } from "./EdgeLegend";
import { EdgeMarkers, LabEdge } from "./LabEdge";
import { LabNode } from "./LabNode";
import { toAbsolute, toFlowEdges, toFlowNodes, type AdapterContext } from "./rf-adapter";
import { useAddComponent } from "./use-add-component";

const nodeTypes = { lab: LabNode };
const edgeTypes = { lab: LabEdge };

export function Canvas({ extra }: { extra?: Partial<AdapterContext> }) {
  const t = useTranslations("lab");
  const design = useDesign((s) => s.design);
  const selection = useDesign((s) => s.selection);
  const api = useDesignApi();
  const metas = useMetas();
  const snap = useUi((s) => s.snap);
  const minimap = useUi((s) => s.minimap);
  const [drag, setDrag] = useState<Record<string, XY>>({});
  // Fit only a design that opens with nodes. On an empty canvas React Flow would otherwise
  // zoom to fit the first component added (to the max zoom), and later drops would land elsewhere.
  const [fitOnOpen] = useState(() => design.nodes.length > 0);
  const add = useAddComponent();
  const tAll = useTranslations();

  const onConnect = useCallback(
    (c: Connection) => {
      if (!c.source || !c.target) return;
      const r = connectNodes(api, metas, c.source, c.target);
      if (!r.ok && r.reason !== "self" && r.reason !== "duplicate") {
        const d = api.getState().design;
        const label = (id: string) => {
          const n = d.nodes.find((x) => x.id === id);
          return n ? displayLabel(n, metas.get(n.kind) ?? null, tAll) : id;
        };
        toast(tAll(`connect.refused.${r.reason}`, { source: label(c.source), target: label(c.target) }), "warn");
      }
    },
    [api, metas, tAll],
  );
  const isValidConnection = useCallback(
    (c: Connection | FlowEdge) => {
      if (c.source === c.target) return false;
      const target = api.getState().design.nodes.find((n) => n.id === c.target);
      const meta = target ? metas.get(target.kind) : undefined;
      return !meta || meta.accepts.length > 0;
    },
    [api, metas],
  );

  const costs = useCheck((s) => s.costs);
  const issues = useCheck((s) => s.issues);
  const runIssues = useCheck((s) => s.runIssues);
  const counts = useMemo(() => issueCounts({ issues, runIssues }), [issues, runIssues]);

  const ctx: AdapterContext = {
    metas,
    selection,
    costs,
    issues: counts,
    drag,
    ...extra,
  };
  const nodes = useMemo(() => toFlowNodes(design, ctx), [design, ctx.selection, ctx.costs, ctx.issues, ctx.drag, ctx.states, ctx.path, ctx.metas]); // eslint-disable-line react-hooks/exhaustive-deps
  const edges = useMemo(() => toFlowEdges(design, ctx), [design, ctx.selection, ctx.issues, ctx.path]); // eslint-disable-line react-hooks/exhaustive-deps

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
            if (!c.dragging) groupMoves.push([c.id, c.position]);
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
        api.getState().apply((x) => groupMoves.reduce((acc, [id, p]) => moveGroup(acc, id, p), moveNodes(x, commit)));
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
      for (const n of dragged) if (n.type === "lab") commit[n.id] = toAbsolute(n.id, n.position, d);
      api.getState().apply((x) => moveNodes(x, commit));
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
    <div data-testid="lab-canvas" aria-label={t("canvas")} className="relative h-full w-full bg-canvas">
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
        isValidConnection={isValidConnection}
        connectionLineType={ConnectionLineType.SmoothStep}
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
        multiSelectionKeyCode={["Meta", "Control", "Shift"]}
        fitView={fitOnOpen}
        fitViewOptions={{ maxZoom: 1 }}
        minZoom={0.25}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="var(--sd-grid)" />
        {minimap ? (
          <MiniMap
            ariaLabel={t("minimap")}
            pannable
            zoomable
            className="!m-3 !h-28 !w-42 overflow-hidden rounded-lg border border-border !bg-surface/85"
            nodeColor={(n) => (n.type === "group" ? "transparent" : "var(--sd-cat-compute)")}
          />
        ) : null}
      </ReactFlow>
      <div className="pointer-events-none absolute top-3 left-3">
        <div className="pointer-events-auto">
          <EdgeLegend />
        </div>
      </div>
      {design.nodes.length === 0 ? <EmptyState /> : null}
    </div>
  );
}

function EmptyState() {
  const t = useTranslations("lab.empty");
  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 text-center">
      <p className="text-md font-semibold">{t("title")}</p>
      <p className="text-sm text-text-2">{t("body", { shortcut: "⌘K" })}</p>
    </div>
  );
}
