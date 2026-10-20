"use client";
import { ReactFlowProvider } from "@xyflow/react";
import { useTranslations } from "next-intl";
import { useEngineStart, useEngineStore } from "@/engine/EngineProvider";
import { EngineStatus } from "@/engine/EngineStatus";
import { Canvas } from "./canvas/Canvas";
import { useAddComponent } from "./canvas/use-add-component";
import type { Design } from "./model/design";
import { Palette } from "./palette/Palette";
import { LabStoresProvider, useDesign } from "./store/LabStores";

export function LabApp({ initial }: { initial?: Design }) {
  useEngineStart();
  const t = useTranslations("lab");
  return (
    <LabStoresProvider initial={initial}>
      <ReactFlowProvider>
        <h1 className="sr-only">{t("heading")}</h1>
        <div data-testid="lab-page" className="grid min-h-0 flex-1 grid-cols-[256px_minmax(0,1fr)_320px] grid-rows-[minmax(0,1fr)_auto]">
          <aside aria-label={t("palette")} className="row-span-2 min-h-0 border-r border-border bg-bg" data-tour="palette">
            <PalettePane />
          </aside>
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

const NO_METAS: never[] = [];

/** The palette, fed by the engine's component list and the challenge's allowed kinds. */
function PalettePane() {
  const metas = useEngineStore((s) => s.info?.components ?? NO_METAS);
  const allowedKinds = useDesign((s) => s.design.challenge?.limits.allowedKinds ?? null);
  const add = useAddComponent();
  return <Palette metas={metas} onAdd={(k) => add(k)} allowedKinds={allowedKinds} />;
}
