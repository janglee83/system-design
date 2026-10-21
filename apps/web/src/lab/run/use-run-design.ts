"use client";
import { useTranslations } from "next-intl";
import { useCallback } from "react";
import { useEngineStore } from "@/engine/EngineProvider";
import { toast } from "@/ui/toast-store";
import { useCheckApi, useDesignApi, usePlaybackApi, useRunsApi } from "../store/LabStores";
import { runDesign } from "./run-design";

/** Runs the design once (the Run button and Mod+Enter), and says why when it could not. */
export function useRunDesign(): () => void {
  const t = useTranslations("run");
  const client = useEngineStore((s) => (s.status === "ready" ? s.client : null));
  const design = useDesignApi();
  const check = useCheckApi();
  const runs = useRunsApi();
  const playback = usePlaybackApi();
  return useCallback(() => {
    if (!client) return;
    // A new run selects itself and starts paused at 0 s (R18).
    const onRun = (r: { input: { durationMs: number } }) => playback.getState().reset(r.input.durationMs);
    void runDesign({ design, check, runs, onRun }, client).then((r) => {
      if (r) return;
      const error = runs.getState().error;
      if (error) toast(t("failed", { message: error }), "error");
      else if (check.getState().runIssues.length > 0) toast(t("refused"), "warn");
    });
  }, [client, design, check, runs, playback, t]);
}
