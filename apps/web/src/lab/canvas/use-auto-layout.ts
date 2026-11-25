"use client";
import { useReactFlow } from "@xyflow/react";
import { useTranslations } from "next-intl";
import { useCallback } from "react";
import { toast } from "@/ui/toast-store";
import { autoLayout } from "../commands";
import { useDesignApi } from "../store/LabStores";

/** Tidy layout from a button or a shortcut: fits the view afterwards, says so if it failed. */
export function useAutoLayout(): () => void {
  const api = useDesignApi();
  const flow = useReactFlow();
  const t = useTranslations("lab");
  return useCallback(() => {
    autoLayout(api)
      .then((applied) => {
        // Fit with room around the edges, never zooming past 100 % (Task 35a: no clipped nodes).
        if (applied) void flow.fitView({ duration: 200, maxZoom: 1, padding: { top: "48px", left: "48px", right: "48px", bottom: "48px" } });
      })
      .catch(() => toast(t("layoutFailed"), "error"));
  }, [api, flow, t]);
}
