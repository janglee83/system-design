# Sub-project 2: Content format and `content validate` — Design

Date: 2026-10-20
Status: Approved (2026-10-20)

## 1. Goal

One machine-checked format for lessons and challenges, read directly by the app (sub-projects
3–5), and a validator that proves every lesson and challenge behaves as written on the real
engine (`sim-core`).

The validator proves, for each item:

- Structure: ids, levels, prerequisites, research links, VI and EN prose with the required sections.
- Experiments: the correct choice passes every goal; each wrong choice fails exactly the goals it
  declares; every numeric expectation holds.
- Challenges: for every mode, a reference design passes every goal within the mode's budget and
  limits, and a naive design fails.

Product-wide rules from the engine spec (§1.1) still apply: all learner-facing text is original,
bilingual, written for absolute beginners.

## 2. Layout

```
content/
  lessons/<lesson-id>/lesson.json     structured part (metadata, experiment or check)
  lessons/<lesson-id>/vi.md           Vietnamese prose
  lessons/<lesson-id>/en.md           English prose
  challenges/<challenge-id>/challenge.json
  challenges/<challenge-id>/vi.md
  challenges/<challenge-id>/en.md
  research/*.md                       unchanged
  levels.json                         level titles, scores, entry assumptions, outcomes, exit checks, ordering
  curriculum.json                     generated from the folders and levels.json
```

`content/drafts/` stays until every draft is migrated, then it is removed.

Ids: lessons `^l[0-6]-[a-z0-9-]{2,60}$`, challenges `^c-l[0-6]-[a-z0-9-]{2,60}$`. The folder name must
equal the id.

## 3. `lesson.json`

```json
{
  "formatVersion": 1,
  "id": "l0-throughput-and-capacity",
  "level": "L0",
  "kind": "experiment",
  "minutes": 12,
  "difficulty": 1,
  "prerequisites": ["l0-client-server"],
  "concepts": ["throughput", "capacity"],
  "research": ["throughput-and-capacity"],
  "status": "draft",
  "experiment": { "...": "see 3.1" }
}
```

- `kind`: `"experiment"` (has `experiment`) or `"reading"` (has `check`).
- `difficulty`: 1–3. `minutes`: 1–60. `status`: `"draft" | "review" | "published"`.
- `research`: ids of files in `content/research/` (without `.md`).
- Engine readiness is not authored; the validator computes it (§7).

### 3.1 Experiment

```json
"experiment": {
  "base": { "graph": {}, "workload": {}, "faults": [], "durationMs": 10000 },
  "controls": [
    { "id": "cpu", "type": "stepper", "path": "graph.nodes[web].config.cpu", "options": [1, 2, 4], "default": 1 },
    { "id": "timeout", "type": "select", "path": "workload.clientTimeoutMs", "options": [1000, 5000], "default": 1000 }
  ],
  "goals": [
    { "id": "fast", "metric": "p95", "op": "<=", "value": 50 },
    { "id": "no-drops", "metric": "requestsRejected", "op": "<=", "value": 0 }
  ],
  "choices": [
    { "id": "A", "correct": true, "set": { "cpu": 2, "timeout": 1000 },
      "expect": { "p95": { "<=": 10 }, "requestsRejected": { "==": 0 } } },
    { "id": "B", "misconception": "M1", "set": { "cpu": 1, "timeout": 5000 },
      "failsGoals": ["fast", "no-drops"],
      "expect": { "requestsRejected": { ">=": 1 } }, "expectEvents": ["node.overloaded"] }
  ]
}
```

- `base` is a full `SimInput` (engine spec §4.1). `seed` defaults to 1.
- `controls[].path` addresses one value inside `base`:
  - `workload.<field>`, `calibration.<field>`, `durationMs`, `seed`
  - `graph.nodes[<node-id>].replicas`, `graph.nodes[<node-id>].config.<key>`
  - `faults[<index>].atMs`
- `type`: `"stepper" | "select" | "toggle"`. `default` must be one of `options`. Every option
  value must produce an input the engine accepts.
- `choices`:
  - Exactly one `correct: true`; at least one wrong choice; at most 6 choices.
  - `set` maps control ids to one of that control's options. Unset controls use `default`.
  - A wrong choice has `misconception` (an id present in both prose files, §5) and a non-empty
    `failsGoals` (goal ids).
  - `expect`: optional numeric checks in the golden-fixture shape (`metric → {op: value}`; several
    ops allowed). Free text such as "≈6.5 ms" is not allowed.
  - `expectEvents`: optional event codes that must appear.

### 3.2 Reading check

```json
"check": {
  "passMark": 4,
  "questions": [
    { "id": "q1", "type": "single", "options": ["a", "b", "c"], "answer": "b", "misconception": "M1" },
    { "id": "q2", "type": "numeric", "answer": 525.6, "tolerance": 1, "unit": "min" }
  ]
}
```

Question text and option labels live in the prose files (§5), keyed `q1`, `q1.a`, …, so the JSON
stays language-neutral. `passMark` is at most the number of questions.

## 4. `challenge.json`

```json
{
  "formatVersion": 1,
  "id": "c-l0-first-launch",
  "level": "L0",
  "prerequisites": ["l0-database-basics"],
  "status": "draft",
  "start": { "graph": {}, "workload": {} },
  "lockedNodes": ["users"],
  "limits": { "maxNodes": 6, "maxInstances": 12, "allowedKinds": ["client", "web-server", "postgres", "lb"] },
  "goals": [ { "id": "fast", "metric": "p95", "op": "<=", "value": 50 } ],
  "modes": [
    {
      "id": "standard",
      "budgetPerMonth": 300,
      "faults": [],
      "workloadOverride": {},
      "reference": { "graph": {} },
      "naive": { "graph": {}, "failsGoals": ["fast"] }
    }
  ],
  "hints": ["h1", "h2", "h3"]
}
```

- Every mode adds an implicit goal `costPerMonth <= budgetPerMonth` with id `budget`.
- A mode's input is `start` with `workloadOverride` merged in and `faults` replacing the start's
  faults; `reference.graph` and `naive.graph` replace the start graph.
- `reference` and `naive` must contain every node in `lockedNodes` unchanged and respect `limits`.
- Hint text lives in the prose files under `h1`, `h2`, `h3`.

## 5. Prose files (`vi.md`, `en.md`)

Front matter: `id` (must match the folder) and `title`. Required level-2 headings, in this order:

| Section | `vi.md` | `en.md` |
|---|---|---|
| Outcome | `## Mục tiêu` | `## Outcome` |
| Everyday picture | `## Hình dung trước` | `## Picture it first` |
| Terms | `## Thuật ngữ` | `## Terms` |
| Misconceptions | `## Hiểu lầm thường gặp` | `## Common misconceptions` |
| Experiment or check | `## Thí nghiệm` or `## Câu hỏi` | `## Experiment` or `## Questions` |
| Feedback | `## Phản hồi` | `## Feedback` |
| Takeaways | `## Điều cần nhớ` | `## Takeaways` |

Challenges use `## Bối cảnh`/`## Scenario`, `## Mục tiêu`/`## Outcome` and `## Gợi ý`/`## Hints`.

Keyed items start a list item with a bold id, for example `- **M1**: …`, `- **q1**: …`,
`- **q1.b**: …`, `- **B**: …` (feedback for choice B), `- **h1**: …`. The validator checks that every
key the JSON refers to appears in both files and that every misconception has feedback. It never
checks wording.

## 6. Validation

A new crate `crates/content` (depends on `sim-core`), exposed as `sim-cli content validate <dir>`.

Issue codes (blocking unless noted), each with `path` and optional `id`/`field`:

| Code | Meaning |
|---|---|
| `content.parse` | JSON or front matter cannot be read |
| `content.format-version` | unknown `formatVersion` |
| `content.id` | bad id, or folder name differs from id |
| `content.duplicate-id` | id used twice |
| `content.prerequisite-missing` / `content.prerequisite-cycle` | prerequisite graph broken |
| `content.research-missing` | research id has no file |
| `content.prose-section` | a required heading is missing or out of order |
| `content.prose-key` | a referenced key (`M1`, `q1`, `B`, `h1`) is missing in vi or en |
| `content.control` | path does not resolve, option invalid, or default not in options |
| `content.choice` | choice rules broken (count, correct, set, failsGoals) |
| `content.engine-invalid` | the engine rejects an input built from the item (engine codes attached) |
| `content.correct-fails` | the correct choice misses a goal (measured value attached) |
| `content.wrong-passes` | a wrong choice passes a goal listed in its `failsGoals` |
| `content.wrong-extra-fail` | a wrong choice fails a goal not in `failsGoals` (warning) |
| `content.expect` | an `expect` or `expectEvents` check fails (measured value attached) |
| `content.reference-fails` / `content.naive-passes` | challenge mode proofs fail |
| `content.limits` | reference or naive breaks limits or changes a locked node |
| `content.blocked` | needs an engine feature not available yet (warning; structure still checked) |

Output: `PASS <id>` / `FAIL <id> <code> …` lines and a summary, or `--json`. Exit codes: 0 all pass,
1 any blocking issue, 2 unreadable directory. Parallel (rayon) and deterministic.

## 7. Engine readiness and the curriculum

- Readiness is computed: `ready` when the item validates; `blocked` when it uses a component kind,
  fault kind, workload field or metric the engine does not know (reported with the missing names);
  `not-needed` for reading lessons.
- `content/tools/gen_curriculum.py` is replaced by `sim-cli content curriculum <dir>` (writes
  `content/curriculum.json` from the folders and `content/levels.json`) and
  `sim-cli content curriculum <dir> --check` (fails if the committed file differs). Engine gaps come
  from `content.blocked`.

## 8. Types for the app

`crates/content` exports its types to TypeScript with ts-rs into `packages/content/src/generated/`.
A thin `packages/content` package re-exports them. Loading files in the app is sub-project 3–4 work.

## 9. CI

The `content` workflow installs the pinned Rust toolchain with a build cache and runs
`sim-cli content validate content` and `sim-cli content curriculum content --check`; Python is no
longer needed. Path filters: `content/**`, `crates/content/**`, `crates/sim-cli/**`,
`crates/sim-core/**` (an engine change can break content) and the workflow file. The `engine`
workflow also runs for `crates/content/**`.

## 10. Migration

- The 13 L0 drafts move to `content/lessons/<id>/`, JSON split from prose, free-text expectations
  replaced by numeric ranges measured on the real engine.
- Challenges that run on the current engine move to `content/challenges/<id>/` with reference and
  naive designs.
- Failing items are fixed in content, never by weakening the validator. Expected numbers in the old
  drafts came from a scratch model and are not authoritative.

## 11. Out of scope

Rendering, lesson UI, progress tracking, AI feedback, authoring UI, and engine features from plan 1b.

## 12. Done when

- `sim-cli content validate content` passes on all migrated items, with every blocked item reported.
- `sim-cli content curriculum content --check` reproduces the committed `curriculum.json`.
- Unit tests cover every issue code; a golden test validates a set of good and broken fixture items.
- The content CI workflow runs in under 3 minutes with a warm cache.
- Generated TS types are committed and checked for freshness.
