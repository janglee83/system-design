"use client";
import { CircleAlert, Info, TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/ui/cn";
import { displayLabel } from "../labels";
import { usePlayback, usePlaybackApi } from "../store/LabStores";
import type { RunRecord } from "../store/run-store";
import { useMetas } from "../use-metas";
import { eventLevel, eventText } from "./event-text";

const ICON = { info: Info, warn: TriangleAlert, error: CircleAlert } as const;
const TONE = { info: "text-info", warn: "text-busy", error: "text-over" } as const;
const seconds = (ms: number) => (ms / 1000).toFixed(1);

/** The run's events; the row at the playhead is highlighted, and a row moves the playhead there. */
export function EventsTab({ run }: { run: RunRecord }) {
  const t = useTranslations();
  const design = run.snapshot; // names as they were when the run started
  const metas = useMetas();
  const timeMs = usePlayback((s) => s.timeMs);
  const playback = usePlaybackApi();
  if (run.events.length === 0) return <p className="text-sm text-text-3">{t("events.empty")}</p>;
  let current = -1;
  run.events.forEach((e, i) => {
    if (e.atMs <= timeMs) current = i;
  });
  const node = (id: string | null) => {
    const n = id ? design.nodes.find((x) => x.id === id) : undefined;
    return n ? displayLabel(n, metas.get(n.kind) ?? null, t) : (id ?? "");
  };
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-xs text-text-3">
          <th className="w-20 py-1 font-medium">{t("events.time")}</th>
          <th className="w-40 py-1 font-medium">{t("events.node")}</th>
          <th className="py-1 font-medium">{t("events.message")}</th>
        </tr>
      </thead>
      <tbody>
        {run.events.map((e, i) => {
          const level = eventLevel(e.code);
          const Icon = ICON[level];
          const jump = () => playback.getState().seek(e.atMs);
          return (
            <tr
              key={i}
              tabIndex={0}
              aria-current={i === current ? "true" : undefined}
              title={t("events.jump", { time: seconds(e.atMs) })}
              onClick={jump}
              onKeyDown={(k) => {
                if (k.key === "Enter") jump();
              }}
              className={cn("cursor-pointer border-t border-border hover:bg-surface-2", i === current && "bg-accent-soft")}
            >
              <td className="num py-1">{seconds(e.atMs)}</td>
              <td className="truncate py-1">{node(e.node)}</td>
              <td className="py-1">
                <span className="flex items-center gap-1.5">
                  <Icon size={14} aria-hidden className={TONE[level]} />
                  {eventText(e, { design, metas, t })}
                </span>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
