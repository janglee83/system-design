import { getTranslations, setRequestLocale } from "next-intl/server";
import { loadCurriculum } from "@/content/load";
import { Placeholder } from "@/shell/Placeholder";

/** The learning path as a plain list (sub-project 4 brings lesson pages; Design v2 DV-11 the path view). */
export default async function LearnPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("learn");
  const curriculum = await loadCurriculum();
  const vi = locale === "vi";
  return (
    <Placeholder title={t("title")} body={t("placeholder")}>
      {curriculum.levels.map((level, i) => (
        <section key={level.id} className="mb-6">
          <h2 className="section-label pb-1">{t("level", { level: i })}</h2>
          <p className="pb-2 text-md font-semibold">{vi ? level.titleVi : level.titleEn}</p>
          <ol className="flex flex-col gap-1">
            {level.lessons.map((lesson) => (
              <li key={lesson.id} id={lesson.id} className="flex items-baseline justify-between gap-3 text-sm">
                <span>{vi ? lesson.titleVi : lesson.titleEn}</span>
                <span className="num text-xs text-text-3">{t("minutes", { n: lesson.minutes })}</span>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </Placeholder>
  );
}
