"use client";
import { Copy, Download } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEngineStore } from "@/engine/EngineProvider";
import { WorkloadForm } from "../inspector/WorkloadForm";
import { useState } from "react";
import type { EngineClient } from "@/engine/client";
import { Button } from "@/ui/Button";
import { downloadText } from "@/ui/download";
import { toast } from "@/ui/toast-store";
import { runAvailable, type RunRecord } from "../store/run-store";
import { runExportFile } from "./export";

/** What was sent to the engine, its version, and the run's export (when the worker still holds it). */
const NO_PARAMS: string[] = [];

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
  const workloadParams = useEngineStore((s) => s.info?.capabilities.workloadParams ?? NO_PARAMS);
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
      {/* The workload form in four columns (design-system §8, Mô phỏng). */}
      <div
        data-testid="sim-form"
        className="rounded-md border border-border bg-surface [&_[data-section-body]]:grid [&_[data-section-body]]:grid-cols-4 [&_[data-section-body]]:items-start [&_[data-section-body]]:gap-x-4"
      >
        <WorkloadForm workloadParams={workloadParams} />
      </div>
      <div className="flex items-center gap-2">
        <p className="num flex-1 text-caption text-text-2">{t("simulation.engine", { version: engineVersion })}</p>
        <Button size="sm" onClick={() => void exportRun()} disabled={!client || !available || exporting}>
          <Download size={14} aria-hidden />
          {t("simulation.export")}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => void copyInput()}>
          <Copy size={14} aria-hidden />
          {t("simulation.copy")}
        </Button>
      </div>
      {available ? null : <p className="text-caption text-text-3">{t("run.unavailable")}</p>}
      <h3 className="section-label">{t("simulation.input")}</h3>
      {/* Focusable, so the keyboard can scroll it (axe: scrollable-region-focusable). */}
      <pre data-testid="sim-input" tabIndex={0} aria-label={t("simulation.input")} className="num max-h-64 overflow-auto rounded-md border border-border bg-surface p-2 text-caption">
        {inputText}
      </pre>
    </div>
  );
}
