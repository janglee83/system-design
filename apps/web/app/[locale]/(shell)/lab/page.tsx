import { setRequestLocale } from "next-intl/server";
import { contentIndex, loadChallenge, loadCurriculum } from "@/content/load";
import { LabApp } from "@/lab/LabApp";
import { designFromChallenge } from "@/lab/model/from-challenge";
import { TEMPLATES, type TemplateId } from "@/lab/model/templates";

export default async function LabPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ challenge?: string; mode?: string; template?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const q = await searchParams;
  const curriculum = await loadCurriculum();
  const challenge = q.challenge ? await loadChallenge(q.challenge) : null;
  const initial = challenge ? designFromChallenge(challenge, q.mode) : null;
  if (initial && challenge) {
    // The design is named after the challenge, in the current language.
    const entry = contentIndex(curriculum).challenges.find((c) => c.id === challenge.id);
    initial.name = (locale === "vi" ? entry?.titleVi : entry?.titleEn) ?? challenge.id;
  }
  const template = (TEMPLATES as readonly string[]).includes(q.template ?? "") ? (q.template as TemplateId) : undefined;
  return <LabApp planned={curriculum.engine.planned.components} initial={initial ?? undefined} template={initial ? undefined : template} notFound={Boolean(q.challenge) && !initial} />;
}
