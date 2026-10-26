"use client";
import { useTranslations } from "next-intl";
import { useCallback } from "react";
import { toast } from "@/ui/toast-store";
import { emptyDesign } from "../model/design";
import { useDesignApi, useDocApi, useUiApi } from "../store/LabStores";
import { openSaved, saveAs, saveCurrent } from "./save";

/** Save / Save as / Open / New, shared by the Design menu, the dialogs and the shortcuts. */
export function useDocActions() {
  const t = useTranslations("designs");
  const design = useDesignApi();
  const doc = useDocApi();
  const ui = useUiApi();
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

  const saveNamed = (mode: "save" | "saveAs", name: string) =>
    report(mode === "save" ? saveCurrent({ design, doc }, name) : saveAs({ design, doc }, name));

  const open = (id: string) =>
    openSaved({ design, doc }, id).then(
      (ok) => {
        if (ok) ui.getState().set({ designsOpen: false });
      },
      () => toast(t("storageUnavailable"), "error"),
    );

  const newEmpty = () => {
    design.getState().replace(emptyDesign());
    doc.getState().reset(null);
  };

  return { save, saveNamed, open, newEmpty };
}
