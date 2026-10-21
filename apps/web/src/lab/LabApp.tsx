"use client";
import { ReactFlowProvider, useReactFlow } from "@xyflow/react";
import { useTranslations } from "next-intl";
import { useEngineStart, useEngineStore } from "@/engine/EngineProvider";
import { EngineStatus } from "@/engine/EngineStatus";
import { Canvas } from "./canvas/Canvas";
import { ConnectDialog } from "./canvas/ConnectDialog";
import {
  copySelection,
  deleteSelection,
  duplicateSelection,
  groupSelection,
  inspectNode,
  openConnect,
  pasteClipboard,
  redo,
  selectAll,
  toggleSnap,
  undo,
  ungroupSelection,
} from "./commands";
import { useAddComponent } from "./canvas/use-add-component";
import { useAutoLayout } from "./canvas/use-auto-layout";
import type { Design } from "./model/design";
import { Inspector } from "./inspector/Inspector";
import { Palette } from "./palette/Palette";
import { Problems } from "./Problems";
import { LabStoresProvider, useDesign, useDesignApi, useUiApi } from "./store/LabStores";
import { useLiveValidation } from "./use-live-validation";
import { useLabShortcuts } from "./use-shortcuts";
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
            {/* Bottom-left, beside the canvas controls: clear of the minimap at any width. */}
            <div className="absolute bottom-3 left-16">
              <Problems />
            </div>
            {/* Top-right: the minimap is bottom-right, controls bottom-left, the legend top-left. */}
            <div className="absolute top-3 right-3">
              <EngineStatus />
            </div>
          </section>
          <aside aria-label={t("inspector")} className="min-h-0 border-l border-border bg-bg" data-tour="inspector">
            <Inspector />
          </aside>
          <div className="col-span-2 border-t border-border bg-bg" data-tour="panel" />
        </div>
        <ConnectPane />
        <LiveValidation />
        <LabShortcuts />
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

/** Editing and view shortcuts (one table: shortcuts.ts). Run and playback shortcuts come later. */
function LabShortcuts() {
  const api = useDesignApi();
  const ui = useUiApi();
  const flow = useReactFlow();
  const layout = useAutoLayout();
  useLabShortcuts({
    undo: () => undo(api),
    redo: () => redo(api),
    delete: () => deleteSelection(api),
    duplicate: () => duplicateSelection(api),
    copy: () => copySelection(api),
    paste: () => pasteClipboard(api),
    selectAll: () => selectAll(api),
    connect: () => openConnect(api, ui),
    inspect: () => {
      const id = (document.activeElement as HTMLElement | null)?.closest<HTMLElement>(".react-flow__node")?.dataset.id;
      if (id) inspectNode(api, ui, id);
    },
    fitView: () => void flow.fitView({ duration: 200 }),
    zoomIn: () => void flow.zoomIn({ duration: 200 }),
    zoomOut: () => void flow.zoomOut({ duration: 200 }),
    toggleSnap: () => toggleSnap(ui),
    layout,
    group: () => groupSelection(api),
    ungroup: () => ungroupSelection(api),
    escape: () => api.getState().clearSelection(),
  });
  return null;
}
