"use client";
import * as S from "@radix-ui/react-slider";
import { CircleAlert, Info, TriangleAlert } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { cn } from "@/ui/cn";
import { Tooltip } from "@/ui/Tooltip";
import { formatNumber } from "../format";

export interface ScrubMarker {
  atMs: number;
  level: "info" | "warn" | "error";
  text: string;
}

const RANK = { info: 0, warn: 1, error: 2 } as const;
const ICON = { info: Info, warn: TriangleAlert, error: CircleAlert } as const;
const BORDER = { info: "var(--sd-info)", warn: "var(--sd-busy-line)", error: "var(--sd-over)" } as const;

/** Events in the same 100 ms become one marker, in the most severe colour, listing every text. */
export function mergeMarkers(markers: readonly ScrubMarker[]): ScrubMarker[] {
  const byTick = new Map<number, ScrubMarker>();
  for (const m of markers) {
    const tick = Math.floor(m.atMs / 100);
    const prev = byTick.get(tick);
    byTick.set(
      tick,
      prev
        ? { atMs: prev.atMs, level: RANK[m.level] > RANK[prev.level] ? m.level : prev.level, text: `${prev.text} · ${m.text}` }
        : { atMs: tick * 100, level: m.level, text: m.text },
    );
  }
  return [...byTick.values()].sort((a, b) => a.atMs - b.atMs);
}

/**
 * The playback scrubber (design-system §7.2): a slider (arrows ±0.1 s, PageUp/PageDown ±1 s,
 * Home/End) with focusable event markers above the played line.
 */
export function Scrubber({ markers, durationMs, timeMs, onSeek }: { markers: readonly ScrubMarker[]; durationMs: number; timeMs: number; onSeek: (ms: number) => void }) {
  const t = useTranslations("playback");
  const locale = useLocale();
  const s = (ms: number) => formatNumber(ms / 1000, locale, 1);
  return (
    <div className="relative flex h-9 min-w-0 flex-1 items-center">
      <S.Root
        className="relative flex h-full w-full touch-none items-center select-none"
        min={0}
        max={Math.max(durationMs, 100)}
        step={100}
        value={[timeMs]}
        onValueChange={([v]) => onSeek(v ?? 0)}
      >
        <S.Track className="relative h-0.5 grow rounded-full bg-surface-3">
          <S.Range className="absolute h-full rounded-full bg-accent" />
        </S.Track>
        <S.Thumb
          aria-label={t("time")}
          aria-valuetext={t("timeValue", { now: s(timeMs), total: s(durationMs) })}
          className="block size-3.5 rounded-full border-2 border-accent bg-surface shadow-1"
        />
      </S.Root>
      {mergeMarkers(markers).map((m) => {
        const Icon = ICON[m.level];
        const label = t("marker", { time: s(m.atMs), text: m.text });
        return (
          <Tooltip key={m.atMs} content={label} side="top">
            <button
              type="button"
              aria-label={label}
              data-level={m.level}
              onClick={() => onSeek(m.atMs)}
              className={cn("absolute top-1/2 grid size-4 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-[1.5px] bg-surface")}
              style={{ left: `${(m.atMs / Math.max(durationMs, 1)) * 100}%`, borderColor: BORDER[m.level], color: BORDER[m.level] }}
            >
              <Icon size={9} aria-hidden />
            </button>
          </Tooltip>
        );
      })}
    </div>
  );
}
