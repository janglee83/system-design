import { getTranslations, setRequestLocale } from "next-intl/server";
import { Placeholder } from "@/shell/Placeholder";

export default async function LearnPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("learn");
  return <Placeholder title={t("title")} body={t("placeholder")} />;
}
