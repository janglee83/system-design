"use client";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Button } from "@/ui/Button";
import { Dialog } from "@/ui/Dialog";
import { TEXT_MAX } from "../inspector/TextField";
import { useDesign, useUi, useUiApi } from "../store/LabStores";
import { useDocActions } from "./use-doc-actions";

/** The name prompt for a first save, or for Save as. */
export function SaveDialog() {
  const t = useTranslations();
  const mode = useUi((s) => s.saveDialog);
  const ui = useUiApi();
  const current = useDesign((s) => s.design.name);
  const { saveNamed } = useDocActions();
  const [name, setName] = useState("");
  useEffect(() => {
    if (mode) setName(current);
  }, [mode, current]);
  const close = () => ui.getState().set({ saveDialog: null });
  const submit = () => {
    const n = name.trim();
    if (!n || !mode) return;
    close();
    void saveNamed(mode, n);
  };
  return (
    <Dialog
      open={mode !== null}
      onOpenChange={(o) => {
        if (!o) close();
      }}
      title={mode === "saveAs" ? t("designs.saveAs") : t("designs.save")}
      footer={
        <>
          <Button variant="ghost" onClick={close}>
            {t("common.cancel")}
          </Button>
          <Button variant="primary" type="submit" form="save-design" disabled={name.trim() === ""}>
            {t("common.save")}
          </Button>
        </>
      }
    >
      <form
        id="save-design"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <input
          type="text"
          autoFocus
          aria-label={t("designs.nameLabel")}
          placeholder={t("inspector.untitled")}
          maxLength={TEXT_MAX}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="h-8 w-full rounded-sm border border-border-strong bg-surface px-2 text-sm placeholder:text-text-3"
        />
      </form>
    </Dialog>
  );
}
