"use client";
import { ReactFlowProvider, useReactFlow } from "@xyflow/react";
import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { toast } from "@/ui/toast-store";
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
import { DesignMenu } from "./designs/DesignMenu";
import { DesignsDialog } from "./designs/DesignsDialog";
import { SaveDialog } from "./designs/SaveDialog";
import { loadDraft, useAutosave } from "./designs/use-autosave";
import { useDocActions } from "./designs/use-doc-actions";
import { Inspector } from "./inspector/Inspector";
import { Palette } from "./palette/Palette";
import { BottomPanel } from "./panel/BottomPanel";
import { Problems } from "./Problems";
import { RunBar } from "./run/RunBar";
import { useRunDesign } from "./run/use-run-design";
import { LabStoresProvider, useDesign, useDesignApi, useDocApi, useUiApi } from "./store/LabStores";
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
            <div className="flex h-full min-h-0 flex-col">
              <DesignMenu />
              <div className="min-h-0 flex-1">
                <PalettePane />
              </div>
            </div>
          </aside>
          <section className="relative min-h-0" data-tour="canvas">
            <Canvas />
            {/* Bottom-left, beside the canvas controls: clear of the minimap at any width. */}
            <div className="absolute bottom-3 left-16">
              <Problems />
            </div>
            <div className="absolute top-3 left-1/2 -translate-x-1/2">
              <RunPane />
            </div>
            {/* Top-right: the minimap is bottom-right, controls bottom-left, the legend top-left. */}
            <div className="absolute top-3 right-3">
              <EngineStatus />
            </div>
          </section>
          <aside aria-label={t("inspector")} className="min-h-0 border-l border-border bg-bg" data-tour="inspector">
            <Inspector />
          </aside>
          <div className="col-span-2 min-w-0" data-tour="panel">
            <BottomPanel />
          </div>
        </div>
        <ConnectPane />
        <LiveValidation />
        <LabShortcuts />
        <DesignsDialog />
        <SaveDialog />
        <Drafts restore={!initial} />
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
  const run = useRunDesign();
  const docActions = useDocActions();
  useLabShortcuts({
    save: docActions.save,
    open: () => ui.getState().set({ designsOpen: true }),
    run,
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

function RunPane() {
  return <RunBar onRun={useRunDesign()} />;
}

/** Autosaves the draft, and restores it once when the Lab opens without a design from the URL (R22). */
function Drafts({ restore }: { restore: boolean }) {
  useAutosave();
  const design = useDesignApi();
  const doc = useDocApi();
  const t = useTranslations("designs");
  useEffect(() => {
    if (!restore) return;
    let cancelled = false; // StrictMode runs this twice; only the live run restores
    void loadDraft().then((draft) => {
      if (cancelled || !draft || draft.design.nodes.length === 0) return;
      design.getState().replace(draft.design);
      doc.getState().reset(draft.savedId);
      toast(t("draftRestored"), "info");
    });
    return () => {
      cancelled = true;
    };
  }, [restore, design, doc, t]);
  return null;
}
