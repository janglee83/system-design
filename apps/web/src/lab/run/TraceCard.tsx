"use client";
import { X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { cn } from "@/ui/cn";
import { IconButton } from "@/ui/IconButton";
import { formatNumber } from "../format";
import { displayLabel } from "../labels";
import { currentRun } from "../store/run-store";
import { usePlaybackApi, useRuns, useTrace, useTraceApi } from "../store/LabStores";
import { useMetas } from "../use-metas";
import { hopList, nextSameClass } from "./trace-model";
import { useFollowRequest } from "./use-follow-request";

const OUTCOME_TONE = { delivered: "text-ok", rejected: "text-over", timeout: "text-busy", unreachable: "text-over" } as const;

/** The trace card at the canvas's top right while following a request (design-system §7.4). */
export function TraceCard() {
  const t = useTranslations();
  const locale = useLocale();
  const metas = useMetas();
  const run = useRuns((s) => currentRun(s));
  const trace = useTrace((s) => s.trace);
  const runId = useTrace((s) => s.runId);
  const hop = useTrace((s) => s.hop);
  const api = useTraceApi();
  const playback = usePlaybackApi();
  const follow = useFollowRequest();
  if (!run || !trace || runId !== run.id) return null;
  const hops = hopList(trace);
  const failed = trace.outcome !== "delivered";
  const name = (id: string) => {
    const n = run.snapshot.nodes.find((x) => x.id === id);
    return n ? displayLabel(n, metas.get(n.kind) ?? null, t) : id;
  };
  const next = nextSameClass(run.traces, trace.id);
  return (
    <section
      aria-label={t("trace.title")}
      data-testid="trace-card"
      className="pointer-events-auto absolute top-4 right-4 z-10 w-[330px] rounded-lg border border-border bg-surface shadow-2"
    >
      <header className="flex items-center gap-2 border-b border-border px-3 py-2">
        <p className="flex-1 text-label font-semibold">
          {t("trace.title")} <span className="num font-normal text-text-3">#{trace.id}</span>
        </p>
        <IconButton label={t("trace.close")} className="size-7" onClick={() => api.getState().clear()}>
          <X size={14} aria-hidden />
        </IconButton>
      </header>
      <ol className="relative max-h-[300px] overflow-y-auto px-3 py-2">
        {hops.map((h, i) => {
          const bad = failed && i === hops.length - 1;
          return (
            <li key={i} aria-current={i === hop ? "step" : undefined} className={cn("relative flex gap-2.5 py-1.5 pl-1", i === hop && "rounded-md bg-accent-soft")}>
              <span aria-hidden className="relative flex w-2.5 shrink-0 justify-center">
                {i < hops.length - 1 ? <span className="absolute top-3 bottom-[-12px] w-0.5 bg-border" /> : null}
                <span className={cn("relative mt-1 size-2.5 rounded-full", bad ? "bg-over" : "bg-accent-text")} />
              </span>
              <button
                type="button"
                className="min-w-0 flex-1 text-left"
                onClick={() => {
                  api.getState().setHop(i);
                  playback.getState().seek(h.tMs);
                }}
              >
                <span className="flex items-baseline gap-2">
                  <span className="min-w-0 flex-1 truncate text-body font-semibold">{t("trace.hop", { action: t(`traceAction.${h.action}`), node: name(h.nodeId) })}</span>
                  <span className="num shrink-0 text-caption text-text-2">{t("trace.delta", { ms: formatNumber(h.tMs - trace.startMs, locale, 0) })}</span>
                </span>
                <span className="block text-caption text-text-3">{t("trace.cause", { wait: formatNumber(h.waitMs, locale, 0), service: formatNumber(h.serviceMs, locale, 0) })}</span>
              </button>
            </li>
          );
        })}
      </ol>
      <footer className="flex items-center gap-2 border-t border-border px-3 py-2 text-caption">
        <span className={cn("font-semibold", OUTCOME_TONE[trace.outcome])}>{t(`traceOutcome.${trace.outcome}`)}</span>
        <span className="num text-text-3">{t("trace.ms", { ms: formatNumber(trace.latencyMs, locale, 0) })}</span>
        {next ? (
          <button type="button" className="ml-auto text-accent-text hover:underline" onClick={() => follow(run.traces.indexOf(next))}>
            {t("trace.next")}
          </button>
        ) : null}
      </footer>
    </section>
  );
}
