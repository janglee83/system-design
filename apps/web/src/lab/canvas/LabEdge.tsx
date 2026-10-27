"use client";
import { BaseEdge, getSmoothStepPath, type Edge, type EdgeProps } from "@xyflow/react";
import { memo } from "react";
import { EDGE_KINDS } from "@/i18n/engine-codes";
import type { LabEdgeData } from "./rf-adapter";

function LabEdgeView({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data, selected }: EdgeProps<Edge<LabEdgeData>>) {
  const kind = data?.kind ?? "http";
  const [path] = getSmoothStepPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition, borderRadius: 8 });
  const color = `var(--sd-edge-${kind})`;
  return (
    <g data-testid={`edge-${id}`} data-kind={kind} opacity={data?.onPath === false ? 0.3 : 1}>
      {selected || data?.onPath ? <path d={path} fill="none" stroke="var(--sd-accent-soft)" strokeWidth={8} /> : null}
      <BaseEdge
        id={id}
        path={path}
        markerEnd={`url(#sd-arrow-${kind})`}
        style={{ stroke: color, strokeWidth: selected ? 3 : 2, strokeDasharray: `var(--sd-dash-${kind})`, strokeLinecap: "round" }}
      />
    </g>
  );
}

export const LabEdge = memo(LabEdgeView);

/** One arrowhead per kind; rendered once inside the canvas. */
export function EdgeMarkers() {
  return (
    <svg width="0" height="0" aria-hidden className="absolute">
      <defs>
        {EDGE_KINDS.map((k) => (
          <marker key={k} id={`sd-arrow-${k}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
            <path d="M0 0 L10 5 L0 10 z" fill={`var(--sd-edge-${k})`} />
          </marker>
        ))}
      </defs>
    </svg>
  );
}
