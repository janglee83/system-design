import { getTranslations, setRequestLocale } from "next-intl/server";

export default async function LabPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("lab");
  return (
    <main data-testid="lab-page">
      <h1>{t("title")}</h1>
    </main>
  );
}
