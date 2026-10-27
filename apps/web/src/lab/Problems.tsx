"use client";
import * as Popover from "@radix-ui/react-popover";
import type { ValidationIssue } from "@sd/sim";
import { useReactFlow } from "@xyflow/react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { issueText } from "./issue-text";
import { faultIssues } from "./model/faults";
import { allIssues } from "./store/check-store";
import { useCheck, useDesign, useDesignApi } from "./store/LabStores";
import { useMetas } from "./use-metas";

/** The "N problems" pill over the canvas, with the translated list in a popover. */
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
  const dot = all.length === 0 ? "var(--sd-ok)" : blocking.length > 0 ? "var(--sd-over)" : "var(--sd-busy)";

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
                className="w-full rounded-sm px-2 py-1.5 text-left text-sm hover:bg-surface-2"
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
          className="inline-flex h-8 items-center gap-2 rounded-full border border-border bg-surface px-3 text-sm font-medium shadow-2"
        >
          <span aria-hidden className="size-2 rounded-full" style={{ background: dot }} />
          {all.length === 0 ? t("problems.none") : t("problems.count", { count: all.length })}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          aria-label={t("problems.title")}
          side="top"
          sideOffset={8}
          className="z-50 max-h-80 w-96 overflow-y-auto rounded-lg border border-border bg-surface p-2 shadow-2"
        >
          {all.length === 0 ? <p className="px-2 py-1 text-sm text-text-2">{t("problems.none")}</p> : null}
          {list(t("problems.blocking"), blocking)}
          {list(t("problems.warning"), warnings)}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
    </>
  );
}
