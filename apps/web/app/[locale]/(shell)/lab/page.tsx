import { setRequestLocale } from "next-intl/server";
import { challengeFolders, contentIndex, loadChallenge, loadCurriculum } from "@/content/load";
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
  // Challenge starts for the empty Lab: the playable ones (with a content folder), in curriculum order.
  const folders = await challengeFolders();
  const playable = contentIndex(curriculum).challenges.filter((c) => folders.has(c.id));
  const starts = (
    await Promise.all(
      playable.slice(0, 3).map(async (c) => {
        const full = await loadChallenge(c.id);
        const kinds = ((full?.start as { graph?: { nodes?: { kind: string }[] } } | undefined)?.graph?.nodes ?? []).map((n) => n.kind);
        return { id: c.id, title: locale === "vi" ? c.titleVi : c.titleEn, kinds };
      }),
    )
  ).concat(playable.slice(3).map((c) => ({ id: c.id, title: locale === "vi" ? c.titleVi : c.titleEn, kinds: [] })));
  const template = (TEMPLATES as readonly string[]).includes(q.template ?? "") ? (q.template as TemplateId) : undefined;
  return <LabApp planned={curriculum.engine.planned.components} starts={starts} initial={initial ?? undefined} template={initial ? undefined : template} notFound={Boolean(q.challenge) && !initial} />;
}
