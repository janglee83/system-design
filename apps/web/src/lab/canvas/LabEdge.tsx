"use client";
import { BaseEdge, EdgeLabelRenderer, useStore, type ConnectionLineComponentProps, type Edge, type EdgeProps } from "@xyflow/react";
import { ArrowLeftRight, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { memo } from "react";
import { EDGE_KINDS } from "@/i18n/engine-codes";
import { Button } from "@/ui/Button";
import { toast } from "@/ui/toast-store";
import { deleteSelection } from "../commands";
import { displayLabel } from "../labels";
import { reverseEdge } from "../model/ops";
import { useDesign, useDesignApi } from "../store/LabStores";
import { useMetas } from "../use-metas";
import { bezierPath } from "./edge-geometry";
import type { LabEdgeData } from "./rf-adapter";

/** A typed connection (design-system §6.1): a Bézier, colour and dash per kind, a fixed-size arrowhead. */
function LabEdgeView({ id, source, target, sourceX, sourceY, targetX, targetY, data, selected }: EdgeProps<Edge<LabEdgeData>>) {
  const kind = data?.kind ?? "http";
  const path = bezierPath(sourceX, sourceY, targetX, targetY);
  const onPath = data?.onPath;
  const accent = selected || onPath === true;
  return (
    <>
      <g data-testid={`edge-${id}`} data-kind={kind} data-selected={selected ? "" : undefined} opacity={onPath === false ? 0.18 : 1}>
        <BaseEdge
          id={id}
          path={path}
          markerEnd={`url(#sd-arrow-${onPath ? "path" : kind})`}
          interactionWidth={16}
          style={{
            stroke: onPath ? "var(--sd-accent-text)" : `var(--sd-edge-${kind})`,
            strokeWidth: accent ? 3 : 1.8,
            strokeDasharray: onPath ? "none" : `var(--sd-dash-${kind})`,
            strokeLinecap: "round",
            filter: selected ? "drop-shadow(0 0 3px color-mix(in srgb, var(--sd-accent-text) 50%, transparent))" : undefined,
          }}
        />
      </g>
      {selected ? <EdgePopover id={id} source={source} target={target} x={targetX} y={targetY} /> : null}
    </>
  );
}

export const LabEdge = memo(LabEdgeView);

/** Below the target end of the selected edge: what it connects, its kind, Reverse and Delete. */
function EdgePopover({ id, source, target, x, y }: { id: string; source: string; target: string; x: number; y: number }) {
  const t = useTranslations();
  const api = useDesignApi();
  const metas = useMetas();
  const nodes = useDesign((s) => s.design.nodes);
  const kind = useDesign((s) => s.design.edges.find((e) => e.id === id)?.kind ?? "http");
  const name = (nid: string) => {
    const n = nodes.find((x) => x.id === nid);
    return n ? displayLabel(n, metas.get(n.kind) ?? null, t) : nid;
  };
  return (
    <EdgeLabelRenderer>
      <div
        role="dialog"
        aria-label={t("lab.edgePopover.title")}
        data-testid="edge-popover"
        className="nodrag nopan pointer-events-auto absolute z-10 w-60 rounded-lg border border-border bg-surface p-3 text-body shadow-2"
        style={{ transform: `translate(-50%, 0) translate(${x}px, ${y + 92}px)` }}
      >
        <p className="text-caption text-text-3">{t("lab.edgePopover.title")}</p>
        <p className="truncate font-semibold">
          {name(source)} → {name(target)}
        </p>
        <p className="mt-0.5 flex items-center gap-1.5 text-caption text-text-2">
          <span aria-hidden className="h-0.5 w-4 rounded-full" style={{ background: `var(--sd-edge-${kind})` }} />
          {t(`edgeKind.${kind}`)}
        </p>
        <div className="mt-2 flex items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              const r = reverseEdge(api.getState().design, id, metas);
              if ("refused" in r) toast(t(`connect.refused.${r.refused}`, { source: name(target), target: name(source) }), "warn");
              else api.getState().apply(() => r.design);
            }}
          >
            <ArrowLeftRight size={12} aria-hidden />
            {t("lab.edgePopover.reverse")}
          </Button>
          <Button size="sm" variant="danger" className="ml-auto" onClick={() => deleteSelection(api)}>
            <Trash2 size={12} aria-hidden />
            {t("lab.edgePopover.delete")}
          </Button>
        </div>
      </div>
    </EdgeLabelRenderer>
  );
}

/** The ghost connection while dragging from a port (§6.2): accent, dashed, with an end dot. */
export function GhostConnection({ fromX, fromY, toX, toY }: ConnectionLineComponentProps) {
  return (
    <g>
      <path d={bezierPath(fromX, fromY, toX, toY)} fill="none" stroke="var(--sd-accent-text)" strokeWidth={2.2} strokeDasharray="5 4" />
      <circle cx={toX} cy={toY} r={5} fill="var(--sd-surface)" stroke="var(--sd-accent-text)" strokeWidth={2} />
    </g>
  );
}

/** Open chevron arrowheads, one per kind plus the trace path; a fixed 11 px at every zoom. */
export function EdgeMarkers() {
  // The markers live in the zoomed viewport: sized 11 / zoom flow units, they stay 11 px on screen.
  const zoom = useStore((s) => s.transform[2]);
  const size = 11 / zoom;
  const ids = [...EDGE_KINDS.map((k) => ({ id: k, color: `var(--sd-edge-${k})` })), { id: "path", color: "var(--sd-accent-text)" }];
  return (
    <svg width="0" height="0" aria-hidden className="absolute">
      <defs>
        {ids.map(({ id, color }) => (
          <marker
            key={id}
            id={`sd-arrow-${id}`}
            viewBox="0 0 11 11"
            refX="10"
            refY="5.5"
            markerWidth={size}
            markerHeight={size}
            markerUnits="userSpaceOnUse"
            orient="auto-start-reverse"
          >
            <path d="M1 1.5 L10 5.5 L1 9.5" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
          </marker>
        ))}
      </defs>
    </svg>
  );
}
