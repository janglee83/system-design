import { getTranslations, setRequestLocale } from "next-intl/server";
import { Placeholder } from "@/shell/Placeholder";

export default async function ChallengesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("challenges");
  return <Placeholder title={t("title")} body={t("placeholder")} />;
}
