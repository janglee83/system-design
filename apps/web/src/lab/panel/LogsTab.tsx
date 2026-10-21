"use client";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { cn } from "@/ui/cn";
import { useCheck, useDesign } from "../store/LabStores";
import type { RunRecord } from "../store/run-store";
import { useMetas } from "../use-metas";
import { buildLogs, type LogLevel } from "./logs";

const LEVELS: LogLevel[] = ["info", "warn", "error"];
const CHIP = { info: "bg-surface-2 text-info", warn: "bg-busy-soft text-busy", error: "bg-over-soft text-over" } as const;

export function LogsTab({ run }: { run: RunRecord }) {
  const t = useTranslations();
  const design = useDesign((s) => s.design);
  const issues = useCheck((s) => s.issues);
  const metas = useMetas();
  const stamp = (ms: number) => `[${t("run.duration", { seconds: (ms / 1000).toFixed(1).padStart(4, "0") })}]`;
  const [shown, setShown] = useState<ReadonlySet<LogLevel>>(new Set(LEVELS));
  const lines = useMemo(
    () => buildLogs(run, { design, metas, t, warnings: issues.filter((i) => !i.blocking) }),
    [run, design, metas, t, issues],
  );
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
            className={cn("h-7 rounded-sm border px-2 text-xs", shown.has(l) ? "border-border-strong bg-surface" : "border-border text-text-3")}
          >
            {t(`logs.level.${l}`)}
          </button>
        ))}
      </div>
      <ol className="num text-xs">
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
