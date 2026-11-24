"use client";
import { CircleAlert, Info, TriangleAlert } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { cn } from "@/ui/cn";
import { formatNumber } from "../format";
import { displayLabel } from "../labels";
import { useReactFlow } from "@xyflow/react";
import { useDesign, useDesignApi, usePlayback, usePlaybackApi } from "../store/LabStores";
import type { RunRecord } from "../store/run-store";
import { useMetas } from "../use-metas";
import { eventLevel, eventText } from "./event-text";

const ICON = { info: Info, warn: TriangleAlert, error: CircleAlert } as const;
const TONE = { info: "bg-surface-2 text-info", warn: "bg-busy-soft text-busy", error: "bg-over-soft text-over" } as const;

/** The run's events; the row at the playhead is highlighted, and a row moves the playhead there. */
export function EventsTab({ run }: { run: RunRecord }) {
  const t = useTranslations();
  const locale = useLocale();
  const seconds = (ms: number) => formatNumber(ms / 1000, locale, 1);
  const design = run.snapshot; // names as they were when the run started
  const metas = useMetas();
  const timeMs = usePlayback((s) => s.timeMs);
  const playback = usePlaybackApi();
  const api = useDesignApi();
  const flow = useReactFlow();
  const current_nodes = new Set(useDesign((s) => s.design.nodes).map((n) => n.id));
  /** "Xem trên sơ đồ": select the node and pan to it. */
  const showOnCanvas = (id: string) => {
    api.getState().select({ nodes: [id], edges: [], groups: [] });
    void flow.fitView({ nodes: [{ id }], duration: 300, maxZoom: 1, padding: 0.4 });
  };
  if (run.events.length === 0) return <p className="text-body text-text-3">{t("events.empty")}</p>;
  let current = -1;
  run.events.forEach((e, i) => {
    if (e.atMs <= timeMs) current = i;
  });
  const node = (id: string | null) => {
    const n = id ? design.nodes.find((x) => x.id === id) : undefined;
    return n ? displayLabel(n, metas.get(n.kind) ?? null, t) : (id ?? "");
  };
  return (
    <table className="w-full text-body">
      <thead>
        <tr className="text-left text-caption text-text-3">
          <th className="w-20 py-1 font-medium">{t("events.time")}</th>
          <th className="w-40 py-1 font-medium">{t("events.node")}</th>
          <th className="py-1 font-medium">{t("events.message")}</th>
          <th className="w-32 py-1" />
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
                if (k.key === "Enter" || k.key === " ") {
                  k.preventDefault();
                  jump();
                }
              }}
              className={cn("cursor-pointer border-t border-border hover:bg-surface-2", i === current && "bg-accent-soft")}
            >
              <td className="num py-1">{seconds(e.atMs)}</td>
              <td className="truncate py-1">{node(e.node)}</td>
              <td className="py-1">
                <span className="flex items-center gap-2">
                  <span aria-hidden className={cn("grid size-5 shrink-0 place-items-center rounded-full", TONE[level])}>
                    <Icon size={12} />
                  </span>
                  {eventText(e, { design, metas, t })}
                </span>
              </td>
              <td className="py-1 text-right">
                {e.node && current_nodes.has(e.node) ? (
                  <button
                    type="button"
                    className="text-caption text-accent-text hover:underline"
                    onClick={(ev) => {
                      ev.stopPropagation();
                      showOnCanvas(e.node!);
                    }}
                  >
                    {t("events.show")}
                  </button>
                ) : null}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
