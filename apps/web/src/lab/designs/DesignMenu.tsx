"use client";
import * as DM from "@radix-ui/react-dropdown-menu";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { MENU_ITEM_CLASS } from "@/shell/HelpMenu";
import { ConfirmDialog } from "@/ui/ConfirmDialog";
import { formatCombo } from "../shortcuts";
import { useDesign, useDoc, useUiApi } from "../store/LabStores";
import { useIsMac } from "../use-shortcuts";
import { useDocActions } from "./use-doc-actions";

const CONTENT = "z-50 min-w-52 rounded-md border border-border bg-surface p-1 shadow-2";

/** The design's name and the Design menu, at the top of the palette column. */
export function DesignMenu({ templates }: { templates?: React.ReactNode }) {
  const t = useTranslations();
  const name = useDesign((s) => s.design.name);
  const dirty = useDoc((s) => s.dirty);
  const ui = useUiApi();
  const actions = useDocActions();
  const mac = useIsMac();
  const saveCombo = formatCombo("Mod+S", mac);
  const openCombo = formatCombo("Mod+O", mac);
  const [confirmNew, setConfirmNew] = useState<(() => void) | null>(null);
  /** Replacing the design asks first when there are unsaved changes. */
  const guarded = (fn: () => void) => () => (dirty ? setConfirmNew(() => fn) : fn());

  return (
    <div className="flex items-center gap-2 border-b border-border px-3 py-2" data-testid="design-menu">
      <p className="min-w-0 flex-1 truncate text-sm font-semibold" title={dirty ? t("designs.unsaved") : undefined}>
        {name || t("inspector.untitled")}
        {dirty ? (
          <span role="img" aria-label={t("designs.unsaved")} className="ml-1.5 inline-block size-1.5 rounded-full bg-busy align-middle" />
        ) : null}
      </p>
      <DM.Root modal={false}>
        <DM.Trigger className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-sm font-medium text-text-2 hover:bg-surface-2">
          {t("designs.menu")}
          <ChevronDown size={14} aria-hidden />
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
                  <DM.Item className={MENU_ITEM_CLASS} onSelect={guarded(actions.newEmpty)}>
                    {t("designs.empty_template")}
                  </DM.Item>
                  {templates}
                </DM.SubContent>
              </DM.Portal>
            </DM.Sub>
            <DM.Item className={MENU_ITEM_CLASS} onSelect={() => ui.getState().set({ designsOpen: true })}>
              <span className="flex-1">{t("designs.open")}</span>
              <kbd className="num text-2xs text-text-3">{openCombo}</kbd>
            </DM.Item>
            <DM.Item className={MENU_ITEM_CLASS} onSelect={actions.save}>
              <span className="flex-1">{t("designs.save")}</span>
              <kbd className="num text-2xs text-text-3">{saveCombo}</kbd>
            </DM.Item>
            <DM.Item className={MENU_ITEM_CLASS} onSelect={() => ui.getState().set({ saveDialog: "saveAs" })}>
              {t("designs.saveAs")}
            </DM.Item>
          </DM.Content>
        </DM.Portal>
      </DM.Root>
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
