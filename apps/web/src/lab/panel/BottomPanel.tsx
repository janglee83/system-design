"use client";
import { BarChart3 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { useEngineStore } from "@/engine/EngineProvider";
import { ResizeHandle } from "@/ui/ResizeHandle";
import { Select } from "@/ui/Select";
import { Tabs, TabsContent, TabsList } from "@/ui/Tabs";
import { selectRun } from "../run/select-run";
import { usePlaybackApi, useRuns, useRunsApi, useUi, useUiApi } from "../store/LabStores";
import { currentRun, previousRun, runAvailable } from "../store/run-store";
import type { BottomTab } from "../store/ui-store";
import { EventsTab } from "./EventsTab";
import { LogsTab } from "./LogsTab";
import { MetricsTab } from "./MetricsTab";
import { SimulationTab } from "./SimulationTab";

const TABS: BottomTab[] = ["metrics", "events", "logs", "simulation"];
const MIN = 160;

/** The results panel under the canvas: tabs, run history, resizable height. */
export function BottomPanel() {
  const t = useTranslations();
  const ui = useUiApi();
  const tab = useUi((s) => s.bottomTab);
  const height = useUi((s) => s.panelHeight);
  const runs = useRuns((s) => s.runs);
  const run = useRuns(currentRun);
  const previous = useRuns(previousRun);
  const runsApi = useRunsApi();
  const playback = usePlaybackApi();
  const epoch = useEngineStore((s) => s.epoch);
  const engineVersion = useEngineStore((s) => s.info?.version ?? "");
  const client = useEngineStore((s) => (s.status === "ready" ? s.client : null));
  const max = useMaxPanelHeight();
  const time = (ms: number) => new Date(ms).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  return (
    <section aria-label={t("panel.label")} className="flex flex-col bg-bg" data-testid="bottom-panel">
      <ResizeHandle label={t("panel.resize")} value={height} min={MIN} max={max} onChange={(h) => ui.getState().set({ panelHeight: h })} />
      <Tabs value={tab} onValueChange={(v) => ui.getState().set({ bottomTab: v as BottomTab })} className="flex flex-col" style={{ height }}>
        <div className="flex items-center justify-between border-b border-border px-3">
          <TabsList label={t("panel.label")} items={TABS.map((v) => ({ value: v, label: t(`panel.tabs.${v}`) }))} />
          {runs.length > 0 ? (
            <div className="w-64">
              <Select<string>
                label={t("run.history")}
                value={String(run?.id ?? "")}
                onChange={(v) => selectRun(runsApi, playback, Number(v))}
                options={[...runs].reverse().map((r) => ({
                  value: String(r.id),
                  label: t("run.runLabel", { id: r.id, time: time(r.startedAt) }),
                  hint: runAvailable(r, epoch) ? undefined : t("run.stale"),
                }))}
              />
            </div>
          ) : null}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          {run ? (
            <>
              <TabsContent value="metrics">
                <MetricsTab run={run} previous={previous} />
              </TabsContent>
              <TabsContent value="events">
                <EventsTab run={run} />
              </TabsContent>
              <TabsContent value="logs">
                <LogsTab run={run} />
              </TabsContent>
              <TabsContent value="simulation">
                <SimulationTab run={run} epoch={epoch} engineVersion={engineVersion} client={client} />
              </TabsContent>
            </>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-center" data-testid="no-run">
              <span className="flex size-16 items-center justify-center rounded-full bg-surface-2 text-text-3">
                <BarChart3 size={32} aria-hidden />
              </span>
              <p className="text-md font-semibold">{t("panel.noRun")}</p>
              <p className="text-sm text-text-2">{t("panel.noRunBody")}</p>
            </div>
          )}
        </div>
      </Tabs>
    </section>
  );
}

/** 60% of the window height (R: panel height limit), kept current on resize; not read during render. */
function useMaxPanelHeight(): number {
  const [max, setMax] = useState(600);
  useEffect(() => {
    const update = () => setMax(Math.round(window.innerHeight * 0.6));
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  return max;
}
