import "server-only";
import { challengeFolders, loadCurriculum } from "@/content/load";
import { readiness } from "./gating";

export interface LearnLesson {
  id: string;
  title: string;
  kind: "experiment" | "reading";
  minutes: number;
  difficulty: number;
}
export interface LearnChallenge {
  id: string;
  title: string;
  modes: number;
  baseRps: number;
  readiness: "ready" | "waiting" | "noLab";
  prerequisites: { id: string; title: string }[];
}
export interface LearnLevel {
  id: string;
  index: number;
  title: string;
  outcomes: string[];
  exitChallenge: string | null;
  lessons: LearnLesson[];
  challenges: LearnChallenge[];
}

/** The curriculum, shaped for the Learn and Challenges pages in one language (R24: read on the server). */
export async function learnLevels(locale: string): Promise<LearnLevel[]> {
  const c = await loadCurriculum();
  const folders = await challengeFolders();
  const vi = locale === "vi";
  const engineKinds = c.engine.available.components as string[];
  const titles = new Map<string, string>();
  for (const l of c.levels) {
    for (const x of l.lessons) titles.set(x.id, vi ? x.titleVi : x.titleEn);
    for (const x of l.challenges) titles.set(x.id, vi ? x.titleVi : x.titleEn);
  }
  return c.levels.map((l, index) => ({
    id: l.id,
    index,
    title: vi ? l.titleVi : l.titleEn,
    outcomes: (vi ? l.outcomesVi : l.outcomesEn) as string[],
    exitChallenge: (l.exitCheck as { challenge?: string } | undefined)?.challenge ?? null,
    lessons: l.lessons.map((x) => ({
      id: x.id,
      title: vi ? x.titleVi : x.titleEn,
      kind: (x as { kind?: string }).kind === "experiment" ? "experiment" : "reading",
      minutes: x.minutes,
      difficulty: (x as { difficulty?: number }).difficulty ?? 1,
    })),
    challenges: l.challenges.map((x) => {
      const raw = x as unknown as { allowedKinds?: string[]; workload?: { baseRps?: number }; prerequisites?: string[]; modes: unknown[] };
      return {
        id: x.id,
        title: vi ? x.titleVi : x.titleEn,
        modes: raw.modes.length,
        baseRps: raw.workload?.baseRps ?? 0,
        readiness: readiness({ hasFolder: folders.has(x.id), allowedKinds: raw.allowedKinds ?? [] }, engineKinds),
        prerequisites: (raw.prerequisites ?? []).map((id) => ({ id, title: titles.get(id) ?? id })),
      };
    }),
  }));
}
