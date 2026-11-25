"use client";
import { useFormatter, useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { cn } from "@/ui/cn";
import { setName } from "../model/ops";
import { useDesign, useDesignApi, useDoc, useRuns } from "../store/LabStores";
import { saveLine } from "./save-line";

/** The time now, refreshed every 30 s (for "2 minutes ago"). */
function useNow(): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);
  return now;
}

/** The design's name (click to rename) and its save line (design-system §2.1). */
export function DesignTitle() {
  const t = useTranslations();
  const format = useFormatter();
  const name = useDesign((s) => s.design.name) || t("inspector.untitled");
  const savedAt = useDoc((s) => s.savedAt);
  const dirty = useDoc((s) => s.dirty);
  const runs = useRuns((s) => s.runs);
  const api = useDesignApi();
  const now = useNow();
  const [editing, setEditing] = useState(false);

  const last = runs.at(-1);
  const line = useMemo(() => saveLine({ savedAt, dirty, lastRun: last ? { id: last.id, at: last.startedAt } : null }), [savedAt, dirty, last]);
  const ago = (at: number) => (now - at < 60_000 ? t("designTitle.justNow") : format.relativeTime(at, now));
  const text =
    line.key === "saved"
      ? t("designTitle.saved", { ago: ago(line.at) })
      : line.key === "ran"
        ? t("designTitle.ran", { run: line.run, ago: ago(line.at) })
        : t(`designTitle.${line.key}`);
  const dot = line.key === "unsaved" ? "bg-busy-line" : line.key === "never" ? "bg-border-strong" : "bg-ok";

  const commit = (value: string) => {
    const next = value.trim();
    if (next) api.getState().apply((d) => setName(d, next));
    setEditing(false);
  };

  return (
    <div className="flex min-w-[150px] flex-col justify-center leading-none">
      {editing ? (
        <input
          aria-label={t("designTitle.nameField")}
          defaultValue={name}
          autoFocus
          onFocus={(e) => e.currentTarget.select()}
          onBlur={(e) => commit(e.currentTarget.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit(e.currentTarget.value);
            if (e.key === "Escape") setEditing(false);
          }}
          className="-ml-1 h-6 rounded-xs border border-border-strong bg-surface px-1 text-body font-semibold"
        />
      ) : (
        <button
          type="button"
          title={t("designTitle.rename")}
          onClick={() => setEditing(true)}
          className="-ml-1 max-w-[280px] truncate rounded-xs px-1 text-left text-body font-semibold hover:bg-surface-2"
        >
          {name}
        </button>
      )}
      <p data-testid="save-line" className="mt-0.5 flex items-center gap-1.5 truncate text-caption text-text-3">
        <span aria-hidden className={cn("size-1.5 shrink-0 rounded-full", dot)} />
        {text}
      </p>
    </div>
  );
}
