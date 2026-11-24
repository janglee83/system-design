"use client";
import { useTranslations } from "next-intl";
import { useCallback } from "react";
import { useEngineStore } from "@/engine/EngineProvider";
import { toast } from "@/ui/toast-store";
import { currentRun, runAvailable } from "../store/run-store";
import { usePlaybackApi, useRunsApi, useTraceApi } from "../store/LabStores";

/** Starts following a sampled request of the current run: loads its trace and moves playback to it (§7.4). */
export function useFollowRequest(): (summaryIndex: number) => void {
  const t = useTranslations("trace");
  const client = useEngineStore((s) => (s.status === "ready" ? s.client : null));
  const epoch = useEngineStore((s) => s.epoch);
  const runs = useRunsApi();
  const trace = useTraceApi();
  const playback = usePlaybackApi();
  return useCallback(
    (index: number) => {
      const run = currentRun(runs.getState());
      if (!run || !client) return;
      if (!runAvailable(run, epoch)) {
        toast(t("unavailable"), "warn");
        return;
      }
      void client
        .request({ type: "trace", runId: run.engineRunId, index })
        .then((tr) => {
          trace.getState().pick(run.id, tr);
          playback.getState().pause();
          playback.getState().seek(tr.startMs);
        })
        .catch(() => toast(t("unavailable"), "warn"));
    },
    [client, epoch, runs, trace, playback, t],
  );
}
