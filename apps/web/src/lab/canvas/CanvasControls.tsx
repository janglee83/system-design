"use client";
import * as Popover from "@radix-ui/react-popover";
import { useReactFlow, useStore } from "@xyflow/react";
import { CircleCheck, Gauge, Grid3x3, Info, LayoutGrid, Map as MapIcon, Maximize, Minus, Plus, PowerOff, TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { EDGE_KINDS } from "@/i18n/engine-codes";
import { cn } from "@/ui/cn";
import { IconButton } from "@/ui/IconButton";
import { toggleMinimap, toggleSnap } from "../commands";
import { formatCombo, SHORTCUTS, type ShortcutId } from "../shortcuts";
import { useDesign, useDesignApi, useUi, useUiApi } from "../store/LabStores";
import { useIsMac } from "../use-shortcuts";
import { usePlaybackView } from "../run/use-playback-view";
import { legendCounts } from "./edge-geometry";
import { minimapVisible } from "./minimap-model";
import { useAutoLayout } from "./use-auto-layout";

const LEGEND_KEY = "sd-legend-open";

/** Whether the minimap shows now: the viewer's choice, else automatically above 20 nodes. */
export function useMinimapShown(): boolean {
  const choice = useUi((s) => s.minimapChoice);
  const nodes = useDesign((s) => s.design.nodes.length);
  return minimapVisible({ nodes, manual: choice });
}
const Sep = () => <span aria-hidden className="mx-0.5 h-5 w-px bg-border" />;

/** The one controls cluster at the canvas's bottom-right (design-system §6.3). */
export function CanvasControls() {
  const t = useTranslations("lab");
  const flow = useReactFlow();
  const ui = useUiApi();
  const layout = useAutoLayout();
  const snap = useUi((s) => s.snap);
  const minimap = useMinimapShown();
  const api = useDesignApi();
  const zoom = useStore((s) => s.transform[2]);
  const mac = useIsMac();
  const combo = (id: ShortcutId) => formatCombo(SHORTCUTS.find((s) => s.id === id)!.keys[0], mac);
  const percent = Math.round(zoom * 100);
  return (
    <div
      role="toolbar"
      aria-label={t("controls")}
      className="flex items-center gap-0.5 rounded-md border border-border bg-surface p-[3px] shadow-2"
    >
      <IconButton label={t("zoomOut")} shortcut={combo("zoomOut")} onClick={() => void flow.zoomOut({ duration: 200 })}>
        <Minus size={16} aria-hidden />
      </IconButton>
      <span className="num w-11 text-center text-caption text-text-2" aria-label={t("zoomLevel", { percent })}>
        {percent}%
      </span>
      <IconButton label={t("zoomIn")} shortcut={combo("zoomIn")} onClick={() => void flow.zoomIn({ duration: 200 })}>
        <Plus size={16} aria-hidden />
      </IconButton>
      <IconButton label={t("fitView")} shortcut={combo("fitView")} onClick={() => void flow.fitView({ duration: 200 })}>
        <Maximize size={16} aria-hidden />
      </IconButton>
      <Sep />
      <IconButton label={t("autoLayout")} shortcut={combo("layout")} onClick={layout}>
        <LayoutGrid size={16} aria-hidden />
      </IconButton>
      <IconButton label={t("snap")} shortcut={combo("toggleSnap")} active={snap} onClick={() => toggleSnap(ui)}>
        <Grid3x3 size={16} aria-hidden />
      </IconButton>
      <Sep />
      <IconButton
        label={minimap ? t("minimap.hide") : t("minimap.show")}
        shortcut={combo("toggleMinimap")}
        active={minimap}
        data-testid="minimap-toggle"
        onClick={() => toggleMinimap(ui, api)}
      >
        <MapIcon size={16} aria-hidden />
      </IconButton>
      <Legend />
    </div>
  );
}

const STATE_ICON = { normal: CircleCheck, busy: Gauge, overloaded: TriangleAlert, down: PowerOff } as const;
const STATE_TONE = { normal: "ok", busy: "busy", overloaded: "over", down: "down" } as const;
const STATES = ["normal", "busy", "overloaded", "down"] as const;

/** While a run plays, the legend also explains the component states (icon and word, never colour alone). */
function StateLegend() {
  const t = useTranslations("state");
  return (
    <div className="mt-3 border-t border-border pt-2">
      <p className="pb-1.5 text-label font-semibold">{t("title")}</p>
      <ul className="flex flex-col gap-1">
        {STATES.map((s) => {
          const Icon = STATE_ICON[s];
          const tone = STATE_TONE[s];
          return (
            <li key={s} className="flex items-center gap-2 text-caption">
              <span
                aria-hidden
                className="grid size-4 place-items-center rounded-xs border-2"
                style={{ background: `var(--sd-${tone}-soft)`, borderColor: tone === "busy" ? "var(--sd-busy-line)" : `var(--sd-${tone})`, color: `var(--sd-${tone})` }}
              >
                <Icon size={9} />
              </span>
              {t(s)}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Chú giải: the connection kinds with how many edges use each; closed by default, remembered. */
function Legend() {
  const t = useTranslations();
  const edges = useDesign((s) => s.design.edges);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    try {
      setOpen(window.localStorage.getItem(LEGEND_KEY) === "1");
    } catch {
      // storage blocked: closed
    }
  }, []);
  const counts = legendCounts(edges);
  const active = usePlaybackView()?.active ?? false;
  return (
    <Popover.Root
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        try {
          window.localStorage.setItem(LEGEND_KEY, o ? "1" : "0");
        } catch {
          // storage blocked: remembered for this page only
        }
      }}
    >
      <Popover.Trigger
        aria-pressed={open}
        className={cn(
          "inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-label text-text-2 hover:bg-surface-2 hover:text-text",
          open && "bg-accent-soft text-accent-text",
        )}
      >
        <Info size={14} aria-hidden />
        {t("lab.legend.button")}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          side="top"
          align="end"
          sideOffset={8}
          onInteractOutside={(e) => e.preventDefault()}
          className="z-40 w-[250px] rounded-lg border border-border bg-surface p-3 shadow-2"
        >
          <p className="pb-2 text-label font-semibold">{t("lab.legend.title")}</p>
          <ul className="flex flex-col gap-1.5">
            {EDGE_KINDS.map((k) => (
              <li key={k} className={cn("flex items-center gap-2 text-body", counts[k] === 0 && "text-text-3")}>
                <svg width="30" height="8" aria-hidden className="shrink-0">
                  <line x1="1" y1="4" x2="29" y2="4" stroke={`var(--sd-edge-${k})`} strokeWidth="1.8" strokeDasharray={`var(--sd-dash-${k})`} strokeLinecap="round" />
                </svg>
                <span className="flex-1">{t(`edgeKind.${k}`)}</span>
                <span className="num text-caption">{counts[k] === 0 ? t("lab.legend.unused") : t("lab.legend.count", { count: counts[k] })}</span>
              </li>
            ))}
          </ul>
          {active ? <StateLegend /> : null}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
