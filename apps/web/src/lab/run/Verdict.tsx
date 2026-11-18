"use client";
import type { Metrics } from "@sd/sim";
import { useReactFlow, ViewportPortal } from "@xyflow/react";
import { Check, RotateCcw, TriangleAlert, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { announce } from "@/ui/announce";
import { Button } from "@/ui/Button";
import { cn } from "@/ui/cn";
import { IconButton } from "@/ui/IconButton";
import { useMediaQuery } from "@/ui/use-media-query";
import { formatMetric } from "../format";
import { displayLabel, type Translate } from "../labels";
import { NODE_SIZE } from "../model/design";
import { currentRun } from "../store/run-store";
import { useDesign, useDesignApi, useRuns } from "../store/LabStores";
import { useMetas } from "../use-metas";
import { verdictView, type GoalChip } from "./verdict-model";

const HEADLINE: (keyof Metrics)[] = ["p95", "availability", "throughputRps", "costPerMonth"];

/** A goal's name: latency goals read "Độ trễ p95", others use the metric's name. */
export function goalLabel(metric: string, t: Translate): string {
  return ["p50", "p95", "p99"].includes(metric) ? t(`verdict.goalLabel.${metric}`) : t(`metric.${metric}`);
}

/**
 * The verdict strip at the top of the canvas when a run ends (design-system §7.3): n/N against the
 * challenge's goals, or a neutral "Lần chạy #N xong" in the free Lab. Presentation; grading is the engine's.
 */
export function Verdict({ onRunAgain }: { onRunAgain: () => void }) {
  const t = useTranslations();
  const locale = useLocale();
  const run = useRuns((s) => currentRun(s));
  const status = useRuns((s) => s.status);
  const api = useDesignApi();
  const flow = useReactFlow();
  const narrow = useMediaQuery("(max-width: 1280px)");
  const [closed, setClosed] = useState<number | null>(null);
  const [why, setWhy] = useState<number | null>(null);
  const view = useMemo(() => (run ? verdictView({ goals: run.goals, verdict: run.verdict, timeline: run.timeline }) : null), [run]);

  // While the strip is open the design stays clear of it: fit leaving 96 px at the top (§7.3).
  const open = !!run && status !== "running" && closed !== run.id;
  useEffect(() => {
    if (!open) return;
    const id = requestAnimationFrame(() => void flow.fitView({ duration: 200, maxZoom: 1, padding: { top: "96px", left: "48px", right: "48px", bottom: "48px" } }));
    return () => cancelAnimationFrame(id);
  }, [open, run?.id, flow]);

  // Announce each new result once.
  useEffect(() => {
    if (!run || !view) return;
    if (view.kind === "neutral") announce(t("verdict.announceNeutral", { run: run.id }));
    else announce(view.passed ? t("verdict.announcePass", { total: view.total }) : t("verdict.announceFail", { met: view.met, total: view.total }));
  }, [run, view, t]);

  if (!run || !view || !open) return null;
  const graded = view.kind === "graded";
  const tone = !graded ? "neutral" : view.passed ? "ok" : "over";
  const chip = (c: GoalChip) => (
    <li
      key={c.id}
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[12.5px] leading-[18px] font-medium",
        c.passed ? "bg-ok-soft text-ok" : "bg-over-soft text-over",
      )}
    >
      {c.passed ? <Check size={12} aria-hidden /> : <X size={12} aria-hidden />}
      {goalLabel(c.metric, t)}
      <span className="num font-semibold">{formatMetric(c.metric, c.measured, locale)}</span>
    </li>
  );
  const chips = graded ? (narrow ? view.chips.filter((c) => !c.passed) : view.chips) : [];
  const hiddenMet = graded && narrow ? view.chips.filter((c) => c.passed).length : 0;

  const showWhy = () => {
    if (!graded || !view.failing?.nodeId) return;
    const id = view.failing.nodeId;
    api.getState().select({ nodes: [id], edges: [], groups: [] });
    void flow.fitView({ nodes: [{ id }], duration: 300, maxZoom: 1, padding: 0.6 });
    setWhy(run.id);
  };

  return (
    <>
      <section
        data-testid="verdict"
        data-outcome={tone}
        aria-label={graded ? (view.passed ? t("verdict.pass", { met: view.met, total: view.total }) : t("verdict.fail", { met: view.met, total: view.total })) : t("verdict.neutral", { run: run.id })}
        className="pointer-events-auto absolute inset-x-4 top-4 z-10 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 rounded-lg border bg-surface px-4 py-3 shadow-2"
        style={{ borderColor: tone === "neutral" ? "var(--sd-border)" : `color-mix(in srgb, var(--sd-${tone}) 40%, transparent)` }}
      >
        <div className="flex items-center gap-2.5">
          <span
            aria-hidden
            className={cn("grid size-8 place-items-center rounded-full", tone === "ok" ? "bg-ok-soft text-ok" : tone === "over" ? "bg-over-soft text-over" : "bg-surface-2 text-text-2")}
          >
            {tone === "over" ? <X size={16} /> : <Check size={16} />}
          </span>
          <p className={cn("text-[18px] leading-6 font-bold whitespace-nowrap", tone === "ok" ? "text-ok" : tone === "over" ? "text-over" : "text-text")}>
            {graded ? (view.passed ? t("verdict.pass", { met: view.met, total: view.total }) : t("verdict.fail", { met: view.met, total: view.total })) : t("verdict.neutral", { run: run.id })}
          </p>
        </div>
        {graded ? (
          <ul className="flex max-h-[52px] flex-wrap gap-1.5 overflow-hidden">
            {chips.map(chip)}
            {hiddenMet > 0 ? <li className="self-center text-caption text-text-3">{t("verdict.moreMet", { count: hiddenMet })}</li> : null}
          </ul>
        ) : (
          <dl className="flex flex-wrap gap-x-5 gap-y-1">
            {HEADLINE.map((k) => (
              <div key={k} className="flex items-baseline gap-1.5">
                <dt className="text-caption text-text-3">{t(`metric.${k}`)}</dt>
                <dd className="num text-body font-semibold">{formatMetric(k, run.metrics[k] as number, locale)}</dd>
              </div>
            ))}
          </dl>
        )}
        <div className="flex items-center gap-2">
          {graded && view.failing?.nodeId ? (
            <Button variant="primary" onClick={showWhy}>
              <TriangleAlert size={14} aria-hidden />
              {t("verdict.why")}
            </Button>
          ) : null}
          <Button variant="secondary" onClick={onRunAgain}>
            <RotateCcw size={14} aria-hidden />
            {t("verdict.again")}
          </Button>
          <IconButton label={t("verdict.close")} onClick={() => setClosed(run.id)}>
            <X size={14} aria-hidden />
          </IconButton>
        </div>
      </section>
      {graded && view.failing?.nodeId && why === run.id ? <WhyCallout view={view} nodeId={view.failing.nodeId} /> : null}
    </>
  );
}

/** Under the failing node: "Đây là chỗ gãy" and one sentence from the goal and the node's numbers. */
function WhyCallout({ view, nodeId }: { view: Extract<ReturnType<typeof verdictView>, { kind: "graded" }>; nodeId: string }) {
  const t = useTranslations();
  const locale = useLocale();
  const metas = useMetas();
  const node = useDesign((s) => s.design.nodes.find((n) => n.id === nodeId));
  const goal = view.chips.find((c) => c.id === view.failing?.goalId);
  if (!node || !goal || !view.failing) return null;
  const values = {
    goal: goalLabel(goal.metric, t),
    measured: formatMetric(goal.metric, goal.measured, locale),
    op: goal.op === "<=" ? "≤" : goal.op === ">=" ? "≥" : "=",
    target: formatMetric(goal.metric, goal.value, locale),
    node: displayLabel(node, metas.get(node.kind) ?? null, t),
    busy: Math.round(view.failing.peakBusy * 100),
  };
  return (
    <ViewportPortal>
      <div
        role="note"
        data-testid="why-callout"
        className="nodrag nopan absolute w-[280px] rounded-md bg-text p-3 text-body text-bg shadow-3"
        style={{ transform: `translate(-50%, 0) translate(${node.position.x + NODE_SIZE.width / 2}px, ${node.position.y + NODE_SIZE.height + 14}px)` }}
      >
        <span aria-hidden className="absolute -top-1.5 left-1/2 size-3 -translate-x-1/2 rotate-45 bg-text" />
        <p className="font-semibold">{t("verdict.calloutTitle")}</p>
        <p className="mt-1 text-caption">{t("verdict.callout", values)}</p>
      </div>
    </ViewportPortal>
  );
}
