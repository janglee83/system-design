// One-off: check that the Rust curriculum (v2) carries the same data as the Python one (v1).
// Run: ./dev node content/tools/compare_curriculum.mjs <old.json> <new.json>
import { readFileSync } from "node:fs";

const [oldPath, newPath] = process.argv.slice(2);
const o = JSON.parse(readFileSync(oldPath, "utf8"));
const n = JSON.parse(readFileSync(newPath, "utf8"));
// serde_json::Value keeps object keys sorted, so compare with sorted keys on both sides.
const canon = (v) => JSON.stringify(v, (_k, x) =>
  x && typeof x === "object" && !Array.isArray(x) ? Object.fromEntries(Object.entries(x).sort()) : x);
const eq = (a, b) => canon(a) === canon(b);
const sorted = (a) => [...(a ?? [])].sort();
let bad = 0;
const fail = (what) => { bad += 1; console.error("MISMATCH", what); };

if (o.levels.length !== n.levels.length) fail("level count");
o.levels.forEach((lo, i) => {
  const ln = n.levels[i];
  const pairs = [["title_vi", "titleVi"], ["title_en", "titleEn"], ["score", "score"],
    ["entry_assumptions_vi", "entryAssumptionsVi"], ["entry_assumptions_en", "entryAssumptionsEn"],
    ["outcomes_vi", "outcomesVi"], ["outcomes_en", "outcomesEn"]];
  for (const [a, b] of pairs) if (!eq(lo[a], ln[b])) fail(`${lo.id}.${a}`);
  if (lo.exit_check.challenge !== ln.exitCheck.challenge || lo.exit_check.mode !== ln.exitCheck.mode) fail(`${lo.id}.exitCheck`);
  if (!eq(lo.lessons.map((l) => l.id), ln.lessons.map((l) => l.id))) fail(`${lo.id} lesson order`);
  if (!eq(lo.challenges.map((c) => c.id), ln.challenges.map((c) => c.id))) fail(`${lo.id} challenge order`);
  lo.lessons.forEach((l, k) => {
    const m = ln.lessons[k];
    const lp = [["title_vi", "titleVi"], ["title_en", "titleEn"], ["minutes", "minutes"], ["difficulty", "difficulty"],
      ["prerequisites", "prerequisites"], ["concepts", "concepts"], ["research", "research"]];
    for (const [a, b] of lp) if (!eq(l[a], m[b])) fail(`${l.id}.${a}`);
    if ((l.format === "experiment") !== (m.kind === "experiment")) fail(`${l.id}.kind`);
    if (!eq(sorted(l.engine_gaps), sorted(m.engineGaps))) fail(`${l.id}.engine_gaps`);
    for (const k2 of ["components", "faults", "dynamic", "behaviors", "calibration", "nodeOverrides", "metrics"]) {
      if (!eq(l.engine[k2], m.engine.needs[k2])) fail(`${l.id}.engine.${k2}`);
    }
  });
  lo.challenges.forEach((c, k) => {
    const m = ln.challenges[k];
    const cp = [["title_vi", "titleVi"], ["title_en", "titleEn"], ["prerequisites", "prerequisites"],
      ["allowedKinds", "allowedKinds"], ["goals", "goals"], ["workload", "workload"], ["brief_vi", "briefVi"], ["brief_en", "briefEn"]];
    for (const [a, b] of cp) if (!eq(c[a], m[b])) fail(`${c.id}.${a}`);
    if (!eq(sorted(c.engine_gaps), sorted(m.engineGaps))) fail(`${c.id}.engine_gaps`);
    if (!eq(c.modes.map((x) => [x.id, x.budgetPerMonth, x.faults]), m.modes.map((x) => [x.id, x.budgetPerMonth, x.faults]))) fail(`${c.id}.modes`);
  });
});
for (const [g, v] of Object.entries(o.engineGaps)) {
  if (!eq(v.description, n.engineGaps[g]?.description) || !eq(v.neededBy, n.engineGaps[g]?.neededBy)) fail(`gap ${g}`);
}
for (const k of ["levels", "lessons", "challenges", "engineGaps"]) if (o.counts[k] !== n.counts[k]) fail(`counts.${k}`);
console.log(bad ? `curriculum differs in ${bad} places` : "curriculum equivalent");
process.exitCode = bad ? 1 : 0;
