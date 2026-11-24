"use client";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { Banner } from "@/ui/Banner";
import { ContinueCard, OutcomesCard } from "./ContinueCard";
import { lockReasonLevel, type Progress } from "./gating";
import type { LearnLevel } from "./learn-data";
import { LearningPath, Milestone } from "./LearningPath";
import { LevelStrip } from "./LevelStrip";
import { localProgress } from "./progress-store";

const EMPTY: Progress = { doneLessons: [], passedChallenges: [] };

/** Progress from this browser, and the current level (the first unlocked level with lessons left). */
function useLearnState(levels: readonly LearnLevel[]) {
  const [progress, setProgress] = useState<Progress>(EMPTY);
  useEffect(() => {
    let live = true;
    void localProgress.load().then((p) => live && setProgress(p));
    return () => {
      live = false;
    };
  }, []);
  const done = useMemo(() => new Set(progress.doneLessons), [progress]);
  const lockedBy = (id: string) => lockReasonLevel(id, levels, progress);
  const current = levels.find((l) => !lockedBy(l.id) && l.lessons.some((x) => !done.has(x.id))) ?? levels[0]!;
  const strip = levels.map((l) => ({
    id: l.id,
    title: l.title,
    lessons: l.lessons.length,
    progress: l.lessons.length ? l.lessons.filter((x) => done.has(x.id)).length / l.lessons.length : 0,
    lockedBy: lockedBy(l.id),
  }));
  return { progress, done, current, strip, lockedBy };
}

/** The Learn page body (design-system §11, 11A): level strip, path, right rail; or the plain list. */
export function LearnView({ levels }: { levels: readonly LearnLevel[] }) {
  const t = useTranslations("learn");
  const { done, current, strip, lockedBy } = useLearnState(levels);
  const [selected, setSelected] = useState<string | null>(null);
  const [list, setList] = useState(false);
  const level = levels.find((l) => l.id === (selected ?? current.id)) ?? current;
  const locked = lockedBy(level.id);
  const currentLesson = current.lessons.find((x) => !done.has(x.id)) ?? null;
  return (
    <div className="flex flex-col gap-5">
      <div className="flex justify-end">
        <button type="button" aria-pressed={list} onClick={() => setList(!list)} className="h-8 rounded-sm border border-border-strong bg-surface px-3 text-label hover:bg-surface-2">
          {list ? t("pathView") : t("listView")}
        </button>
      </div>
      {list ? (
        <div className="flex flex-col gap-6" data-testid="learn-list">
          {levels.map((l) => (
            <section key={l.id}>
              <h2 className="text-heading">{t("levelHeading", { id: l.id, title: l.title })}</h2>
              <ol className="mt-2 flex flex-col gap-1">
                {l.lessons.map((x) => (
                  <li key={x.id} className="flex items-baseline justify-between gap-3 text-body">
                    <span>{x.title}</span>
                    <span className="num text-caption text-text-3">{t("meta", { kind: t(`kind.${x.kind}`), minutes: x.minutes })}</span>
                  </li>
                ))}
              </ol>
            </section>
          ))}
        </div>
      ) : (
        <>
          <LevelStrip levels={strip} current={current.id} selected={level.id} onSelect={setSelected} />
          <div className="grid grid-cols-[minmax(0,1fr)_320px] gap-6">
            <div className="flex flex-col gap-3">
              {locked ? <Banner tone="info">{t("preview", { reason: t("locked", { level: locked.replace("L", "") }) })}</Banner> : null}
              <LearningPath level={level} done={done} currentLesson={currentLesson?.id ?? null} locked={!!locked} />
            </div>
            <aside className="sticky top-4 flex flex-col gap-3 self-start">
              <ContinueCard lesson={currentLesson} />
              <OutcomesCard level={level.index} outcomes={level.outcomes} />
            </aside>
          </div>
        </>
      )}
    </div>
  );
}

/** The Challenges page body: every milestone by level, with progress and how runs are scored. */
export function ChallengesView({ levels }: { levels: readonly LearnLevel[] }) {
  const t = useTranslations();
  const { progress, lockedBy } = useLearnState(levels);
  const total = levels.reduce((n, l) => n + l.challenges.length, 0);
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_320px] gap-6">
      <div className="flex flex-col gap-6">
        {levels.map((l) => {
          const locked = lockedBy(l.id);
          return (
            <section key={l.id} aria-labelledby={`ch-${l.id}`}>
              <h2 id={`ch-${l.id}`} className="pb-2 text-heading">
                {t("learn.levelHeading", { id: l.id, title: l.title })}
              </h2>
              {locked ? <p className="pb-2 text-caption text-text-3">{t("learn.locked", { level: locked.replace("L", "") })}</p> : null}
              <ol className="flex flex-col gap-3" data-locked={locked ? "" : undefined}>
                {l.challenges.map((c) => (
                  <Milestone key={c.id} c={c} locked={!!locked} />
                ))}
              </ol>
            </section>
          );
        })}
      </div>
      <aside className="sticky top-4 flex flex-col gap-3 self-start">
        <section className="rounded-lg border border-border bg-surface p-4">
          <p className="text-label font-semibold">{t("challenges.progressTitle")}</p>
          <p className="num mt-1 text-[28px] leading-9 font-semibold" data-testid="challenge-progress">
            {t("challenges.progressValue", { done: progress.passedChallenges.length, total })}
          </p>
        </section>
        <section className="rounded-lg border border-border bg-surface p-4">
          <p className="text-label font-semibold">{t("challenges.scoringTitle")}</p>
          <p className="mt-1 text-body text-text-2">{t("challenges.scoring")}</p>
        </section>
      </aside>
    </div>
  );
}
