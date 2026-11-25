"use client";
import * as Popover from "@radix-ui/react-popover";
import { ChevronDown, Play, Square } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/ui/Button";
import { cn } from "@/ui/cn";
import { Tooltip } from "@/ui/Tooltip";
import { formatCombo } from "../shortcuts";
import { useDesign, useDesignApi, useRuns, useRunsApi, useUiApi } from "../store/LabStores";
import { useIsMac } from "../use-shortcuts";
import type { RunBlock } from "./run-gate";
import { useRunBlock } from "./use-run-block";

/**
 * The Run split button (design-system §2.2), the only accent-filled control in the Lab. While a run
 * is on, the progress block and Stop take its place in the same fixed-width box.
 * Presentation only: running is useRunDesign, stopping is the run store.
 */
export function RunButton({ onRun }: { onRun: () => void }) {
  const status = useRuns((s) => s.status);
  const currentId = useRuns((s) => s.currentId);
  const running = status === "running";
  return (
    <div data-testid="run-bar" data-tour="run" data-status={status} data-run-id={currentId ?? ""} className="flex h-9 w-[264px] items-center justify-end gap-2">
      {running ? <Progress /> : <Split onRun={onRun} />}
    </div>
  );
}

function useBlockText(block: RunBlock | null): string | null {
  const t = useTranslations("run.why");
  if (!block) return null;
  return block.key === "problems" ? t("problems", { count: block.count }) : t(block.key);
}

function Split({ onRun }: { onRun: () => void }) {
  const t = useTranslations("run");
  const block = useRunBlock();
  const why = useBlockText(block);
  const combo = formatCombo("Mod+Enter", useIsMac());
  const enabled = block === null;
  const go = (
    <button
      type="button"
      aria-disabled={!enabled || undefined}
      onClick={enabled ? onRun : undefined}
      className={cn(
        "inline-flex h-full min-w-0 flex-1 items-center gap-2 rounded-l-sm pr-3 pl-3.5 text-body font-semibold whitespace-nowrap",
        "transition-colors duration-(--sd-t-fast) ease-sd",
        enabled ? "bg-accent text-on-accent hover:bg-accent-hover active:brightness-90" : "cursor-not-allowed bg-surface-3 text-text-3",
      )}
    >
      <Play size={14} aria-hidden fill="currentColor" />
      <span className="truncate">{t("go")}</span>
      <kbd className={cn("num ml-auto rounded-xs px-1 text-[11px] leading-4 max-[1400px]:hidden", enabled ? "bg-on-accent/16" : "bg-surface-2")}>{combo}</kbd>
    </button>
  );
  return (
    <div className={cn("flex h-full w-full overflow-hidden rounded-sm", enabled && "shadow-1")}>
      {/* aria-disabled keeps the button focusable, so the reason shows on focus as well as hover. */}
      {why ? <Tooltip content={why} side="bottom">{go}</Tooltip> : go}
      <RunSettings enabled={enabled} />
    </div>
  );
}

function RunSettings({ enabled }: { enabled: boolean }) {
  const t = useTranslations("run");
  const durationMs = useDesign((s) => s.design.durationMs);
  const seed = useDesign((s) => s.design.seed);
  const faults = useDesign((s) => s.design.faults.length);
  const design = useDesignApi();
  const ui = useUiApi();
  return (
    <Popover.Root>
      <Popover.Trigger
        aria-label={t("more")}
        className={cn(
          "inline-flex h-full w-8 shrink-0 items-center justify-center border-l",
          enabled ? "border-on-accent/25 bg-accent text-on-accent hover:bg-accent-hover" : "border-border bg-surface-3 text-text-2 hover:text-text",
        )}
      >
        <ChevronDown size={16} aria-hidden />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content align="end" sideOffset={6} className="z-50 w-64 rounded-lg border border-border bg-surface p-3 shadow-2">
          <dl className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1.5 text-body">
            <dt className="text-text-2">{t("settings.duration")}</dt>
            <dd className="num">{t("duration", { seconds: durationMs / 1000 })}</dd>
            <dt className="text-text-2">{t("settings.seed")}</dt>
            <dd className="num">{seed}</dd>
          </dl>
          <p className="mt-1.5 text-body text-text-2">{t("settings.faults", { count: faults })}</p>
          <Popover.Close asChild>
            <Button
              variant="ghost"
              className="mt-2 -ml-2 text-accent-text"
              onClick={() => {
                design.getState().clearSelection();
                ui.getState().focusInspector();
              }}
            >
              {t("settings.open")}
            </Button>
          </Popover.Close>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function Progress() {
  const t = useTranslations("run");
  const durationMs = useDesign((s) => s.design.durationMs);
  const runs = useRunsApi();
  return (
    <>
      <div className="flex w-[168px] flex-col justify-center gap-1" role="status">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-caption text-text-2">{t("progress")}</span>
          <span className="num text-caption font-semibold">{t("simulated", { seconds: durationMs / 1000 })}</span>
        </div>
        {/* The engine reports no progress while it runs, so the track is indeterminate. */}
        <div className="h-1 overflow-hidden rounded-full bg-surface-3">
          <div className="sd-indeterminate h-full w-1/3 rounded-full bg-accent" />
        </div>
      </div>
      {/* §2.2: a 2 px accent line grows along the bottom edge of the top bar (positioned by the header). */}
      <span aria-hidden className="sd-grow pointer-events-none absolute inset-x-0 bottom-0 h-0.5 origin-left bg-accent" />
      <Button variant="secondary" className="h-9" onClick={() => runs.getState().stop()}>
        <Square size={12} aria-hidden fill="currentColor" />
        {t("stop")}
      </Button>
    </>
  );
}
