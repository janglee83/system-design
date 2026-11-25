"use client";
import { useTranslations } from "next-intl";
import { useCallback, useMemo } from "react";
import { toast } from "@/ui/toast-store";
import { designFromTemplate, type TemplateId } from "../model/templates";
import { useMetas } from "../use-metas";
import { useDesignApi, useDocApi, useUiApi } from "../store/LabStores";
import { openSaved, saveAs, saveCurrent } from "./save";

/** Save / Save as / Open / New, shared by the Design menu, the dialogs and the shortcuts. */
export function useDocActions() {
  const t = useTranslations("designs");
  const design = useDesignApi();
  const doc = useDocApi();
  const ui = useUiApi();
  const metas = useMetas();
  const report = useCallback(
    (p: Promise<string>) =>
      p.then(
        () => toast(t("saved", { name: design.getState().design.name }), "info"),
        () => toast(t("storageUnavailable"), "error"),
      ),
    [t, design],
  );

  /** Mod+S: save in place, or ask for a name the first time. */
  const save = useCallback(() => {
    if (doc.getState().savedId) void report(saveCurrent({ design, doc }));
    else ui.getState().set({ saveDialog: "save" });
  }, [design, doc, ui, report]);

  // One stable object, so callers can list it as a dependency (the command palette registers it).
  return useMemo(
    () => ({
      save,
      saveNamed: (mode: "save" | "saveAs", name: string) =>
        report(mode === "save" ? saveCurrent({ design, doc }, name) : saveAs({ design, doc }, name)),
      open: (id: string) =>
        openSaved({ design, doc }, id).then(
          (ok) => {
            if (ok) ui.getState().set({ designsOpen: false });
          },
          () => toast(t("storageUnavailable"), "error"),
        ),
      /** A fresh design from a template; it is not one of the saved designs yet. */
      newFrom: (id: TemplateId) => {
        design.getState().replace(designFromTemplate(id, metas));
        doc.getState().reset(null);
      },
    }),
    [save, report, design, doc, ui, t, metas],
  );
}
