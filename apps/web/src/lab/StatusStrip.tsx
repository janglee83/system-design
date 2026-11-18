"use client";
import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { useToastLane } from "@/ui/Toaster";
import { useEngineStore } from "@/engine/EngineProvider";
import { cn } from "@/ui/cn";
import { useCheck, useDesign } from "./store/LabStores";

/** The 28 px strip under the Lab (design-system §2.3): engine state, counts, monthly cost, autosave. */
export function StatusStrip() {
  const t = useTranslations();
  const status = useEngineStore((s) => s.status);
  const version = useEngineStore((s) => s.info?.version ?? "");
  const nodes = useDesign((s) => s.design.nodes.length);
  const edges = useDesign((s) => s.design.edges.length);
  const costs = useCheck((s) => s.costs);
  const setLane = useToastLane((s) => s.setLane);
  useEffect(() => () => setLane(null), [setLane]);
  const total = Object.values(costs).reduce<number>((sum, c) => sum + (c ?? 0), 0);

  return (
    <footer
      aria-label={t("status.label")}
      className="flex h-7 shrink-0 items-center gap-4 border-t border-border bg-surface px-3 text-caption text-text-3"
    >
      <span data-testid="engine-status" data-status={status} role="status" className="inline-flex items-center gap-1.5">
        <span
          aria-hidden
          className={cn("size-1.5 rounded-full", status === "ready" ? "bg-ok" : status === "error" ? "bg-over" : "bg-busy-line")}
        />
        {status === "ready" ? (
          <span>{t("status.engineReady", { version })}</span>
        ) : status === "error" ? (
          // The canvas banner explains the failure and offers the retry.
          <span className="text-over">{t("status.engineError")}</span>
        ) : (
          t("status.engineLoading")
        )}
      </span>
      <span data-testid="design-counts">{t("status.counts", { nodes, edges })}</span>
      {/* The toast lane: messages appear here instead of over the canvas or panels. */}
      <div ref={setLane} data-testid="toast-lane" className="flex h-full min-w-0 flex-1 justify-center" />
      <span className="num">{t("status.cost", { cost: Math.round(total) })}</span>
      <span>{t("status.autosave")}</span>
    </footer>
  );
}
