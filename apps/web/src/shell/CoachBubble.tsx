"use client";
import { useTranslations } from "next-intl";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Button } from "@/ui/Button";
import { cn } from "@/ui/cn";
import type { OnboardingTask } from "./onboarding-model";

/** "Chỉ cho tôi" steps: which `[data-tour]` target each task spotlights (design-system §10). */
export const COACH_STEPS: Partial<Record<OnboardingTask, { n: number; target: string }>> = {
  addClient: { n: 1, target: "palette" },
  connectWeb: { n: 2, target: "canvas" },
  addDatabase: { n: 3, target: "palette" },
  firstRun: { n: 4, target: "run" },
};
const ORDER = Object.keys(COACH_STEPS) as OnboardingTask[];

/**
 * One coach step: a spotlight on the target (box-shadow ring plus scrim) and a 320 px card beside it.
 * Esc or Bỏ qua closes it; the caller returns focus.
 */
export function CoachBubble({ task, onClose, onNext }: { task: OnboardingTask; onClose: () => void; onNext: (next: OnboardingTask) => void }) {
  const t = useTranslations("onboarding.coach");
  const step = COACH_STEPS[task]!;
  const [rect, setRect] = useState<DOMRect | null>(null);
  const card = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`);
    setRect(el ? el.getBoundingClientRect() : null);
  }, [step.target]);
  useEffect(() => {
    card.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, task]);

  const next = ORDER[ORDER.indexOf(task) + 1];
  // Beside the target: to its right when there is room, else below it.
  const left = rect ? (rect.right + 340 < window.innerWidth ? rect.right + 16 : Math.max(16, rect.left)) : 16;
  const top = rect ? (rect.right + 340 < window.innerWidth ? rect.top + 16 : rect.bottom + 12) : 80;
  return (
    <>
      {rect ? (
        <div
          aria-hidden
          data-testid="coach-spotlight"
          className="pointer-events-none fixed z-40 rounded-lg"
          style={{ left: rect.left, top: rect.top, width: rect.width, height: rect.height, boxShadow: "0 0 0 4px var(--sd-accent-text), 0 0 0 9999px var(--sd-scrim)" }}
        />
      ) : null}
      <div
        ref={card}
        role="dialog"
        aria-label={t("step", { n: step.n })}
        tabIndex={-1}
        className="fixed z-50 w-[320px] rounded-lg border border-border bg-surface p-4 shadow-3 outline-none"
        style={{ left, top: Math.min(top, window.innerHeight - 220) }}
      >
        <p className="num text-caption text-accent-text">{t("step", { n: step.n })}</p>
        <p className="mt-1 text-heading">{t(`${task}.title`)}</p>
        <p className="mt-1 text-body text-text-2">{t(`${task}.text`)}</p>
        <div className="mt-3 flex items-center gap-2">
          <span aria-hidden className="flex gap-1">
            {ORDER.map((x) => (
              <span key={x} className={cn("size-1.5 rounded-full", x === task ? "bg-accent-text" : "bg-surface-3")} />
            ))}
          </span>
          <Button size="sm" variant="ghost" className="ml-auto" onClick={onClose}>
            {t("skip")}
          </Button>
          <Button size="sm" variant="primary" onClick={() => (next ? onNext(next) : onClose())}>
            {next ? t("next") : t("done")}
          </Button>
        </div>
      </div>
    </>
  );
}
