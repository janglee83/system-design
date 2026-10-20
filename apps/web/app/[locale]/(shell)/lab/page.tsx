import { setRequestLocale } from "next-intl/server";
import { LabApp } from "@/lab/LabApp";

export default async function LabPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <LabApp />;
}
