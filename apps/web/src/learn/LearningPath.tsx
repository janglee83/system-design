"use client";
import { BookOpen, Check, Flag, Route } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { formatNumber } from "@/lab/format";
import { cn } from "@/ui/cn";
import type { LearnChallenge, LearnLevel } from "./learn-data";

const READY_TONE = { ready: "bg-ok-soft text-ok", waiting: "bg-surface-3 text-text-2", noLab: "bg-surface-3 text-text-2" } as const;

/** Difficulty as three dots (never colour or bars alone). */
function Dots({ n }: { n: number }) {
  const t = useTranslations("learn");
  return (
    <span role="img" aria-label={t("difficulty", { n })} className="inline-flex gap-0.5 align-middle">
      {[1, 2, 3].map((i) => (
        <span key={i} className={cn("size-1.5 rounded-full", i <= n ? "bg-text-2" : "border border-border-strong")} />
      ))}
    </span>
  );
}

/** A challenge milestone: a flag station and a dashed card with modes, load and readiness. */
export function Milestone({ c, locked }: { c: LearnChallenge; locked: boolean }) {
  const t = useTranslations();
  const locale = useLocale();
  return (
    <li id={c.id} className="grid grid-cols-[48px_minmax(0,1fr)] items-start gap-3">
      <span aria-hidden className="relative z-[1] grid size-12 place-items-center rounded-lg border-2 border-busy-line bg-busy-soft text-busy">
        <Flag size={18} />
      </span>
      <div className="rounded-md border border-dashed border-border-strong bg-surface p-3">
        <p className="text-[14.5px] leading-5 font-semibold">{c.title}</p>
        <p className="mt-1 flex flex-wrap items-center gap-2 text-caption text-text-3">
          <span>{t("learn.milestone", { modes: c.modes, rps: formatNumber(c.baseRps, locale, 0) })}</span>
          <span className={cn("rounded-full px-2 py-px font-medium", READY_TONE[c.readiness])}>{t(`learn.ready.${c.readiness}`)}</span>
        </p>
        {c.prerequisites.length > 0 ? (
          <p className="mt-1 text-caption text-text-3">
            {t("challenges.prereqs")}{" "}
            {c.prerequisites.map((p) => (
              <span key={p.id} className="after:content-[',_'] last:after:content-none">
                <Link href={`/learn#${p.id}`} className="text-accent-text hover:underline">
                  {p.title}
                </Link>
              </span>
            ))}
          </p>
        ) : null}
        {c.readiness === "ready" && !locked ? (
          <Link href={`/lab?challenge=${c.id}`} className="mt-2 inline-flex h-7 items-center rounded-sm border border-border-strong px-2 text-label hover:bg-surface-2">
            {t("learn.openLab")}
          </Link>
        ) : null}
      </div>
    </li>
  );
}

/** The level's path (design-system §11): stations down a line, lessons then the challenge milestones. */
export function LearningPath({ level, done, currentLesson, locked }: { level: LearnLevel; done: ReadonlySet<string>; currentLesson: string | null; locked: boolean }) {
  const t = useTranslations("learn");
  return (
    <ol className="relative flex flex-col gap-3 before:absolute before:top-6 before:bottom-6 before:left-[23px] before:w-0.5 before:bg-border" data-testid="learning-path">
      {level.lessons.map((l) => {
        const isDone = done.has(l.id);
        const isCurrent = l.id === currentLesson && !locked;
        const KindIcon = l.kind === "experiment" ? Route : BookOpen;
        return (
          <li key={l.id} id={l.id} className="grid grid-cols-[48px_minmax(0,1fr)_auto] items-center gap-3">
            <span
              aria-hidden
              className={cn(
                "relative z-[1] grid size-12 place-items-center rounded-full border-2",
                isDone ? "border-ok bg-ok text-surface" : isCurrent ? "border-accent-text bg-surface text-accent-text shadow-[0_0_0_5px_var(--sd-accent-soft)]" : "border-border-strong bg-surface text-text-2",
              )}
            >
              {isDone ? <Check size={18} strokeWidth={3} /> : <KindIcon size={18} />}
            </span>
            <div className={cn("rounded-md border border-border bg-surface p-3", isCurrent && "shadow-2")}>
              <p className="text-[14.5px] leading-5 font-semibold">{l.title}</p>
              <p className="mt-0.5 flex items-center gap-2 text-caption text-text-3">
                {t("meta", { kind: t(`kind.${l.kind}`), minutes: l.minutes })} <Dots n={l.difficulty} />
              </p>
              {isCurrent ? <p className="mt-1 text-caption font-semibold text-accent-text">{t("current")}</p> : null}
            </div>
            <span title={t("soonHint")} className="rounded-full bg-surface-3 px-2 py-px text-caption text-text-2">
              {t("soon")}
            </span>
          </li>
        );
      })}
      {level.challenges.map((c) => (
        <Milestone key={c.id} c={c} locked={locked} />
      ))}
    </ol>
  );
}
