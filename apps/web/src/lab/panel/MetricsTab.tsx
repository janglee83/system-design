"use client";
import type { Metrics } from "@sd/sim";
import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { cn } from "@/ui/cn";
import { Field } from "@/ui/Field";
import { Select } from "@/ui/Select";
import { formatMetric } from "../format";
import { displayLabel } from "../labels";
import { useDesign } from "../store/LabStores";
import type { RunRecord } from "../store/run-store";
import { useMetas } from "../use-metas";
import { compareMetric, deltaText, failsGoal } from "./compare";
import { SeriesChart } from "./SeriesChart";

/** Six KPI tiles (design-system §8). */
const TILES: (keyof Metrics)[] = ["p50", "p95", "p99", "availability", "throughputRps", "costPerMonth"];
const BREAKDOWN = [
  ["requestsOk", "var(--sd-ok)"],
  ["requestsRejected", "var(--sd-over)"],
  ["requestsTimedOut", "var(--sd-busy)"],
  ["requestsUnreachable", "var(--sd-down)"],
] as const;

/** The busiest node by peak `busy`, the default for the chart. */
function busiest(run: RunRecord): string | null {
  let best: string | null = null;
  let peak = -1;
  for (const id of run.timeline.nodeIds) {
    for (let k = 0; k < run.timeline.frames; k++) {
      const b = run.timeline.value(k, id, "busy");
      if (b > peak) {
        peak = b;
        best = id;
      }
    }
  }
  return best;
}

export function MetricsTab({ run, previous }: { run: RunRecord; previous: RunRecord | null }) {
  const t = useTranslations();
  const locale = useLocale();
  const nodes = useDesign((s) => s.design.nodes);
  const metas = useMetas();
  const defaultNode = useMemo(() => busiest(run), [run]);
  const [picked, setPicked] = useState<string | null>(null);
  const nodeId = picked && run.timeline.nodeIds.includes(picked) ? picked : defaultNode;
  const label = (id: string) => {
    const n = nodes.find((x) => x.id === id);
    return n ? displayLabel(n, metas.get(n.kind) ?? null, t) : id;
  };
  const m = run.metrics;
  const total = BREAKDOWN.reduce((a, [k]) => a + (m[k] ?? 0), 0);

  return (
    <div className="flex flex-col gap-4">
      <ul className="grid grid-cols-3 gap-2 xl:grid-cols-6">
        {TILES.map((key) => {
          const now = m[key];
          const cmp = compareMetric(key, now, previous?.metrics[key]);
          const delta = previous ? deltaText(key, now, previous.metrics[key], locale, t("panel.pointsUnit")) : null;
          return (
            <li key={key} data-testid={`metric-${key}`} className="rounded-md border border-border bg-surface px-3 py-2.5">
              <p className="truncate text-caption text-text-3">{t(`metric.${key}`)}</p>
              <p className={cn("num text-[20px] leading-[26px] font-semibold", failsGoal(key, now, run.goals) && "text-over")} data-value={now ?? ""}>
                {formatMetric(key, now, locale)}
              </p>
              {previous && delta && cmp.verdict ? (
                <p className={cn("num text-[11.5px] leading-4", cmp.verdict === "better" ? "text-ok" : cmp.verdict === "worse" ? "text-over" : "text-text-3")}>
                  {t("panel.vsRun", { delta, id: previous.id })}
                  {cmp.verdict !== "same" ? <span className="sr-only"> {t(`panel.${cmp.verdict}`)}</span> : null}
                </p>
              ) : null}
            </li>
          );
        })}
      </ul>
      {previous ? null : <p className="text-caption text-text-3">{t("panel.noComparison")}</p>}
      <section>
        <h3 className="section-label pb-1">{t("panel.breakdown")}</h3>
        <div className="flex h-3 overflow-hidden rounded-full bg-surface-3" aria-hidden>
          {BREAKDOWN.map(([k, color]) => (
            <span key={k} style={{ width: total ? `${((m[k] ?? 0) / total) * 100}%` : 0, background: color }} />
          ))}
        </div>
        <ul className="mt-1 flex flex-wrap gap-x-4 text-caption text-text-2">
          {BREAKDOWN.map(([k, color]) => (
            <li key={k} className="flex items-center gap-1">
              <span aria-hidden className="size-2 rounded-full" style={{ background: color }} />
              {t(`metric.${k}`)} <span className="num">{formatMetric(k, m[k], locale)}</span>
            </li>
          ))}
        </ul>
      </section>
      {nodeId ? (
        <section>
          <div className="flex items-center justify-between">
            <h3 className="section-label">{t("panel.series")}</h3>
            <div className="w-72">
              <Field label={t("panel.node")}>
                <Select<string>
                  label={t("panel.node")}
                  value={nodeId}
                  onChange={setPicked}
                  options={run.timeline.nodeIds.map((id) => ({ value: id, label: label(id) }))}
                />
              </Field>
            </div>
          </div>
          <SeriesChart run={run} nodeId={nodeId} label={`${t("panel.series")}: ${label(nodeId)}`} />
        </section>
      ) : null}
    </div>
  );
}
