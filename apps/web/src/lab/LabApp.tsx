"use client";
import { ReactFlowProvider, useReactFlow } from "@xyflow/react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "@/ui/toast-store";
import { both } from "@/i18n/both";
import { useRegisterCommands } from "@/shell/command-registry";
import type { SearchItem } from "@/shell/search";
import { ConfirmDialog } from "@/ui/ConfirmDialog";
import { downloadText } from "@/ui/download";
import { useEngineStart, useEngineStore } from "@/engine/EngineProvider";
import { TopBarPortal } from "@/shell/top-bar-slot";
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
  toggleMinimap,
  toggleSnap,
  undo,
  ungroupSelection,
} from "./commands";
import { readMinimapChoice } from "./canvas/minimap-model";
import { useAddComponent } from "./canvas/use-add-component";
import { useAutoLayout } from "./canvas/use-auto-layout";
import type { Design } from "./model/design";
import { exportDesign } from "./model/design-file";
import { designFromTemplate, type TemplateId } from "./model/templates";
import { DesignMenu } from "./designs/DesignMenu";
import { DesignsDialog } from "./designs/DesignsDialog";
import { ImportExport, type ImportExportHandle } from "./designs/ImportExport";
import { SaveDialog } from "./designs/SaveDialog";
import { loadDraft, useAutosave } from "./designs/use-autosave";
import { useDocActions } from "./designs/use-doc-actions";
import { Inspector } from "./inspector/Inspector";
import { Palette } from "./palette/Palette";
import { useKindPrices } from "./palette/use-kind-prices";
import { BottomPanel } from "./panel/BottomPanel";
import { Onboarding } from "@/shell/Onboarding";
import { EmptyLab } from "./EmptyLab";
import { EngineBoot } from "./EngineBoot";
import { EngineError } from "./EngineError";
import { Problems } from "./Problems";
import type { ChallengeStart } from "./templates";
import { StatusStrip } from "./StatusStrip";
import { UndoRedo } from "./UndoRedo";
import { LiveChip } from "./run/LiveChip";
import { PlaybackBar } from "./run/PlaybackBar";
import { TraceCard } from "./run/TraceCard";
import { usePlaybackLoop } from "./run/use-playback-loop";
import { RunButton } from "./run/RunButton";
import { Verdict } from "./run/Verdict";
import { useRunDesign } from "./run/use-run-design";
import { LabStoresProvider, useDesign, useDesignApi, useDocApi, usePlaybackApi, useRuns, useRunsApi, useTraceApi, useUiApi } from "./store/LabStores";
import { useLiveValidation } from "./use-live-validation";
import { useLabShortcuts } from "./use-shortcuts";
import { useMetas } from "./use-metas";

export function LabApp({
  planned = [],
  starts = [],
  initial,
  template,
  notFound = false,
}: {
  /** Kinds the engine will support next (curriculum.json), shown as coming soon. */
  planned?: readonly string[];
  /** Challenge starting designs for the empty Lab's template cards. */
  starts?: readonly ChallengeStart[];
  initial?: Design;
  /** `?template=`: built once the engine's component list is known. */
  template?: TemplateId;
  /** `?challenge=` named a challenge or mode that does not exist. */
  notFound?: boolean;
}) {
  useEngineStart();
  const t = useTranslations("lab");
  return (
    <LabStoresProvider initial={initial}>
      <ReactFlowProvider>
        <h1 className="sr-only">{t("heading")}</h1>
        <TopBarPortal name="main">
          <span aria-hidden className="h-5 w-px shrink-0 bg-border" />
          <DesignMenu />
          <div className="ml-auto flex shrink-0 items-center gap-2">
            <UndoRedo />
            <span aria-hidden className="h-5 w-px bg-border" />
            <Problems />
          </div>
        </TopBarPortal>
        <TopBarPortal name="end">
          <RunPane />
        </TopBarPortal>
        <div data-testid="lab-page" className="flex min-h-0 flex-1 flex-col">
          <div className="grid min-h-0 flex-1 grid-cols-[auto_minmax(0,1fr)_368px] grid-rows-[minmax(0,1fr)_auto_auto]">
            <aside aria-label={t("palette")} className="row-span-3 min-h-0" data-tour="palette">
              <PalettePane planned={planned} />
            </aside>
            <CanvasArea starts={starts} />
            <aside aria-label={t("inspector")} className="min-h-0 border-l border-border bg-bg" data-tour="inspector">
              <Inspector />
            </aside>
            <div className="col-span-2 min-w-0">
              <PlaybackBar />
            </div>
            <div className="col-span-2 min-w-0" data-tour="panel">
              <BottomPanel />
            </div>
          </div>
          <StatusStrip />
        </div>
        <ConnectPane />
        <LiveValidation />
        <LabShortcuts />
        <DesignsDialog />
        <SaveDialog />
        <Drafts restore={!initial && !template} />
        <StartFrom template={template} fromChallenge={!!initial} notFound={notFound} />
        <LabCommands />
      </ReactFlowProvider>
    </LabStoresProvider>
  );
}

const NO_METAS: never[] = [];

/** The palette, fed by the engine's component list, the planned kinds and the challenge's allowed kinds. */
function PalettePane({ planned }: { planned: readonly string[] }) {
  const metas = useEngineStore((s) => s.info?.components ?? NO_METAS);
  const allowedKinds = useDesign((s) => s.design.challenge?.limits.allowedKinds ?? null);
  const running = useRuns((s) => s.status === "running");
  const prices = useKindPrices(metas);
  const add = useAddComponent();
  return <Palette metas={metas} planned={planned} onAdd={(k) => add(k)} allowedKinds={allowedKinds} running={running} prices={prices} />;
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
  const runs = useRunsApi();
  const playback = usePlaybackApi();
  const traceApi = useTraceApi();
  usePlaybackLoop();
  const stepHop = (by: number) => {
    const s = traceApi.getState();
    if (!s.trace) return;
    s.setHop(s.hop + by);
    const h = traceApi.getState();
    const step = h.trace?.steps[h.hop];
    if (step) playback.getState().seek(step.tMs);
  };
  // A new run ends the follow of the previous one.
  useEffect(
    () =>
      runs.subscribe((s, prev) => {
        if (s.currentId !== prev.currentId) traceApi.getState().clear();
      }),
    [runs, traceApi],
  );
  // The viewer's minimap choice from this browser, if they ever made one.
  useEffect(() => {
    const saved = readMinimapChoice();
    if (saved !== null) ui.getState().set({ minimapChoice: saved });
  }, [ui]);
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
    connect: () => openConnect(api, ui, (document.activeElement as HTMLElement | null)?.closest<HTMLElement>(".react-flow__node-lab")?.dataset.id),
    inspect: () => {
      const id = (document.activeElement as HTMLElement | null)?.closest<HTMLElement>(".react-flow__node")?.dataset.id;
      if (id) inspectNode(api, ui, id);
    },
    fitView: () => void flow.fitView({ duration: 200 }),
    zoomIn: () => void flow.zoomIn({ duration: 200 }),
    zoomOut: () => void flow.zoomOut({ duration: 200 }),
    toggleSnap: () => toggleSnap(ui),
    toggleMinimap: () => toggleMinimap(ui, api),
    playPause: () => playback.getState().toggle(),
    // [ and ] step between the followed request's hops and move playback there (§7.4).
    prevHop: () => stepHop(-1),
    nextHop: () => stepHop(1),
    layout,
    group: () => groupSelection(api),
    ungroup: () => ungroupSelection(api),
    // Esc stops a run first (§2.2); otherwise it clears the selection.
    escape: () => (runs.getState().status === "running" ? runs.getState().stop() : api.getState().clearSelection()),
  });
  return null;
}

/** The canvas with its states: boot card, error card (design kept, greyed), empty Lab, run feedback (§9). */
function CanvasArea({ starts }: { starts: readonly ChallengeStart[] }) {
  const status = useEngineStore((s) => s.status);
  const empty = useDesign((s) => s.design.nodes.length === 0);
  const booting = status === "loading" || status === "idle";
  return (
    <section className="relative min-h-0" data-tour="canvas" aria-busy={booting || undefined}>
      <div className={status === "error" ? "h-full opacity-45 grayscale" : "h-full"}>
        <Canvas overlay={status === "ready" && empty ? <EmptyLab starts={starts} /> : null} />
      </div>
      <EngineBoot />
      <EngineError />
      {status === "ready" ? <Onboarding firstChallenge={starts[0] ?? null} /> : null}
      <RunFeedback />
    </section>
  );
}

/** The live chip while running and the verdict when a run ends (design-system §7.1, §7.3). */
function RunFeedback() {
  const run = useRunDesign();
  return (
    <>
      <LiveChip />
      <TraceCard />
      <Verdict onRunAgain={run} />
    </>
  );
}

function RunPane() {
  return <RunButton onRun={useRunDesign()} />;
}

/** Autosaves the draft, and restores it once when the Lab opens without a design from the URL (R22). */
function Drafts({ restore }: { restore: boolean }) {
  useAutosave();
  const design = useDesignApi();
  const doc = useDocApi();
  const t = useTranslations("designs");
  const ui = useUiApi();
  useEffect(() => {
    if (!restore) {
      ui.getState().set({ draftChecked: true });
      return;
    }
    let cancelled = false; // StrictMode runs this twice; only the live run restores
    void loadDraft().then((draft) => {
      if (cancelled) return;
      ui.getState().set({ draftChecked: true });
      if (!draft || draft.design.nodes.length === 0) return;
      design.getState().replace(draft.design);
      doc.getState().reset(draft.savedId);
      toast(t("draftRestored"), "info");
    });
    return () => {
      cancelled = true;
    };
  }, [restore, design, doc, ui, t]);
  return null;
}

/** `?template=` and the "no such challenge" notice, once per page load. */
/**
 * Once the start design from `?template=` or `?challenge=` is in place, the URL drops the query:
 * a reload or a language switch then restores the user's draft instead of starting over.
 */
function dropStartQuery() {
  const url = new URL(window.location.href);
  if (!url.searchParams.has("template") && !url.searchParams.has("challenge")) return;
  url.searchParams.delete("template");
  url.searchParams.delete("challenge");
  url.searchParams.delete("mode");
  window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
}

function StartFrom({ template, fromChallenge, notFound }: { template?: TemplateId; fromChallenge: boolean; notFound: boolean }) {
  const design = useDesignApi();
  const doc = useDocApi();
  const metas = useMetas();
  const t = useTranslations("challenges");
  const applied = useRef(false); // once, when the component list first arrives
  useEffect(() => {
    if (!template || metas.size === 0 || applied.current) return;
    applied.current = true;
    design.getState().replace(designFromTemplate(template, metas));
    doc.getState().reset(null);
    dropStartQuery();
  }, [template, metas, design, doc]);
  useEffect(() => {
    if (fromChallenge) dropStartQuery();
  }, [fromChallenge]);
  useEffect(() => {
    if (notFound) toast(t("notFound"), "warn");
  }, [notFound, t]);
  return null;
}

/** The Lab's commands and component adds in the command palette (R25). */
function LabCommands() {
  const design = useDesignApi();
  const doc = useDocApi();
  const ui = useUiApi();
  const flow = useReactFlow();
  const metas = useMetas();
  const run = useRunDesign();
  const layout = useAutoLayout();
  const add = useAddComponent();
  const docActions = useDocActions();
  const engineVersion = useEngineStore((s) => s.info?.version ?? "");
  const io = useRef<ImportExportHandle>(null);
  const [confirmNew, setConfirmNew] = useState<TemplateId | null>(null);
  const t = useTranslations("designs");
  // Starting over asks first when there are unsaved changes, as the Design menu does.
  const startNew = useCallback(
    (id: TemplateId) => (doc.getState().dirty ? setConfirmNew(id) : docActions.newFrom(id)),
    [doc, docActions],
  );

  const items = useMemo<SearchItem[]>(() => {
    const cmd = (id: string, key: string, go: () => void): SearchItem => ({ id: `cmd-${id}`, group: "command", title: both(`palette2.cmd.${key}`), run: go });
    return [
      cmd("run", "run", run),
      cmd("fit", "fitView", () => void flow.fitView({ duration: 200 })),
      cmd("layout", "layout", layout),
      cmd("minimap", "minimap", () => toggleMinimap(ui, design)),
      cmd("open", "open", () => ui.getState().set({ designsOpen: true })),
      cmd("save", "save", docActions.save),
      cmd("export", "export", () => {
        const { filename, text } = exportDesign(design.getState().design, engineVersion);
        downloadText(filename, text);
      }),
      cmd("import", "import", () => io.current?.openImport()),
      cmd("new-empty", "newEmpty", () => startNew("empty")),
      cmd("new-webdb", "newWebDb", () => startNew("webDb")),
      ...[...metas.values()].map((m) => ({
        id: `cmp-${m.kind}`,
        group: "component" as const,
        title: both("palette2.cmd.add", { name: both(m.labelKey) }),
        subtitle: both(`componentDescription.${m.kind}`),
        keywords: [m.kind, both(m.labelKey).vi, both(m.labelKey).en],
        run: () => void add(m.kind),
      })),
    ];
  }, [run, flow, layout, ui, docActions, design, engineVersion, metas, add, startNew]);
  useRegisterCommands("lab", items);

  return (
    <>
      <ImportExport ref={io} />
      <ConfirmDialog
        open={confirmNew !== null}
        onOpenChange={(o) => {
          if (!o) setConfirmNew(null);
        }}
        title={t("discard")}
        confirmLabel={t("new")}
        onConfirm={() => {
          if (confirmNew) docActions.newFrom(confirmNew);
        }}
      />
    </>
  );
}
