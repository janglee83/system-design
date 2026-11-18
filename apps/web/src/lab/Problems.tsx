"use client";
import * as Popover from "@radix-ui/react-popover";
import type { ValidationIssue } from "@sd/sim";
import { useReactFlow } from "@xyflow/react";
import { useTranslations } from "next-intl";
import { Check, TriangleAlert } from "lucide-react";
import { useMemo, useState } from "react";
import { cn } from "@/ui/cn";
import { issueText } from "./issue-text";
import { faultIssues } from "./model/faults";
import { allIssues } from "./store/check-store";
import { useCheck, useDesign, useDesignApi } from "./store/LabStores";
import { useMetas } from "./use-metas";

/** The top bar's "N problems" pill, with the translated list in a popover. */
export function Problems() {
  const t = useTranslations();
  const issues = useCheck((s) => s.issues);
  const runIssues = useCheck((s) => s.runIssues);
  const design = useDesign((s) => s.design);
  const api = useDesignApi();
  const metas = useMetas();
  const flow = useReactFlow();
  const [open, setOpen] = useState(false);

  const faultChecks = useMemo(() => faultIssues(design), [design]);
  const all = useMemo(() => [...allIssues({ issues, runIssues }), ...faultChecks], [issues, runIssues, faultChecks]);
  const blocking = all.filter((i) => i.blocking);
  const warnings = all.filter((i) => !i.blocking);
  // §2.1: ok when clear, over with blocking problems; warnings alone use busy (they do not stop a run).
  const tone = all.length === 0 ? "bg-ok-soft text-ok" : blocking.length > 0 ? "bg-over-soft text-over" : "bg-busy-soft text-busy";
  const Icon = all.length === 0 ? Check : TriangleAlert;

  const show = (issue: ValidationIssue) => {
    if (issue.nodeId) {
      api.getState().select({ nodes: [issue.nodeId], edges: [], groups: [] });
      void flow.fitView({ nodes: [{ id: issue.nodeId }], duration: 200, maxZoom: 1.2 });
    } else if (issue.edgeId) {
      const e = design.edges.find((x) => x.id === issue.edgeId);
      api.getState().select({ nodes: [], edges: [issue.edgeId], groups: [] });
      if (e) void flow.fitView({ nodes: [{ id: e.from }, { id: e.to }], duration: 200, maxZoom: 1.2 });
    }
    setOpen(false);
  };

  const list = (title: string, items: ValidationIssue[]) =>
    items.length === 0 ? null : (
      <section className="mb-2 last:mb-0">
        <h3 className="section-label px-2 pb-1">{title}</h3>
        <ul>
          {items.map((i, k) => (
            <li key={`${i.code}-${i.nodeId ?? ""}-${i.edgeId ?? ""}-${i.field ?? ""}-${k}`}>
              <button
                type="button"
                title={i.nodeId || i.edgeId ? t("problems.select") : undefined}
                onClick={() => show(i)}
                className="w-full rounded-sm px-2 py-1.5 text-left text-body hover:bg-surface-2"
              >
                {issueText(i, { design, metas, t })}
              </button>
            </li>
          ))}
        </ul>
      </section>
    );

  return (
    <>
    {/* The count, announced politely when it changes (the pill itself is a button). */}
    <span data-testid="problems-live" role="status" aria-live="polite" className="sr-only">
      {all.length === 0 ? t("problems.none") : t("problems.count", { count: all.length })}
    </span>
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          data-testid="problems"
          className={cn("inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-[12.5px] leading-4 font-medium whitespace-nowrap", tone)}
        >
          <Icon size={14} aria-hidden />
          {all.length === 0 ? t("problems.none") : t("problems.count", { count: all.length })}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          aria-label={t("problems.title")}
          side="bottom"
          align="end"
          sideOffset={8}
          className="z-50 max-h-80 w-96 overflow-y-auto rounded-lg border border-border bg-surface p-2 shadow-2"
        >
          {all.length === 0 ? <p className="px-2 py-1 text-body text-text-2">{t("problems.none")}</p> : null}
          {list(t("problems.blocking"), blocking)}
          {list(t("problems.warning"), warnings)}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
    </>
  );
}
