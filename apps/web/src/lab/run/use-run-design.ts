"use client";
import { useTranslations } from "next-intl";
import { useCallback } from "react";
import { useEngineStore } from "@/engine/EngineProvider";
import { toast } from "@/ui/toast-store";
import { useCheckApi, useDesignApi, useRunsApi } from "../store/LabStores";
import { runDesign } from "./run-design";

/** Runs the design once (the Run button and Mod+Enter), and says why when it could not. */
export function useRunDesign(): () => void {
  const t = useTranslations("run");
  const client = useEngineStore((s) => (s.status === "ready" ? s.client : null));
  const design = useDesignApi();
  const check = useCheckApi();
  const runs = useRunsApi();
  return useCallback(() => {
    if (!client) return;
    void runDesign({ design, check, runs }, client).then((r) => {
      if (r) return;
      const error = runs.getState().error;
      if (error) toast(t("failed", { message: error }), "error");
      else if (check.getState().runIssues.length > 0) toast(t("refused"), "warn");
    });
  }, [client, design, check, runs, t]);
}
