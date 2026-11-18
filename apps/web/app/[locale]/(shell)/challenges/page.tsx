import { getTranslations, setRequestLocale } from "next-intl/server";
import { challengeFolders, loadCurriculum } from "@/content/load";
import { Link } from "@/i18n/navigation";
import { Placeholder } from "@/shell/Placeholder";

/** Challenges by level. Only challenges with a content folder open in the Lab (R24). */
export default async function ChallengesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  const [curriculum, playable] = await Promise.all([loadCurriculum(), challengeFolders()]);
  const vi = locale === "vi";
  return (
    <Placeholder title={t("challenges.title")} body={t("challenges.placeholder")}>
      {curriculum.levels.map((level, i) =>
        level.challenges.length === 0 ? null : (
          <section key={level.id} className="mb-6">
            <h2 className="section-label pb-1">{t("challenges.level", { level: i })}</h2>
            <ul className="flex flex-col gap-2">
              {level.challenges.map((c) => (
                <li key={c.id} className="rounded-lg border border-border bg-surface p-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-body font-semibold">{vi ? c.titleVi : c.titleEn}</span>
                    {playable.has(c.id) ? (
                      <Link href={`/lab?challenge=${c.id}`} className="text-label font-medium text-accent hover:underline">
                        {t("challenges.open")}
                      </Link>
                    ) : (
                      <span className="text-caption text-text-3">{t("common.comingSoon")}</span>
                    )}
                  </div>
                  {playable.has(c.id) ? (
                    <div className="mt-2 flex flex-wrap items-center gap-1.5 text-caption">
                      <span className="text-text-3">{t("challenges.modes")}</span>
                      {c.modes.map((m) => (
                        <Link
                          key={m.id}
                          href={`/lab?challenge=${c.id}&mode=${m.id}`}
                          aria-label={t("challenges.openMode", { mode: m.id })}
                          className="num rounded-full border border-border px-2 py-0.5 hover:bg-surface-2"
                        >
                          {m.id}
                        </Link>
                      ))}
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        ),
      )}
    </Placeholder>
  );
}
