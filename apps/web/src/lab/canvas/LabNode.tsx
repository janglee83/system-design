"use client";
import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import { Gauge, Lock, PowerOff, TriangleAlert } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { memo } from "react";
import { displayLabel } from "../labels";
import { NodeArt } from "./art/NodeArt";
import { categoryColor, kindArt } from "./kinds";
import { formatNumber } from "../format";
import { configLine, costLine } from "./node-lines";
import type { LabNodeData } from "./rf-adapter";

const STATE_ICON = { busy: Gauge, overloaded: TriangleAlert, down: PowerOff } as const;
const yes = (b: boolean | undefined) => (b ? "" : undefined);

/** Body line 2 while playing: down since when, rejecting, or work in flight. */
function liveLine(l: NonNullable<LabNodeData["live"]>, t: (k: string, v?: Record<string, string | number>) => string, locale: string): string {
  if (l.downSinceMs !== null) return t("lab.node.live.down", { seconds: formatNumber(l.downSinceMs / 1000, locale, 1) });
  if (l.rejected > 0) return t("lab.node.live.rejected", { count: formatNumber(l.rejected, locale, 0) });
  return t("lab.node.live.inFlight", { count: formatNumber(l.inFlight, locale, 0) });
}

/** The illustrated node tile (design-system §5, 1A). Presentation only; node.css draws the states. */
function LabNodeView({ data, selected }: NodeProps<Node<LabNodeData>>) {
  const t = useTranslations();
  const locale = useLocale();
  const { node, meta, locked, cost, issues, state = "normal", onPath, disallowed, baseRps = 0, target, targetTip, live } = data;
  const art = kindArt(node.kind);
  const StateIcon = state !== "normal" ? STATE_ICON[state] : null;
  const issueCount = issues.blocking + issues.warnings;
  return (
    <div
      data-testid={`node-${node.id}`}
      data-state={state}
      data-selected={yes(selected)}
      data-locked={yes(locked)}
      data-replicas={node.replicas > 1 ? node.replicas : undefined}
      data-disallowed={yes(disallowed)}
      data-path={onPath === undefined ? undefined : onPath ? "on" : "off"}
      data-target={target}
      className="sd-node"
      style={{ "--k": categoryColor(node.kind) } as React.CSSProperties}
    >
      {/* A component that accepts no connection kind (Users) has no input port (R13). */}
      {!meta || meta.accepts.length > 0 ? (
        <Handle id="in" type="target" position={Position.Left} isConnectableEnd data-testid={`handle-in-${node.id}`} className="sd-port" />
      ) : null}
      <div className="sd-node-art">
        {/* The water level: load, up to 100 %. */}
        <span className="sd-node-fill" style={{ height: live ? `${Math.min(1, live.load) * 100}%` : 0 }} />
        {art ? <NodeArt kind={art} /> : null}
        {node.replicas > 1 ? <span className="sd-node-rep">{t("lab.node.replicas", { count: node.replicas })}</span> : null}
        {StateIcon ? (
          <span className="sd-node-chip">
            <StateIcon size={12} aria-hidden />
            {t(`canvasA11y.state.${state}`)}
          </span>
        ) : null}
      </div>
      <div className="sd-node-body">
        <div className="sd-node-name">{displayLabel(node, meta, t)}</div>
        {live ? (
          <>
            <div className="sd-node-line">{liveLine(live, t, locale)}</div>
            <div className="sd-node-line3">
              <span className="sd-node-load">{t("lab.node.live.load", { percent: Math.round(live.load * 100) })}</span>
            </div>
          </>
        ) : (
          <>
            <div className="sd-node-line">{configLine(node, meta, { baseRps }, t, locale)}</div>
            <div className="sd-node-line3">{costLine(cost, t, locale)}</div>
          </>
        )}
      </div>
      {locked ? (
        <span className="sd-node-lock" role="img" aria-label={t("lab.node.locked")}>
          <Lock size={12} aria-hidden />
        </span>
      ) : null}
      {issueCount > 0 ? (
        <span className="sd-node-issues" data-tone={issues.blocking > 0 ? undefined : "warn"} role="img" aria-label={t("lab.node.issues", { count: issueCount })}>
          {issueCount}
        </span>
      ) : null}
      {targetTip ? (
        <span role="tooltip" className="sd-node-tip" data-tone={target}>
          {targetTip}
        </span>
      ) : null}
      <Handle id="out" type="source" position={Position.Right} data-testid={`handle-out-${node.id}`} className="sd-port" />
    </div>
  );
}

export const LabNode = memo(LabNodeView);
