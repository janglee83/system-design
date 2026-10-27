"use client";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/ui/Button";
import { ConfirmDialog } from "@/ui/ConfirmDialog";
import { Dialog } from "@/ui/Dialog";
import { toast } from "@/ui/toast-store";
import { TextField } from "../inspector/TextField";
import { useDoc, useUi, useUiApi } from "../store/LabStores";
import { deleteDesign, listDesigns, type SavedDesign } from "./db";
import { duplicateSaved, renameSaved } from "./save";
import { useDocActions } from "./use-doc-actions";

function relative(ms: number, locale: string): string {
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  const s = Math.round((ms - Date.now()) / 1000);
  const units: [Intl.RelativeTimeFormatUnit, number][] = [["day", 86400], ["hour", 3600], ["minute", 60]];
  for (const [u, n] of units) if (Math.abs(s) >= n) return rtf.format(Math.round(s / n), u);
  return rtf.format(s, "second");
}

/** The designs kept in this browser: open, rename, duplicate, delete. */
export function DesignsDialog() {
  const t = useTranslations("designs");
  const locale = useLocale();
  const open = useUi((s) => s.designsOpen);
  const ui = useUiApi();
  const dirty = useDoc((s) => s.dirty);
  const actions = useDocActions();
  const [list, setList] = useState<SavedDesign[] | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ kind: "open" | "delete"; d: SavedDesign } | null>(null);

  const reload = useCallback(
    () =>
      listDesigns().then(setList, () => {
        setList([]);
        toast(t("storageUnavailable"), "error");
      }),
    [t],
  );
  useEffect(() => {
    if (open) void reload();
  }, [open, reload]);

  const close = () => ui.getState().set({ designsOpen: false });
  const doOpen = (d: SavedDesign) => (dirty ? setConfirm({ kind: "open", d }) : void actions.open(d.id));

  return (
    <Dialog
        open={open}
        onOpenChange={(o) => {
          if (!o) close();
        }}
        title={t("dialogTitle")}
        description={t("dialogDescription")}
        wide
      >
        {list && list.length === 0 ? <p className="text-sm text-text-3">{t("empty")}</p> : null}
        <ul className="flex max-h-[50dvh] flex-col divide-y divide-border overflow-y-auto">
          {(list ?? []).map((d) => (
            <li key={d.id} className="flex items-center gap-2 py-2" data-testid={`saved-${d.id}`}>
              <div className="min-w-0 flex-1">
                {renaming === d.id ? (
                  <TextField
                    label={t("nameLabel")}
                    value={d.name}
                    onCommit={(name) => {
                      setRenaming(null);
                      if (name) void renameSaved(d.id, name).then(reload);
                    }}
                  />
                ) : (
                  <p className="truncate text-sm font-semibold">{d.name}</p>
                )}
                <p className="text-xs text-text-3">
                  {t("updated", { when: relative(d.updatedAt, locale) })} · {t("nodes", { count: d.design.nodes.length })}
                </p>
              </div>
              <Button size="sm" variant="primary" aria-label={t("openAction", { name: d.name })} onClick={() => doOpen(d)}>
                {t("open")}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setRenaming(d.id)}>
                {t("rename")}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => void duplicateSaved(d.id, t("copySuffix")).then(reload)}>
                {t("duplicate")}
              </Button>
              <Button size="sm" variant="danger" onClick={() => setConfirm({ kind: "delete", d })}>
                {t("delete")}
              </Button>
            </li>
          ))}
        </ul>
        {/* Nested inside the dialog, so Radix keeps it reachable (a sibling would be hidden by the modal). */}
        <ConfirmDialog
          open={confirm !== null}
          onOpenChange={(o) => {
            if (!o) setConfirm(null);
          }}
          title={confirm?.kind === "delete" ? t("deleteConfirm", { name: confirm.d.name }) : t("discard")}
          confirmLabel={confirm?.kind === "delete" ? t("delete") : t("openConfirm")}
          danger={confirm?.kind === "delete"}
          onConfirm={() => {
            if (!confirm) return;
            if (confirm.kind === "delete") void deleteDesign(confirm.d.id).then(reload);
            else void actions.open(confirm.d.id);
          }}
        />
      </Dialog>
  );
}
