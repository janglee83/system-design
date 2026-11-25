"use client";
import { useTranslations } from "next-intl";
import { Tooltip } from "@/ui/Tooltip";
import type { LearnLesson } from "./learn-data";

/** The right rail's "Tiếp tục" card. Lesson pages come in sub-project 4, so the button says why it waits. */
export function ContinueCard({ lesson }: { lesson: LearnLesson | null }) {
  const t = useTranslations("learn");
  if (!lesson) return null;
  return (
    <section className="rounded-lg bg-accent-soft p-4">
      <p className="text-caption font-semibold text-accent-text">{t("continue")}</p>
      <p className="mt-1 text-heading">{lesson.title}</p>
      <p className="mt-0.5 text-caption text-text-2">{t("meta", { kind: t(`kind.${lesson.kind}`), minutes: lesson.minutes })}</p>
      <Tooltip content={t("soonHint")}>
        <button type="button" aria-disabled="true" className="mt-3 h-9 w-full cursor-not-allowed rounded-sm bg-surface-3 text-label font-semibold text-text-3">
          {t("continueSoon")}
        </button>
      </Tooltip>
    </section>
  );
}

/** "Xong cấp N, bạn sẽ": the level's outcomes from curriculum.json. */
export function OutcomesCard({ level, outcomes }: { level: number; outcomes: readonly string[] }) {
  const t = useTranslations("learn");
  return (
    <section className="rounded-lg border border-border bg-surface p-4">
      <p className="text-label font-semibold">{t("outcomes", { level })}</p>
      <ul className="mt-2 flex list-disc flex-col gap-1 pl-4 text-body text-text-2">
        {outcomes.map((o) => (
          <li key={o}>{o}</li>
        ))}
      </ul>
    </section>
  );
}
