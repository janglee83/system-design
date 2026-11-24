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

/** The run's sampled requests, slowest first; clicking one follows it on the canvas (design-system §7.4). */
function Sampled({ run }: { run: RunRecord }) {
  const t = useTranslations();
  const locale = useLocale();
  const follow = useFollowRequest();
  const list = useMemo(() => filterTraces(run.traces, null).slice(0, 12), [run]);
  if (list.length === 0) return null;
  return (
    <section>
      <h3 className="section-label pb-1">{t("trace.sampled")}</h3>
      <ul className="flex flex-col">
        {list.map((s) => (
          <li key={s.id}>
            <button
              type="button"
              data-testid="trace-row"
              aria-label={t("trace.follow", { id: s.id })}
              onClick={() => follow(run.traces.indexOf(s))}
              className="flex w-full items-center gap-2 rounded-sm px-1 py-0.5 text-left text-caption hover:bg-surface-2"
            >
              <span className="num flex-1">{t("trace.row", { id: s.id, class: t(`trace.class.${s.class}`), latency: t("trace.ms", { ms: formatNumber(s.latencyMs, locale, 0) }) })}</span>
              <span className={cn("rounded-full px-1.5", OUTCOME[s.outcome])}>{t(`traceOutcome.${s.outcome}`)}</span>
            </button>
          </li>
        ))}
      </ul>
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
      <Sampled run={run} />
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
