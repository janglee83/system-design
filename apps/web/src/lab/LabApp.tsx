"use client";
import { ReactFlowProvider } from "@xyflow/react";
import { useTranslations } from "next-intl";
import { useEngineStart } from "@/engine/EngineProvider";
import { EngineStatus } from "@/engine/EngineStatus";
import { Canvas } from "./canvas/Canvas";
import type { Design } from "./model/design";
import { LabStoresProvider } from "./store/LabStores";

export function LabApp({ initial }: { initial?: Design }) {
  useEngineStart();
  const t = useTranslations("lab");
  return (
    <LabStoresProvider initial={initial}>
      <ReactFlowProvider>
        <h1 className="sr-only">{t("heading")}</h1>
        <div data-testid="lab-page" className="grid min-h-0 flex-1 grid-cols-[256px_minmax(0,1fr)_320px] grid-rows-[minmax(0,1fr)_auto]">
          <aside aria-label={t("palette")} className="row-span-2 border-r border-border bg-bg" data-tour="palette" />
          <section className="relative min-h-0" data-tour="canvas">
            <Canvas />
            <div className="absolute right-3 bottom-3"><EngineStatus /></div>
          </section>
          <aside aria-label={t("inspector")} className="border-l border-border bg-bg" data-tour="inspector" />
          <div className="col-span-2 border-t border-border bg-bg" data-tour="panel" />
        </div>
      </ReactFlowProvider>
    </LabStoresProvider>
  );
}
