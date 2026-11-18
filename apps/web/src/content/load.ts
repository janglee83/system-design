import type { Challenge, Curriculum } from "@sd/content";
import fs from "node:fs/promises";
import path from "node:path";
import type { ContentIndex } from "./types";

/** The repo's content/ folder; next build and next start run with cwd = apps/web (R24). */
export const CONTENT_DIR = path.resolve(process.cwd(), "../../content");
const CHALLENGE_ID = /^c-[a-z0-9-]+$/;

export async function loadCurriculum(): Promise<Curriculum> {
  return JSON.parse(await fs.readFile(path.join(CONTENT_DIR, "curriculum.json"), "utf8")) as Curriculum;
}

export async function loadChallenge(id: string): Promise<Challenge | null> {
  if (!CHALLENGE_ID.test(id)) return null;
  try {
    return JSON.parse(await fs.readFile(path.join(CONTENT_DIR, "challenges", id, "challenge.json"), "utf8")) as Challenge;
  } catch {
    return null;
  }
}

export function contentIndex(c: Curriculum): ContentIndex {
  return {
    lessons: c.levels.flatMap((l) =>
      l.lessons.map((x) => ({ id: x.id, level: l.id, titleVi: x.titleVi, titleEn: x.titleEn, concepts: x.concepts, minutes: x.minutes })),
    ),
    challenges: c.levels.flatMap((l) =>
      l.challenges.map((x) => ({ id: x.id, level: l.id, titleVi: x.titleVi, titleEn: x.titleEn, modes: x.modes.map((m) => m.id) })),
    ),
  };
}

/** Challenge ids that have a content folder (the others are roadmap entries, not playable yet). */
export async function challengeFolders(): Promise<Set<string>> {
  try {
    const entries = await fs.readdir(path.join(CONTENT_DIR, "challenges"), { withFileTypes: true });
    return new Set(entries.filter((e) => e.isDirectory() && CHALLENGE_ID.test(e.name)).map((e) => e.name));
  } catch {
    return new Set();
  }
}
