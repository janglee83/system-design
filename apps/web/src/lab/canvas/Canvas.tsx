"use client";
import {
  Background,
  BackgroundVariant,
  MiniMap,
  ReactFlow,
  type Node as FlowNode,
  type NodeChange,
  type EdgeChange,
} from "@xyflow/react";
import "@xyflow/react/dist/base.css";
import { useTranslations } from "next-intl";
import { useCallback, useMemo, useState } from "react";
import type { XY } from "../model/design";
import { moveGroup, moveNodes } from "../model/ops";
import { useDesign, useDesignApi, useUi } from "../store/LabStores";
import { useMetas } from "../use-metas";
import { EdgeLegend } from "./EdgeLegend";
import { EdgeMarkers, LabEdge } from "./LabEdge";
import { LabNode } from "./LabNode";
import { toAbsolute, toFlowEdges, toFlowNodes, type AdapterContext } from "./rf-adapter";

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

  const ctx: AdapterContext = {
    metas,
    selection,
    costs: {},
    issues: { nodes: {}, edges: {} },
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
        snapToGrid={snap}
        snapGrid={[16, 16]}
        deleteKeyCode={null}
        selectionKeyCode="Shift"
        multiSelectionKeyCode={["Meta", "Control", "Shift"]}
        fitView
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
