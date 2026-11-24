"use client";
import { Pause, Play } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useMemo } from "react";
import { cn } from "@/ui/cn";
import { IconButton } from "@/ui/IconButton";
import { formatNumber } from "../format";
import { eventLevel, eventText } from "../panel/event-text";
import { formatCombo } from "../shortcuts";
import { currentRun } from "../store/run-store";
import { usePlayback, usePlaybackApi, useRuns } from "../store/LabStores";
import { useIsMac } from "../use-shortcuts";
import { useMetas } from "../use-metas";
import { formatClock, SPEEDS } from "./clock";
import { Scrubber } from "./Scrubber";

/**
 * The 52 px playback bar under the main row once a run exists (design-system §7.2): pause/play
 * (required, WCAG 2.2.2), the clock, the scrubber with event markers, the end time and the speed.
 */
export function PlaybackBar() {
  const t = useTranslations();
  const locale = useLocale();
  const run = useRuns((s) => currentRun(s));
  const timeMs = usePlayback((s) => s.timeMs);
  const playing = usePlayback((s) => s.playing);
  const speed = usePlayback((s) => s.speed);
  const durationMs = usePlayback((s) => s.durationMs);
  const api = usePlaybackApi();
  const metas = useMetas();
  const mac = useIsMac();
  const markers = useMemo(
    () => (run ? run.events.map((e) => ({ atMs: e.atMs, level: eventLevel(e.code), text: eventText(e, { design: run.snapshot, metas, t }) })) : []),
    [run, metas, t],
  );
  if (!run) return null;
  return (
    <section
      aria-label={t("playback.bar")}
      data-testid="playback-bar"
      className="flex h-[52px] items-center gap-3 border-t border-border bg-surface px-3"
    >
      <IconButton
        label={playing ? t("playback.pause") : t("playback.play")}
        shortcut={formatCombo("Space", mac)}
        onClick={() => api.getState().toggle()}
        className="rounded-md border border-border-strong"
      >
        {playing ? <Pause size={14} aria-hidden fill="currentColor" /> : <Play size={14} aria-hidden fill="currentColor" />}
      </IconButton>
      <span className="num w-[60px] text-[13px] text-text-2" aria-hidden>
        {formatClock(timeMs, locale)}
      </span>
      <Scrubber markers={markers} durationMs={durationMs} timeMs={timeMs} onSeek={(ms) => api.getState().seek(ms)} />
      <span className="num text-[13px] text-text-3" aria-hidden>
        {formatClock(durationMs, locale)}
      </span>
      <div role="radiogroup" aria-label={t("playback.speed")} className="flex items-center rounded-md border border-border bg-surface-2 p-0.5">
        {SPEEDS.map((sp) => (
          <button
            key={sp}
            type="button"
            role="radio"
            aria-checked={speed === sp}
            onClick={() => api.getState().setSpeed(sp)}
            className={cn("num h-6 rounded-sm px-1.5 text-caption text-text-2 hover:text-text", speed === sp && "bg-surface font-semibold text-text shadow-1")}
          >
            {t("playback.speedValue", { speed: formatNumber(sp, locale, sp % 1 === 0 ? 0 : 2) })}
          </button>
        ))}
      </div>
    </section>
  );
}
