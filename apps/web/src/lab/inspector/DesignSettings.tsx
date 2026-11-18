"use client";
import type { FaultKind } from "@sd/sim";
import { Download, LayoutDashboard } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEngineStore } from "@/engine/EngineProvider";
import { Button } from "@/ui/Button";
import { downloadText } from "@/ui/download";
import { exportDesign } from "../model/design-file";
import { setName } from "../model/ops";
import { useDesign, useDesignApi } from "../store/LabStores";
import { useMetas } from "../use-metas";
import { FaultList } from "./FaultList";
import { TextField } from "./TextField";
import { WorkloadForm } from "./WorkloadForm";
import { WorldParams } from "./WorldParams";

const NO_FAULTS: FaultKind[] = [];
const NO_PARAMS: string[] = [];

/** Design-wide settings when nothing is selected (design-system §4.2, 2). */
export function DesignSettings() {
  const t = useTranslations("inspector");
  const api = useDesignApi();
  const name = useDesign((s) => s.design.name);
  const workloadParams = useEngineStore((s) => s.info?.capabilities.workloadParams ?? NO_PARAMS);
  const supportedFaults = useEngineStore((s) => s.info?.capabilities.faults ?? NO_FAULTS);
  const engineVersion = useEngineStore((s) => s.info?.version ?? "");
  const metas = useMetas();
  const calibration = useEngineStore((s) => s.info?.calibration ?? null);
  return (
    <div data-testid="design-settings" className="flex min-h-full flex-col">
      <header className="grid grid-cols-[44px_minmax(0,1fr)] items-center gap-3 border-b border-border px-4 py-3.5">
        <span className="grid size-11 place-items-center rounded-md bg-surface-2 text-text-2">
          <LayoutDashboard size={20} aria-hidden />
        </span>
        <div className="min-w-0">
          <h2 className="sr-only">{t("design")}</h2>
          <TextField label={t("name")} value={name} placeholder={t("untitled")} variant="title" onCommit={(v) => api.getState().apply((d) => setName(d, v))} />
          <p className="truncate px-1 text-caption text-text-3">
            {t("design")} · {t("designSub")}
          </p>
        </div>
      </header>
      <WorkloadForm workloadParams={workloadParams} />
      <FaultList supported={supportedFaults} metas={metas} />
      {calibration ? <WorldParams defaults={calibration} /> : null}
      <footer className="mt-auto flex items-center gap-2 border-t border-border px-4 py-3">
        <Button
          variant="ghost"
          onClick={() => {
            const { filename, text } = exportDesign(api.getState().design, engineVersion);
            downloadText(filename, text);
          }}
        >
          <Download size={14} aria-hidden />
          {t("exportDesign")}
        </Button>
      </footer>
    </div>
  );
}
