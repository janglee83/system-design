"use client";
import { LoaderCircle, Play } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/ui/Button";
import { Tooltip } from "@/ui/Tooltip";
import { formatCombo } from "../shortcuts";
import { useCanRun, useDesign, useRuns } from "../store/LabStores";
import { useIsMac } from "../use-shortcuts";

/** The floating run bar (top-centre of the canvas). Presentation only: running is useRunDesign. */
export function RunBar({ onRun }: { onRun: () => void }) {
  const t = useTranslations("run");
  const canRun = useCanRun();
  const status = useRuns((s) => s.status);
  const currentId = useRuns((s) => s.currentId);
  const durationMs = useDesign((s) => s.design.durationMs);
  const mac = useIsMac();
  const running = status === "running";
  const combo = formatCombo("Mod+Enter", mac);
  const button = (
    <Button variant="primary" disabled={!canRun || running} onClick={onRun}>
      {running ? <LoaderCircle size={14} aria-hidden className="animate-spin" /> : <Play size={14} aria-hidden />}
      {running ? t("running") : t("run")}
      <kbd className="num ml-1 text-2xs opacity-80">{combo}</kbd>
    </Button>
  );
  return (
    <div
      data-testid="run-bar"
      data-status={status}
      data-run-id={currentId ?? ""}
      className="flex h-10 items-center gap-2 rounded-xl border border-border bg-surface px-1.5 shadow-2"
    >
      {/* A disabled button gets no pointer events, so the "why" tooltip sits on a wrapper. */}
      {canRun || running ? button : <Tooltip content={t("blocked")}><span tabIndex={0}>{button}</span></Tooltip>}
      <span className="h-5 w-px bg-border" aria-hidden />
      <span className="num px-1 text-xs text-text-2">{t("duration", { seconds: durationMs / 1000 })}</span>
    </div>
  );
}
