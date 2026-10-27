"use client";
import { Copy, Download } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import type { EngineClient } from "@/engine/client";
import { Button } from "@/ui/Button";
import { downloadText } from "@/ui/download";
import { toast } from "@/ui/toast-store";
import { runAvailable, type RunRecord } from "../store/run-store";
import { runExportFile } from "./export";

/** What was sent to the engine, its version, and the run's export (when the worker still holds it). */
export function SimulationTab({
  run,
  epoch,
  engineVersion,
  client,
}: {
  run: RunRecord;
  epoch: number;
  engineVersion: string;
  client: EngineClient | null;
}) {
  const t = useTranslations();
  const [exporting, setExporting] = useState(false);
  const inputText = JSON.stringify(run.input, null, 2);
  const available = runAvailable(run, epoch);

  const exportRun = async () => {
    if (!client || !available) return;
    setExporting(true);
    let resultJson: string;
    try {
      resultJson = await client.request({ type: "resultJson", runId: run.engineRunId });
    } catch {
      // The worker no longer holds the run (a restart, or it was evicted).
      toast(t("run.unavailable"), "warn");
      setExporting(false);
      return;
    }
    try {
      downloadText(`sd-lab-run-${run.id}.json`, runExportFile({ engineVersion, input: run.input, resultJson }));
    } catch (e) {
      toast(t("simulation.exportFailed", { message: e instanceof Error ? e.message : String(e) }), "error");
    } finally {
      setExporting(false);
    }
  };
  const copyInput = async () => {
    try {
      // navigator.clipboard is missing outside secure contexts; writeText can also reject.
      await navigator.clipboard.writeText(inputText);
      toast(t("simulation.copied"), "info");
    } catch {
      toast(t("simulation.copyFailed"), "warn");
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <p className="num flex-1 text-xs text-text-2">{t("simulation.engine", { version: engineVersion })}</p>
        <Button size="sm" onClick={() => void exportRun()} disabled={!client || !available || exporting}>
          <Download size={14} aria-hidden />
          {t("simulation.export")}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => void copyInput()}>
          <Copy size={14} aria-hidden />
          {t("simulation.copy")}
        </Button>
      </div>
      {available ? null : <p className="text-xs text-text-3">{t("run.unavailable")}</p>}
      <h3 className="section-label">{t("simulation.input")}</h3>
      <pre data-testid="sim-input" className="num max-h-64 overflow-auto rounded-md border border-border bg-surface p-2 text-xs">
        {inputText}
      </pre>
    </div>
  );
}
