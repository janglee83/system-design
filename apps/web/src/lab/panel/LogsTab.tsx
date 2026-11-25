"use client";
import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { cn } from "@/ui/cn";
import type { RunRecord } from "../store/run-store";
import { useMetas } from "../use-metas";
import { formatNumber } from "../format";
import { filterTraces } from "../run/trace-model";
import { useFollowRequest } from "../run/use-follow-request";
import { buildLogs, type LogLevel } from "./logs";

const LEVELS: LogLevel[] = ["info", "warn", "error"];
const CHIP = { info: "bg-surface-2 text-info", warn: "bg-busy-soft text-busy", error: "bg-over-soft text-over" } as const;

const OUTCOME = { delivered: "bg-ok-soft text-ok", rejected: "bg-over-soft text-over", timeout: "bg-busy-soft text-busy", unreachable: "bg-over-soft text-over" } as const;

const FILTERS = [null, "rejected", "timeout", "unreachable"] as const;

/**
 * The run's sampled requests (design-system §8): outcome filter chips with counts, then a table;
 * clicking a row follows the request on the canvas (§7.4).
 */
function Requests({ run }: { run: RunRecord }) {
  const t = useTranslations();
  const locale = useLocale();
  const follow = useFollowRequest();
  const [outcome, setOutcome] = useState<(typeof FILTERS)[number]>(null);
  const rows = useMemo(() => filterTraces(run.traces, outcome).slice(0, 50), [run, outcome]);
  const count = (o: (typeof FILTERS)[number]) => (o === null ? run.traces.length : run.traces.filter((x) => x.outcome === o).length);
  if (run.traces.length === 0) return null;
  return (
    <section className="flex flex-col gap-2">
      <h3 className="section-label">{t("trace.sampled")}</h3>
      <div role="group" aria-label={t("trace.filter")} className="flex flex-wrap gap-1">
        {FILTERS.map((o) => (
          <button
            key={o ?? "all"}
            type="button"
            aria-pressed={outcome === o}
            onClick={() => setOutcome(o)}
            className={cn("inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-caption", outcome === o ? "border-accent-text bg-accent-soft text-text" : "border-border text-text-2")}
          >
            {o === null ? t("trace.all") : t(`traceOutcome.${o}`)}
            <span className="num text-text-3">{count(o)}</span>
          </button>
        ))}
      </div>
      <table className="w-full text-caption" data-testid="request-table">
        <thead className="sticky top-0 bg-surface">
          <tr className="text-left text-text-3">
            <th className="py-1 font-medium">{t("trace.col.request")}</th>
            <th className="w-32 py-1 font-medium">{t("trace.col.outcome")}</th>
            <th className="w-24 py-1 text-right font-medium">{t("trace.col.latency")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((s) => (
            <tr
              key={s.id}
              data-testid="trace-row"
              data-outcome={s.outcome}
              tabIndex={0}
              aria-label={t("trace.follow", { id: s.id })}
              onClick={() => follow(run.traces.indexOf(s))}
              onKeyDown={(k) => {
                if (k.key === "Enter" || k.key === " ") {
                  k.preventDefault();
                  follow(run.traces.indexOf(s));
                }
              }}
              className="cursor-pointer border-t border-border hover:bg-surface-2"
            >
              <td className="num py-1">{t("trace.request", { id: s.id, class: t(`trace.class.${s.class}`) })}</td>
              <td className="py-1">
                <span className={cn("rounded-full px-1.5 py-px", OUTCOME[s.outcome])}>{t(`traceOutcome.${s.outcome}`)}</span>
              </td>
              <td className="num py-1 text-right">{t("trace.ms", { ms: formatNumber(s.latencyMs, locale, 0) })}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

export function LogsTab({ run }: { run: RunRecord }) {
  const t = useTranslations();
  const locale = useLocale();
  const metas = useMetas();
  const stamp = (ms: number) => `[${t("run.duration", { seconds: formatNumber(ms / 1000, locale, 1) })}]`;
  const [shown, setShown] = useState<ReadonlySet<LogLevel>>(new Set(LEVELS));
  const lines = useMemo(() => buildLogs(run, { metas, t }), [run, metas, t]);
  return (
    <div className="flex flex-col gap-2">
      <div role="group" aria-label={t("logs.filter")} className="flex gap-1">
        {LEVELS.map((l) => (
          <button
            key={l}
            type="button"
            aria-pressed={shown.has(l)}
            onClick={() => {
              const next = new Set(shown);
              if (next.has(l)) next.delete(l);
              else next.add(l);
              setShown(next);
            }}
            className={cn("h-7 rounded-sm border px-2 text-caption", shown.has(l) ? "border-border-strong bg-surface" : "border-border text-text-3")}
          >
            {t(`logs.level.${l}`)}
          </button>
        ))}
      </div>
      <Requests run={run} />
      <ol className="num text-caption">
        {lines
          .filter((l) => shown.has(l.level))
          .map((l, i) => (
            <li key={i} className="flex gap-2 py-0.5">
              <span className="w-20 shrink-0 text-text-3">{stamp(l.atMs)}</span>
              <span className={cn("w-16 shrink-0 rounded-xs px-1 text-center", CHIP[l.level])}>{t(`logs.level.${l.level}`)}</span>
              <span>{l.text}</span>
            </li>
          ))}
      </ol>
    </div>
  );
}
