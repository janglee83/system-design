"use client";
import { Check, ChevronDown, ChevronUp } from "lucide-react";
import { useReactFlow } from "@xyflow/react";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePaletteDrag } from "@/lab/palette/use-palette-drag";
import { useRouter } from "@/i18n/navigation";
import { currentRun } from "@/lab/store/run-store";
import { useDesign, useRuns, useUi } from "@/lab/store/LabStores";
import type { ChallengeStart } from "@/lab/templates";
import { Button } from "@/ui/Button";
import { cn } from "@/ui/cn";
import { IconButton } from "@/ui/IconButton";
import { CoachBubble, COACH_STEPS } from "./CoachBubble";
import { ONBOARDING_TASKS, tickTasks, type OnboardingTask } from "./onboarding-model";
import { useOnboardingSlot } from "./onboarding-slot";
import { useOnboarding } from "./onboarding-store";

/**
 * The first-run checklist (design-system §10): a card at the canvas's bottom left that ticks itself
 * from the design and the runs. Pointer events pass everywhere outside the card, and through it
 * while a component is dragged. Until the first run it sits in the results panel instead, so it
 * never covers the empty Lab's cards (QA).
 */
export function Onboarding({ firstChallenge }: { firstChallenge: ChallengeStart | null }) {
  const t = useTranslations("onboarding");
  const router = useRouter();
  const { hidden, done, loaded, load, setDone, hide } = useOnboarding();
  const nodes = useDesign((s) => s.design.nodes);
  const edges = useDesign((s) => s.design.edges);
  const ran = useRuns((s) => s.runs.length > 0);
  const passedSeen = useRuns((s) => currentRun(s)?.verdict?.passed === true);
  const whyUsed = useUi((s) => s.whyUsed);
  const [collapsed, setCollapsed] = useState(false);
  const [coach, setCoach] = useState<OnboardingTask | null>(null);
  const showMe = useRef<HTMLButtonElement>(null);
  const dragging = usePaletteDrag();
  const slot = useOnboardingSlot((s) => s.slot);

  useEffect(() => {
    if (!loaded) load();
  }, [loaded, load]);
  const ticked = useMemo(() => tickTasks(done, { nodes, edges }, { ran, whyUsed, passedSeen }), [done, nodes, edges, ran, whyUsed, passedSeen]);
  useEffect(() => {
    if (loaded) setDone(ticked);
  }, [loaded, ticked, setDone]);

  // §10: on first open the canvas fit leaves room for the card (it sits over the bottom left).
  const flow = useReactFlow();
  const cardRef = useRef<HTMLElement>(null);
  const fitted = useRef(false);
  const visible = loaded && !hidden;
  const hasNodes = nodes.length > 0;
  useEffect(() => {
    if (!visible || !hasNodes || fitted.current) return;
    fitted.current = true;
    const id = requestAnimationFrame(() => {
      // Only the corner card covers the canvas.
      const h = cardRef.current?.dataset.placement === "corner" ? cardRef.current.getBoundingClientRect().height : 0;
      void flow.fitView({ duration: 200, maxZoom: 1, padding: { top: "48px", left: "48px", right: "48px", bottom: `${Math.round(h + 32)}px` } });
    });
    return () => cancelAnimationFrame(id);
  }, [visible, hasNodes, flow]);

  if (!loaded || hidden) return null;
  // In the corner over an empty Lab (every node deleted after a run) it would cover the cards.
  if (!slot && nodes.length === 0) return null;
  const count = ticked.length;
  const complete = count === ONBOARDING_TASKS.length;
  const current = ONBOARDING_TASKS.find((x) => !ticked.includes(x));
  const ring = 2 * Math.PI * 17;
  const section = (
      <section
        ref={cardRef}
        aria-label={t("label", { done: count })}
        data-testid="onboarding"
        data-placement={slot ? "panel" : "corner"}
        className={cn(
          "z-10 w-[320px] rounded-lg border border-border bg-surface",
          slot ? "shadow-1" : "absolute bottom-3.5 left-4 shadow-3",
          dragging ? "pointer-events-none" : "pointer-events-auto",
        )}
      >
        <header className="flex items-center gap-3 px-3 py-2.5">
          <svg width="40" height="40" viewBox="0 0 40 40" aria-hidden className="shrink-0 -rotate-90">
            <circle cx="20" cy="20" r="17" fill="none" stroke="var(--sd-surface-3)" strokeWidth="5" />
            <circle cx="20" cy="20" r="17" fill="none" stroke="var(--sd-ok)" strokeWidth="5" strokeLinecap="round" strokeDasharray={`${(count / 5) * ring} ${ring}`} />
          </svg>
          <div className="min-w-0 flex-1">
            <p className="text-body font-semibold">{complete ? t("doneTitle") : t("title")}</p>
            <p className="text-caption text-text-3">{t("progress", { done: count })}</p>
          </div>
          <IconButton label={collapsed ? t("expand") : t("collapse")} className="size-7" onClick={() => setCollapsed(!collapsed)}>
            {collapsed ? <ChevronUp size={14} aria-hidden /> : <ChevronDown size={14} aria-hidden />}
          </IconButton>
        </header>
        {collapsed ? null : (
          <>
            <ol className="flex flex-col gap-0.5 px-2 pb-2">
              {ONBOARDING_TASKS.map((task) => {
                const isDone = ticked.includes(task);
                const isCurrent = task === current;
                return (
                  <li key={task} data-done={isDone ? "" : undefined} className={cn("flex items-center gap-2.5 rounded-md px-1.5 py-1.5", isCurrent && "bg-accent-soft")}>
                    <span
                      aria-hidden
                      className={cn("grid size-[22px] shrink-0 place-items-center rounded-full border-2", isDone ? "border-ok bg-ok text-surface" : "border-border-strong")}
                    >
                      {isDone ? <Check size={12} strokeWidth={3} /> : null}
                    </span>
                    <span className={cn("min-w-0 flex-1 text-body", isDone && "text-text-3 line-through")}>{t(`task.${task}`)}</span>
                    {isCurrent && task in COACH_STEPS ? (
                      <button ref={showMe} type="button" className="shrink-0 text-caption font-semibold text-accent-text hover:underline" onClick={() => setCoach(task)}>
                        {t("showMe")}
                      </button>
                    ) : null}
                  </li>
                );
              })}
            </ol>
            {complete && firstChallenge ? (
              <div className="flex items-center gap-2 border-t border-border px-3 py-2 text-caption">
                <span className="min-w-0 flex-1">{t("next", { title: firstChallenge.title })}</span>
                <Button size="sm" variant="primary" onClick={() => router.push(`/lab?challenge=${firstChallenge.id}`)}>
                  {t("start")}
                </Button>
              </div>
            ) : null}
            <footer className="flex items-center gap-2 border-t border-border px-3 py-2 text-caption text-text-3">
              <span className="flex-1">{t("footer")}</span>
              <Button size="sm" variant="ghost" onClick={hide}>
                {t("hide")}
              </Button>
            </footer>
          </>
        )}
      </section>
  );
  return (
    <>
      {slot ? createPortal(section, slot) : section}
      {coach ? (
        <CoachBubble
          task={coach}
          onClose={() => {
            setCoach(null);
            showMe.current?.focus(); // focus returns to "Chỉ cho tôi"
          }}
          onNext={(next) => setCoach(next)}
        />
      ) : null}
    </>
  );
}
