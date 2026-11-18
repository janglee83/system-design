"use client";
import * as DM from "@radix-ui/react-dropdown-menu";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { MENU_ITEM_CLASS } from "@/shell/menu-styles";
import { ConfirmDialog } from "@/ui/ConfirmDialog";
import { TEMPLATES } from "../model/templates";
import { formatCombo } from "../shortcuts";
import { useDoc, useUiApi } from "../store/LabStores";
import { useIsMac } from "../use-shortcuts";
import { ImportExport, type ImportExportHandle } from "./ImportExport";
import { DesignTitle } from "./DesignTitle";
import { useDocActions } from "./use-doc-actions";

const CONTENT = "z-50 min-w-52 rounded-md border border-border bg-surface p-1 shadow-2";

/** The design's name, its save line and the Design menu, in the top bar. */
export function DesignMenu() {
  const t = useTranslations();
  const dirty = useDoc((s) => s.dirty);
  const ui = useUiApi();
  const actions = useDocActions();
  const mac = useIsMac();
  const saveCombo = formatCombo("Mod+S", mac);
  const openCombo = formatCombo("Mod+O", mac);
  const io = useRef<ImportExportHandle>(null);
  const [confirmNew, setConfirmNew] = useState<(() => void) | null>(null);
  /** Replacing the design asks first when there are unsaved changes. */
  const guarded = (fn: () => void) => () => (dirty ? setConfirmNew(() => fn) : fn());

  return (
    <div className="flex min-w-0 items-center gap-0.5" data-testid="design-menu">
      <DesignTitle />
      <DM.Root modal={false}>
        <DM.Trigger
          aria-label={t("designs.menu")}
          title={t("designs.menu")}
          className="inline-flex size-7 shrink-0 items-center justify-center self-start rounded-sm text-text-2 hover:bg-surface-2 hover:text-text"
        >
          <ChevronDown size={16} aria-hidden />
        </DM.Trigger>
        <DM.Portal>
          <DM.Content align="end" sideOffset={4} className={CONTENT}>
            <DM.Sub>
              <DM.SubTrigger className={MENU_ITEM_CLASS}>
                <span className="flex-1">{t("designs.new")}</span>
                <ChevronRight size={14} aria-hidden />
              </DM.SubTrigger>
              <DM.Portal>
                <DM.SubContent className={CONTENT} sideOffset={4}>
                  {TEMPLATES.map((id) => (
                    <DM.Item key={id} className={MENU_ITEM_CLASS} onSelect={guarded(() => actions.newFrom(id))}>
                      {t(`templates.${id}`)}
                    </DM.Item>
                  ))}
                </DM.SubContent>
              </DM.Portal>
            </DM.Sub>
            <DM.Item className={MENU_ITEM_CLASS} onSelect={() => ui.getState().set({ designsOpen: true })}>
              <span className="flex-1">{t("designs.open")}</span>
              <kbd className="num text-caption text-text-3">{openCombo}</kbd>
            </DM.Item>
            <DM.Item className={MENU_ITEM_CLASS} onSelect={actions.save}>
              <span className="flex-1">{t("designs.save")}</span>
              <kbd className="num text-caption text-text-3">{saveCombo}</kbd>
            </DM.Item>
            <DM.Item className={MENU_ITEM_CLASS} onSelect={() => ui.getState().set({ saveDialog: "saveAs" })}>
              {t("designs.saveAs")}
            </DM.Item>
            <DM.Separator className="my-1 h-px bg-border" />
            <DM.Item className={MENU_ITEM_CLASS} onSelect={() => io.current?.openImport()}>
              {t("designs.import")}
            </DM.Item>
            <DM.Item className={MENU_ITEM_CLASS} onSelect={() => io.current?.exportCurrent()}>
              {t("designs.export")}
            </DM.Item>
          </DM.Content>
        </DM.Portal>
      </DM.Root>
      <ImportExport ref={io} />
      <ConfirmDialog
        open={confirmNew !== null}
        onOpenChange={(o) => {
          if (!o) setConfirmNew(null);
        }}
        title={t("designs.discard")}
        confirmLabel={t("designs.new")}
        onConfirm={() => confirmNew?.()}
      />
    </div>
  );
}
