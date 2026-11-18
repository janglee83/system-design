"use client";
import { Redo2, Undo2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { IconButton } from "@/ui/IconButton";
import { redo, undo } from "./commands";
import { formatCombo } from "./shortcuts";
import { useDesign, useDesignApi } from "./store/LabStores";
import { useIsMac } from "./use-shortcuts";

/** Undo and redo in the top bar, with the shortcut in each tooltip. */
export function UndoRedo() {
  const t = useTranslations("edit");
  const api = useDesignApi();
  const canUndo = useDesign((s) => s.past.length > 0);
  const canRedo = useDesign((s) => s.future.length > 0);
  const mac = useIsMac();
  return (
    <div className="flex items-center">
      <IconButton label={t("undo")} shortcut={formatCombo("Mod+Z", mac)} disabled={!canUndo} onClick={() => undo(api)}>
        <Undo2 size={16} aria-hidden />
      </IconButton>
      <IconButton label={t("redo")} shortcut={formatCombo("Mod+Shift+Z", mac)} disabled={!canRedo} onClick={() => redo(api)}>
        <Redo2 size={16} aria-hidden />
      </IconButton>
    </div>
  );
}
