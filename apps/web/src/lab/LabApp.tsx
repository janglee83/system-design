"use client";
import { ReactFlowProvider } from "@xyflow/react";
import { useTranslations } from "next-intl";
import { useEngineStart, useEngineStore } from "@/engine/EngineProvider";
import { EngineStatus } from "@/engine/EngineStatus";
import { Canvas } from "./canvas/Canvas";
import { ConnectDialog } from "./canvas/ConnectDialog";
import { useAddComponent } from "./canvas/use-add-component";
import type { Design } from "./model/design";
import { Inspector } from "./inspector/Inspector";
import { Palette } from "./palette/Palette";
import { Problems } from "./Problems";
import { LabStoresProvider, useDesign } from "./store/LabStores";
import { useLiveValidation } from "./use-live-validation";
import { useMetas } from "./use-metas";

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
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2">
              <Problems />
            </div>
            <div className="absolute right-3 bottom-3"><EngineStatus /></div>
          </section>
          <aside aria-label={t("inspector")} className="min-h-0 border-l border-border bg-bg" data-tour="inspector">
            <Inspector />
          </aside>
          <div className="col-span-2 border-t border-border bg-bg" data-tour="panel" />
        </div>
        <ConnectPane />
        <LiveValidation />
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

function ConnectPane() {
  return <ConnectDialog metas={useMetas()} />;
}

/** Keeps problems and node costs in step with the design (inside the stores provider). */
function LiveValidation() {
  useLiveValidation();
  return null;
}
