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
        if (applied) void flow.fitView({ duration: 200 });
      })
      .catch(() => toast(t("layoutFailed"), "error"));
  }, [api, flow, t]);
}
