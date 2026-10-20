"use client";
import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import { Gauge, Lock, PowerOff, TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import { memo } from "react";
import { cn } from "@/ui/cn";
import { displayLabel } from "../labels";
import type { LabNodeData } from "./rf-adapter";
import { categoryColor, iconFor } from "./icons";

const STATE_CLASS = {
  normal: "",
  busy: "border-2 border-busy bg-busy-soft",
  overloaded: "border-2 border-over bg-over-soft motion-safe:animate-[sd-pulse_1.2s_ease-in-out_infinite]",
  down: "border-2 border-down bg-down-soft [&>*]:opacity-55",
} as const;
const STATE_ICON = { busy: Gauge, overloaded: TriangleAlert, down: PowerOff } as const;

function LabNodeView({ data, selected }: NodeProps<Node<LabNodeData>>) {
  const t = useTranslations();
  const { node, meta, locked, cost, issues, state = "normal", onPath, disallowed } = data;
  const Icon = iconFor(node.kind);
  const StateIcon = state !== "normal" ? STATE_ICON[state] : null;
  const label = displayLabel(node, meta, t);
  const color = categoryColor(meta?.category);
  return (
    <div
      data-testid={`node-${node.id}`}
      data-state={state}
      aria-label={label}
      className={cn(
        "relative h-[76px] w-[184px] rounded-lg border bg-surface shadow-1",
        locked ? "border-dashed border-border-strong" : "border-border",
        STATE_CLASS[state],
        selected && "outline-2 outline-offset-2 outline-accent",
        onPath === true && "shadow-[0_0_0_6px_var(--sd-accent-soft)]",
        onPath === false && "opacity-35",
        disallowed && "opacity-50",
      )}
    >
      <Handle id="in" type="target" position={Position.Left} data-testid={`handle-in-${node.id}`} className="!size-2.5 !border-[1.5px] !border-border-strong !bg-surface" />
      <div className="absolute top-2 -left-3 flex flex-col gap-0.5" aria-hidden>
        {meta?.accepts.map((k) => (
          <span key={k} className="size-1.5 rounded-full" style={{ background: `var(--sd-edge-${k})` }} />
        ))}
      </div>
      <div className="flex items-center gap-2 px-2.5 pt-2">
        <span className="flex size-7 items-center justify-center rounded-sm" style={{ color, background: `color-mix(in srgb, ${color} 14%, transparent)` }}>
          <Icon size={16} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold">{label}</div>
          <div className="truncate text-2xs text-text-3">{meta ? t(meta.labelKey) : node.kind}</div>
        </div>
        {locked ? <Lock size={14} className="text-text-3" aria-label={t("lab.node.locked")} /> : null}
        {StateIcon ? <StateIcon size={14} aria-hidden className={state === "busy" ? "text-busy" : state === "overloaded" ? "text-over" : "text-down"} /> : null}
      </div>
      <div className="mx-2.5 mt-1.5 flex items-center justify-between border-t border-border pt-1">
        <span className="num rounded-xs bg-surface-2 px-1 text-2xs">{t("lab.node.replicas", { count: node.replicas })}</span>
        <span className="num text-2xs text-text-2">
          {typeof cost === "number" ? t("lab.node.costPerMonth", { cost: Math.round(cost) }) : t("lab.node.costUnknown")}
        </span>
      </div>
      {issues.blocking + issues.warnings > 0 ? (
        <span
          className={cn(
            "num absolute -top-2 -right-2 flex size-4 items-center justify-center rounded-full text-[10px] font-semibold text-on-accent",
            issues.blocking > 0 ? "bg-over" : "bg-busy",
          )}
          aria-label={t("lab.node.issues", { count: issues.blocking + issues.warnings })}
        >
          {issues.blocking + issues.warnings}
        </span>
      ) : null}
      <Handle id="out" type="source" position={Position.Right} data-testid={`handle-out-${node.id}`} className="!size-2.5 !border-[1.5px] !border-border-strong !bg-surface" />
    </div>
  );
}

export const LabNode = memo(LabNodeView);
