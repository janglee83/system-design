import { getTranslations, setRequestLocale } from "next-intl/server";
import { learnLevels } from "@/learn/learn-data";
import { ChallengesView } from "@/learn/LearnView";

/** Every challenge as a milestone by level (design-system §11); the brief comes in sub-project 5. */
export default async function ChallengesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("challenges");
  const levels = await learnLevels(locale);
  return (
    <main className="min-h-0 flex-1 overflow-y-auto bg-bg">
      <div className="mx-auto w-full max-w-[1180px] px-7 py-6">
        <h1 className="text-display">{t("title")}</h1>
        <p className="mt-1 text-body text-text-2">{t("description")}</p>
        <div className="mt-4">
          <ChallengesView levels={levels} />
        </div>
      </div>
    </main>
  );
}
