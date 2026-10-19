# Content

Learning content for System Design Lab: a curriculum from level 0 (never heard of a load balancer)
to level 100 (can design, defend and debug large distributed systems). Everything here is written by
us. Other books, courses and products — including the reference product — are used only as a map of
topics; their text, exercises, scenarios, hints and diagrams are never copied or lightly reworded.

## Layout

```
content/
├─ README.md            this file: layout, conventions, authoring checklist
├─ curriculum.json      the 0→100 map: levels, lessons, challenges, engine needs and gaps
├─ research/<topic>.md  research notes with citations (facts in our words)
├─ drafts/<lesson>.md   lesson drafts (VI + EN) until packages/content defines the real format
├─ tools/gen_curriculum.py  source of curriculum.json (data + validation)
└─ REPORT.md            the latest content-researcher run report
```

### `curriculum.json`

- `levels[]` — L0 to L6, each with `score` range, `entry_assumptions_*`, `outcomes_*`, an
  `exit_check` (a named challenge + mode + minimum review score), `lessons[]` and `challenges[]`.
- Lesson fields: `id`, `title_vi`, `title_en`, `format` (`experiment` | `reading+check`), `minutes`,
  `difficulty` (1–3), `prerequisites` (lesson ids, always earlier in the file), `concepts`,
  `research` (note names), `engine` and `engine_gaps`.
- `engine` lists what the lesson's experiment needs: `components`, `faults`, `dynamic` (autoscaling,
  retries, circuit-breaker, rate-limiting, db-failover), `behaviors`, `calibration` overrides,
  `nodeOverrides`, `metrics`, and `readiness`:
  - `ready-1a` — runs on the current engine (client, lb, web-server, postgres; four faults;
    calibration and per-node overrides);
  - `needs-1b` — needs only components/faults/features the engine spec already plans;
  - `blocked-by-gap` — needs something the spec does not plan, listed in `engine_gaps`;
  - `not-needed` — reading lesson. `experimentUpgrade` says how ready its future experiment is.
- `engineGaps` at the top level describes each gap and lists every lesson and challenge that needs
  it. The engine team uses it as a backlog.
- Challenge fields: `id`, titles, `prerequisites`, `allowedKinds`, `workload`, `goals`
  (`metric` + `op` + `value`, metric keys from `SimResult.metrics`), `modes` (`standard`,
  `tight-budget`, `misbehaving-servers`, `chaos` or a named variant, each with a budget, faults and
  optional calibration), short `brief_*`, `engine_gaps` and `readiness`.
- Do not hand-edit counts; they are recomputed when the file is regenerated. Keep ids stable once
  published (progress data will reference them).

### `research/<topic>.md`

One note per topic, shared by the lessons that use it. Sections: key facts (numbered, each with
citation markers), numbers worth remembering, how the topic maps to the engine (including checked
numbers and gaps), misconceptions, analogy ideas, caveats, sources. Sources list title,
author/organisation, URL and date (or "accessed" date). One-sentence quotations are allowed only
here, with a citation.

### `drafts/<lesson-id>.md`

Front matter (`id`, `level`, `format`, `minutes`, `prerequisites`, `research`, `engine_readiness`,
`engine_gaps`, `status`), then a language-neutral **experiment spec** (or check spec) in JSON, then
the full **Vietnamese** lesson, then the full **English** lesson. The two languages are written
separately, not translated line by line. Sources live in the research note, not in the lesson body.

The experiment spec holds: `workload`, starting `graph`, `locked` items, `controls` (each maps to a
graph/config/workload/calibration path), an optional `prediction`, `goals`, and `choices` — one
correct choice and one wrong choice per misconception, each with expected values and the goals it
fails. Expected values in drafts come from a scratch re-implementation of the 1a model and are
marked "≈"; `sim-cli check` is the authority.

## Authoring checklist (every lesson)

1. **Outcome** — one observable sentence ("choose …", "show …", "compute …").
2. **Prerequisites** — lesson ids that come earlier in `curriculum.json`.
3. **Analogy first**, then the precise term. Every new term is defined at first use. In Vietnamese,
   technical terms stay in English with a Vietnamese explanation the first time
   (e.g. "**cache** (bộ nhớ đệm)").
4. **Misconceptions** — 2–4 that beginners actually hold, labelled M1…; say which ones have no
   experiment choice.
5. **Experiment** — controls, one correct choice, one wrong choice per misconception, the metric and
   goal that separates them, and expected values. Runnable on the engine level stated in
   `engine_readiness`; anything else goes in `engine_gaps`. Prefer goals on `p95`/`p99`,
   `requestsRejected`, `spofCount`, `costPerMonth`; note that in 1a an overloaded node can still show
   availability above 0.99.
6. **Feedback** for each wrong choice, in plain words, explaining the mechanism (not just "wrong").
7. **Takeaways** — 2–4 short lines.
8. **Review questions** with short answers, for spaced repetition.
9. **Bilingual** — VI and EN written separately; same facts, numbers and choices in both.
10. **Sources** — every claim traceable to the research note's source list.

Before marking a draft ready:

- [ ] Numbers in both languages match the experiment spec.
- [ ] `sim-cli check` passes the correct choice and fails every wrong choice for the stated goal.
- [ ] No sentence, exercise, scenario or hint resembles a source's wording (re-read the notes'
      sources side by side if unsure).
- [ ] Game-world numbers (vCPU capacity, prices) are presented as lab assumptions, not real
      benchmarks.
- [ ] No English left inside Vietnamese prose except technical terms (and vice versa).
- [ ] `curriculum.json` entry (minutes, prerequisites, engine, gaps) matches the draft.

## Regenerating `curriculum.json`

`curriculum.json` is generated. Edit `tools/gen_curriculum.py` (lessons, challenges, gaps), then run:

```
python3 content/tools/gen_curriculum.py content/curriculum.json
```

The script fails on duplicate ids, prerequisites that do not exist or come later, unknown gap ids,
engine features that are neither in 1a nor planned, levels without a challenge, exit checks that
point to a missing challenge, and gaps no lesson uses. It prints the counts. Sub-project 2's
`content validate` will take over these checks.
