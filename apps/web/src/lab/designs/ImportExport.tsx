"use client";
import { useTranslations } from "next-intl";
import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { useEngineStore } from "@/engine/EngineProvider";
import { ConfirmDialog } from "@/ui/ConfirmDialog";
import { Dialog } from "@/ui/Dialog";
import { downloadText } from "@/ui/download";
import { toast } from "@/ui/toast-store";
import type { Design } from "../model/design";
import { exportDesign, type FileIssue } from "../model/design-file";
import { useDesignApi, useDocApi } from "../store/LabStores";
import { readDesignFile } from "./import-file";

export interface ImportExportHandle {
  /** Opens the file picker; call it straight from the click (browsers need the user gesture). */
  openImport(): void;
  exportCurrent(): void;
}

/** A hidden file input, the import problems dialog and the "lose unsaved changes" question. */
export const ImportExport = forwardRef<ImportExportHandle>(function ImportExport(_props, ref) {
  const t = useTranslations();
  const design = useDesignApi();
  const doc = useDocApi();
  const engineVersion = useEngineStore((s) => s.info?.version ?? "");
  const input = useRef<HTMLInputElement>(null);
  const [issues, setIssues] = useState<FileIssue[] | null>(null);
  const [pending, setPending] = useState<Design | null>(null);

  const load = (d: Design) => {
    design.getState().replace(d);
    doc.getState().reset(null); // an imported file is not one of the saved designs yet
    toast(t("importIssue.imported", { name: d.name || t("inspector.untitled") }), "info");
  };

  useImperativeHandle(ref, () => ({
    openImport: () => input.current?.click(),
    exportCurrent: () => {
      const { filename, text } = exportDesign(design.getState().design, engineVersion);
      downloadText(filename, text);
    },
  }));

  const reason = (code: string) => (t.has(`importIssue.${code}`) ? t(`importIssue.${code}`) : t("importIssue.custom"));

  return (
    <>
      <input
        ref={input}
        type="file"
        accept=".json,application/json"
        className="hidden"
        data-testid="import-input"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = ""; // choosing the same file again still fires
          if (!file) return;
          void readDesignFile(file).then((r) => {
            if (!r.ok) setIssues(r.issues);
            else if (doc.getState().dirty) setPending(r.design);
            else load(r.design);
          });
        }}
      />
      <Dialog
        open={issues !== null}
        onOpenChange={(o) => {
          if (!o) setIssues(null);
        }}
        title={t("importIssue.title")}
        description={t("importIssue.description")}
      >
        <ul className="num max-h-72 list-disc overflow-y-auto pl-5 text-xs">
          {(issues ?? []).map((i, k) => (
            <li key={k}>{t("importIssue.line", { path: i.path || t("importIssue.root"), reason: reason(i.code) })}</li>
          ))}
        </ul>
      </Dialog>
      <ConfirmDialog
        open={pending !== null}
        onOpenChange={(o) => {
          if (!o) setPending(null);
        }}
        title={t("designs.discard")}
        confirmLabel={t("designs.import")}
        onConfirm={() => {
          if (pending) load(pending);
        }}
      />
    </>
  );
});
