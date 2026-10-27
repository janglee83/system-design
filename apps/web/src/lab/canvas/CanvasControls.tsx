"use client";
import { useReactFlow } from "@xyflow/react";
import { Grid3x3, LayoutGrid, Maximize, Minus, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { IconButton } from "@/ui/IconButton";
import { toggleSnap } from "../commands";
import { formatCombo, SHORTCUTS, type ShortcutId } from "../shortcuts";
import { useUi, useUiApi } from "../store/LabStores";
import { useIsMac } from "../use-shortcuts";
import { useAutoLayout } from "./use-auto-layout";

/** Zoom, fit and snap: the vertical pill at the canvas's bottom-left. */
export function CanvasControls() {
  const t = useTranslations("lab");
  const flow = useReactFlow();
  const ui = useUiApi();
  const layout = useAutoLayout();
  const snap = useUi((s) => s.snap);
  const mac = useIsMac();
  const combo = (id: ShortcutId) => formatCombo(SHORTCUTS.find((s) => s.id === id)!.keys[0], mac);
  return (
    <div role="toolbar" aria-label={t("controls")} aria-orientation="vertical" className="flex flex-col gap-0.5 rounded-full border border-border bg-surface p-0.5 shadow-1">
      <IconButton label={t("zoomIn")} shortcut={combo("zoomIn")} onClick={() => void flow.zoomIn({ duration: 200 })} className="rounded-full">
        <Plus size={16} aria-hidden />
      </IconButton>
      <IconButton label={t("zoomOut")} shortcut={combo("zoomOut")} onClick={() => void flow.zoomOut({ duration: 200 })} className="rounded-full">
        <Minus size={16} aria-hidden />
      </IconButton>
      <IconButton label={t("fitView")} shortcut={combo("fitView")} onClick={() => void flow.fitView({ duration: 200 })} className="rounded-full">
        <Maximize size={16} aria-hidden />
      </IconButton>
      <IconButton
        label={t("autoLayout")}
        shortcut={combo("layout")}
        onClick={layout}
        className="rounded-full"
      >
        <LayoutGrid size={16} aria-hidden />
      </IconButton>
      <IconButton label={t("snap")} shortcut={combo("toggleSnap")} active={snap} onClick={() => toggleSnap(ui)} className="rounded-full">
        <Grid3x3 size={16} aria-hidden />
      </IconButton>
    </div>
  );
}
