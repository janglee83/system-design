"use client";
import { useLocale, useTranslations } from "next-intl";
import { formatNumber } from "../format";
import { useDesign, usePlayback, useRuns } from "../store/LabStores";
import { usePlaybackView } from "./use-playback-view";

/**
 * The live chip at the top-centre of the canvas (design-system §7.1): while the engine runs, the
 * simulated length; while a run plays, "giây 4,2 / 10", the events so far and how many components
 * are overloaded. Screen readers hear it at most once a second.
 */
export function LiveChip() {
  const t = useTranslations("verdict");
  const locale = useLocale();
  const running = useRuns((s) => s.status === "running");
  const durationMs = useDesign((s) => s.design.durationMs);
  const playing = usePlayback((s) => s.playing);
  const timeMs = usePlayback((s) => s.timeMs);
  const view = usePlaybackView();
  const s = (ms: number) => formatNumber(ms / 1000, locale, 1);
  if (running) {
    return (
      <p data-testid="live-chip" aria-live="polite" className={CHIP}>
        <span aria-hidden className="sd-live-dot size-2 rounded-full bg-accent-text" />
        <span className="num font-semibold">{t("live", { seconds: durationMs / 1000 })}</span>
      </p>
    );
  }
  if (!playing || !view?.active) return null;
  const events = view.run.events.filter((e) => e.atMs <= timeMs).length;
  const over = Object.values(view.states).filter((x) => x === "overloaded").length;
  const total = view.run.input.durationMs;
  return (
    <div data-testid="live-chip" className={CHIP}>
      <span aria-hidden className="sd-live-dot size-2 rounded-full bg-accent-text" />
      <span className="num font-semibold" aria-hidden>
        {t("clock", { now: s(timeMs), total: s(total) })}
      </span>
      <span className="text-text-2" aria-hidden>
        {t("eventsSoFar", { count: events })}
      </span>
      {over > 0 ? (
        <span className="font-semibold text-over" aria-hidden>
          {t("overloadedNow", { count: over })}
        </span>
      ) : null}
      {/* One update per second for screen readers. */}
      <span className="sr-only" aria-live="polite">
        {t("clock", { now: formatNumber(Math.floor(timeMs / 1000), locale, 0), total: s(total) })}
      </span>
    </div>
  );
}

const CHIP = "pointer-events-none absolute top-4 left-1/2 z-10 inline-flex -translate-x-1/2 items-center gap-2 rounded-full bg-surface px-3.5 py-[7px] text-caption shadow-2";
