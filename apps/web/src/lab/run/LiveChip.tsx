"use client";
import { useTranslations } from "next-intl";
import { useDesign, useRuns } from "../store/LabStores";

/**
 * The live chip at the top-centre of the canvas while a run is on (design-system §7.1). The engine
 * runs in one go, so it shows the simulated length; playback (Task 25) feeds the running clock.
 */
export function LiveChip() {
  const t = useTranslations("verdict");
  const running = useRuns((s) => s.status === "running");
  const durationMs = useDesign((s) => s.design.durationMs);
  if (!running) return null;
  return (
    <p
      data-testid="live-chip"
      aria-live="polite"
      className="pointer-events-none absolute top-4 left-1/2 z-10 inline-flex -translate-x-1/2 items-center gap-2 rounded-full bg-surface px-3.5 py-[7px] text-caption shadow-2"
    >
      <span aria-hidden className="sd-live-dot size-2 rounded-full bg-accent-text" />
      <span className="num font-semibold">{t("live", { seconds: durationMs / 1000 })}</span>
    </p>
  );
}
