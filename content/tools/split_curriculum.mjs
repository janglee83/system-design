// One-off: split the generated content/curriculum.json (version 1) into content/levels.json
// (ruling R8). Run once: ./dev node content/tools/split_curriculum.mjs
import { readFileSync, writeFileSync } from "node:fs";

const old = JSON.parse(readFileSync("content/curriculum.json", "utf8"));
if (old.version !== 1) throw new Error("expected curriculum.json version 1");

const kind = (format) => (format === "experiment" ? "experiment" : "reading");
const needs = (e) => {
  const n = {};
  for (const k of ["components", "faults", "dynamic", "behaviors", "calibration", "nodeOverrides", "metrics"]) {
    if (e[k]?.length) n[k] = e[k];
  }
  return n;
};

const levels = {
  formatVersion: 1,
  description:
    "System Design Lab learning path, level 0 to 100: level metadata, lesson and challenge order, planning stubs for items not written yet, and the engine features they wait for. Authored items live in content/lessons and content/challenges.",
  fields: {
    roadmap: "Planning stubs for lessons and challenges that have no folder yet. Remove a stub when its folder is added.",
    engineGaps: "Engine features no plan covers yet, each with the items that need it.",
    "engine.planned": "Engine features a plan covers but the engine does not have yet. Items that use them are reported as blocked.",
  },
  engine: {
    planned: { ...old.engine.planned, fields: [] },
  },
  engineGaps: Object.fromEntries(
    Object.entries(old.engineGaps).map(([id, g]) => [id, { description: g.description, neededBy: g.neededBy }]),
  ),
  levels: old.levels.map((lv) => ({
    id: lv.id,
    titleVi: lv.title_vi,
    titleEn: lv.title_en,
    score: lv.score,
    entryAssumptionsVi: lv.entry_assumptions_vi,
    entryAssumptionsEn: lv.entry_assumptions_en,
    outcomesVi: lv.outcomes_vi,
    outcomesEn: lv.outcomes_en,
    exitCheck: {
      challenge: lv.exit_check.challenge,
      mode: lv.exit_check.mode,
      reviewMinScore: lv.exit_check.review_min_score,
      descriptionVi: lv.exit_check.description_vi,
      descriptionEn: lv.exit_check.description_en,
    },
    lessons: lv.lessons.map((l) => l.id),
    challenges: lv.challenges.map((c) => c.id),
  })),
  roadmap: {
    lessons: old.levels.flatMap((lv) =>
      lv.lessons.map((l) => ({
        id: l.id,
        titleVi: l.title_vi,
        titleEn: l.title_en,
        kind: kind(l.format),
        minutes: l.minutes,
        difficulty: l.difficulty,
        prerequisites: l.prerequisites,
        concepts: l.concepts,
        research: l.research,
        needs: needs(l.engine),
      })),
    ),
    challenges: old.levels.flatMap((lv) =>
      lv.challenges.map((c) => ({
        id: c.id,
        titleVi: c.title_vi,
        titleEn: c.title_en,
        prerequisites: c.prerequisites,
        allowedKinds: c.allowedKinds,
        workload: c.workload,
        goals: c.goals,
        modes: c.modes,
        briefVi: c.brief_vi,
        briefEn: c.brief_en,
      })),
    ),
  },
};

writeFileSync("content/levels.json", JSON.stringify(levels, null, 2) + "\n");
const nl = levels.roadmap.lessons.length;
const nc = levels.roadmap.challenges.length;
console.log(`levels.json: ${levels.levels.length} levels, ${nl} lessons, ${nc} challenges, ${Object.keys(levels.engineGaps).length} gaps`);
