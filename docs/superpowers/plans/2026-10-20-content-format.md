# Content Format and `content validate` Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** One machine-checked format for lessons and challenges (`content/lessons/<id>/`, `content/challenges/<id>/`, `content/levels.json`) and a validator, `sim-cli content validate`, that proves on the real engine that every item behaves as written. A Rust generator, `sim-cli content curriculum [--check]`, replaces `content/tools/gen_curriculum.py`.

**Architecture:** A new crate `crates/content` depends on `sim-core`. It loads a content directory into an in-memory `ContentTree` (`tree.rs`, the only module doing file I/O). Then it runs three stages: (1) parse plus cross-item structure checks (sequential, cheap); (2) per-item checks (prose, controls, choices, readiness, engine runs), run in parallel with rayon; (3) a deterministic `Report` sorted by item id. `sim-cli` adds a `content` subcommand group. Types are exported to TypeScript with ts-rs into `packages/content/src/generated/` and re-exported by a thin `@sd/content` package.

**Tech Stack:** Docker dev container (`./dev <cmd>`, Rust 1.85.1); Rust, serde, serde_json, ts-rs 10.1 (already in `Cargo.lock`), rayon, clap, insta, assert_cmd, tempfile; Node 24 for one-off conversion scripts; pnpm 10 and TypeScript 5 for `packages/content`.

**Spec:** `docs/superpowers/specs/2026-10-20-content-format-design.md`

**Previous plan (style, engine API):** `docs/superpowers/plans/2026-10-18-sim-engine-1a.md`

## Rulings on spec ambiguities

The spec leaves these points open. Each ruling below is what this plan implements. The owner can overturn any of them before Phase 1 starts.

| # | Topic | Ruling |
|---|---|---|
| R1 | `sim-core` support | Two small additive public APIs go into `sim-core` (Task 1). `check_input(&SimInput) -> Vec<ValidationIssue>` is what `simulate` already runs before a run, now callable without running; `simulate` calls it, so behaviour is unchanged. `capabilities()` lists the component kinds, applied fault kinds, always-measured metrics and read `workload.params` keys. Without it the validator could not tell "not built yet" from "broken". Everything else uses the existing API: `simulate`, `grade`, `grade::compare`, `metric_value`, `fixture::parse_op`, `validate::validate_graph`, `components::get`, `components::NODE_OVERRIDE_KEYS`. |
| R2 | `seed` default | `SimInput.seed` defaults to 0 in sim-core; the spec says a lesson's `base` defaults to 1. The content loader inserts `"seed": 1` into `base` / `start` when it is absent, before anything else reads it. |
| R3 | Engine-shaped JSON stays raw | `base`, `start`, `reference.graph`, `naive.graph`, `faults`, `workloadOverride` are kept as `serde_json::Value` in Rust (exported to TS as `SimInput`, `Graph`, `Array<Fault>`, `JsonValue`). The readiness scan has to see fields that serde would silently drop (sim-core types do not `deny_unknown_fields`). Typed `SimInput` is built only after the scan. |
| R4 | What makes an item `blocked` | A name the engine does not implement **and** that `levels.json` lists under `engine.planned` gives `content.blocked` (warning, with `missing` names such as `component:redis`, `fault:instance-slow`, `metric:duplicateIds`, `field:workload.params.hotKeyShare`). Fault kinds in sim-core's `FaultKind` enum that the engine does not apply (they only emit `fault.unsupported`) and metrics that sim-core names but always reports as `null` are `blocked` without needing a catalog entry. A name that is neither known nor planned is a typo. It is reported as blocking: an unknown component kind or fault kind becomes `content.engine-invalid` (the engine rejects it), an unknown input field becomes `content.engine-invalid` with `field=<path>` and `detail="unknown field"`, and an unknown metric becomes `content.expect`. "Workload field" in spec §7 is widened to every input field the engine would silently ignore: top-level, workload, `workload.params`, surge, calibration, node, node config, edge and fault keys. Blocked items still get every structural check but no engine runs. |
| R5 | Unknown fields in content JSON | All content structs use `#[serde(deny_unknown_fields)]`, so a typo is `content.parse`. Shape and range errors in an item's own JSON (minutes 1–60, difficulty 1–3, `kind` without its `experiment`/`check`, `start` not an object) are also `content.parse`, with `field` set. |
| R6 | `formatVersion` | Read from the raw JSON before typed parsing. Missing or anything other than `1` gives `content.format-version`, and the item is not parsed further. |
| R7 | Sub-item ids | Duplicate goal, control, choice, question, mode or hint ids, an id listed twice in `levels.json`, two folders declaring the same id, and a roadmap entry that also has a folder are all `content.duplicate-id`. Choice ids are single capital letters `A`–`F` (they are prose keys and must not clash with `M1`/`q1`/`h1`). Question ids match `^q[0-9]+$`, option ids `^[a-z]$`, misconception ids `^M[0-9]+$`, hint ids `^h[0-9]+$`, mode ids `^[a-z0-9-]{2,40}$`. |
| R8 | `levels.json` contents | Besides the spec §2 fields it holds: `engine.planned` (components, faults, fields, dynamic, behaviors), `engineGaps` (`description` and `neededBy` per gap, the single place where gaps are linked to items), and `roadmap.lessons` / `roadmap.challenges`, which are planning stubs for the items that have no folder yet. Right after Task 20 that is all 136 lessons and 44 challenges; after Phase 7 it is 123 lessons and 41 challenges. Each level lists its `lessons` and `challenges` ids in order. A folder item must be listed under the level that matches its `level` field (otherwise `content.id`). A listed id with neither folder nor roadmap stub, or a stub that is not listed, is `content.id`. |
| R9 | Dangling references | A prerequisite, `exitCheck.challenge`/`mode` or `engineGaps.*.neededBy` entry naming nothing gives `content.prerequisite-missing` (`field` says which). A lesson prerequisite must be a lesson; a challenge prerequisite must be a lesson. A lesson whose prerequisite is listed **after** it in `levels.json` order is reported as `content.prerequisite-cycle` with `detail="listed after"`, because ordering defines the learning path and a later prerequisite is a cycle in that path. True cycles are found by search and reported on every member. |
| R10 | Prose parsing | Front matter is a strict subset with exactly two keys: `id` and `title` (title optionally in double quotes). Any other key is `content.parse`; no YAML crate is used. Required `##` headings must appear as an in-order subsequence. Extra `##` headings (for example a review section) are allowed anywhere. Fenced code blocks are skipped. A key is a list item exactly of the form `- **KEY**: …` at column 0, and keys count only under their own section: `M*` under Misconceptions, choice ids and `M*` under Feedback, `q*` under Questions, `h*` under Hints. Challenge prose requires Scenario, Outcome, Hints in that order. |
| R11 | Prose key coverage | Experiment: Misconceptions has the `misconception` of every wrong choice, and Feedback has every wrong choice id. Reading: Questions has `qN` for every question and `qN.x` for every option of a `single` question; Misconceptions has every question `misconception`; Feedback has the id of every question that has a misconception. "Every misconception has feedback" means each `M*` key under Misconceptions is used by a wrong choice or question, or has its own `- **M3**:` item under Feedback. A missing key is `content.prose-key` (`id`=key, `field`=section heading, path = the `.md` file). |
| R12 | Controls | Path grammar is exactly spec §3.1. `workload.<field>` covers only the scalar `Workload` fields (`surge` and `params` cannot be addressed). `graph.nodes[<id>].config.<key>` needs the node in `base`, and a key the component declares or one of `NODE_OVERRIDE_KEYS`; for a planned component kind any key is accepted because readiness blocks the item anyway. The value does not need to exist in `base`: building an input writes every control's value (default or set), creating `config`/`calibration` objects as needed. Options are JSON scalars (sim-core `ConfigValue`), at least 2 and pairwise distinct. A `stepper` has numeric, strictly ascending options; a `toggle` has exactly 2; `default` must be one of the options. An option the engine rejects (base plus defaults with that one option) is `content.control` with engine codes attached. The draft `l0-database-basics` control that swapped a whole config object is not expressible and is redesigned in migration (Phase 7). |
| R13 | Choice rules (`content.choice`) | 2–6 choices, exactly one `correct: true`. The correct choice has no `misconception` and no `failsGoals`. Each wrong choice has both, and every `failsGoals` id is a goal id. `set` keys are control ids and values are among that control's options. Two choices that resolve to the same settings are an error. Reading-check rules use the same code: `passMark` 1..=questions, `single` needs at least 2 distinct options and `answer` among them, `numeric` needs a numeric `answer` and finite `tolerance >= 0`. Naive designs whose `failsGoals` is empty or names an unknown goal are also `content.choice`. |
| R14 | Grading wrong choices | Only goals named in `failsGoals` must fail. A listed goal that passes is `content.wrong-passes` (blocking). An unlisted goal that fails is `content.wrong-extra-fail` (warning). Challenges have no extra-fail warning: a naive design may fail more than it declares. |
| R15 | Challenges | `start` is a full `SimInput` (R2 seed default, optional `faults`, `durationMs`, `calibration`). A mode's input is `start` with `workloadOverride` shallow-merged into `workload` (a `null` value removes a key), `faults` replaced by the mode's `faults` (default `[]`), and `graph` replaced by the design's graph. There is no per-mode calibration in format v1; challenge calibration lives in `start.calibration`. The implicit goal is `{id:"budget", metric:"costPerMonth", op:"<=", value:budgetPerMonth}`, and an authored goal with id `budget` is `content.duplicate-id`. `budgetPerMonth` must be finite and > 0, `limits` values >= 1, and every `lockedNodes` id must exist in `start.graph`; anything else is `content.limits`. A locked node is "unchanged" when the design's node with that id is equal (`PartialEq` on the typed `Node`) to the start node; edges are free. `start.graph` is checked against `limits` only (it may be incomplete on purpose), and is not run. |
| R16 | `content.limits` vs `content.engine-invalid` | `validate_graph(graph, Some(&limits))` issues whose code starts with `limits.` become `content.limits` (engine issues attached). Every other blocking engine issue becomes `content.engine-invalid`. |
| R17 | Readiness values | `ready` (has engine needs, not blocked), `blocked`, `not-needed` (reading lesson), `planned` (roadmap stub). Pass/fail is separate from readiness. |
| R18 | Report shape and CLI | `ContentIssue { code, path, id?, field?, blocking, measured?, detail?, engine[], missing[] }`, where `path` is relative to the content dir. One `ItemReport` per item, plus an item `levels` for `levels.json` and other global issues. `--json` reports also carry `runs` (metrics and event codes of every engine run) so authors can read measured values. Text output prints `PASS <id>` for each item without blocking issues, then `WARN <id> …` / `FAIL <id> …` lines, then `N items: P passed, F failed, W warnings, B blocked`. Exit codes: 0 when there are no blocking issues (warnings allowed); 1 for any blocking issue, a stale curriculum on `--check`, or any blocking issue during `curriculum`; 2 when the dir is unreadable or has no `levels.json`. `--json` is accepted by both `validate` and `curriculum` (for `curriculum` it formats the validation report printed on failure). |
| R19 | Curriculum file | `content/curriculum.json` becomes version 2 with camelCase fields. It holds the same information as today: level metadata, ordered lessons and challenges with titles, minutes, difficulty, prerequisites, concepts, research, engine needs, readiness, gaps, the gap catalog with `neededBy`, the engine available/planned catalogs and counts. The `updated` date is dropped because the output must be deterministic. Titles of authored items come from the prose front matter. Engine needs of authored items are computed from their JSON; roadmap stubs keep their declared needs. `missing` lists what the engine lacks. Research note headers ("Feeds lessons:") are no longer parsed: the merged research lists are frozen into `levels.json` and `lesson.json` by the one-off conversion (Task 20). `curriculum` refuses to write when validation has a blocking issue. |
| R20 | Golden fixtures | `crates/content/tests/fixtures/good/` is a small valid tree whose numbers were measured on the engine while writing this plan. `broken/` is generated from `good/` by the committed script `make-broken.mjs` and covers every issue code. The golden test snapshots both text reports with insta and asserts every code in `codes::ALL` appears in the broken report. |
| R21 | CI | `content.yml` runs natively, not in the dev container: `rustup toolchain install` reads `rust-toolchain.toml`, `Swatinem/rust-cache@v2` caches, and a new cargo profile `ci` (release without LTO, 16 codegen units) keeps warm builds fast. Path filters are spec §9 plus `Cargo.toml`, `Cargo.lock` and `rust-toolchain.toml`, since a dependency or toolchain bump can break content too. `engine.yml` already triggers on `crates/**` and `packages/**`, so it needs no filter change; it gains content checks through the root `pnpm test`. |

## Global Constraints

- **Every build/test command runs inside the dev container via `./dev <command>`** (for example `./dev cargo test -p content`). Nothing is installed on the host. The only exception is CI's `content.yml`, which runs natively per spec §9.
- `sim-core` stays pure: no I/O, clock, OS randomness, threads or `HashMap`; transcendental math through `libm`. Task 1 adds only pure functions.
- `crates/content` may do file I/O (in `tree.rs` only) and use rayon. It still uses `BTreeMap`/`BTreeSet` (no `HashMap`), so output order never depends on hashing.
- Same content dir → byte-identical `validate` output (text and JSON) and byte-identical `curriculum.json`, regardless of thread count.
- Issue codes are exactly the 20 codes of spec §6, no more. Warnings are only `content.wrong-extra-fail` and `content.blocked`.
- The validator never checks wording. It never edits content to make it pass.
- No prose in engine or validator output beyond fixed short `detail` strings and serde error messages.
- JSON field names camelCase, enum values kebab-case, goal ops `"<="`, `">="`, `"=="` (same as sim-core).
- Fixture and test text is our own; nothing from the reference product or books.
- Every commit message ends with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Run `./dev cargo fmt --all` and `./dev cargo clippy -p content -p sim-cli --all-targets -- -D warnings` before each commit.

## Review Focus

1. **Silent drops.** A lesson whose base contains a field the engine ignores (for example `workload.params.hotKeyShare` or `config.autoscale`) must never pass as `ready`. Tests are in Task 12.
2. **Determinism under rayon.** Running `validate` twice, and with `RAYON_NUM_THREADS=1` vs the default, gives identical bytes. Test in Task 18.
3. **No panics on hostile input.** Non-object `base`, `start` as an array, a control path like `faults[99999999999999999999].atMs`, empty files, invalid UTF-8 and BOMs all give issues, never panics. Tests in Tasks 4, 5, 9 and 15.
4. **Wrong-choice grading.** `failsGoals` goals must fail; unlisted failures only warn. Test in Task 13.
5. **Locked nodes and limits** compare typed `Node`s, not JSON text, so key order or `replicas: 1` vs a missing field does not count as a change. Test in Task 16.
6. **Curriculum equivalence.** The Rust generator's output on the converted `levels.json` carries the same ids, order, titles, minutes, difficulty, prerequisites, concepts, research and gaps as today's `curriculum.json`. One-off check in Task 21.

## File Map

| Path | Responsibility |
|---|---|
| `crates/sim-core/src/capabilities.rs` | NEW: supported components, faults, measured metrics, read `workload.params` keys |
| `crates/sim-core/src/simulate.rs` | `check_input` split out of `simulate` |
| `crates/content/Cargo.toml` | New crate; features `ts` |
| `crates/content/src/lib.rs` | Public API: `load_dir`, `validate_tree`, `validate_dir`, `curriculum`, `curriculum_json` |
| `crates/content/src/issue.rs` | `ContentIssue`, `codes` |
| `crates/content/src/types.rs` | `Lesson`, `Experiment`, `Control`, `Choice`, `Check`, `Question`, `Challenge`, `Mode`, `Levels`, roadmap types (serde + ts-rs) |
| `crates/content/src/tree.rs` | `ContentTree`, `RawItem`, `load_dir`, `LoadError` (the only I/O) |
| `crates/content/src/prose.rs` | Front matter, `##` sections, keyed list items |
| `crates/content/src/known.rs` | Field-name sets taken from sim-core types by serialization |
| `crates/content/src/ids.rs` | Id patterns |
| `crates/content/src/structure.rs` | Parse stage and cross-item checks (ids, duplicates, prerequisites, research, levels refs) |
| `crates/content/src/prose_check.rs` | Required sections and keys |
| `crates/content/src/controls.rs` | Control path grammar, resolution, application, option rules |
| `crates/content/src/choices.rs` | Goal, choice, expect-shape and reading-check rules |
| `crates/content/src/engine_input.rs` | Input building (lesson, challenge mode), typed conversion, engine check |
| `crates/content/src/readiness.rs` | Capability scan → `missing` / unknown fields / metric status |
| `crates/content/src/experiment.rs` | Experiment engine stage: options, runs, grading, expect |
| `crates/content/src/challenge.rs` | Challenge structure, limits, locked nodes, mode runs |
| `crates/content/src/report.rs` | `ItemReport`, `Report`, `RunSummary`, `Readiness`, text output |
| `crates/content/src/curriculum.rs` | `Curriculum` types and generation |
| `crates/content/src/test_util.rs` | Good-tree builder and editors for unit tests |
| `crates/content/tests/fixtures/good/**` | Valid fixture tree |
| `crates/content/tests/fixtures/make-broken.mjs` | Generates `broken/` from `good/` |
| `crates/content/tests/fixtures/broken/**` | One broken item per issue code (generated, committed) |
| `crates/content/tests/golden.rs` | Golden report snapshots + code coverage |
| `crates/sim-cli/src/main.rs` | `content validate|curriculum` subcommands |
| `crates/sim-cli/tests/content_cli.rs` | CLI exit codes, output, determinism, `--check` |
| `packages/content/**` | `@sd/content`: generated TS types + re-exports |
| `scripts/check-types.sh` | Freshness check for both generated type dirs |
| `content/levels.json` | NEW: levels, ordering, catalogs, roadmap stubs |
| `content/curriculum.json` | Regenerated by `sim-cli content curriculum` (version 2) |
| `content/tools/gen_curriculum.py` | DELETED in Task 24 |
| `.github/workflows/content.yml` | Rust-based content CI |
| `package.json`, `compose.yaml`, `Cargo.toml` | Scripts, a node_modules volume, workspace member, `ci` profile |

## Phases and tasks

| Phase | Tasks |
|---|---|
| 1. Crate skeleton, types, loader, prose parser | 1–5 |
| 2. Structural validation | 6–10 |
| 3. Experiment validation on sim-core | 11–14 |
| 4. Challenge validation | 15–17 |
| 5. Orchestration, golden test, CLI, curriculum, TS export | 18–23 |
| 6. CI and scripts | 24 |
| 7. Migration hand-off to the content-researcher agent | 25 |

---

## Phase 1: Crate skeleton, types, loader, prose parser

### Task 1: `sim-core` gains `check_input` and `capabilities`

**Files:**
- Create: `crates/sim-core/src/capabilities.rs`
- Modify: `crates/sim-core/src/simulate.rs`, `crates/sim-core/src/lib.rs`

**Interfaces:**
- Produces: `sim_core::check_input(&SimInput) -> Vec<ValidationIssue>` (all issues `simulate` checks, warnings included); `sim_core::capabilities() -> Capabilities { components: Vec<String>, faults: Vec<FaultKind>, metrics: Vec<String>, workload_params: Vec<String> }`; constants `capabilities::SUPPORTED_FAULTS`, `capabilities::MEASURED_METRICS`, `capabilities::WORKLOAD_PARAMS`.

- [ ] **Step 1: Write the failing tests** at the bottom of a new `crates/sim-core/src/capabilities.rs`:

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use crate::grade::metric_value;
    use crate::simulate;
    use crate::test_util::{input, web_tier};
    use crate::types::{Fault, FaultKind, Metrics};

    const ALL_FAULTS: [FaultKind; 14] = [
        FaultKind::TrafficSurge3x,
        FaultKind::InstanceDown,
        FaultKind::InstanceSlow,
        FaultKind::LbNodeDown,
        FaultKind::CacheDown,
        FaultKind::DbOverloaded,
        FaultKind::DbPrimaryDown,
        FaultKind::DbReplicaDown,
        FaultKind::DbStalled,
        FaultKind::BrokerDown,
        FaultKind::ObjectStorageDown,
        FaultKind::KvNodeDown,
        FaultKind::ThirdPartyDown,
        FaultKind::ThirdPartySlow,
    ];

    #[test]
    fn supported_faults_are_exactly_the_ones_the_engine_applies() {
        for kind in ALL_FAULTS {
            let mut i = input(web_tier(2, 3), 1_000.0);
            i.faults = vec![Fault { kind, target: None, at_ms: 1_000 }];
            let r = simulate(&i).unwrap();
            let unsupported = r.events.iter().any(|e| e.code == "fault.unsupported");
            assert_eq!(
                unsupported,
                !SUPPORTED_FAULTS.contains(&kind),
                "{kind:?}: capabilities and faults.rs disagree"
            );
        }
    }

    #[test]
    fn measured_metrics_are_present_and_the_rest_are_null() {
        let r = simulate(&input(web_tier(1, 1), 1_000.0)).unwrap();
        let keys = serde_json::to_value(Metrics::default()).unwrap();
        for key in keys.as_object().unwrap().keys() {
            let measured = metric_value(&r.metrics, key).is_some();
            assert_eq!(measured, MEASURED_METRICS.contains(&key.as_str()), "{key}");
        }
    }

    #[test]
    fn capabilities_list_registry_kinds() {
        let c = capabilities();
        assert_eq!(c.components, vec!["client", "lb", "postgres", "web-server"]);
        assert_eq!(c.faults.len(), 4);
        assert!(c.workload_params.is_empty());
    }
}
```

Add to `crates/sim-core/src/simulate.rs` tests:

```rust
    #[test]
    fn check_input_reports_what_simulate_rejects_and_keeps_warnings() {
        let mut g = web_tier(1, 1);
        g.nodes.push(node("orphan", "web-server", 1, &[]));
        let mut i = input(g, 100.0);
        i.workload.write_ratio = 2.0;
        let issues = super::check_input(&i);
        let codes: Vec<&str> = issues.iter().map(|x| x.code.as_str()).collect();
        assert!(codes.contains(&"node.unreachable")); // warning kept
        assert!(codes.contains(&"workload.invalid"));
        let err = simulate(&i).unwrap_err();
        assert!(err.iter().all(|x| x.blocking));
        assert_eq!(err.len(), issues.iter().filter(|x| x.blocking).count());
    }
```

- [ ] **Step 2: Run them and see them fail**

Run: `./dev cargo test -p sim-core capabilities check_input`
Expected: compile errors: `capabilities` module and `check_input` not found.

- [ ] **Step 3: Implement**

`crates/sim-core/src/capabilities.rs` (above the tests):

```rust
//! What this engine build can simulate. Content tooling uses it to tell "not built yet" apart
//! from "broken": a lesson needing anything outside these lists is `blocked`, not failing.

use crate::types::FaultKind;

/// Fault kinds the engine applies. Every other kind parses but only emits `fault.unsupported`.
pub const SUPPORTED_FAULTS: [FaultKind; 4] = [
    FaultKind::TrafficSurge3x,
    FaultKind::InstanceDown,
    FaultKind::LbNodeDown,
    FaultKind::DbPrimaryDown,
];

/// Metric keys (as in `grade::metric_value`) every run reports. The optional metrics
/// (`duplicateIds`, `staleReads`, ...) need components that are not built yet and stay null.
pub const MEASURED_METRICS: [&str; 16] = [
    "p50",
    "p95",
    "p99",
    "availability",
    "throughputRps",
    "costPerMonth",
    "spofCount",
    "exposedBackends",
    "peakBusy",
    "peakDbConnections",
    "cacheOps",
    "requestsTotal",
    "requestsOk",
    "requestsRejected",
    "requestsTimedOut",
    "requestsUnreachable",
];

/// `workload.params` keys the engine reads. None yet; every key is ignored.
pub const WORKLOAD_PARAMS: [&str; 0] = [];

#[derive(Debug, Clone, PartialEq)]
pub struct Capabilities {
    pub components: Vec<String>,
    pub faults: Vec<FaultKind>,
    pub metrics: Vec<String>,
    pub workload_params: Vec<String>,
}

pub fn capabilities() -> Capabilities {
    Capabilities {
        components: crate::components::list_components()
            .into_iter()
            .map(|m| m.kind)
            .collect(),
        faults: SUPPORTED_FAULTS.to_vec(),
        metrics: MEASURED_METRICS.iter().map(|s| s.to_string()).collect(),
        workload_params: WORKLOAD_PARAMS.iter().map(|s| s.to_string()).collect(),
    }
}
```

In `crates/sim-core/src/simulate.rs`, replace the body of `simulate` up to `has_blocking`:

```rust
/// Every issue `simulate` checks before running, warnings (such as `node.unreachable`)
/// included. Content tooling calls it to vet inputs without running them.
pub fn check_input(input: &SimInput) -> Vec<ValidationIssue> {
    let mut issues = validate_graph(&input.graph, None);
    issues.extend(validate_workload(input));
    if let Some(o) = &input.calibration {
        for field in invalid_overrides(o) {
            issues.push(field_issue(codes::CALIBRATION_INVALID, None, field));
        }
    }
    issues
}

pub fn simulate(input: &SimInput) -> Result<SimResult, Vec<ValidationIssue>> {
    let issues = check_input(input);
    if has_blocking(&issues) {
        return Err(issues.into_iter().filter(|i| i.blocking).collect());
    }
    let mut engine = Engine::new(input);
    engine.run();
    Ok(engine.finish())
}
```

In `crates/sim-core/src/lib.rs` change `pub use simulate::simulate;` to `pub use simulate::{check_input, simulate};` and add:

```rust
pub mod capabilities;
pub use capabilities::{capabilities, Capabilities};
```

- [ ] **Step 4: Run all engine tests**

Run: `./dev cargo test -p sim-core && ./dev cargo run -q -p sim-cli -- check fixtures/golden`
Expected: all tests pass (the 3 new capability tests and 1 new simulate test included); `10 passed, 0 failed`. Parity and snapshot tests are unchanged because `simulate` behaves the same.

- [ ] **Step 5: Commit**

```bash
git add crates/sim-core
git commit -m "feat(sim-core): check_input and capabilities for content tooling

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 2: Crate skeleton, issue type and codes

**Files:**
- Create: `crates/content/Cargo.toml`, `crates/content/src/lib.rs`, `crates/content/src/issue.rs`
- Modify: `Cargo.toml` (workspace members)

**Interfaces:**
- Produces: `content::issue::{ContentIssue, codes}`; builder methods `ContentIssue::new(code, path)`, `.id()`, `.field()`, `.measured()`, `.detail()`, `.engine()`, `.missing()`. `blocking` is derived from the code (only the two warning codes are non-blocking).

- [ ] **Step 1: Create the crate manifest**

`crates/content/Cargo.toml`:

```toml
[package]
name = "content"
version.workspace = true
edition.workspace = true
rust-version.workspace = true
license.workspace = true
publish.workspace = true

[features]
ts = ["dep:ts-rs", "sim-core/ts"]

[dependencies]
sim-core = { path = "../sim-core" }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
rayon = "1"
ts-rs = { version = "10", optional = true, features = ["serde-json-impl"] }

[dev-dependencies]
insta = { version = "1", features = ["json"] }
tempfile = "3"
```

Add `"crates/content"` to `members` in the root `Cargo.toml`:

```toml
members = ["crates/sim-core", "crates/sim-cli", "crates/sim-wasm", "crates/content"]
```

- [ ] **Step 2: Write the failing test** in `crates/content/src/issue.rs`:

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn there_are_exactly_twenty_unique_codes_and_two_warnings() {
        let mut all = codes::ALL.to_vec();
        all.sort_unstable();
        all.dedup();
        assert_eq!(all.len(), 20);
        assert!(all.iter().all(|c| c.starts_with("content.")));
        for w in codes::WARNINGS {
            assert!(codes::ALL.contains(&w));
        }
    }

    #[test]
    fn blocking_follows_the_code() {
        assert!(ContentIssue::new(codes::CHOICE, "lessons/x/lesson.json").blocking);
        assert!(!ContentIssue::new(codes::BLOCKED, "lessons/x/lesson.json").blocking);
        assert!(!ContentIssue::new(codes::WRONG_EXTRA_FAIL, "x").blocking);
    }

    #[test]
    fn serializes_camel_case_with_empty_lists() {
        let i = ContentIssue::new(codes::EXPECT, "lessons/a/lesson.json")
            .id("A")
            .field("p95")
            .measured(Some(4.5));
        let v = serde_json::to_value(&i).unwrap();
        assert_eq!(v["code"], "content.expect");
        assert_eq!(v["measured"], 4.5);
        assert_eq!(v["engine"], serde_json::json!([]));
    }
}
```

`crates/content/src/lib.rs`:

```rust
//! Content format (lessons, challenges, levels) and its validator. See
//! docs/superpowers/specs/2026-10-20-content-format-design.md.

pub mod issue;
pub use issue::{codes, ContentIssue};
```

- [ ] **Step 3: Run it and see it fail**

Run: `./dev cargo test -p content`
Expected: compile errors: `ContentIssue` and `codes` not defined.

- [ ] **Step 4: Implement** (top of `crates/content/src/issue.rs`):

```rust
//! Validation issues. Codes are fixed by the spec (§6); messages are never prose.

use serde::{Deserialize, Serialize};
use sim_core::ValidationIssue;

pub mod codes {
    pub const PARSE: &str = "content.parse";
    pub const FORMAT_VERSION: &str = "content.format-version";
    pub const ID: &str = "content.id";
    pub const DUPLICATE_ID: &str = "content.duplicate-id";
    pub const PREREQUISITE_MISSING: &str = "content.prerequisite-missing";
    pub const PREREQUISITE_CYCLE: &str = "content.prerequisite-cycle";
    pub const RESEARCH_MISSING: &str = "content.research-missing";
    pub const PROSE_SECTION: &str = "content.prose-section";
    pub const PROSE_KEY: &str = "content.prose-key";
    pub const CONTROL: &str = "content.control";
    pub const CHOICE: &str = "content.choice";
    pub const ENGINE_INVALID: &str = "content.engine-invalid";
    pub const CORRECT_FAILS: &str = "content.correct-fails";
    pub const WRONG_PASSES: &str = "content.wrong-passes";
    pub const WRONG_EXTRA_FAIL: &str = "content.wrong-extra-fail";
    pub const EXPECT: &str = "content.expect";
    pub const REFERENCE_FAILS: &str = "content.reference-fails";
    pub const NAIVE_PASSES: &str = "content.naive-passes";
    pub const LIMITS: &str = "content.limits";
    pub const BLOCKED: &str = "content.blocked";

    pub const ALL: [&str; 20] = [
        PARSE, FORMAT_VERSION, ID, DUPLICATE_ID, PREREQUISITE_MISSING, PREREQUISITE_CYCLE,
        RESEARCH_MISSING, PROSE_SECTION, PROSE_KEY, CONTROL, CHOICE, ENGINE_INVALID,
        CORRECT_FAILS, WRONG_PASSES, WRONG_EXTRA_FAIL, EXPECT, REFERENCE_FAILS, NAIVE_PASSES,
        LIMITS, BLOCKED,
    ];

    /// The only non-blocking codes.
    pub const WARNINGS: [&str; 2] = [WRONG_EXTRA_FAIL, BLOCKED];
}

#[cfg_attr(feature = "ts", derive(ts_rs::TS), ts(export))]
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ContentIssue {
    pub code: String,
    /// File the issue is about, relative to the content dir (e.g. `lessons/l0-x/vi.md`).
    pub path: String,
    /// Sub-item id: choice, goal, control, question, mode, key or referenced item.
    pub id: Option<String>,
    /// Field, goal id, metric or section heading the issue is about.
    pub field: Option<String>,
    pub blocking: bool,
    pub measured: Option<f64>,
    /// Short fixed detail (`"listed after"`, `"unknown field"`) or a serde error message.
    pub detail: Option<String>,
    /// Engine validation issues behind `content.engine-invalid`, `content.control`, `content.limits`.
    pub engine: Vec<ValidationIssue>,
    /// Engine features a blocked item needs (`component:redis`, `fault:instance-slow`, ...).
    pub missing: Vec<String>,
}

impl ContentIssue {
    pub fn new(code: &str, path: impl Into<String>) -> Self {
        ContentIssue {
            code: code.into(),
            path: path.into(),
            id: None,
            field: None,
            blocking: !codes::WARNINGS.contains(&code),
            measured: None,
            detail: None,
            engine: vec![],
            missing: vec![],
        }
    }
    pub fn id(mut self, id: impl Into<String>) -> Self {
        self.id = Some(id.into());
        self
    }
    pub fn field(mut self, field: impl Into<String>) -> Self {
        self.field = Some(field.into());
        self
    }
    pub fn measured(mut self, measured: Option<f64>) -> Self {
        self.measured = measured;
        self
    }
    pub fn detail(mut self, detail: impl Into<String>) -> Self {
        self.detail = Some(detail.into());
        self
    }
    pub fn engine(mut self, engine: Vec<ValidationIssue>) -> Self {
        self.engine = engine;
        self
    }
    pub fn missing(mut self, missing: Vec<String>) -> Self {
        self.missing = missing;
        self
    }
}
```

- [ ] **Step 5: Run the tests**

Run: `./dev cargo test -p content`
Expected: `3 passed`.

- [ ] **Step 6: Commit**

```bash
git add Cargo.toml Cargo.lock crates/content
git commit -m "feat(content): crate skeleton with issue codes

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 3: Content types and the good fixture tree

**Files:**
- Create: `crates/content/src/types.rs`, all files under `crates/content/tests/fixtures/good/`
- Modify: `crates/content/src/lib.rs`

**Interfaces:**
- Produces: `FORMAT_VERSION`, `LevelId`, `LessonKind`, `Status`, `Lesson`, `Experiment`, `ControlType`, `Control`, `Choice`, `Check`, `QuestionType`, `Answer`, `Question`, `Challenge`, `Mode`, `Design`, `NaiveDesign`, `Levels`, `Level`, `ExitCheck`, `PlannedFeatures`, `EngineCatalog`, `EngineGap`, `EngineNeeds`, `Roadmap`, `RoadmapLesson`, `RoadmapChallenge`, `RoadmapMode`. The good fixture tree is reused by every later unit test through `test_util` (Task 4).

The numbers in the fixtures below were measured with `sim-cli run` on the current engine (seed 1, 10 s):

| Input | p95 | availability | rejected | cost | events |
|---|---|---|---|---|---|
| users→web, 1 vCPU, 12,000 rps (timeout 1 s or 5 s) | 953.86 | 0.8211 | 21,391 | 22.5 | `node.overloaded` |
| users→web, 2 vCPU, 12,000 rps | 4.68 | 1.0 | 0 | 50 | — |
| users→web, 4 vCPU, 12,000 rps | 4.68 | 1.0 | 0 | 105 | — |
| users→web 2 vCPU + `instance-down` at 3 s | 4.68 | 0.2996 | 0 | 50 | `instance.down` |
| users→lb→web×3 (1 vCPU) + `instance-down` at 3 s | 7.62 | 1.0 | 0 | 92.5 | `instance.down` |
| users→web 2 vCPU + `instance-slow` | 4.68 | 1.0 | 0 | 50 | `fault.unsupported` |

- [ ] **Step 1: Write the fixture files**

`crates/content/tests/fixtures/good/levels.json`:

```json
{
  "formatVersion": 1,
  "description": "Fixture curriculum for crates/content tests.",
  "fields": {},
  "engine": {
    "planned": {
      "components": ["redis"],
      "faults": ["instance-slow"],
      "fields": ["workload.params.hotKeyShare"],
      "dynamic": ["autoscaling"],
      "behaviors": []
    }
  },
  "engineGaps": {
    "fx-gap": { "description": "A gap used by the roadmap fixture.", "neededBy": ["l0-fx-planned"] }
  },
  "levels": [
    {
      "id": "L0",
      "titleVi": "Nền tảng",
      "titleEn": "Foundations",
      "score": [0, 10],
      "entryAssumptionsVi": ["Không cần kiến thức trước"],
      "entryAssumptionsEn": ["No prior knowledge"],
      "outcomesVi": ["Chọn cấu hình đủ sức chứa"],
      "outcomesEn": ["Pick a configuration with enough capacity"],
      "exitCheck": {
        "challenge": "c-l0-fx-shop",
        "mode": "standard",
        "reviewMinScore": 0.8,
        "descriptionVi": "Vượt qua chế độ standard.",
        "descriptionEn": "Pass the standard mode."
      },
      "lessons": ["l0-fx-capacity", "l0-fx-reading", "l0-fx-planned"],
      "challenges": ["c-l0-fx-shop"]
    }
  ],
  "roadmap": {
    "lessons": [
      {
        "id": "l0-fx-planned",
        "titleVi": "Bài dự kiến",
        "titleEn": "A planned lesson",
        "kind": "experiment",
        "minutes": 10,
        "difficulty": 1,
        "prerequisites": ["l0-fx-capacity"],
        "concepts": ["cache"],
        "research": ["fx-capacity"],
        "needs": { "components": ["client", "redis"] }
      }
    ],
    "challenges": []
  }
}
```

`crates/content/tests/fixtures/good/research/fx-capacity.md`:

```markdown
# Capacity (fixture note)

Used only by crates/content tests.
```

`crates/content/tests/fixtures/good/lessons/l0-fx-capacity/lesson.json`:

```json
{
  "formatVersion": 1,
  "id": "l0-fx-capacity",
  "level": "L0",
  "kind": "experiment",
  "minutes": 12,
  "difficulty": 1,
  "prerequisites": [],
  "concepts": ["capacity"],
  "research": ["fx-capacity"],
  "status": "draft",
  "experiment": {
    "base": {
      "graph": {
        "nodes": [
          { "id": "users", "kind": "client" },
          { "id": "web", "kind": "web-server", "config": { "cpu": 1, "memoryGb": 2 } }
        ],
        "edges": [{ "id": "e1", "from": "users", "to": "web", "kind": "http" }]
      },
      "workload": { "baseRps": 12000 }
    },
    "controls": [
      { "id": "cpu", "type": "stepper", "path": "graph.nodes[web].config.cpu", "options": [1, 2, 4], "default": 1 },
      { "id": "timeout", "type": "select", "path": "workload.clientTimeoutMs", "options": [1000, 5000], "default": 1000 }
    ],
    "goals": [
      { "id": "fast", "metric": "p95", "op": "<=", "value": 50 },
      { "id": "no-drops", "metric": "requestsRejected", "op": "<=", "value": 0 }
    ],
    "choices": [
      { "id": "A", "correct": true, "set": { "cpu": 2 },
        "expect": { "p95": { "<=": 10 }, "requestsRejected": { "==": 0 } } },
      { "id": "B", "misconception": "M1", "set": { "cpu": 1, "timeout": 5000 },
        "failsGoals": ["fast", "no-drops"],
        "expect": { "requestsRejected": { ">=": 1 } }, "expectEvents": ["node.overloaded"] },
      { "id": "C", "misconception": "M2", "set": { "cpu": 1 },
        "failsGoals": ["fast", "no-drops"], "expect": { "p95": { ">=": 500 } } }
    ]
  }
}
```

`crates/content/tests/fixtures/good/lessons/l0-fx-capacity/vi.md`:

```markdown
---
id: l0-fx-capacity
title: Sức chứa của một máy chủ (bài mẫu)
---

## Mục tiêu
Chọn số vCPU để không yêu cầu nào bị từ chối.

## Hình dung trước
Một quầy chỉ có một người phục vụ.

## Thuật ngữ
- **Capacity** (sức chứa): số yêu cầu tối đa mỗi giây.

## Hiểu lầm thường gặp
- **M1**: Chờ lâu hơn thì hết quá tải.
- **M2**: Vượt sức chứa một chút cũng không sao.

## Thí nghiệm
Thử từng lựa chọn rồi so sánh p95.

## Phản hồi
- **B**: Chờ lâu hơn không làm máy chạy nhanh hơn.
- **C**: Phần dư cộng dồn cho đến khi hàng đợi đầy.

## Điều cần nhớ
- Sức chứa đến từ CPU.
```

`crates/content/tests/fixtures/good/lessons/l0-fx-capacity/en.md`:

```markdown
---
id: l0-fx-capacity
title: The capacity of one server (fixture)
---

## Outcome
Pick the number of vCPUs so that no request is rejected.

## Picture it first
One counter with one person serving.

## Terms
- **Capacity**: the most requests per second a server can finish.

## Common misconceptions
- **M1**: Waiting longer cures overload.
- **M2**: Going a little over capacity is fine.

## Experiment
Try each choice and compare p95.

## Feedback
- **B**: Waiting longer does not make the server faster.
- **C**: The excess adds up until the queue is full.

## Takeaways
- Capacity comes from CPU.
```

`crates/content/tests/fixtures/good/lessons/l0-fx-reading/lesson.json`:

```json
{
  "formatVersion": 1,
  "id": "l0-fx-reading",
  "level": "L0",
  "kind": "reading",
  "minutes": 8,
  "difficulty": 1,
  "prerequisites": ["l0-fx-capacity"],
  "concepts": ["availability"],
  "research": ["fx-capacity"],
  "status": "draft",
  "check": {
    "passMark": 2,
    "questions": [
      { "id": "q1", "type": "single", "options": ["a", "b", "c"], "answer": "b", "misconception": "M1" },
      { "id": "q2", "type": "numeric", "answer": 525.6, "tolerance": 1, "unit": "min" }
    ]
  }
}
```

`crates/content/tests/fixtures/good/lessons/l0-fx-reading/vi.md`:

```markdown
---
id: l0-fx-reading
title: "Sẵn sàng: bài đọc mẫu"
---

## Mục tiêu
Đổi tỉ lệ sẵn sàng thành thời gian ngừng.

## Hình dung trước
Một cửa hàng đóng cửa vài phút mỗi năm.

## Thuật ngữ
- **Availability** (độ sẵn sàng): phần thời gian hệ thống phục vụ được.

## Hiểu lầm thường gặp
- **M1**: 99,9% nghĩa là gần như không bao giờ ngừng.

## Câu hỏi
- **q1**: 99,9% cho phép ngừng bao lâu mỗi năm?
- **q1.a**: Vài giây.
- **q1.b**: Khoảng 8,8 giờ.
- **q1.c**: Một tuần.
- **q2**: 99,9% mỗi năm là bao nhiêu phút ngừng?

## Phản hồi
- **q1**: Một phần nghìn của một năm là gần 9 giờ.

## Điều cần nhớ
- Mỗi số 9 thêm vào chia thời gian ngừng cho mười.
```

`crates/content/tests/fixtures/good/lessons/l0-fx-reading/en.md`:

```markdown
---
id: l0-fx-reading
title: "Availability: a fixture reading"
---

## Outcome
Turn an availability figure into downtime.

## Picture it first
A shop that closes for a few minutes a year.

## Terms
- **Availability**: the share of time a system can serve.

## Common misconceptions
- **M1**: 99.9% means it almost never stops.

## Questions
- **q1**: How much downtime a year does 99.9% allow?
- **q1.a**: A few seconds.
- **q1.b**: About 8.8 hours.
- **q1.c**: A week.
- **q2**: How many minutes of downtime a year is 99.9%?

## Feedback
- **q1**: One thousandth of a year is almost 9 hours.

## Takeaways
- Each extra nine divides downtime by ten.
```

(The q2 numeric answer 525.6 is minutes for 99.99%; the fixture checks format, not facts. Keep it as is: the validator never checks wording or answers' truth.)

`crates/content/tests/fixtures/good/challenges/c-l0-fx-shop/challenge.json`:

```json
{
  "formatVersion": 1,
  "id": "c-l0-fx-shop",
  "level": "L0",
  "prerequisites": ["l0-fx-capacity"],
  "status": "draft",
  "start": {
    "graph": {
      "nodes": [{ "id": "users", "kind": "client" }, { "id": "web", "kind": "web-server" }],
      "edges": [{ "id": "e1", "from": "users", "to": "web", "kind": "http" }]
    },
    "workload": { "baseRps": 12000 }
  },
  "lockedNodes": ["users"],
  "limits": { "maxNodes": 4, "maxInstances": 6, "allowedKinds": ["client", "lb", "web-server"] },
  "goals": [
    { "id": "fast", "metric": "p95", "op": "<=", "value": 50 },
    { "id": "up", "metric": "availability", "op": ">=", "value": 0.98 }
  ],
  "modes": [
    {
      "id": "standard",
      "budgetPerMonth": 60,
      "reference": {
        "graph": {
          "nodes": [{ "id": "users", "kind": "client" }, { "id": "web", "kind": "web-server", "config": { "cpu": 2 } }],
          "edges": [{ "id": "e1", "from": "users", "to": "web", "kind": "http" }]
        }
      },
      "naive": {
        "graph": {
          "nodes": [{ "id": "users", "kind": "client" }, { "id": "web", "kind": "web-server" }],
          "edges": [{ "id": "e1", "from": "users", "to": "web", "kind": "http" }]
        },
        "failsGoals": ["fast", "up"]
      }
    },
    {
      "id": "chaos",
      "budgetPerMonth": 100,
      "faults": [{ "kind": "instance-down", "target": "web", "atMs": 3000 }],
      "reference": {
        "graph": {
          "nodes": [
            { "id": "users", "kind": "client" },
            { "id": "lb", "kind": "lb" },
            { "id": "web", "kind": "web-server", "replicas": 3 }
          ],
          "edges": [
            { "id": "e1", "from": "users", "to": "lb", "kind": "http" },
            { "id": "e2", "from": "lb", "to": "web", "kind": "http" }
          ]
        }
      },
      "naive": {
        "graph": {
          "nodes": [{ "id": "users", "kind": "client" }, { "id": "web", "kind": "web-server", "config": { "cpu": 2 } }],
          "edges": [{ "id": "e1", "from": "users", "to": "web", "kind": "http" }]
        },
        "failsGoals": ["up"]
      }
    }
  ],
  "hints": ["h1", "h2"]
}
```

`crates/content/tests/fixtures/good/challenges/c-l0-fx-shop/vi.md`:

```markdown
---
id: c-l0-fx-shop
title: Cửa hàng mẫu
---

## Bối cảnh
Một cửa hàng nhận 12.000 yêu cầu mỗi giây.

## Mục tiêu
Giữ p95 dưới 50 ms trong ngân sách.

## Gợi ý
- **h1**: Một vCPU xử lý được bao nhiêu yêu cầu mỗi giây?
- **h2**: Mất một máy thì phần còn lại có đủ sức không?
```

`crates/content/tests/fixtures/good/challenges/c-l0-fx-shop/en.md`:

```markdown
---
id: c-l0-fx-shop
title: The fixture shop
---

## Scenario
A shop receives 12,000 requests per second.

## Outcome
Keep p95 under 50 ms within budget.

## Hints
- **h1**: How many requests per second does one vCPU finish?
- **h2**: If one machine is lost, can the rest cope?
```

- [ ] **Step 2: Write the failing parse tests** at the bottom of `crates/content/src/types.rs`:

```rust
#[cfg(test)]
mod tests {
    use super::*;

    const GOOD: &str = concat!(env!("CARGO_MANIFEST_DIR"), "/tests/fixtures/good/");

    fn read(rel: &str) -> String {
        std::fs::read_to_string(format!("{GOOD}{rel}")).unwrap()
    }

    #[test]
    fn good_fixture_items_parse() {
        let l: Lesson = serde_json::from_str(&read("lessons/l0-fx-capacity/lesson.json")).unwrap();
        assert_eq!(l.kind, LessonKind::Experiment);
        let e = l.experiment.unwrap();
        assert_eq!(e.controls[0].kind, ControlType::Stepper);
        assert_eq!(e.choices[1].fails_goals, vec!["fast", "no-drops"]);
        let r: Lesson = serde_json::from_str(&read("lessons/l0-fx-reading/lesson.json")).unwrap();
        assert_eq!(r.check.unwrap().questions[1].answer, Answer::Number(525.6));
        let c: Challenge = serde_json::from_str(&read("challenges/c-l0-fx-shop/challenge.json")).unwrap();
        assert_eq!(c.modes[0].faults, serde_json::json!([]));
        assert_eq!(c.modes[1].naive.fails_goals, vec!["up"]);
        let lv: Levels = serde_json::from_str(&read("levels.json")).unwrap();
        assert_eq!(lv.levels[0].id, LevelId::L0);
        assert_eq!(lv.roadmap.lessons[0].needs.components, vec!["client", "redis"]);
    }

    #[test]
    fn unknown_fields_are_rejected() {
        let mut v: serde_json::Value =
            serde_json::from_str(&read("lessons/l0-fx-capacity/lesson.json")).unwrap();
        v["minuets"] = 3.into();
        assert!(serde_json::from_value::<Lesson>(v).is_err());
    }
}
```

Add `pub mod types;` and `pub use types::*;` to `lib.rs`.

- [ ] **Step 3: Run and see them fail**

Run: `./dev cargo test -p content types`
Expected: compile errors (types missing).

- [ ] **Step 4: Implement `crates/content/src/types.rs`**

```rust
//! The content format (spec §3, §4) plus `levels.json` (spec §2, ruling R8).
//! Engine-shaped parts stay raw JSON (ruling R3) and are typed only after the readiness scan.

use serde::{Deserialize, Serialize};
use serde_json::Value;
use sim_core::{ConfigValue, Goal, GraphLimits};
use std::collections::BTreeMap;

macro_rules! exported {
    ($item:item) => {
        #[cfg_attr(feature = "ts", derive(ts_rs::TS), ts(export))]
        $item
    };
}

pub const FORMAT_VERSION: u64 = 1;

fn empty_array() -> Value {
    Value::Array(vec![])
}
fn empty_object() -> Value {
    Value::Object(Default::default())
}

exported! {
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
pub enum LevelId { L0, L1, L2, L3, L4, L5, L6 }
}

impl LevelId {
    /// The digit used in ids (`l0-…`, `c-l0-…`).
    pub fn digit(self) -> char {
        (b'0' + self as u8) as char
    }
}

exported! {
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum LessonKind { Experiment, Reading }
}

exported! {
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum Status { Draft, Review, Published }
}

exported! {
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Lesson {
    pub format_version: u64,
    pub id: String,
    pub level: LevelId,
    pub kind: LessonKind,
    pub minutes: u32,
    pub difficulty: u8,
    #[serde(default)]
    pub prerequisites: Vec<String>,
    #[serde(default)]
    pub concepts: Vec<String>,
    #[serde(default)]
    pub research: Vec<String>,
    pub status: Status,
    #[serde(default)]
    #[cfg_attr(feature = "ts", ts(optional))]
    pub experiment: Option<Experiment>,
    #[serde(default)]
    #[cfg_attr(feature = "ts", ts(optional))]
    pub check: Option<Check>,
}
}

exported! {
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Experiment {
    #[cfg_attr(feature = "ts", ts(as = "sim_core::SimInput"))]
    pub base: Value,
    pub controls: Vec<Control>,
    pub goals: Vec<Goal>,
    pub choices: Vec<Choice>,
}
}

exported! {
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum ControlType { Stepper, Select, Toggle }
}

exported! {
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Control {
    pub id: String,
    #[serde(rename = "type")]
    pub kind: ControlType,
    pub path: String,
    pub options: Vec<ConfigValue>,
    pub default: ConfigValue,
}
}

exported! {
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Choice {
    pub id: String,
    #[serde(default)]
    pub correct: bool,
    #[serde(default)]
    #[cfg_attr(feature = "ts", ts(optional))]
    pub misconception: Option<String>,
    #[serde(default)]
    pub set: BTreeMap<String, ConfigValue>,
    #[serde(default)]
    pub fails_goals: Vec<String>,
    /// Golden-fixture shape: metric -> { op -> value }.
    #[serde(default)]
    pub expect: BTreeMap<String, BTreeMap<String, f64>>,
    #[serde(default)]
    pub expect_events: Vec<String>,
}
}

exported! {
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Check { pub pass_mark: u32, pub questions: Vec<Question> }
}

exported! {
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum QuestionType { Single, Numeric }
}

exported! {
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(untagged)]
pub enum Answer { Number(f64), Text(String) }
}

exported! {
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Question {
    pub id: String,
    #[serde(rename = "type")]
    pub kind: QuestionType,
    #[serde(default)]
    pub options: Vec<String>,
    pub answer: Answer,
    #[serde(default)]
    #[cfg_attr(feature = "ts", ts(optional))]
    pub tolerance: Option<f64>,
    #[serde(default)]
    #[cfg_attr(feature = "ts", ts(optional))]
    pub unit: Option<String>,
    #[serde(default)]
    #[cfg_attr(feature = "ts", ts(optional))]
    pub misconception: Option<String>,
}
}

exported! {
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Challenge {
    pub format_version: u64,
    pub id: String,
    pub level: LevelId,
    #[serde(default)]
    pub prerequisites: Vec<String>,
    pub status: Status,
    #[cfg_attr(feature = "ts", ts(as = "sim_core::SimInput"))]
    pub start: Value,
    #[serde(default)]
    pub locked_nodes: Vec<String>,
    #[serde(default)]
    pub limits: GraphLimits,
    pub goals: Vec<Goal>,
    pub modes: Vec<Mode>,
    #[serde(default)]
    pub hints: Vec<String>,
}
}

exported! {
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Mode {
    pub id: String,
    pub budget_per_month: f64,
    #[serde(default = "empty_array")]
    #[cfg_attr(feature = "ts", ts(as = "Vec<sim_core::Fault>"))]
    pub faults: Value,
    #[serde(default = "empty_object")]
    pub workload_override: Value,
    pub reference: Design,
    pub naive: NaiveDesign,
}
}

exported! {
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Design {
    #[cfg_attr(feature = "ts", ts(as = "sim_core::Graph"))]
    pub graph: Value,
}
}

exported! {
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct NaiveDesign {
    #[cfg_attr(feature = "ts", ts(as = "sim_core::Graph"))]
    pub graph: Value,
    #[serde(default)]
    pub fails_goals: Vec<String>,
}
}

// ---------- levels.json ----------

exported! {
#[derive(Debug, Clone, PartialEq, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct PlannedFeatures {
    #[serde(default)] pub components: Vec<String>,
    #[serde(default)] pub faults: Vec<String>,
    /// Input fields the engine will read later: `workload.<k>`, `workload.params.<k>`,
    /// `calibration.<k>`, `config.<kind>.<k>`.
    #[serde(default)] pub fields: Vec<String>,
    #[serde(default)] pub dynamic: Vec<String>,
    #[serde(default)] pub behaviors: Vec<String>,
}
}

exported! {
#[derive(Debug, Clone, PartialEq, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct EngineCatalog { #[serde(default)] pub planned: PlannedFeatures }
}

exported! {
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct EngineGap { pub description: String, #[serde(default)] pub needed_by: Vec<String> }
}

exported! {
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ExitCheck {
    pub challenge: String,
    pub mode: String,
    pub review_min_score: f64,
    pub description_vi: String,
    pub description_en: String,
}
}

exported! {
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Level {
    pub id: LevelId,
    pub title_vi: String,
    pub title_en: String,
    pub score: [u32; 2],
    pub entry_assumptions_vi: Vec<String>,
    pub entry_assumptions_en: Vec<String>,
    pub outcomes_vi: Vec<String>,
    pub outcomes_en: Vec<String>,
    pub exit_check: ExitCheck,
    pub lessons: Vec<String>,
    pub challenges: Vec<String>,
}
}

exported! {
#[derive(Debug, Clone, PartialEq, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct EngineNeeds {
    #[serde(default)] pub components: Vec<String>,
    #[serde(default)] pub faults: Vec<String>,
    #[serde(default)] pub dynamic: Vec<String>,
    #[serde(default)] pub behaviors: Vec<String>,
    #[serde(default)] pub calibration: Vec<String>,
    #[serde(default)] pub node_overrides: Vec<String>,
    #[serde(default)] pub metrics: Vec<String>,
}
}

exported! {
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct RoadmapLesson {
    pub id: String,
    pub title_vi: String,
    pub title_en: String,
    pub kind: LessonKind,
    pub minutes: u32,
    pub difficulty: u8,
    #[serde(default)] pub prerequisites: Vec<String>,
    #[serde(default)] pub concepts: Vec<String>,
    #[serde(default)] pub research: Vec<String>,
    #[serde(default)] pub needs: EngineNeeds,
}
}

exported! {
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct RoadmapMode {
    pub id: String,
    pub budget_per_month: f64,
    #[serde(default = "empty_array")]
    pub faults: Value,
    #[serde(default)]
    #[cfg_attr(feature = "ts", ts(optional))]
    pub calibration: Option<Value>,
    #[serde(default)]
    #[cfg_attr(feature = "ts", ts(optional))]
    pub note: Option<String>,
}
}

exported! {
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct RoadmapChallenge {
    pub id: String,
    pub title_vi: String,
    pub title_en: String,
    #[serde(default)] pub prerequisites: Vec<String>,
    #[serde(default)] pub allowed_kinds: Vec<String>,
    pub workload: Value,
    pub goals: Vec<Goal>,
    pub modes: Vec<RoadmapMode>,
    pub brief_vi: String,
    pub brief_en: String,
}
}

exported! {
#[derive(Debug, Clone, PartialEq, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Roadmap {
    #[serde(default)] pub lessons: Vec<RoadmapLesson>,
    #[serde(default)] pub challenges: Vec<RoadmapChallenge>,
}
}

exported! {
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Levels {
    pub format_version: u64,
    pub description: String,
    #[serde(default)]
    pub fields: BTreeMap<String, String>,
    #[serde(default)]
    pub engine: EngineCatalog,
    #[serde(default)]
    pub engine_gaps: BTreeMap<String, EngineGap>,
    pub levels: Vec<Level>,
    #[serde(default)]
    pub roadmap: Roadmap,
}
}
```

`GraphLimits` already uses `#[serde(default)]` per field and camelCase, so `{"maxNodes": 4, ...}` parses. It does not deny unknown fields; a typo there is caught by Task 15 (`limits` must be one of the three keys, checked on the raw JSON).

- [ ] **Step 5: Run the tests**

Run: `./dev cargo test -p content`
Expected: `5 passed`.

- [ ] **Step 6: Commit**

```bash
git add crates/content
git commit -m "feat(content): format types and the good fixture tree

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 4: Loader (`ContentTree`) and test helpers

**Files:**
- Create: `crates/content/src/tree.rs`, `crates/content/src/test_util.rs`
- Modify: `crates/content/src/lib.rs`

**Interfaces:**
- Produces: `ContentTree { levels: FileText, research: BTreeSet<String>, lessons: Vec<RawItem>, challenges: Vec<RawItem> }`, `RawItem { folder, json: FileText, vi: FileText, en: FileText }`, `type FileText = Result<String, String>` (`Err` carries `"missing"` or the I/O message), `load_dir(&Path) -> Result<ContentTree, LoadError>`, `LoadError` (`Display`). Test helpers: `good_tree()`, `edit_json(&mut tree, folder, |&mut Value|)`, `edit_levels`, `edit_prose(&mut tree, folder, "vi"|"en", |&str| -> String)`.

- [ ] **Step 1: Write the failing tests** at the bottom of `crates/content/src/tree.rs`:

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    fn good_dir() -> PathBuf {
        PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("tests/fixtures/good")
    }

    #[test]
    fn loads_the_good_tree_sorted() {
        let t = load_dir(&good_dir()).unwrap();
        assert!(t.levels.is_ok());
        assert!(t.research.contains("fx-capacity"));
        let folders: Vec<&str> = t.lessons.iter().map(|i| i.folder.as_str()).collect();
        assert_eq!(folders, vec!["l0-fx-capacity", "l0-fx-reading"]);
        assert_eq!(t.challenges[0].folder, "c-l0-fx-shop");
        assert!(t.challenges[0].json.as_ref().unwrap().contains("\"modes\""));
    }

    #[test]
    fn missing_dir_and_missing_levels_are_load_errors() {
        assert!(matches!(load_dir(Path::new("/no/such/dir")), Err(LoadError::NotADirectory(_))));
        let tmp = tempfile::tempdir().unwrap();
        assert!(matches!(load_dir(tmp.path()), Err(LoadError::MissingLevels(_))));
    }

    #[test]
    fn missing_files_and_bad_utf8_become_file_errors_not_load_errors() {
        let tmp = tempfile::tempdir().unwrap();
        fs::write(tmp.path().join("levels.json"), "{}").unwrap();
        fs::create_dir_all(tmp.path().join("lessons/l0-x")).unwrap();
        fs::write(tmp.path().join("lessons/l0-x/vi.md"), [0xff, 0xfe, 0x00]).unwrap();
        fs::write(tmp.path().join("lessons/.DS_Store"), "").unwrap();
        let t = load_dir(tmp.path()).unwrap();
        assert_eq!(t.lessons.len(), 1);
        assert_eq!(t.lessons[0].json, Err("missing".to_string()));
        assert!(t.lessons[0].vi.is_err());
        assert!(t.challenges.is_empty());
    }
}
```

Add to `lib.rs`:

```rust
pub mod tree;
pub use tree::{load_dir, ContentTree, LoadError, RawItem};

#[cfg(test)]
pub(crate) mod test_util;
```

- [ ] **Step 2: Run and see them fail**

Run: `./dev cargo test -p content tree`
Expected: compile errors.

- [ ] **Step 3: Implement `crates/content/src/tree.rs`**

```rust
//! Reads a content directory into memory. The only module that touches the file system; every
//! check works on `ContentTree`, so unit tests build trees without files.

use std::collections::BTreeSet;
use std::fmt;
use std::path::{Path, PathBuf};

/// File contents, or why they are not available (`"missing"` or the I/O error).
pub type FileText = Result<String, String>;

#[derive(Debug, Clone, PartialEq)]
pub struct RawItem {
    /// Folder name under `lessons/` or `challenges/`.
    pub folder: String,
    /// `lesson.json` or `challenge.json`.
    pub json: FileText,
    pub vi: FileText,
    pub en: FileText,
}

#[derive(Debug, Clone, PartialEq)]
pub struct ContentTree {
    pub levels: FileText,
    /// Research note ids: `research/<id>.md` file stems.
    pub research: BTreeSet<String>,
    pub lessons: Vec<RawItem>,
    pub challenges: Vec<RawItem>,
}

#[derive(Debug)]
pub enum LoadError {
    NotADirectory(PathBuf),
    MissingLevels(PathBuf),
    Io(PathBuf, String),
}

impl fmt::Display for LoadError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            LoadError::NotADirectory(p) => write!(f, "{}: not a readable directory", p.display()),
            LoadError::MissingLevels(p) => write!(f, "{}: no levels.json, not a content directory", p.display()),
            LoadError::Io(p, e) => write!(f, "{}: {e}", p.display()),
        }
    }
}

impl std::error::Error for LoadError {}

fn read_text(path: &Path) -> FileText {
    match std::fs::read(path) {
        Ok(bytes) => String::from_utf8(bytes).map_err(|_| "not UTF-8".to_string()),
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => Err("missing".into()),
        Err(e) => Err(e.to_string()),
    }
}

/// Visible sub-directory names, sorted. A missing parent is an empty list.
fn folders(dir: &Path) -> Result<Vec<String>, LoadError> {
    if !dir.exists() {
        return Ok(vec![]);
    }
    let entries = std::fs::read_dir(dir).map_err(|e| LoadError::Io(dir.into(), e.to_string()))?;
    let mut out: Vec<String> = entries
        .filter_map(|e| e.ok())
        .filter(|e| e.path().is_dir())
        .filter_map(|e| e.file_name().into_string().ok())
        .filter(|n| !n.starts_with('.'))
        .collect();
    out.sort();
    Ok(out)
}

fn items(dir: &Path, json_name: &str) -> Result<Vec<RawItem>, LoadError> {
    Ok(folders(dir)?
        .into_iter()
        .map(|folder| {
            let d = dir.join(&folder);
            RawItem {
                json: read_text(&d.join(json_name)),
                vi: read_text(&d.join("vi.md")),
                en: read_text(&d.join("en.md")),
                folder,
            }
        })
        .collect())
}

pub fn load_dir(dir: &Path) -> Result<ContentTree, LoadError> {
    if !dir.is_dir() {
        return Err(LoadError::NotADirectory(dir.into()));
    }
    let levels_path = dir.join("levels.json");
    if !levels_path.is_file() {
        return Err(LoadError::MissingLevels(dir.into()));
    }
    let mut research = BTreeSet::new();
    let research_dir = dir.join("research");
    if research_dir.is_dir() {
        let entries = std::fs::read_dir(&research_dir)
            .map_err(|e| LoadError::Io(research_dir.clone(), e.to_string()))?;
        for e in entries.filter_map(|e| e.ok()) {
            if let Some(stem) = e.file_name().to_str().and_then(|n| n.strip_suffix(".md")) {
                research.insert(stem.to_string());
            }
        }
    }
    Ok(ContentTree {
        levels: read_text(&levels_path),
        research,
        lessons: items(&dir.join("lessons"), "lesson.json")?,
        challenges: items(&dir.join("challenges"), "challenge.json")?,
    })
}
```

`crates/content/src/test_util.rs`:

```rust
//! Unit-test helpers: the good fixture tree in memory, and editors that change one thing.

use crate::tree::{ContentTree, RawItem};
use serde_json::Value;

macro_rules! fx {
    ($p:literal) => {
        include_str!(concat!(env!("CARGO_MANIFEST_DIR"), "/tests/fixtures/good/", $p)).to_string()
    };
}

fn item(folder: &str, json: String, vi: String, en: String) -> RawItem {
    RawItem { folder: folder.into(), json: Ok(json), vi: Ok(vi), en: Ok(en) }
}

pub fn good_tree() -> ContentTree {
    ContentTree {
        levels: Ok(fx!("levels.json")),
        research: ["fx-capacity".to_string()].into_iter().collect(),
        lessons: vec![
            item(
                "l0-fx-capacity",
                fx!("lessons/l0-fx-capacity/lesson.json"),
                fx!("lessons/l0-fx-capacity/vi.md"),
                fx!("lessons/l0-fx-capacity/en.md"),
            ),
            item(
                "l0-fx-reading",
                fx!("lessons/l0-fx-reading/lesson.json"),
                fx!("lessons/l0-fx-reading/vi.md"),
                fx!("lessons/l0-fx-reading/en.md"),
            ),
        ],
        challenges: vec![item(
            "c-l0-fx-shop",
            fx!("challenges/c-l0-fx-shop/challenge.json"),
            fx!("challenges/c-l0-fx-shop/vi.md"),
            fx!("challenges/c-l0-fx-shop/en.md"),
        )],
    }
}

fn find<'a>(tree: &'a mut ContentTree, folder: &str) -> &'a mut RawItem {
    tree.lessons
        .iter_mut()
        .chain(tree.challenges.iter_mut())
        .find(|i| i.folder == folder)
        .unwrap_or_else(|| panic!("no fixture item {folder}"))
}

pub fn edit_json(tree: &mut ContentTree, folder: &str, f: impl FnOnce(&mut Value)) {
    let it = find(tree, folder);
    let mut v: Value = serde_json::from_str(it.json.as_ref().unwrap()).unwrap();
    f(&mut v);
    it.json = Ok(serde_json::to_string_pretty(&v).unwrap());
}

pub fn edit_levels(tree: &mut ContentTree, f: impl FnOnce(&mut Value)) {
    let mut v: Value = serde_json::from_str(tree.levels.as_ref().unwrap()).unwrap();
    f(&mut v);
    tree.levels = Ok(serde_json::to_string_pretty(&v).unwrap());
}

pub fn edit_prose(tree: &mut ContentTree, folder: &str, lang: &str, f: impl FnOnce(&str) -> String) {
    let it = find(tree, folder);
    let slot = if lang == "vi" { &mut it.vi } else { &mut it.en };
    *slot = Ok(f(slot.as_ref().unwrap()));
}
```

Later tasks add a `codes_of(&Report, item_id) -> Vec<String>` helper here (Task 6).

- [ ] **Step 4: Run the tests**

Run: `./dev cargo test -p content`
Expected: `8 passed`. (`test_util` compiles; its functions may warn as unused until Task 6, so add `#![allow(dead_code)]` at the top of `test_util.rs` to keep clippy clean.)

- [ ] **Step 5: Commit**

```bash
git add crates/content
git commit -m "feat(content): load a content directory into memory

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 5: Prose parser

**Files:**
- Create: `crates/content/src/prose.rs`
- Modify: `crates/content/src/lib.rs` (`pub mod prose;`)

**Interfaces:**
- Produces: `Prose { id, title, sections: Vec<Section> }`, `Section { heading, keys: Vec<String> }`, `parse_prose(&str) -> Result<Prose, String>`, `Prose::keys_in(heading) -> Vec<&str>`, `Prose::position(heading) -> Option<usize>`.

- [ ] **Step 1: Write the failing tests** at the bottom of `crates/content/src/prose.rs`:

```rust
#[cfg(test)]
mod tests {
    use super::*;

    const DOC: &str = "---\nid: l0-a\ntitle: \"A: title\"\n---\n\n## Outcome\ntext\n\n## Common misconceptions\n- **M1**: one\n- **M2**: two\n  - **M9**: nested, ignored\n- **Capacity** (x): not a key\n\n```json\n## not a heading\n- **M7**: in a fence\n```\n\n## Feedback\n- **B**: fb\n- **q1.a**: option key\n";

    #[test]
    fn parses_front_matter_sections_and_keys() {
        let p = parse_prose(DOC).unwrap();
        assert_eq!(p.id, "l0-a");
        assert_eq!(p.title, "A: title");
        let headings: Vec<&str> = p.sections.iter().map(|s| s.heading.as_str()).collect();
        assert_eq!(headings, vec!["Outcome", "Common misconceptions", "Feedback"]);
        assert_eq!(p.keys_in("Common misconceptions"), vec!["M1", "M2"]);
        assert_eq!(p.keys_in("Feedback"), vec!["B", "q1.a"]);
        assert_eq!(p.position("Feedback"), Some(2));
    }

    #[test]
    fn bom_and_crlf_are_accepted() {
        let doc = format!("\u{feff}{}", DOC.replace('\n', "\r\n"));
        assert_eq!(parse_prose(&doc).unwrap().keys_in("Feedback"), vec!["B", "q1.a"]);
    }

    #[test]
    fn front_matter_errors() {
        assert!(parse_prose("").is_err());
        assert!(parse_prose("## Outcome\n").is_err());
        assert!(parse_prose("---\nid: a\ntitle: t\n").is_err()); // not closed
        assert!(parse_prose("---\nid: a\n---\n").is_err()); // no title
        assert!(parse_prose("---\nid: a\ntitle: \"\"\n---\n").is_err()); // empty title
        assert!(parse_prose("---\nid: a\ntitle: t\nlevel: L0\n---\n").is_err()); // unknown key
        assert!(parse_prose("---\nid a\ntitle: t\n---\n").is_err()); // no colon
    }
}
```

- [ ] **Step 2: Run and see them fail**

Run: `./dev cargo test -p content prose`
Expected: compile errors.

- [ ] **Step 3: Implement** (top of `crates/content/src/prose.rs`):

```rust
//! Prose files: a two-key front matter (`id`, `title`), `## ` sections, and keyed list items
//! of the exact form `- **KEY**: text` (ruling R10). Wording is never inspected.

#[derive(Debug, Clone, PartialEq)]
pub struct Section {
    pub heading: String,
    pub keys: Vec<String>,
}

#[derive(Debug, Clone, PartialEq)]
pub struct Prose {
    pub id: String,
    pub title: String,
    pub sections: Vec<Section>,
}

impl Prose {
    /// Keys of every section with this heading, in file order.
    pub fn keys_in(&self, heading: &str) -> Vec<&str> {
        self.sections
            .iter()
            .filter(|s| s.heading == heading)
            .flat_map(|s| s.keys.iter().map(String::as_str))
            .collect()
    }
    pub fn position(&self, heading: &str) -> Option<usize> {
        self.sections.iter().position(|s| s.heading == heading)
    }
}

fn unquote(v: &str) -> String {
    v.strip_prefix('"')
        .and_then(|s| s.strip_suffix('"'))
        .unwrap_or(v)
        .to_string()
}

/// `- **M1**: text` -> `M1`. Column 0 only; the key is ASCII letters, digits, `.` or `-`.
fn list_key(line: &str) -> Option<String> {
    let rest = line.strip_prefix("- **")?;
    let (key, after) = rest.split_once("**")?;
    let valid = !key.is_empty()
        && key.chars().all(|c| c.is_ascii_alphanumeric() || c == '.' || c == '-');
    (valid && after.starts_with(':')).then(|| key.to_string())
}

pub fn parse_prose(text: &str) -> Result<Prose, String> {
    let text = text.strip_prefix('\u{feff}').unwrap_or(text);
    let mut lines = text.lines().map(|l| l.trim_end_matches('\r')).enumerate();
    match lines.next() {
        Some((_, l)) if l.trim_end() == "---" => {}
        _ => return Err("front matter must start on line 1 with ---".into()),
    }
    let (mut id, mut title) = (None, None);
    let mut closed = false;
    for (n, line) in lines.by_ref() {
        let line = line.trim_end();
        if line == "---" {
            closed = true;
            break;
        }
        if line.trim().is_empty() {
            continue;
        }
        let Some((key, value)) = line.split_once(':') else {
            return Err(format!("line {}: expected `key: value`", n + 1));
        };
        let value = unquote(value.trim());
        match key.trim() {
            "id" => id = Some(value),
            "title" => title = Some(value),
            other => return Err(format!("line {}: unknown front matter key `{other}`", n + 1)),
        }
    }
    if !closed {
        return Err("front matter is not closed with ---".into());
    }
    let id = id.ok_or("front matter needs `id`")?;
    let title = title
        .filter(|t| !t.trim().is_empty())
        .ok_or("front matter needs a non-empty `title`")?;

    let mut sections: Vec<Section> = Vec::new();
    let mut in_fence = false;
    for (_, line) in lines {
        if line.trim_start().starts_with("```") {
            in_fence = !in_fence;
            continue;
        }
        if in_fence {
            continue;
        }
        if let Some(h) = line.strip_prefix("## ") {
            sections.push(Section { heading: h.trim().to_string(), keys: vec![] });
        } else if let Some(key) = list_key(line) {
            if let Some(s) = sections.last_mut() {
                s.keys.push(key);
            }
        }
    }
    Ok(Prose { id, title, sections })
}
```

- [ ] **Step 4: Run the tests**

Run: `./dev cargo test -p content`
Expected: `11 passed`.

- [ ] **Step 5: Commit**

```bash
git add crates/content
git commit -m "feat(content): prose front matter, sections and keys

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
## Phase 2: Structural validation

### Task 6: Parse stage, report skeleton, ids and duplicates

**Files:**
- Create: `crates/content/src/ids.rs`, `crates/content/src/structure.rs`, `crates/content/src/checks.rs`, `crates/content/src/report.rs`
- Modify: `crates/content/src/lib.rs`, `crates/content/src/test_util.rs`

**Interfaces:**
- Produces: `Readiness`, `ItemKind`, `RunSummary`, `ItemReport`, `Report` (`Report::new(items)`, `has_blocking()`). `validate_tree(&ContentTree) -> Report` runs sequentially for now; Task 18 adds rayon. Internal: `structure::{Item<T>, Parsed, Listing, parse_tree, check_cross}` and `checks::{Ctx, Outcome, check_lesson, check_challenge}`. Every later check plugs into `check_cross` (cross-item) or into `check_lesson` / `check_challenge` (per item).
- Codes covered: `content.parse`, `content.format-version`, `content.id`, and `content.duplicate-id` at item level.

- [ ] **Step 1: Add test helpers** to `crates/content/src/test_util.rs`:

```rust
use crate::issue::ContentIssue;
use crate::report::Report;

pub fn issues_of(report: &Report, id: &str) -> Vec<ContentIssue> {
    report.items.iter().filter(|i| i.id == id).flat_map(|i| i.issues.clone()).collect()
}

pub fn codes_of(report: &Report, id: &str) -> Vec<String> {
    issues_of(report, id).into_iter().map(|i| i.code).collect()
}

pub fn has(report: &Report, id: &str, code: &str) -> bool {
    codes_of(report, id).iter().any(|c| c == code)
}
```

- [ ] **Step 2: Write the failing tests** in `crates/content/src/structure.rs`:

```rust
#[cfg(test)]
mod tests {
    use crate::issue::codes;
    use crate::test_util::*;
    use crate::validate_tree;
    use serde_json::json;

    #[test]
    fn good_tree_has_no_issues() {
        let r = validate_tree(&good_tree());
        let all: Vec<_> = r.items.iter().flat_map(|i| i.issues.clone()).collect();
        assert!(all.is_empty(), "{all:#?}");
        let ids: Vec<&str> = r.items.iter().map(|i| i.id.as_str()).collect();
        assert_eq!(ids, vec!["levels", "c-l0-fx-shop", "l0-fx-capacity", "l0-fx-reading"]);
    }

    #[test]
    fn unreadable_json_and_prose_are_parse_issues() {
        let mut t = good_tree();
        t.lessons[0].json = Ok("{".into());
        t.lessons[1].vi = Err("missing".into());
        t.levels = Ok("[]".into());
        let r = validate_tree(&t);
        assert!(has(&r, "l0-fx-capacity", codes::PARSE));
        let vi = issues_of(&r, "l0-fx-reading");
        assert_eq!(vi[0].path, "lessons/l0-fx-reading/vi.md");
        assert!(has(&r, "levels", codes::PARSE));
    }

    #[test]
    fn shape_errors_are_parse_issues_with_a_field() {
        let mut t = good_tree();
        edit_json(&mut t, "l0-fx-capacity", |v| v["minutes"] = 0.into());
        edit_json(&mut t, "l0-fx-reading", |v| v["kind"] = "experiment".into());
        edit_json(&mut t, "c-l0-fx-shop", |v| v["start"] = json!([]));
        let r = validate_tree(&t);
        let f: Vec<_> = issues_of(&r, "l0-fx-capacity").into_iter().filter_map(|i| i.field).collect();
        assert!(f.contains(&"minutes".to_string()));
        assert!(has(&r, "l0-fx-reading", codes::PARSE));
        assert!(has(&r, "c-l0-fx-shop", codes::PARSE));
    }

    #[test]
    fn unknown_or_missing_format_version() {
        let mut t = good_tree();
        edit_json(&mut t, "l0-fx-capacity", |v| v["formatVersion"] = 2.into());
        edit_json(&mut t, "c-l0-fx-shop", |v| {
            v.as_object_mut().unwrap().remove("formatVersion");
        });
        let r = validate_tree(&t);
        assert_eq!(codes_of(&r, "l0-fx-capacity")[0], codes::FORMAT_VERSION);
        assert!(has(&r, "c-l0-fx-shop", codes::FORMAT_VERSION));
    }

    #[test]
    fn id_rules() {
        let mut t = good_tree();
        edit_json(&mut t, "l0-fx-capacity", |v| v["id"] = "l0-fx-other".into());
        edit_json(&mut t, "l0-fx-reading", |v| v["level"] = "L1".into());
        edit_prose(&mut t, "c-l0-fx-shop", "en", |s| s.replace("id: c-l0-fx-shop", "id: c-l0-fx-shopp"));
        let r = validate_tree(&t);
        assert!(has(&r, "l0-fx-capacity", codes::ID)); // folder name differs
        assert!(has(&r, "l0-fx-reading", codes::ID)); // level digit differs
        let shop = issues_of(&r, "c-l0-fx-shop");
        assert!(shop.iter().any(|i| i.code == codes::ID && i.path.ends_with("en.md")));
    }

    #[test]
    fn bad_id_pattern_and_unlisted_item() {
        let mut t = good_tree();
        edit_levels(&mut t, |v| v["levels"][0]["lessons"] = json!(["l0-fx-capacity", "l0-fx-planned"]));
        edit_json(&mut t, "l0-fx-capacity", |v| v["id"] = "L0-Bad".into());
        let r = validate_tree(&t);
        assert!(has(&r, "l0-fx-capacity", codes::ID));
        assert!(has(&r, "l0-fx-reading", codes::ID)); // not listed in levels.json
    }

    #[test]
    fn duplicates_at_item_level() {
        let mut t = good_tree();
        let mut copy = t.lessons[0].clone();
        copy.folder = "l0-fx-capacity2".into();
        t.lessons.push(copy);
        edit_levels(&mut t, |v| {
            v["levels"][0]["lessons"].as_array_mut().unwrap().push("l0-fx-reading".into());
            v["roadmap"]["lessons"][0]["id"] = "l0-fx-reading".into();
        });
        let r = validate_tree(&t);
        assert!(has(&r, "l0-fx-capacity2", codes::DUPLICATE_ID));
        let dup: Vec<_> = issues_of(&r, "levels").into_iter().filter(|i| i.code == codes::DUPLICATE_ID).collect();
        assert_eq!(dup.len(), 2, "{dup:#?}"); // listed twice, and a roadmap entry that has a folder
    }
}
```

- [ ] **Step 3: Run and see them fail**

Run: `./dev cargo test -p content structure`
Expected: compile errors (`validate_tree`, `structure`, `report` missing).

- [ ] **Step 4: Implement `crates/content/src/ids.rs`**

```rust
//! Id patterns (spec §2, ruling R7). Plain byte checks, no regex dependency.

fn slug(s: &str, min: usize, max: usize) -> bool {
    (min..=max).contains(&s.len())
        && s.bytes().all(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || c == b'-')
}

/// `^l[0-6]-[a-z0-9-]{2,60}$`
pub fn is_lesson_id(s: &str) -> bool {
    let b = s.as_bytes();
    b.len() > 3 && b[0] == b'l' && (b'0'..=b'6').contains(&b[1]) && b[2] == b'-' && slug(&s[3..], 2, 60)
}

/// `^c-l[0-6]-[a-z0-9-]{2,60}$`
pub fn is_challenge_id(s: &str) -> bool {
    s.strip_prefix("c-").is_some_and(is_lesson_id)
}

/// The level digit of a lesson or challenge id.
pub fn level_digit(s: &str) -> Option<char> {
    s.strip_prefix("c-").unwrap_or(s).chars().nth(1)
}

/// `A`..`F`
pub fn is_choice_id(s: &str) -> bool {
    s.len() == 1 && (b'A'..=b'F').contains(&s.as_bytes()[0])
}

/// `^<prefix>[0-9]+$`, for `M1`, `q1`, `h1`.
pub fn numbered(s: &str, prefix: char) -> bool {
    s.strip_prefix(prefix).is_some_and(|d| !d.is_empty() && d.bytes().all(|c| c.is_ascii_digit()))
}

/// `^[a-z]$`
pub fn is_option_id(s: &str) -> bool {
    s.len() == 1 && s.as_bytes()[0].is_ascii_lowercase()
}

/// `^[a-z0-9-]{2,40}$`
pub fn is_mode_id(s: &str) -> bool {
    slug(s, 2, 40)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn patterns() {
        assert!(is_lesson_id("l0-client-server"));
        assert!(!is_lesson_id("l7-x1"));
        assert!(!is_lesson_id("l0-x"));
        assert!(!is_lesson_id("l0-Upper"));
        assert!(is_challenge_id("c-l0-first-launch"));
        assert!(!is_challenge_id("l0-first-launch"));
        assert_eq!(level_digit("c-l3-x1"), Some('3'));
        assert!(is_choice_id("F") && !is_choice_id("G") && !is_choice_id("a"));
        assert!(numbered("M12", 'M') && !numbered("M", 'M') && !numbered("Mx", 'M'));
        assert!(is_mode_id("tight-budget") && !is_mode_id("x"));
    }
}
```

- [ ] **Step 5: Implement `crates/content/src/report.rs`**

```rust
//! Per-item results and the whole report. Text output is added in Task 18.

use crate::issue::ContentIssue;
use serde::{Deserialize, Serialize};
use sim_core::Metrics;

#[cfg_attr(feature = "ts", derive(ts_rs::TS), ts(export))]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum Readiness { Ready, Blocked, NotNeeded, Planned }

#[cfg_attr(feature = "ts", derive(ts_rs::TS), ts(export))]
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum ItemKind { Levels, Challenge, Lesson }

/// One engine run made while validating: `choice:B` or `mode:chaos/reference`.
#[cfg_attr(feature = "ts", derive(ts_rs::TS), ts(export))]
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RunSummary {
    pub label: String,
    pub metrics: Metrics,
    /// Distinct event codes, sorted.
    pub events: Vec<String>,
}

#[cfg_attr(feature = "ts", derive(ts_rs::TS), ts(export))]
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ItemReport {
    pub id: String,
    pub kind: ItemKind,
    /// Folder (or `levels.json`) relative to the content dir.
    pub path: String,
    pub readiness: Option<Readiness>,
    pub passed: bool,
    pub issues: Vec<ContentIssue>,
    pub runs: Vec<RunSummary>,
}

#[cfg_attr(feature = "ts", derive(ts_rs::TS), ts(export))]
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Report {
    pub items: Vec<ItemReport>,
    pub passed: u32,
    pub failed: u32,
    pub warnings: u32,
    pub blocked: u32,
}

impl Report {
    /// Sorts items (`levels` first, then by id) and counts. Issue order inside an item is the
    /// fixed check order and is kept, never sorted.
    pub fn new(mut items: Vec<ItemReport>) -> Report {
        for it in &mut items {
            it.passed = !it.issues.iter().any(|i| i.blocking);
        }
        items.sort_by(|a, b| (a.kind != ItemKind::Levels, &a.id).cmp(&(b.kind != ItemKind::Levels, &b.id)));
        let count = |f: &dyn Fn(&ItemReport) -> bool| items.iter().filter(|i| f(i)).count() as u32;
        Report {
            passed: count(&|i| i.passed),
            failed: count(&|i| !i.passed),
            warnings: items.iter().flat_map(|i| &i.issues).filter(|i| !i.blocking).count() as u32,
            blocked: count(&|i| i.readiness == Some(Readiness::Blocked)),
            items,
        }
    }

    pub fn has_blocking(&self) -> bool {
        self.failed > 0
    }
}
```

- [ ] **Step 6: Implement `crates/content/src/structure.rs`**: the parse stage, plus the id and duplicate part of the cross checks. Task 7 replaces the `check_references` stub at the end.

```rust
//! Stage 1: parse every file, then run checks that need the whole tree (ids, duplicates,
//! listing in levels.json; prerequisites, research and references in Task 7).

use crate::ids;
use crate::issue::{codes, ContentIssue};
use crate::prose::{parse_prose, Prose};
use crate::tree::{ContentTree, FileText, RawItem};
use crate::types::*;
use serde::de::DeserializeOwned;
use serde_json::Value;
use std::collections::{BTreeMap, BTreeSet};

pub(crate) const LEVELS_ID: &str = "levels";
pub(crate) const LEVELS_PATH: &str = "levels.json";

pub(crate) struct Item<T> {
    /// Folder name; the report id.
    pub id: String,
    /// `lessons/<folder>` or `challenges/<folder>`.
    pub dir: String,
    pub doc: Option<T>,
    pub vi: Option<Prose>,
    pub en: Option<Prose>,
    pub issues: Vec<ContentIssue>,
}

impl<T> Item<T> {
    pub fn file(&self, name: &str) -> String {
        format!("{}/{name}", self.dir)
    }
}

pub(crate) struct Parsed {
    pub levels: Option<Levels>,
    /// Issues about levels.json and roadmap entries (report item `levels`).
    pub global: Vec<ContentIssue>,
    pub research: BTreeSet<String>,
    pub lessons: Vec<Item<Lesson>>,
    pub challenges: Vec<Item<Challenge>>,
}

fn parse_issue(path: &str) -> ContentIssue {
    ContentIssue::new(codes::PARSE, path)
}

/// JSON -> object -> formatVersion gate (ruling R6) -> typed document.
fn parse_doc<T: DeserializeOwned>(text: &FileText, path: &str, issues: &mut Vec<ContentIssue>) -> Option<T> {
    let text = match text {
        Ok(t) => t,
        Err(e) => {
            issues.push(parse_issue(path).detail(e.clone()));
            return None;
        }
    };
    let value: Value = match serde_json::from_str(text) {
        Ok(v) => v,
        Err(e) => {
            issues.push(parse_issue(path).detail(e.to_string()));
            return None;
        }
    };
    if !value.is_object() {
        issues.push(parse_issue(path).detail("expected a JSON object"));
        return None;
    }
    match value.get("formatVersion") {
        Some(v) if v.as_u64() == Some(FORMAT_VERSION) => {}
        other => {
            let found = other.map_or("missing".to_string(), Value::to_string);
            issues.push(ContentIssue::new(codes::FORMAT_VERSION, path).field("formatVersion").detail(found));
            return None;
        }
    }
    match serde_json::from_value(value) {
        Ok(doc) => Some(doc),
        Err(e) => {
            issues.push(parse_issue(path).detail(e.to_string()));
            None
        }
    }
}

fn parse_md(text: &FileText, path: &str, issues: &mut Vec<ContentIssue>) -> Option<Prose> {
    let result = match text {
        Ok(t) => parse_prose(t),
        Err(e) => Err(e.clone()),
    };
    result.map_err(|e| issues.push(parse_issue(path).detail(e))).ok()
}

fn parse_item<T: DeserializeOwned>(raw: &RawItem, parent: &str, json_name: &str) -> Item<T> {
    let dir = format!("{parent}/{}", raw.folder);
    let mut issues = vec![];
    let doc = parse_doc(&raw.json, &format!("{dir}/{json_name}"), &mut issues);
    let vi = parse_md(&raw.vi, &format!("{dir}/vi.md"), &mut issues);
    let en = parse_md(&raw.en, &format!("{dir}/en.md"), &mut issues);
    Item { id: raw.folder.clone(), dir, doc, vi, en, issues }
}

/// Ruling R5: ranges and kind/body consistency of a lesson.
fn lesson_shape(item: &Item<Lesson>) -> Vec<ContentIssue> {
    let Some(l) = &item.doc else { return vec![] };
    let path = item.file("lesson.json");
    let mut out = vec![];
    if !(1..=60).contains(&l.minutes) {
        out.push(parse_issue(&path).field("minutes").detail("must be 1-60"));
    }
    if !(1..=3).contains(&l.difficulty) {
        out.push(parse_issue(&path).field("difficulty").detail("must be 1-3"));
    }
    let body_ok = match l.kind {
        LessonKind::Experiment => l.experiment.is_some() && l.check.is_none(),
        LessonKind::Reading => l.check.is_some() && l.experiment.is_none(),
    };
    if !body_ok {
        out.push(parse_issue(&path).field("kind").detail("experiment needs `experiment`, reading needs `check`, not both"));
    }
    if let Some(e) = &l.experiment {
        if !e.base.is_object() {
            out.push(parse_issue(&path).field("experiment.base").detail("must be an object"));
        }
    }
    out
}

fn challenge_shape(item: &Item<Challenge>) -> Vec<ContentIssue> {
    let Some(c) = &item.doc else { return vec![] };
    if c.start.is_object() {
        vec![]
    } else {
        vec![parse_issue(&item.file("challenge.json")).field("start").detail("must be an object")]
    }
}

/// Pattern, folder name, level digit and prose front matter ids.
fn id_issues<T>(item: &Item<T>, doc_id: &str, level: LevelId, json_name: &str, valid: fn(&str) -> bool) -> Vec<ContentIssue> {
    let path = item.file(json_name);
    let mut out = vec![];
    if !valid(doc_id) {
        out.push(ContentIssue::new(codes::ID, &path).id(doc_id).field("id").detail("bad id"));
    }
    if doc_id != item.id {
        out.push(ContentIssue::new(codes::ID, &path).id(doc_id).field("id").detail("folder name differs"));
    }
    if ids::level_digit(doc_id) != Some(level.digit()) {
        out.push(ContentIssue::new(codes::ID, &path).id(doc_id).field("level"));
    }
    for (name, prose) in [("vi.md", &item.vi), ("en.md", &item.en)] {
        if let Some(p) = prose {
            if p.id != item.id {
                out.push(ContentIssue::new(codes::ID, item.file(name)).id(p.id.clone()).field("id"));
            }
        }
    }
    out
}

pub(crate) fn parse_tree(tree: &ContentTree) -> Parsed {
    let mut global = vec![];
    let levels = parse_doc::<Levels>(&tree.levels, LEVELS_PATH, &mut global);
    let mut lessons: Vec<Item<Lesson>> = tree.lessons.iter().map(|r| parse_item(r, "lessons", "lesson.json")).collect();
    let mut challenges: Vec<Item<Challenge>> =
        tree.challenges.iter().map(|r| parse_item(r, "challenges", "challenge.json")).collect();
    for item in &mut lessons {
        let mut more = lesson_shape(item);
        if let Some(l) = &item.doc {
            more.extend(id_issues(item, &l.id, l.level, "lesson.json", ids::is_lesson_id));
        }
        item.issues.extend(more);
    }
    for item in &mut challenges {
        let mut more = challenge_shape(item);
        if let Some(c) = &item.doc {
            more.extend(id_issues(item, &c.id, c.level, "challenge.json", ids::is_challenge_id));
        }
        item.issues.extend(more);
    }
    Parsed { levels, global, research: tree.research.clone(), lessons, challenges }
}

/// What levels.json lists: id -> (level, is_lesson), plus the global lesson order.
pub(crate) struct Listing {
    pub listed: BTreeMap<String, (LevelId, bool)>,
    pub lesson_order: Vec<String>,
}

fn listing(levels: &Levels, global: &mut Vec<ContentIssue>) -> Listing {
    let mut listed = BTreeMap::new();
    let mut lesson_order = vec![];
    let mut seen_levels = BTreeSet::new();
    for lv in &levels.levels {
        if !seen_levels.insert(lv.id) {
            global.push(ContentIssue::new(codes::DUPLICATE_ID, LEVELS_PATH).id(format!("{:?}", lv.id)).field("levels"));
        }
        for (list, is_lesson) in [(&lv.lessons, true), (&lv.challenges, false)] {
            for id in list {
                if listed.insert(id.clone(), (lv.id, is_lesson)).is_some() {
                    global.push(ContentIssue::new(codes::DUPLICATE_ID, LEVELS_PATH).id(id.clone()).field("levels"));
                } else if is_lesson {
                    lesson_order.push(id.clone());
                }
            }
        }
    }
    Listing { listed, lesson_order }
}

fn listing_issue(l: &Listing, id: &str, level: LevelId, is_lesson: bool, path: &str) -> Option<ContentIssue> {
    match l.listed.get(id) {
        None => Some(ContentIssue::new(codes::ID, path).id(id).field("levels").detail("not listed in levels.json")),
        Some(&(lv, lesson)) if lv != level || lesson != is_lesson => {
            Some(ContentIssue::new(codes::ID, path).id(id).field("level").detail("listed under another level or kind"))
        }
        Some(_) => None,
    }
}

/// Stage 1b: checks across items. Without a readable levels.json there is nothing to check
/// against; its parse issue already fails the run.
pub(crate) fn check_cross(p: &mut Parsed) {
    let Some(levels) = p.levels.clone() else { return };
    let listing = listing(&levels, &mut p.global);

    // A second folder declaring an id already seen is a duplicate (items are in folder order).
    let mut authored: BTreeSet<String> = BTreeSet::new();
    for item in &mut p.lessons {
        if let Some(id) = item.doc.as_ref().map(|d| d.id.clone()) {
            if !authored.insert(id.clone()) {
                item.issues.push(ContentIssue::new(codes::DUPLICATE_ID, item.file("lesson.json")).id(id).field("id"));
            }
        }
    }
    for item in &mut p.challenges {
        if let Some(id) = item.doc.as_ref().map(|d| d.id.clone()) {
            if !authored.insert(id.clone()) {
                item.issues.push(ContentIssue::new(codes::DUPLICATE_ID, item.file("challenge.json")).id(id).field("id"));
            }
        }
    }
    let mut roadmap: BTreeSet<String> = BTreeSet::new();
    let stubs = levels.roadmap.lessons.iter().map(|s| &s.id).chain(levels.roadmap.challenges.iter().map(|s| &s.id));
    for id in stubs {
        if authored.contains(id) || !roadmap.insert(id.clone()) {
            p.global.push(ContentIssue::new(codes::DUPLICATE_ID, LEVELS_PATH).id(id.clone()).field("roadmap"));
        }
    }

    // Every authored item is listed under its own level and kind.
    for item in &mut p.lessons {
        let Some(l) = &item.doc else { continue };
        if let Some(issue) = listing_issue(&listing, &l.id, l.level, true, &item.file("lesson.json")) {
            item.issues.push(issue);
        }
    }
    for item in &mut p.challenges {
        let Some(c) = &item.doc else { continue };
        if let Some(issue) = listing_issue(&listing, &c.id, c.level, false, &item.file("challenge.json")) {
            item.issues.push(issue);
        }
    }
    // Every listed id exists; every roadmap stub is listed.
    for id in listing.listed.keys() {
        if !authored.contains(id) && !roadmap.contains(id) {
            p.global.push(ContentIssue::new(codes::ID, LEVELS_PATH).id(id.clone()).detail("listed but has no folder or roadmap entry"));
        }
    }
    for id in &roadmap {
        if !listing.listed.contains_key(id) {
            p.global.push(ContentIssue::new(codes::ID, LEVELS_PATH).id(id.clone()).detail("roadmap entry is not listed in any level"));
        }
    }

    check_references(p, &levels, &listing);
}

/// Prerequisites, research and references from levels.json. Replaced in Task 7.
fn check_references(_p: &mut Parsed, _levels: &Levels, _listing: &Listing) {}
```

- [ ] **Step 7: Implement `crates/content/src/checks.rs`**: the per-item stage. Later tasks add to it.

```rust
//! Stage 2: checks on one item. Pure; runs in parallel from Task 18 on.

use crate::issue::ContentIssue;
use crate::report::{Readiness, RunSummary};
use crate::structure::Item;
use crate::types::*;
use sim_core::Capabilities;

pub(crate) struct Ctx {
    pub planned: PlannedFeatures,
    pub caps: Capabilities,
}

impl Ctx {
    pub fn new(levels: Option<&Levels>) -> Ctx {
        Ctx {
            planned: levels.map(|l| l.engine.planned.clone()).unwrap_or_default(),
            caps: sim_core::capabilities(),
        }
    }
}

#[derive(Debug, Default)]
pub(crate) struct Outcome {
    pub issues: Vec<ContentIssue>,
    pub runs: Vec<RunSummary>,
    pub readiness: Option<Readiness>,
    /// What the item's engine inputs use (for curriculum.json).
    pub needs: EngineNeeds,
    /// Engine features a blocked item lacks.
    pub missing: Vec<String>,
}

pub(crate) fn check_lesson(item: &Item<Lesson>, _ctx: &Ctx) -> Outcome {
    let mut out = Outcome::default();
    let Some(l) = &item.doc else { return out };
    out.readiness = Some(match l.kind {
        LessonKind::Reading => Readiness::NotNeeded,
        LessonKind::Experiment => Readiness::Ready,
    });
    out
}

pub(crate) fn check_challenge(item: &Item<Challenge>, _ctx: &Ctx) -> Outcome {
    let mut out = Outcome::default();
    if item.doc.is_some() {
        out.readiness = Some(Readiness::Ready);
    }
    out
}
```

- [ ] **Step 8: Wire `validate_tree`** in `crates/content/src/lib.rs`:

```rust
pub mod ids;
pub mod prose;
pub mod report;
pub(crate) mod checks;
pub(crate) mod structure;

pub use report::{ItemKind, ItemReport, Readiness, Report, RunSummary};

use structure::{Item, LEVELS_ID, LEVELS_PATH};

fn item_report<T>(kind: ItemKind, item: &Item<T>, o: checks::Outcome) -> ItemReport {
    let mut issues = item.issues.clone();
    issues.extend(o.issues);
    ItemReport { id: item.id.clone(), kind, path: item.dir.clone(), readiness: o.readiness, passed: true, issues, runs: o.runs }
}

/// Validate an in-memory tree. Deterministic: same tree, same report.
pub fn validate_tree(tree: &ContentTree) -> Report {
    let mut parsed = structure::parse_tree(tree);
    structure::check_cross(&mut parsed);
    let ctx = checks::Ctx::new(parsed.levels.as_ref());
    let mut items = vec![ItemReport {
        id: LEVELS_ID.into(),
        kind: ItemKind::Levels,
        path: LEVELS_PATH.into(),
        readiness: None,
        passed: true,
        issues: parsed.global.clone(),
        runs: vec![],
    }];
    for l in &parsed.lessons {
        items.push(item_report(ItemKind::Lesson, l, checks::check_lesson(l, &ctx)));
    }
    for c in &parsed.challenges {
        items.push(item_report(ItemKind::Challenge, c, checks::check_challenge(c, &ctx)));
    }
    Report::new(items)
}
```

- [ ] **Step 9: Run the tests**

Run: `./dev cargo test -p content`
Expected: all pass (`ids::patterns`, the 7 structure tests and everything from Tasks 2–5). If `good_tree_has_no_issues` lists an issue, fix the code, not the fixture: the fixture was measured to be valid.

- [ ] **Step 10: Commit**

```bash
git add crates/content
git commit -m "feat(content): parse stage, ids, duplicates and report skeleton

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 7: Prerequisites, cycles, research and levels references

**Files:**
- Modify: `crates/content/src/structure.rs` (replace the `check_references` stub)

**Interfaces:**
- Codes covered: `content.prerequisite-missing`, `content.prerequisite-cycle`, `content.research-missing`.

- [ ] **Step 1: Write the failing tests** (add them to the `structure.rs` tests):

```rust
    #[test]
    fn missing_prerequisites_and_references() {
        let mut t = good_tree();
        edit_json(&mut t, "l0-fx-capacity", |v| v["prerequisites"] = json!(["l0-nope"]));
        edit_json(&mut t, "c-l0-fx-shop", |v| v["prerequisites"] = json!(["c-l0-fx-shop"]));
        edit_levels(&mut t, |v| {
            v["levels"][0]["exitCheck"]["mode"] = "nightmare".into();
            v["engineGaps"]["fx-gap"]["neededBy"] = json!(["l0-ghost"]);
            v["roadmap"]["lessons"][0]["prerequisites"] = json!(["l0-gone"]);
        });
        let r = validate_tree(&t);
        assert!(has(&r, "l0-fx-capacity", codes::PREREQUISITE_MISSING));
        assert!(has(&r, "c-l0-fx-shop", codes::PREREQUISITE_MISSING)); // a challenge is not a lesson
        let g: Vec<_> = issues_of(&r, "levels").into_iter()
            .filter(|i| i.code == codes::PREREQUISITE_MISSING).filter_map(|i| i.id).collect();
        // Fixed check order: roadmap entries, then exit checks, then gaps.
        assert_eq!(g, vec!["l0-gone", "nightmare", "l0-ghost"]);
    }

    #[test]
    fn prerequisite_listed_later_is_a_cycle_in_the_path() {
        let mut t = good_tree();
        edit_json(&mut t, "l0-fx-capacity", |v| v["prerequisites"] = json!(["l0-fx-reading"]));
        let r = validate_tree(&t);
        let i: Vec<_> = issues_of(&r, "l0-fx-capacity").into_iter()
            .filter(|i| i.code == codes::PREREQUISITE_CYCLE).collect();
        assert!(i.iter().any(|i| i.detail.as_deref() == Some("listed after")));
        assert!(i.iter().any(|i| i.detail.as_deref() == Some("cycle")));
        assert!(has(&r, "l0-fx-reading", codes::PREREQUISITE_CYCLE)); // reading <-> capacity
    }

    #[test]
    fn missing_research_notes() {
        let mut t = good_tree();
        edit_json(&mut t, "l0-fx-reading", |v| v["research"] = json!(["no-such-note"]));
        edit_levels(&mut t, |v| v["roadmap"]["lessons"][0]["research"] = json!(["also-missing"]));
        let r = validate_tree(&t);
        assert!(has(&r, "l0-fx-reading", codes::RESEARCH_MISSING));
        assert!(has(&r, "levels", codes::RESEARCH_MISSING));
    }
```

- [ ] **Step 2: Run and see them fail**

Run: `./dev cargo test -p content structure`
Expected: the 3 new tests fail, because the stub produces no issues.

- [ ] **Step 3: Implement**: replace the stub `check_references` in `structure.rs`:

```rust
/// True when `start` can reach itself through prerequisite edges.
fn on_cycle(start: &str, edges: &BTreeMap<String, Vec<String>>) -> bool {
    let mut seen = BTreeSet::new();
    let mut stack: Vec<&str> = edges.get(start).map(|v| v.iter().map(String::as_str).collect()).unwrap_or_default();
    while let Some(id) = stack.pop() {
        if id == start {
            return true;
        }
        if seen.insert(id) {
            stack.extend(edges.get(id).into_iter().flatten().map(String::as_str));
        }
    }
    false
}

fn check_references(p: &mut Parsed, levels: &Levels, listing: &Listing) {
    let mut lesson_ids: BTreeSet<String> = levels.roadmap.lessons.iter().map(|s| s.id.clone()).collect();
    lesson_ids.extend(p.lessons.iter().filter_map(|i| i.doc.as_ref().map(|d| d.id.clone())));
    // Challenge id -> its mode ids (authored or roadmap).
    let mut modes: BTreeMap<String, Vec<String>> = levels.roadmap.challenges.iter()
        .map(|s| (s.id.clone(), s.modes.iter().map(|m| m.id.clone()).collect()))
        .collect();
    for c in p.challenges.iter().filter_map(|i| i.doc.as_ref()) {
        modes.insert(c.id.clone(), c.modes.iter().map(|m| m.id.clone()).collect());
    }
    let pos: BTreeMap<&str, usize> = listing.lesson_order.iter().enumerate().map(|(i, id)| (id.as_str(), i)).collect();
    let mut edges: BTreeMap<String, Vec<String>> = BTreeMap::new();
    for s in &levels.roadmap.lessons {
        edges.insert(s.id.clone(), s.prerequisites.clone());
    }
    for l in p.lessons.iter().filter_map(|i| i.doc.as_ref()) {
        edges.insert(l.id.clone(), l.prerequisites.clone());
    }

    let prereq_issues = |id: &str, prereqs: &[String], path: &str, field: &str| -> Vec<ContentIssue> {
        let mut out = vec![];
        for pr in prereqs {
            if !lesson_ids.contains(pr) {
                out.push(ContentIssue::new(codes::PREREQUISITE_MISSING, path).id(pr.clone()).field(field));
            } else if let (Some(a), Some(b)) = (pos.get(pr.as_str()), pos.get(id)) {
                if a >= b {
                    out.push(ContentIssue::new(codes::PREREQUISITE_CYCLE, path).id(pr.clone()).field(field).detail("listed after"));
                }
            }
        }
        if on_cycle(id, &edges) {
            out.push(ContentIssue::new(codes::PREREQUISITE_CYCLE, path).id(id).field(field).detail("cycle"));
        }
        out
    };
    let research_issues = |notes: &[String], path: &str, field: &str| -> Vec<ContentIssue> {
        notes.iter().filter(|n| !p.research.contains(*n))
            .map(|n| ContentIssue::new(codes::RESEARCH_MISSING, path).id(n.clone()).field(field))
            .collect()
    };

    let mut lesson_issues = vec![];
    for (k, item) in p.lessons.iter().enumerate() {
        let Some(l) = &item.doc else { continue };
        let path = item.file("lesson.json");
        let mut out = prereq_issues(&l.id, &l.prerequisites, &path, "prerequisites");
        out.extend(research_issues(&l.research, &path, "research"));
        lesson_issues.push((k, out));
    }
    let mut challenge_issues = vec![];
    for (k, item) in p.challenges.iter().enumerate() {
        let Some(c) = &item.doc else { continue };
        let path = item.file("challenge.json");
        let out: Vec<ContentIssue> = c.prerequisites.iter().filter(|pr| !lesson_ids.contains(*pr))
            .map(|pr| ContentIssue::new(codes::PREREQUISITE_MISSING, &path).id(pr.clone()).field("prerequisites"))
            .collect();
        challenge_issues.push((k, out));
    }

    let mut global = vec![];
    for s in &levels.roadmap.lessons {
        let field = format!("roadmap.lessons[{}]", s.id);
        global.extend(prereq_issues(&s.id, &s.prerequisites, LEVELS_PATH, &field));
        global.extend(research_issues(&s.research, LEVELS_PATH, &field));
    }
    for s in &levels.roadmap.challenges {
        for pr in s.prerequisites.iter().filter(|pr| !lesson_ids.contains(*pr)) {
            global.push(ContentIssue::new(codes::PREREQUISITE_MISSING, LEVELS_PATH).id(pr.clone()).field(format!("roadmap.challenges[{}]", s.id)));
        }
    }
    for lv in &levels.levels {
        let ec = &lv.exit_check;
        let field = format!("levels[{:?}].exitCheck", lv.id);
        match modes.get(&ec.challenge) {
            Some(ms) if lv.challenges.contains(&ec.challenge) => {
                if !ms.contains(&ec.mode) {
                    global.push(ContentIssue::new(codes::PREREQUISITE_MISSING, LEVELS_PATH).id(ec.mode.clone()).field(format!("{field}.mode")));
                }
            }
            _ => global.push(ContentIssue::new(codes::PREREQUISITE_MISSING, LEVELS_PATH).id(ec.challenge.clone()).field(format!("{field}.challenge"))),
        }
    }
    for (gap, g) in &levels.engine_gaps {
        for n in &g.needed_by {
            if !lesson_ids.contains(n) && !modes.contains_key(n) {
                global.push(ContentIssue::new(codes::PREREQUISITE_MISSING, LEVELS_PATH).id(n.clone()).field(format!("engineGaps.{gap}.neededBy")));
            }
        }
    }

    for (k, out) in lesson_issues {
        p.lessons[k].issues.extend(out);
    }
    for (k, out) in challenge_issues {
        p.challenges[k].issues.extend(out);
    }
    p.global.extend(global);
}
```

Never sort issues: a fixed check order is part of determinism. If you reorder the blocks above, update the expected vector in `missing_prerequisites_and_references`.

- [ ] **Step 4: Run the tests**

Run: `./dev cargo test -p content`
Expected: all pass, `good_tree_has_no_issues` included.

- [ ] **Step 5: Commit**

```bash
git add crates/content
git commit -m "feat(content): prerequisites, cycles, research and levels references

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 8: Prose sections and keys

**Files:**
- Create: `crates/content/src/prose_check.rs`
- Modify: `crates/content/src/checks.rs`, `crates/content/src/lib.rs` (`pub(crate) mod prose_check;`)

**Interfaces:**
- Produces: `prose_check::{check_lesson_prose, check_challenge_prose}`. Each returns `Vec<ContentIssue>` covering both languages.
- Codes covered: `content.prose-section`, `content.prose-key`, and `content.duplicate-id` for a key repeated within one section.

- [ ] **Step 1: Write the failing tests** at the bottom of `prose_check.rs`:

```rust
#[cfg(test)]
mod tests {
    use crate::issue::codes;
    use crate::test_util::*;
    use crate::validate_tree;

    #[test]
    fn missing_and_out_of_order_sections() {
        let mut t = good_tree();
        edit_prose(&mut t, "l0-fx-capacity", "en", |s| s.replace("## Takeaways\n- Capacity comes from CPU.\n", ""));
        edit_prose(&mut t, "l0-fx-reading", "vi", |s| {
            s.replace("## Mục tiêu", "## TMP").replace("## Điều cần nhớ", "## Mục tiêu").replace("## TMP", "## Điều cần nhớ")
        });
        let r = validate_tree(&t);
        let cap = issues_of(&r, "l0-fx-capacity");
        assert!(cap.iter().any(|i| i.code == codes::PROSE_SECTION
            && i.field.as_deref() == Some("Takeaways") && i.path.ends_with("en.md")));
        assert!(has(&r, "l0-fx-reading", codes::PROSE_SECTION));
    }

    #[test]
    fn challenge_sections() {
        let mut t = good_tree();
        edit_prose(&mut t, "c-l0-fx-shop", "vi", |s| s.replace("## Bối cảnh", "## Bối cảnh chung"));
        assert!(has(&validate_tree(&t), "c-l0-fx-shop", codes::PROSE_SECTION));
    }

    #[test]
    fn missing_keys_in_one_language() {
        let mut t = good_tree();
        edit_prose(&mut t, "l0-fx-capacity", "vi", |s| s.replace("- **M2**: Vượt sức chứa một chút cũng không sao.\n", ""));
        edit_prose(&mut t, "l0-fx-reading", "en", |s| s.replace("- **q1.c**: A week.\n", ""));
        edit_prose(&mut t, "c-l0-fx-shop", "en", |s| s.replace("- **h2**", "- **h3**"));
        let r = validate_tree(&t);
        assert!(issues_of(&r, "l0-fx-capacity").iter()
            .any(|i| i.code == codes::PROSE_KEY && i.id.as_deref() == Some("M2") && i.path.ends_with("vi.md")));
        assert!(issues_of(&r, "l0-fx-reading").iter().any(|i| i.id.as_deref() == Some("q1.c")));
        assert!(issues_of(&r, "c-l0-fx-shop").iter().any(|i| i.id.as_deref() == Some("h2")));
    }

    #[test]
    fn every_misconception_needs_feedback_and_keys_are_unique() {
        let mut t = good_tree();
        edit_prose(&mut t, "l0-fx-capacity", "en", |s| {
            s.replace("- **M2**: Going a little over capacity is fine.\n",
                      "- **M2**: Going a little over capacity is fine.\n- **M3**: An extra one.\n- **M3**: Twice.\n")
        });
        let k = issues_of(&validate_tree(&t), "l0-fx-capacity");
        assert!(k.iter().any(|i| i.code == codes::PROSE_KEY && i.id.as_deref() == Some("M3")));
        assert!(k.iter().any(|i| i.code == codes::DUPLICATE_ID && i.id.as_deref() == Some("M3")));
    }

    #[test]
    fn misconception_with_its_own_feedback_item_is_fine() {
        let mut t = good_tree();
        for (lang, sec) in [("en", "## Feedback\n"), ("vi", "## Phản hồi\n")] {
            edit_prose(&mut t, "l0-fx-capacity", lang, |s| {
                s.replace("- **M2**:", "- **M3**: extra.\n- **M2**:")
                    .replace(sec, &format!("{sec}- **M3**: feedback for M3.\n"))
            });
        }
        assert!(codes_of(&validate_tree(&t), "l0-fx-capacity").is_empty());
    }
}
```

- [ ] **Step 2: Run and see them fail**

Run: `./dev cargo test -p content prose_check`
Expected: a compile error while the module is missing, then failures once it exists but checks nothing.

- [ ] **Step 3: Implement** (top of `prose_check.rs`):

```rust
//! Required sections and keys in vi.md / en.md (spec §5, rulings R10 and R11).

use crate::issue::{codes, ContentIssue};
use crate::prose::Prose;
use crate::structure::Item;
use crate::types::*;
use std::collections::BTreeSet;

#[derive(Clone, Copy, PartialEq)]
enum Kind { Experiment, Reading, Challenge }

#[derive(Clone, Copy)]
enum Sec { Misconceptions, Feedback, Questions, Hints }

fn heading(sec: Sec, vi: bool) -> &'static str {
    match (sec, vi) {
        (Sec::Misconceptions, true) => "Hiểu lầm thường gặp",
        (Sec::Misconceptions, false) => "Common misconceptions",
        (Sec::Feedback, true) => "Phản hồi",
        (Sec::Feedback, false) => "Feedback",
        (Sec::Questions, true) => "Câu hỏi",
        (Sec::Questions, false) => "Questions",
        (Sec::Hints, true) => "Gợi ý",
        (Sec::Hints, false) => "Hints",
    }
}

fn required(kind: Kind, vi: bool) -> Vec<&'static str> {
    let exp = kind == Kind::Experiment;
    match (kind, vi) {
        (Kind::Challenge, true) => vec!["Bối cảnh", "Mục tiêu", "Gợi ý"],
        (Kind::Challenge, false) => vec!["Scenario", "Outcome", "Hints"],
        (_, true) => vec!["Mục tiêu", "Hình dung trước", "Thuật ngữ", "Hiểu lầm thường gặp",
                          if exp { "Thí nghiệm" } else { "Câu hỏi" }, "Phản hồi", "Điều cần nhớ"],
        (_, false) => vec!["Outcome", "Picture it first", "Terms", "Common misconceptions",
                           if exp { "Experiment" } else { "Questions" }, "Feedback", "Takeaways"],
    }
}

fn sections(p: &Prose, kind: Kind, vi: bool, path: &str) -> Vec<ContentIssue> {
    let mut out = vec![];
    let mut last: Option<usize> = None;
    for h in required(kind, vi) {
        match p.position(h) {
            None => out.push(ContentIssue::new(codes::PROSE_SECTION, path).field(h).detail("missing")),
            Some(i) if last.is_some_and(|l| i < l) => {
                out.push(ContentIssue::new(codes::PROSE_SECTION, path).field(h).detail("out of order"))
            }
            Some(i) => last = Some(i),
        }
    }
    out
}

fn keys(p: &Prose, vi: bool, path: &str, needs: &[(Sec, String)], used: &BTreeSet<String>) -> Vec<ContentIssue> {
    let mut out = vec![];
    for (sec, key) in needs {
        let h = heading(*sec, vi);
        if !p.keys_in(h).contains(&key.as_str()) {
            out.push(ContentIssue::new(codes::PROSE_KEY, path).id(key.clone()).field(h));
        }
    }
    let feedback = p.keys_in(heading(Sec::Feedback, vi));
    for m in p.keys_in(heading(Sec::Misconceptions, vi)) {
        if !used.contains(m) && !feedback.contains(&m) {
            out.push(ContentIssue::new(codes::PROSE_KEY, path).id(m).field(heading(Sec::Feedback, vi))
                .detail("misconception without feedback"));
        }
    }
    for s in &p.sections {
        let mut seen = BTreeSet::new();
        for k in &s.keys {
            if !seen.insert(k) {
                out.push(ContentIssue::new(codes::DUPLICATE_ID, path).id(k.clone()).field(s.heading.clone()));
            }
        }
    }
    out
}

fn both<T>(item: &Item<T>, kind: Kind, needs: &[(Sec, String)], used: &BTreeSet<String>) -> Vec<ContentIssue> {
    let mut out = vec![];
    for (name, prose, vi) in [("vi.md", &item.vi, true), ("en.md", &item.en, false)] {
        let Some(p) = prose else { continue };
        let path = item.file(name);
        out.extend(sections(p, kind, vi, &path));
        out.extend(keys(p, vi, &path, needs, used));
    }
    out
}

pub(crate) fn check_lesson_prose(item: &Item<Lesson>) -> Vec<ContentIssue> {
    let Some(l) = &item.doc else { return vec![] };
    let mut needs = vec![];
    let mut used = BTreeSet::new();
    if let Some(e) = &l.experiment {
        for c in e.choices.iter().filter(|c| !c.correct) {
            if let Some(m) = &c.misconception {
                needs.push((Sec::Misconceptions, m.clone()));
                used.insert(m.clone());
            }
            needs.push((Sec::Feedback, c.id.clone()));
        }
    }
    if let Some(c) = &l.check {
        for q in &c.questions {
            needs.push((Sec::Questions, q.id.clone()));
            for o in &q.options {
                needs.push((Sec::Questions, format!("{}.{o}", q.id)));
            }
            if let Some(m) = &q.misconception {
                needs.push((Sec::Misconceptions, m.clone()));
                needs.push((Sec::Feedback, q.id.clone()));
                used.insert(m.clone());
            }
        }
    }
    let kind = if l.kind == LessonKind::Experiment { Kind::Experiment } else { Kind::Reading };
    both(item, kind, &needs, &used)
}

pub(crate) fn check_challenge_prose(item: &Item<Challenge>) -> Vec<ContentIssue> {
    let Some(c) = &item.doc else { return vec![] };
    let needs: Vec<(Sec, String)> = c.hints.iter().map(|h| (Sec::Hints, h.clone())).collect();
    both(item, Kind::Challenge, &needs, &BTreeSet::new())
}
```

In `checks.rs`, add `out.issues.extend(crate::prose_check::check_lesson_prose(item));` to `check_lesson` right after `let Some(l) = …`. Add `out.issues.extend(crate::prose_check::check_challenge_prose(item));` to `check_challenge`.

- [ ] **Step 4: Run the tests**

Run: `./dev cargo test -p content`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add crates/content
git commit -m "feat(content): required prose sections and keys

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 9: Controls (paths, options) and engine field names

**Files:**
- Create: `crates/content/src/known.rs`, `crates/content/src/controls.rs`
- Modify: `crates/content/src/checks.rs`, `crates/content/src/lib.rs` (`pub mod known; pub mod controls;`)

**Interfaces:**
- Produces: `known::{input_keys, graph_keys, node_keys, edge_keys, workload_keys, workload_scalar_keys, surge_keys, fault_keys, calibration_keys, metric_keys, config_keys}`. Each is a `BTreeSet<String>` derived by serializing sim-core types; `config_keys` returns an `Option`. Also `controls::{ControlPath, parse_path, resolve, apply, check_controls}`. `check_controls(path, &Experiment) -> (Vec<ContentIssue>, Vec<Option<ControlPath>>)` returns one parsed path per control, `None` when it failed.
- Codes covered: `content.control`, and `content.duplicate-id` for control ids.

- [ ] **Step 1: Write the failing tests**

At the bottom of `known.rs`:

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn names_come_from_sim_core_types() {
        assert!(input_keys().contains("durationMs") && input_keys().contains("calibration"));
        assert!(workload_keys().contains("trafficEndMs") && workload_keys().contains("params"));
        assert!(!workload_scalar_keys().contains("surge") && workload_scalar_keys().contains("baseRps"));
        assert!(calibration_keys().contains("edgeDelayHttpMs"));
        assert!(metric_keys().contains("duplicateIds"));
        assert_eq!(fault_keys().len(), 3);
        assert!(config_keys("web-server").unwrap().contains("rpsPerInstance"));
        assert!(config_keys("redis").is_none());
    }
}
```

At the bottom of `controls.rs`:

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use crate::issue::codes;
    use crate::test_util::*;
    use crate::validate_tree;
    use serde_json::json;

    #[test]
    fn grammar() {
        use ControlPath::*;
        assert_eq!(parse_path("workload.baseRps"), Some(Workload("baseRps".into())));
        assert_eq!(parse_path("calibration.edgeDelayHttpMs"), Some(Calibration("edgeDelayHttpMs".into())));
        assert_eq!(parse_path("durationMs"), Some(DurationMs));
        assert_eq!(parse_path("graph.nodes[web].replicas"), Some(NodeReplicas("web".into())));
        assert_eq!(parse_path("graph.nodes[web].config.cpu"), Some(NodeConfig("web".into(), "cpu".into())));
        assert_eq!(parse_path("faults[0].atMs"), Some(FaultAt(0)));
        for bad in ["workload", "workload.surge.factor", "graph.nodes[].replicas", "graph.nodes[web].label",
                    "faults[x].atMs", "faults[99999999999999999999].atMs", "nodes.web.config.cpu", ""] {
            assert_eq!(parse_path(bad), None, "{bad}");
        }
    }

    #[test]
    fn apply_creates_missing_objects() {
        let mut v = json!({"graph": {"nodes": [{"id": "web", "kind": "web-server"}], "edges": []}, "workload": {"baseRps": 1}});
        apply(&mut v, &parse_path("graph.nodes[web].config.cpu").unwrap(), &ConfigValue::Num(2.0));
        apply(&mut v, &parse_path("calibration.edgeDelayHttpMs").unwrap(), &ConfigValue::Num(40.5));
        apply(&mut v, &parse_path("seed").unwrap(), &ConfigValue::Num(7.0));
        assert_eq!(v["graph"]["nodes"][0]["config"]["cpu"], json!(2));
        assert_eq!(v["calibration"]["edgeDelayHttpMs"], json!(40.5));
        assert_eq!(v["seed"], json!(7));
        let mut not_object = json!([1, 2]);
        apply(&mut not_object, &parse_path("seed").unwrap(), &ConfigValue::Num(1.0)); // no panic
    }

    fn control_issues(edit: impl FnOnce(&mut serde_json::Value)) -> Vec<crate::ContentIssue> {
        let mut t = good_tree();
        edit_json(&mut t, "l0-fx-capacity", |v| edit(&mut v["experiment"]["controls"]));
        issues_of(&validate_tree(&t), "l0-fx-capacity")
    }

    #[test]
    fn unresolvable_paths() {
        for path in ["graph.nodes[ghost].config.cpu", "graph.nodes[web].config.turbo", "workload.surge",
                     "workload.nope", "calibration.nope", "faults[0].atMs", "bogus"] {
            let i = control_issues(|c| c[0]["path"] = path.into());
            assert!(i.iter().any(|i| i.code == codes::CONTROL && i.id.as_deref() == Some("cpu")), "{path}");
        }
    }

    #[test]
    fn option_rules() {
        let p = "graph.nodes[web].config.cpu";
        let cases = vec![
            ("default not an option", json!({"id": "cpu", "type": "stepper", "path": p, "options": [1, 2], "default": 4})),
            ("one option", json!({"id": "cpu", "type": "select", "path": p, "options": [1], "default": 1})),
            ("duplicate options", json!({"id": "cpu", "type": "select", "path": p, "options": [1, 1], "default": 1})),
            ("stepper not ascending", json!({"id": "cpu", "type": "stepper", "path": p, "options": [2, 1], "default": 1})),
            ("stepper not numeric", json!({"id": "cpu", "type": "stepper", "path": p, "options": ["a", "b"], "default": "a"})),
            ("toggle with three", json!({"id": "cpu", "type": "toggle", "path": p, "options": [1, 2, 4], "default": 1})),
        ];
        for (name, c) in cases {
            let i = control_issues(|cs| cs[0] = c);
            assert!(i.iter().any(|i| i.code == codes::CONTROL), "{name}");
        }
    }

    #[test]
    fn duplicate_control_ids() {
        let i = control_issues(|c| c[1]["id"] = "cpu".into());
        assert!(i.iter().any(|i| i.code == codes::DUPLICATE_ID && i.id.as_deref() == Some("cpu")));
    }
}
```

- [ ] **Step 2: Run and see them fail**

Run: `./dev cargo test -p content known controls`
Expected: compile errors.

- [ ] **Step 3: Implement `crates/content/src/known.rs`**

```rust
//! Field names the engine reads, taken from sim-core's own types by serializing a sample.
//! sim-core serializes `None` as `null` (no `skip_serializing_if`), so every key appears.
//! A field added to sim-core shows up here with no change.

use serde::Serialize;
use sim_core::*;
use std::collections::{BTreeMap, BTreeSet};

fn keys_of<T: Serialize>(v: &T) -> BTreeSet<String> {
    serde_json::to_value(v)
        .ok()
        .and_then(|v| v.as_object().map(|o| o.keys().cloned().collect()))
        .unwrap_or_default()
}

fn sample() -> SimInput {
    SimInput {
        graph: Graph {
            nodes: vec![Node { id: "n".into(), kind: "client".into(), label: String::new(), replicas: 1, config: BTreeMap::new() }],
            edges: vec![Edge { id: "e".into(), from: "n".into(), to: "n".into(), kind: EdgeKind::Http }],
        },
        workload: Workload {
            profile: Profile::Mixed,
            base_rps: 0.0,
            write_ratio: 0.0,
            clients: 1,
            client_timeout_ms: 1.0,
            surge: Some(Surge { factor: 1.0, at_ms: 0, duration_ms: 0 }),
            params: BTreeMap::new(),
            traffic_end_ms: None,
            arrivals: None,
        },
        faults: vec![Fault { kind: FaultKind::InstanceDown, target: None, at_ms: 0 }],
        duration_ms: 0,
        seed: 0,
        calibration: Some(CalibrationOverrides::default()),
    }
}

pub fn input_keys() -> BTreeSet<String> { keys_of(&sample()) }
pub fn graph_keys() -> BTreeSet<String> { keys_of(&sample().graph) }
pub fn node_keys() -> BTreeSet<String> { keys_of(&sample().graph.nodes[0]) }
pub fn edge_keys() -> BTreeSet<String> { keys_of(&sample().graph.edges[0]) }
pub fn workload_keys() -> BTreeSet<String> { keys_of(&sample().workload) }
pub fn surge_keys() -> BTreeSet<String> { keys_of(&sample().workload.surge) }
pub fn fault_keys() -> BTreeSet<String> { keys_of(&sample().faults[0]) }
pub fn calibration_keys() -> BTreeSet<String> { keys_of(&CalibrationOverrides::default()) }
pub fn metric_keys() -> BTreeSet<String> { keys_of(&Metrics::default()) }

/// Workload fields a control may address: all but the object-valued ones.
pub fn workload_scalar_keys() -> BTreeSet<String> {
    let mut k = workload_keys();
    k.remove("surge");
    k.remove("params");
    k
}

/// Config keys a node of `kind` accepts, or `None` when the engine does not know the kind.
pub fn config_keys(kind: &str) -> Option<BTreeSet<String>> {
    let model = sim_core::components::get(kind)?;
    let mut k: BTreeSet<String> = model.meta().fields.into_iter().map(|f| f.key).collect();
    k.extend(sim_core::components::NODE_OVERRIDE_KEYS.iter().map(|s| s.to_string()));
    Some(k)
}
```

`keys_of(&sample().workload.surge)` serializes the inner `Surge`, because `Some(T)` serializes as `T`.

- [ ] **Step 4: Implement `crates/content/src/controls.rs`**

```rust
//! Control paths (spec §3.1, ruling R12): parse, resolve against `base`, write a value.

use crate::issue::{codes, ContentIssue};
use crate::known;
use crate::types::*;
use serde_json::{Map, Value};
use sim_core::ConfigValue;
use std::collections::BTreeSet;

#[derive(Debug, Clone, PartialEq)]
pub enum ControlPath {
    Workload(String),
    Calibration(String),
    DurationMs,
    Seed,
    NodeReplicas(String),
    NodeConfig(String, String),
    FaultAt(usize),
}

fn field_name(f: &str) -> bool {
    !f.is_empty() && f.chars().all(|c| c.is_ascii_alphanumeric())
}

pub fn parse_path(s: &str) -> Option<ControlPath> {
    use ControlPath::*;
    match s {
        "durationMs" => return Some(DurationMs),
        "seed" => return Some(Seed),
        _ => {}
    }
    if let Some(f) = s.strip_prefix("workload.") {
        return field_name(f).then(|| Workload(f.into()));
    }
    if let Some(f) = s.strip_prefix("calibration.") {
        return field_name(f).then(|| Calibration(f.into()));
    }
    if let Some(rest) = s.strip_prefix("graph.nodes[") {
        let (id, tail) = rest.split_once(']')?;
        if id.is_empty() {
            return None;
        }
        if tail == ".replicas" {
            return Some(NodeReplicas(id.into()));
        }
        let key = tail.strip_prefix(".config.")?;
        return field_name(key).then(|| NodeConfig(id.into(), key.into()));
    }
    if let Some(rest) = s.strip_prefix("faults[") {
        let (i, tail) = rest.split_once(']')?;
        if tail != ".atMs" {
            return None;
        }
        return i.parse().ok().map(FaultAt);
    }
    None
}

fn node<'a>(base: &'a Value, id: &str) -> Option<&'a Value> {
    base.get("graph")?.get("nodes")?.as_array()?.iter().find(|n| n.get("id").and_then(Value::as_str) == Some(id))
}

/// Why `path` does not address a value in `base`, if it does not.
pub fn resolve(path: &ControlPath, base: &Value) -> Result<(), String> {
    use ControlPath::*;
    match path {
        Workload(f) if !known::workload_scalar_keys().contains(f) => Err(format!("workload has no scalar field {f}")),
        Calibration(f) if !known::calibration_keys().contains(f) => Err(format!("calibration has no field {f}")),
        NodeReplicas(id) => node(base, id).map(|_| ()).ok_or(format!("no node {id}")),
        NodeConfig(id, key) => {
            let n = node(base, id).ok_or(format!("no node {id}"))?;
            let kind = n.get("kind").and_then(Value::as_str).unwrap_or_default();
            match known::config_keys(kind) {
                Some(keys) if !keys.contains(key) => Err(format!("{kind} has no config key {key}")),
                _ => Ok(()), // a known key, or a planned kind that readiness blocks
            }
        }
        FaultAt(i) => base.get("faults").and_then(Value::as_array).and_then(|f| f.get(*i))
            .map(|_| ()).ok_or(format!("no fault {i}")),
        _ => Ok(()),
    }
}

fn to_json(v: &ConfigValue) -> Value {
    match v {
        ConfigValue::Bool(b) => Value::Bool(*b),
        ConfigValue::Str(s) => Value::String(s.clone()),
        // Whole numbers as integers, so u32 fields (replicas, seed, atMs) deserialize.
        ConfigValue::Num(n) if n.fract() == 0.0 && n.abs() < 9.0e15 => Value::from(*n as i64),
        ConfigValue::Num(n) => serde_json::Number::from_f64(*n).map(Value::Number).unwrap_or(Value::Null),
    }
}

fn obj<'a>(v: &'a mut Value, key: &str) -> Option<&'a mut Map<String, Value>> {
    v.as_object_mut()?.entry(key).or_insert_with(|| Value::Object(Map::new())).as_object_mut()
}

/// Write `value` at `path`. Paths are resolved before this is called; anything that does not
/// fit (a non-object base) is skipped here and caught by the engine check.
pub fn apply(input: &mut Value, path: &ControlPath, value: &ConfigValue) {
    use ControlPath::*;
    let v = to_json(value);
    match path {
        Workload(f) => { if let Some(w) = obj(input, "workload") { w.insert(f.clone(), v); } }
        Calibration(f) => { if let Some(c) = obj(input, "calibration") { c.insert(f.clone(), v); } }
        DurationMs => { if let Some(o) = input.as_object_mut() { o.insert("durationMs".into(), v); } }
        Seed => { if let Some(o) = input.as_object_mut() { o.insert("seed".into(), v); } }
        NodeReplicas(id) | NodeConfig(id, _) => {
            let Some(nodes) = input.get_mut("graph").and_then(|g| g.get_mut("nodes")).and_then(Value::as_array_mut) else { return };
            let Some(n) = nodes.iter_mut().find(|n| n.get("id").and_then(Value::as_str) == Some(id)) else { return };
            match path {
                NodeReplicas(_) => { if let Some(o) = n.as_object_mut() { o.insert("replicas".into(), v); } }
                NodeConfig(_, key) => { if let Some(c) = obj(n, "config") { c.insert(key.clone(), v); } }
                _ => {}
            }
        }
        FaultAt(i) => {
            if let Some(f) = input.get_mut("faults").and_then(Value::as_array_mut).and_then(|f| f.get_mut(*i)).and_then(Value::as_object_mut) {
                f.insert("atMs".into(), v);
            }
        }
    }
}

/// Structural control checks. Engine acceptance of each option comes in Task 11.
pub(crate) fn check_controls(path: &str, exp: &Experiment) -> (Vec<ContentIssue>, Vec<Option<ControlPath>>) {
    let mut out = vec![];
    let mut parsed = vec![];
    let mut seen = BTreeSet::new();
    for c in &exp.controls {
        let issue = |detail: String| ContentIssue::new(codes::CONTROL, path).id(c.id.clone()).detail(detail);
        if !seen.insert(c.id.as_str()) {
            out.push(ContentIssue::new(codes::DUPLICATE_ID, path).id(c.id.clone()).field("controls"));
        }
        match parse_path(&c.path) {
            None => {
                out.push(issue(format!("bad path {}", c.path)).field("path"));
                parsed.push(None);
            }
            Some(p) => match resolve(&p, &exp.base) {
                Err(e) => {
                    out.push(issue(e).field("path"));
                    parsed.push(None);
                }
                Ok(()) => parsed.push(Some(p)),
            },
        }
        if c.options.len() < 2 {
            out.push(issue("needs at least 2 options".into()).field("options"));
        }
        for (i, a) in c.options.iter().enumerate() {
            if c.options[..i].contains(a) {
                out.push(issue("duplicate option".into()).field("options"));
            }
        }
        if !c.options.contains(&c.default) {
            out.push(issue("default is not an option".into()).field("default"));
        }
        match c.kind {
            ControlType::Stepper => {
                let nums: Option<Vec<f64>> = c.options.iter().map(ConfigValue::as_f64).collect();
                if !nums.is_some_and(|n| n.windows(2).all(|w| w[0] < w[1])) {
                    out.push(issue("stepper options must be ascending numbers".into()).field("options"));
                }
            }
            ControlType::Toggle if c.options.len() != 2 => {
                out.push(issue("toggle needs exactly 2 options".into()).field("options"))
            }
            _ => {}
        }
    }
    (out, parsed)
}
```

In `checks.rs` `check_lesson`, after the prose checks:

```rust
    let path = item.file("lesson.json");
    if let Some(e) = &l.experiment {
        let (issues, _paths) = crate::controls::check_controls(&path, e);
        out.issues.extend(issues);
    }
```

- [ ] **Step 5: Run the tests**

Run: `./dev cargo test -p content`
Expected: all pass. `faults[0].atMs` does not resolve because the fixture base has no faults.

- [ ] **Step 6: Commit**

```bash
git add crates/content
git commit -m "feat(content): control paths, options and engine field names

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 10: Goals, choices, expect shape and reading checks

**Files:**
- Create: `crates/content/src/choices.rs`
- Modify: `crates/content/src/checks.rs`, `crates/content/src/lib.rs` (`pub(crate) mod choices;`)

**Interfaces:**
- Produces: `choices::{check_goals, check_choices, check_questions, effective}`. `check_goals(path, goals, reserved: Option<&str>)` is reused by challenges with `reserved = Some("budget")`. `effective(exp, choice)` gives the settings a choice runs with.
- Codes covered: `content.choice`, `content.expect` (shape only: unknown metric or op), and `content.duplicate-id` for goals, choices, questions and options.

- [ ] **Step 1: Write the failing tests** at the bottom of `choices.rs`:

```rust
#[cfg(test)]
mod tests {
    use crate::issue::codes;
    use crate::test_util::*;
    use crate::{validate_tree, ContentIssue};
    use serde_json::{json, Value};

    fn exp(edit: impl FnOnce(&mut Value)) -> Vec<ContentIssue> {
        let mut t = good_tree();
        edit_json(&mut t, "l0-fx-capacity", |v| edit(&mut v["experiment"]));
        issues_of(&validate_tree(&t), "l0-fx-capacity")
    }

    fn check(edit: impl FnOnce(&mut Value)) -> Vec<ContentIssue> {
        let mut t = good_tree();
        edit_json(&mut t, "l0-fx-reading", |v| edit(&mut v["check"]));
        issues_of(&validate_tree(&t), "l0-fx-reading")
    }

    fn has_code(i: &[ContentIssue], code: &str) -> bool {
        i.iter().any(|i| i.code == code)
    }

    #[test]
    fn choice_rules() {
        let cases: Vec<(&str, Box<dyn FnOnce(&mut Value)>)> = vec![
            ("two correct", Box::new(|e| e["choices"][1]["correct"] = true.into())),
            ("none correct", Box::new(|e| e["choices"][0]["correct"] = false.into())),
            ("one choice", Box::new(|e| e["choices"].as_array_mut().unwrap().truncate(1))),
            ("seven choices", Box::new(|e| {
                let c = e["choices"][2].clone();
                let a = e["choices"].as_array_mut().unwrap();
                for (id, cpu) in [("D", 4), ("E", 4), ("F", 4), ("G", 4)] {
                    let mut x = c.clone();
                    x["id"] = id.into();
                    x["set"] = json!({"cpu": cpu});
                    a.push(x);
                }
            })),
            ("bad id", Box::new(|e| e["choices"][2]["id"] = "c".into())),
            ("wrong without misconception", Box::new(|e| { e["choices"][1].as_object_mut().unwrap().remove("misconception"); })),
            ("wrong without failsGoals", Box::new(|e| e["choices"][1]["failsGoals"] = json!([]))),
            ("unknown goal", Box::new(|e| e["choices"][1]["failsGoals"] = json!(["slow"]))),
            ("correct with failsGoals", Box::new(|e| e["choices"][0]["failsGoals"] = json!(["fast"]))),
            ("set unknown control", Box::new(|e| e["choices"][0]["set"] = json!({"ram": 2}))),
            ("set non-option", Box::new(|e| e["choices"][0]["set"] = json!({"cpu": 3}))),
            ("same settings", Box::new(|e| e["choices"][2]["set"] = json!({"cpu": 1, "timeout": 5000}))),
        ];
        for (name, edit) in cases {
            assert!(has_code(&exp(edit), codes::CHOICE), "{name}");
        }
    }

    #[test]
    fn goal_and_expect_shape() {
        assert!(has_code(&exp(|e| e["goals"][1]["id"] = "fast".into()), codes::DUPLICATE_ID));
        assert!(has_code(&exp(|e| e["goals"][0]["metric"] = "p96".into()), codes::EXPECT));
        assert!(has_code(&exp(|e| e["choices"][0]["expect"] = json!({"p95": {"<": 3}})), codes::EXPECT));
        assert!(has_code(&exp(|e| e["choices"][0]["expect"] = json!({"latency": {"<=": 3}})), codes::EXPECT));
        assert!(has_code(&exp(|e| e["goals"] = json!([])), codes::CHOICE));
        assert!(has_code(&exp(|e| e["choices"][2]["id"] = "B".into()), codes::DUPLICATE_ID));
    }

    #[test]
    fn reading_check_rules() {
        assert!(has_code(&check(|c| c["passMark"] = 3.into()), codes::CHOICE));
        assert!(has_code(&check(|c| c["passMark"] = 0.into()), codes::CHOICE));
        assert!(has_code(&check(|c| c["questions"][0]["answer"] = "d".into()), codes::CHOICE));
        assert!(has_code(&check(|c| c["questions"][0]["options"] = json!(["a"])), codes::CHOICE));
        assert!(has_code(&check(|c| c["questions"][1]["answer"] = "x".into()), codes::CHOICE));
        assert!(has_code(&check(|c| c["questions"][1]["tolerance"] = (-1).into()), codes::CHOICE));
        assert!(has_code(&check(|c| c["questions"][1]["id"] = "q1".into()), codes::DUPLICATE_ID));
        assert!(has_code(&check(|c| c["questions"][0]["options"] = json!(["a", "a"])), codes::DUPLICATE_ID));
        assert!(has_code(&check(|c| c["questions"][1]["id"] = "Q2".into()), codes::CHOICE));
    }
}
```

- [ ] **Step 2: Run and see them fail**

Run: `./dev cargo test -p content choices`
Expected: compile errors, then assertion failures.

- [ ] **Step 3: Implement** (top of `choices.rs`):

```rust
//! Goals, experiment choices, the shape of `expect`, and reading checks (rulings R7, R13).

use crate::ids;
use crate::issue::{codes, ContentIssue};
use crate::known;
use crate::types::*;
use sim_core::fixture::parse_op;
use sim_core::{ConfigValue, Goal};
use std::collections::{BTreeMap, BTreeSet};

pub(crate) fn check_goals(path: &str, goals: &[Goal], reserved: Option<&str>) -> Vec<ContentIssue> {
    let mut out = vec![];
    if goals.is_empty() {
        out.push(ContentIssue::new(codes::CHOICE, path).field("goals").detail("needs at least one goal"));
    }
    let metrics = known::metric_keys();
    let mut seen = BTreeSet::new();
    for g in goals {
        if !seen.insert(g.id.as_str()) || reserved == Some(g.id.as_str()) {
            out.push(ContentIssue::new(codes::DUPLICATE_ID, path).id(g.id.clone()).field("goals"));
        }
        if !metrics.contains(&g.metric) {
            out.push(ContentIssue::new(codes::EXPECT, path).id(g.id.clone()).field(g.metric.clone()).detail("unknown metric"));
        }
    }
    out
}

fn check_expect(path: &str, c: &Choice) -> Vec<ContentIssue> {
    let metrics = known::metric_keys();
    let mut out = vec![];
    for (metric, ops) in &c.expect {
        if !metrics.contains(metric) {
            out.push(ContentIssue::new(codes::EXPECT, path).id(c.id.clone()).field(metric.clone()).detail("unknown metric"));
        }
        for op in ops.keys() {
            if parse_op(op).is_none() {
                out.push(ContentIssue::new(codes::EXPECT, path).id(c.id.clone()).field(metric.clone()).detail(format!("unknown op {op}")));
            }
        }
    }
    out
}

/// Settings a choice runs with: every control, in control order.
pub(crate) fn effective(exp: &Experiment, c: &Choice) -> Vec<(String, ConfigValue)> {
    exp.controls.iter().map(|k| (k.id.clone(), c.set.get(&k.id).unwrap_or(&k.default).clone())).collect()
}

pub(crate) fn check_choices(path: &str, exp: &Experiment) -> Vec<ContentIssue> {
    let mut out = check_goals(path, &exp.goals, None);
    let choice = |id: &str| ContentIssue::new(codes::CHOICE, path).id(id.to_string());
    if !(2..=6).contains(&exp.choices.len()) {
        out.push(ContentIssue::new(codes::CHOICE, path).field("choices").detail("needs 2 to 6 choices"));
    }
    if exp.choices.iter().filter(|c| c.correct).count() != 1 {
        out.push(ContentIssue::new(codes::CHOICE, path).field("correct").detail("needs exactly one correct choice"));
    }
    let goals: BTreeSet<&str> = exp.goals.iter().map(|g| g.id.as_str()).collect();
    let controls: BTreeMap<&str, &Control> = exp.controls.iter().map(|c| (c.id.as_str(), c)).collect();
    let mut seen = BTreeSet::new();
    for c in &exp.choices {
        if !seen.insert(c.id.as_str()) {
            out.push(ContentIssue::new(codes::DUPLICATE_ID, path).id(c.id.clone()).field("choices"));
        }
        if !ids::is_choice_id(&c.id) {
            out.push(choice(&c.id).field("id").detail("choice ids are A-F"));
        }
        if c.correct {
            if c.misconception.is_some() || !c.fails_goals.is_empty() {
                out.push(choice(&c.id).field("correct").detail("the correct choice has no misconception or failsGoals"));
            }
        } else {
            if !c.misconception.as_deref().is_some_and(|m| ids::numbered(m, 'M')) {
                out.push(choice(&c.id).field("misconception"));
            }
            if c.fails_goals.is_empty() {
                out.push(choice(&c.id).field("failsGoals").detail("a wrong choice must fail at least one goal"));
            }
        }
        for g in &c.fails_goals {
            if !goals.contains(g.as_str()) {
                out.push(choice(&c.id).field("failsGoals").detail(format!("unknown goal {g}")));
            }
        }
        for (k, v) in &c.set {
            match controls.get(k.as_str()) {
                None => out.push(choice(&c.id).field("set").detail(format!("unknown control {k}"))),
                Some(ctl) if !ctl.options.contains(v) => out.push(choice(&c.id).field("set").detail(format!("{k}: not an option"))),
                Some(_) => {}
            }
        }
        out.extend(check_expect(path, c));
    }
    for (j, b) in exp.choices.iter().enumerate() {
        if let Some(a) = exp.choices[..j].iter().find(|a| effective(exp, a) == effective(exp, b)) {
            out.push(choice(&b.id).field("set").detail(format!("same settings as {}", a.id)));
        }
    }
    out
}

pub(crate) fn check_questions(path: &str, check: &Check) -> Vec<ContentIssue> {
    let mut out = vec![];
    let q_issue = |id: &str| ContentIssue::new(codes::CHOICE, path).id(id.to_string());
    let n = check.questions.len() as u32;
    if n == 0 {
        out.push(ContentIssue::new(codes::CHOICE, path).field("questions").detail("needs at least one question"));
    }
    if check.pass_mark == 0 || check.pass_mark > n {
        out.push(ContentIssue::new(codes::CHOICE, path).field("passMark").detail("must be 1..=questions"));
    }
    let mut seen = BTreeSet::new();
    for q in &check.questions {
        if !seen.insert(q.id.as_str()) {
            out.push(ContentIssue::new(codes::DUPLICATE_ID, path).id(q.id.clone()).field("questions"));
        }
        if !ids::numbered(&q.id, 'q') {
            out.push(q_issue(&q.id).field("id"));
        }
        if q.misconception.as_deref().is_some_and(|m| !ids::numbered(m, 'M')) {
            out.push(q_issue(&q.id).field("misconception"));
        }
        match q.kind {
            QuestionType::Single => {
                if q.options.len() < 2 {
                    out.push(q_issue(&q.id).field("options").detail("needs at least 2 options"));
                }
                let mut opts = BTreeSet::new();
                for o in &q.options {
                    if !opts.insert(o.as_str()) {
                        out.push(ContentIssue::new(codes::DUPLICATE_ID, path).id(format!("{}.{o}", q.id)).field("options"));
                    }
                    if !ids::is_option_id(o) {
                        out.push(q_issue(&q.id).field("options").detail(format!("bad option id {o}")));
                    }
                }
                if !matches!(&q.answer, Answer::Text(a) if q.options.contains(a)) {
                    out.push(q_issue(&q.id).field("answer").detail("answer must be one of the options"));
                }
            }
            QuestionType::Numeric => {
                if !matches!(q.answer, Answer::Number(_)) {
                    out.push(q_issue(&q.id).field("answer").detail("numeric answer expected"));
                }
                if !q.options.is_empty() {
                    out.push(q_issue(&q.id).field("options").detail("numeric questions have no options"));
                }
                if q.tolerance.is_some_and(|t| !t.is_finite() || t < 0.0) {
                    out.push(q_issue(&q.id).field("tolerance"));
                }
            }
        }
    }
    out
}
```

In `checks.rs` `check_lesson`, extend the experiment block and add a reading block:

```rust
    if let Some(e) = &l.experiment {
        let (issues, _paths) = crate::controls::check_controls(&path, e);
        out.issues.extend(issues);
        out.issues.extend(crate::choices::check_choices(&path, e));
    }
    if let Some(c) = &l.check {
        out.issues.extend(crate::choices::check_questions(&path, c));
    }
```

- [ ] **Step 4: Run the tests**

Run: `./dev cargo test -p content`
Expected: all pass, `good_tree_has_no_issues` included.

- [ ] **Step 5: Commit**

```bash
git add crates/content
git commit -m "feat(content): goal, choice, expect-shape and reading-check rules

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Phase 3: Experiment validation on sim-core

### Task 11: Engine inputs, base and option acceptance

**Files:**
- Create: `crates/content/src/engine_input.rs`, `crates/content/src/experiment.rs`
- Modify: `crates/content/src/checks.rs`, `crates/content/src/report.rs`, `crates/content/src/lib.rs` (`pub(crate) mod engine_input; pub(crate) mod experiment;`)

**Interfaces:**
- Produces: `engine_input::{normalized, lesson_input, engine_check, EngineCheck}`. `EngineCheck::issue(code, path) -> Option<ContentIssue>` attaches engine codes, or a serde message when the input does not even parse. `experiment::check_engine(path, &Experiment, &[ControlPath], &mut Outcome)` handles the engine stage of one experiment; this task covers base and options, Tasks 13–14 add the runs. `RunSummary::of(label, &SimResult)`.
- Codes covered: `content.engine-invalid` (base), and `content.control` for an option the engine rejects.

- [ ] **Step 1: Write the failing tests**

At the bottom of `engine_input.rs`:

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn seed_defaults_to_one() {
        assert_eq!(normalized(&json!({"graph": {}}))["seed"], json!(1));
        assert_eq!(normalized(&json!({"seed": 5}))["seed"], json!(5));
        assert_eq!(normalized(&json!([1])), json!([1])); // not an object: left alone
    }

    #[test]
    fn engine_check_three_ways() {
        let ok = json!({"graph": {"nodes": [{"id": "u", "kind": "client"}, {"id": "w", "kind": "web-server"}],
                                  "edges": [{"id": "e", "from": "u", "to": "w", "kind": "http"}]},
                        "workload": {"baseRps": 10}});
        assert!(matches!(engine_check(&ok), EngineCheck::Accepted(_)));
        let mut bad = ok.clone();
        bad["graph"]["edges"][0]["kind"] = "db".into();
        match engine_check(&bad) {
            EngineCheck::Rejected(e) => assert_eq!(e[0].code, "edge.not-accepted"),
            _ => panic!("expected Rejected"),
        }
        let mut unreadable = ok;
        unreadable["graph"]["nodes"][1]["replicas"] = json!(1.5);
        assert!(matches!(engine_check(&unreadable), EngineCheck::Unreadable(_)));
    }
}
```

At the bottom of `experiment.rs`:

```rust
#[cfg(test)]
mod tests {
    use crate::issue::codes;
    use crate::test_util::*;
    use crate::validate_tree;
    use serde_json::json;

    #[test]
    fn base_rejected_by_the_engine() {
        let mut t = good_tree();
        edit_json(&mut t, "l0-fx-capacity", |v| v["experiment"]["base"]["graph"]["edges"][0]["kind"] = "db".into());
        let i = issues_of(&validate_tree(&t), "l0-fx-capacity");
        let e = i.iter().find(|i| i.code == codes::ENGINE_INVALID).expect("engine-invalid");
        assert_eq!(e.field.as_deref(), Some("base"));
        assert_eq!(e.engine[0].code, "edge.not-accepted");
    }

    #[test]
    fn options_rejected_by_the_engine() {
        let mut t = good_tree();
        edit_json(&mut t, "l0-fx-capacity", |v| {
            v["experiment"]["controls"][0]["options"] = json!([0, 1, 2, 4]); // cpu 0 is out of range
            v["experiment"]["controls"][1] = json!({"id": "timeout", "type": "select",
                "path": "workload.clientTimeoutMs", "options": [-5, 1000, 5000], "default": 1000});
        });
        let i = issues_of(&validate_tree(&t), "l0-fx-capacity");
        let cpu = i.iter().find(|i| i.code == codes::CONTROL && i.id.as_deref() == Some("cpu")).unwrap();
        assert_eq!(cpu.engine[0].code, "config.invalid");
        assert!(i.iter().any(|i| i.code == codes::CONTROL && i.id.as_deref() == Some("timeout")
            && i.engine.iter().any(|e| e.code == "workload.invalid")));
    }

    #[test]
    fn non_integer_replicas_option_is_unreadable_not_a_panic() {
        let mut t = good_tree();
        // A third control, so no choice references it and the structure stays sound.
        edit_json(&mut t, "l0-fx-capacity", |v| v["experiment"]["controls"].as_array_mut().unwrap().push(json!({
            "id": "reps", "type": "select", "path": "graph.nodes[web].replicas", "options": [1, 1.5], "default": 1})));
        let i = issues_of(&validate_tree(&t), "l0-fx-capacity");
        assert!(i.iter().any(|i| i.code == codes::CONTROL && i.detail.as_deref().is_some_and(|d| d.contains("1.5"))));
    }
}
```

- [ ] **Step 2: Run and see them fail**

Run: `./dev cargo test -p content engine_input experiment`
Expected: compile errors.

- [ ] **Step 3: Implement `crates/content/src/engine_input.rs`**

```rust
//! Building engine inputs from content and asking the engine whether it accepts them.

use crate::controls::{apply, ControlPath};
use crate::issue::ContentIssue;
use crate::types::*;
use serde_json::Value;
use sim_core::{check_input, ConfigValue, SimInput, ValidationIssue};
use std::collections::BTreeMap;

/// Ruling R2: seed 1 unless the item sets one.
pub(crate) fn normalized(v: &Value) -> Value {
    let mut v = v.clone();
    if let Some(o) = v.as_object_mut() {
        o.entry("seed").or_insert(Value::from(1));
    }
    v
}

/// `base` with every control set: `set[id]` when given, else the control's default.
pub(crate) fn lesson_input(base: &Value, controls: &[(&ControlPath, &Control)], set: &BTreeMap<String, ConfigValue>) -> Value {
    let mut v = normalized(base);
    for (path, c) in controls {
        apply(&mut v, path, set.get(&c.id).unwrap_or(&c.default));
    }
    v
}

pub(crate) enum EngineCheck {
    Accepted(SimInput),
    Rejected(Vec<ValidationIssue>),
    Unreadable(String),
}

/// Typed conversion, then the same checks `simulate` runs. Warnings do not reject.
pub(crate) fn engine_check(v: &Value) -> EngineCheck {
    let input: SimInput = match serde_json::from_value(v.clone()) {
        Ok(i) => i,
        Err(e) => return EngineCheck::Unreadable(e.to_string()),
    };
    let blocking: Vec<ValidationIssue> = check_input(&input).into_iter().filter(|i| i.blocking).collect();
    if blocking.is_empty() {
        EngineCheck::Accepted(input)
    } else {
        EngineCheck::Rejected(blocking)
    }
}

impl EngineCheck {
    /// The issue for a failed check, or `None` when the engine accepts the input.
    pub fn issue(&self, code: &str, path: &str) -> Option<ContentIssue> {
        match self {
            EngineCheck::Accepted(_) => None,
            EngineCheck::Rejected(e) => Some(ContentIssue::new(code, path).engine(e.clone())),
            EngineCheck::Unreadable(m) => Some(ContentIssue::new(code, path).detail(m.clone())),
        }
    }
}
```

- [ ] **Step 4: Add `RunSummary::of`** to `report.rs`:

```rust
impl RunSummary {
    pub fn of(label: impl Into<String>, r: &sim_core::SimResult) -> RunSummary {
        let events: std::collections::BTreeSet<String> = r.events.iter().map(|e| e.code.clone()).collect();
        RunSummary { label: label.into(), metrics: r.metrics.clone(), events: events.into_iter().collect() }
    }
}
```

- [ ] **Step 5: Implement `crates/content/src/experiment.rs`** (above the tests):

```rust
//! Engine stage of an experiment: base and options (this task), runs and grading (Task 13),
//! numeric expectations (Task 14).

use crate::checks::Outcome;
use crate::controls::ControlPath;
use crate::engine_input::{engine_check, lesson_input};
use crate::issue::codes;
use crate::types::*;
use std::collections::BTreeMap;

/// Runs only when the structure is sound and readiness allows it; `paths[i]` belongs to
/// `exp.controls[i]`.
pub(crate) fn check_engine(path: &str, exp: &Experiment, paths: &[ControlPath], out: &mut Outcome) {
    let controls: Vec<(&ControlPath, &Control)> = paths.iter().zip(&exp.controls).collect();
    let defaults = lesson_input(&exp.base, &controls, &BTreeMap::new());
    if let Some(issue) = engine_check(&defaults).issue(codes::ENGINE_INVALID, path) {
        out.issues.push(issue.field("base"));
        return;
    }
    for (_, c) in &controls {
        for o in &c.options {
            let set = BTreeMap::from([(c.id.clone(), o.clone())]);
            let shown = serde_json::to_string(o).unwrap_or_default();
            let check = engine_check(&lesson_input(&exp.base, &controls, &set));
            if let Some(issue) = check.issue(codes::CONTROL, path) {
                let detail = match issue.detail.clone() {
                    Some(serde) => format!("option {shown}: {serde}"),
                    None => format!("option {shown}"),
                };
                out.issues.push(issue.id(c.id.clone()).field("options").detail(detail));
            }
        }
    }
    run_choices(path, exp, &controls, out);
}

/// Task 13.
fn run_choices(_path: &str, _exp: &Experiment, _controls: &[(&ControlPath, &Control)], _out: &mut Outcome) {}
```

- [ ] **Step 6: Gate the engine stage** in `checks.rs` `check_lesson`. Replace the experiment block with:

```rust
    if let Some(e) = &l.experiment {
        let (control_issues, paths) = crate::controls::check_controls(&path, e);
        let choice_issues = crate::choices::check_choices(&path, e);
        let structural_ok = e.base.is_object()
            && !control_issues.iter().chain(&choice_issues).any(|i| i.blocking);
        out.issues.extend(control_issues);
        out.issues.extend(choice_issues);
        if structural_ok {
            let paths: Vec<_> = paths.into_iter().flatten().collect();
            crate::experiment::check_engine(&path, e, &paths, &mut out);
        }
    }
```

(`structural_ok` implies every path parsed, because an unparsed path produces a blocking `content.control`.)

- [ ] **Step 7: Run the tests**

Run: `./dev cargo test -p content`
Expected: all pass. `good_tree_has_no_issues` still passes: base and every option are accepted.

- [ ] **Step 8: Commit**

```bash
git add crates/content
git commit -m "feat(content): build engine inputs and check base and options

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 12: Readiness scan (`blocked`, unknown fields, engine needs)

**Files:**
- Create: `crates/content/src/readiness.rs`
- Modify: `crates/content/src/checks.rs`, `crates/content/src/lib.rs` (`pub(crate) mod readiness;`)

**Interfaces:**
- Produces: `readiness::Scan` with `input(&Value, &Ctx)`, `graph(&Value, &Ctx)`, `fault(i, &Value, &Ctx)`, `metric(&str, &Ctx)`, `issues(path) -> Vec<ContentIssue>`, `stops_engine() -> bool` and `needs() -> EngineNeeds`. Challenges reuse it in Task 16.
- Codes covered: `content.blocked` (warning), and `content.engine-invalid` for unknown fields (ruling R4).

- [ ] **Step 1: Write the failing tests** at the bottom of `readiness.rs`:

```rust
#[cfg(test)]
mod tests {
    use crate::issue::codes;
    use crate::report::Readiness;
    use crate::test_util::*;
    use crate::validate_tree;
    use serde_json::{json, Value};

    fn lesson(edit: impl FnOnce(&mut Value)) -> crate::ItemReport {
        let mut t = good_tree();
        edit_json(&mut t, "l0-fx-capacity", |v| edit(&mut v["experiment"]));
        validate_tree(&t).items.into_iter().find(|i| i.id == "l0-fx-capacity").unwrap()
    }

    fn blocked_with(item: &crate::ItemReport) -> Vec<String> {
        item.issues.iter().find(|i| i.code == codes::BLOCKED).map(|i| i.missing.clone()).unwrap_or_default()
    }

    #[test]
    fn planned_component_blocks_without_running() {
        let it = lesson(|e| {
            e["base"]["graph"]["nodes"].as_array_mut().unwrap().push(json!({"id": "cache", "kind": "redis"}));
            e["base"]["graph"]["edges"].as_array_mut().unwrap().push(json!({"id": "e2", "from": "web", "to": "cache", "kind": "cache"}));
        });
        assert_eq!(blocked_with(&it), vec!["component:redis"]);
        assert_eq!(it.readiness, Some(Readiness::Blocked));
        assert!(it.runs.is_empty());
        assert!(it.passed, "blocked is a warning");
    }

    #[test]
    fn unsupported_fault_and_unmeasured_metric_block() {
        let it = lesson(|e| {
            e["base"]["faults"] = json!([{"kind": "instance-slow", "target": "web", "atMs": 3000}]);
            e["goals"][1]["metric"] = "duplicateIds".into();
        });
        assert_eq!(blocked_with(&it), vec!["fault:instance-slow", "metric:duplicateIds"]);
    }

    #[test]
    fn planned_field_blocks_and_unplanned_field_fails() {
        let it = lesson(|e| e["base"]["workload"]["params"] = json!({"hotKeyShare": 0.5}));
        assert_eq!(blocked_with(&it), vec!["field:workload.params.hotKeyShare"]);
        // Review focus 1: a field the engine would silently ignore never passes as ready.
        for (name, edit) in [
            ("workload.params.other", Box::new(|e: &mut Value| e["base"]["workload"]["params"] = json!({"other": 1})) as Box<dyn FnOnce(&mut Value)>),
            ("config.web-server.autoscale", Box::new(|e: &mut Value| e["base"]["graph"]["nodes"][1]["config"]["autoscale"] = true.into())),
            ("speed", Box::new(|e: &mut Value| e["base"]["speed"] = 1.into())),
            ("faults[0].severity", Box::new(|e: &mut Value| e["base"]["faults"] = json!([{"kind": "instance-down", "atMs": 1, "severity": 2}]))),
        ] {
            let it = lesson(edit);
            assert!(it.issues.iter().any(|i| i.code == codes::ENGINE_INVALID && i.field.as_deref() == Some(name)), "{name}");
            assert!(!it.passed && it.runs.is_empty(), "{name}");
        }
    }

    #[test]
    fn unknown_kinds_are_engine_invalid_not_blocked() {
        let it = lesson(|e| e["base"]["graph"]["nodes"][1]["kind"] = "mainframe".into());
        assert!(it.issues.iter().any(|i| i.code == codes::ENGINE_INVALID && i.engine.iter().any(|e| e.code == "node.unknown-kind")));
        let it = lesson(|e| e["base"]["faults"] = json!([{"kind": "meteor", "atMs": 1}]));
        assert!(it.issues.iter().any(|i| i.code == codes::ENGINE_INVALID && i.detail.is_some()));
    }

    #[test]
    fn blocked_items_still_get_structural_checks() {
        let mut t = good_tree();
        edit_json(&mut t, "l0-fx-capacity", |v| v["experiment"]["base"]["faults"] = json!([{"kind": "instance-slow", "atMs": 1}]));
        edit_prose(&mut t, "l0-fx-capacity", "vi", |s| s.replace("- **B**:", "- **X**:"));
        let r = validate_tree(&t);
        assert!(has(&r, "l0-fx-capacity", codes::BLOCKED));
        assert!(has(&r, "l0-fx-capacity", codes::PROSE_KEY));
    }

    #[test]
    fn needs_are_collected() {
        let mut t = good_tree();
        edit_json(&mut t, "l0-fx-capacity", |v| v["experiment"]["base"]["graph"]["nodes"][1]["config"]["costPerMonth"] = 30.into());
        let p = crate::structure::parse_tree(&t);
        let ctx = crate::checks::Ctx::new(p.levels.as_ref());
        let o = crate::checks::check_lesson(&p.lessons[0], &ctx);
        assert_eq!(o.needs.components, vec!["client", "web-server"]);
        assert_eq!(o.needs.node_overrides, vec!["costPerMonth"]);
        assert_eq!(o.needs.metrics, vec!["p95", "requestsRejected"]);
    }
}
```

- [ ] **Step 2: Run and see them fail**

Run: `./dev cargo test -p content readiness`
Expected: compile errors, then failures.

- [ ] **Step 3: Implement `crates/content/src/readiness.rs`**

```rust
//! What an item needs from the engine (ruling R4). A planned name -> `missing` (blocked, a
//! warning). An input field the engine would silently ignore -> `unknown` (engine-invalid,
//! blocking). Unknown component or fault kinds are left to the engine, which rejects them.

use crate::checks::Ctx;
use crate::issue::{codes, ContentIssue};
use crate::known;
use crate::types::EngineNeeds;
use serde_json::{Map, Value};
use sim_core::FaultKind;
use std::collections::BTreeSet;

#[derive(Debug, Default)]
pub(crate) struct Scan {
    pub missing: BTreeSet<String>,
    pub unknown: BTreeSet<String>,
    pub components: BTreeSet<String>,
    pub faults: BTreeSet<String>,
    pub calibration: BTreeSet<String>,
    pub node_overrides: BTreeSet<String>,
    pub metrics: BTreeSet<String>,
}

impl Scan {
    fn field(&mut self, ctx: &Ctx, name: String) {
        if ctx.planned.fields.contains(&name) {
            self.missing.insert(format!("field:{name}"));
        } else {
            self.unknown.insert(name);
        }
    }

    fn extra_keys(&mut self, obj: &Map<String, Value>, known: &BTreeSet<String>, prefix: &str) {
        for k in obj.keys().filter(|k| !known.contains(*k)) {
            self.unknown.insert(format!("{prefix}{k}"));
        }
    }

    pub fn input(&mut self, v: &Value, ctx: &Ctx) {
        let Some(o) = v.as_object() else { return };
        self.extra_keys(o, &known::input_keys(), "");
        if let Some(g) = o.get("graph") {
            self.graph(g, ctx);
        }
        if let Some(w) = o.get("workload").and_then(Value::as_object) {
            let keys = known::workload_keys();
            for k in w.keys().filter(|k| !keys.contains(*k)) {
                self.field(ctx, format!("workload.{k}"));
            }
            for k in w.get("params").and_then(Value::as_object).into_iter().flat_map(|p| p.keys()) {
                if !ctx.caps.workload_params.contains(k) {
                    self.field(ctx, format!("workload.params.{k}"));
                }
            }
            if let Some(s) = w.get("surge").and_then(Value::as_object) {
                self.extra_keys(s, &known::surge_keys(), "workload.surge.");
            }
        }
        if let Some(c) = o.get("calibration").and_then(Value::as_object) {
            let keys = known::calibration_keys();
            for k in c.keys() {
                if keys.contains(k) {
                    self.calibration.insert(k.clone());
                } else {
                    self.field(ctx, format!("calibration.{k}"));
                }
            }
        }
        for (i, f) in o.get("faults").and_then(Value::as_array).into_iter().flatten().enumerate() {
            self.fault(i, f, ctx);
        }
    }

    pub fn graph(&mut self, g: &Value, ctx: &Ctx) {
        let Some(go) = g.as_object() else { return };
        self.extra_keys(go, &known::graph_keys(), "graph.");
        for n in go.get("nodes").and_then(Value::as_array).into_iter().flatten() {
            let Some(no) = n.as_object() else { continue };
            let id = no.get("id").and_then(Value::as_str).unwrap_or("?");
            self.extra_keys(no, &known::node_keys(), &format!("graph.nodes[{id}]."));
            let kind = no.get("kind").and_then(Value::as_str).unwrap_or_default();
            self.components.insert(kind.to_string());
            match known::config_keys(kind) {
                None if ctx.planned.components.iter().any(|c| c == kind) => {
                    self.missing.insert(format!("component:{kind}"));
                }
                None => {} // unknown kind: the engine rejects it (node.unknown-kind)
                Some(keys) => {
                    for k in no.get("config").and_then(Value::as_object).into_iter().flat_map(|c| c.keys()) {
                        if !keys.contains(k) {
                            self.field(ctx, format!("config.{kind}.{k}"));
                        } else if sim_core::components::NODE_OVERRIDE_KEYS.contains(&k.as_str()) {
                            self.node_overrides.insert(k.clone());
                        }
                    }
                }
            }
        }
        for e in go.get("edges").and_then(Value::as_array).into_iter().flatten() {
            if let Some(eo) = e.as_object() {
                let id = eo.get("id").and_then(Value::as_str).unwrap_or("?");
                self.extra_keys(eo, &known::edge_keys(), &format!("graph.edges[{id}]."));
            }
        }
    }

    pub fn fault(&mut self, i: usize, f: &Value, ctx: &Ctx) {
        let Some(fo) = f.as_object() else { return };
        self.extra_keys(fo, &known::fault_keys(), &format!("faults[{i}]."));
        let Some(name) = fo.get("kind").and_then(Value::as_str) else { return };
        self.faults.insert(name.to_string());
        match serde_json::from_value::<FaultKind>(Value::from(name)) {
            Ok(k) if ctx.caps.faults.contains(&k) => {}
            Ok(_) => {
                self.missing.insert(format!("fault:{name}"));
            }
            Err(_) if ctx.planned.faults.iter().any(|p| p == name) => {
                self.missing.insert(format!("fault:{name}"));
            }
            Err(_) => {} // not a fault kind at all: typed parsing rejects it
        }
    }

    /// Unknown metric names are reported by `choices` as content.expect.
    pub fn metric(&mut self, name: &str, ctx: &Ctx) {
        if !known::metric_keys().contains(name) {
            return;
        }
        self.metrics.insert(name.to_string());
        if !ctx.caps.metrics.iter().any(|m| m == name) {
            self.missing.insert(format!("metric:{name}"));
        }
    }

    pub fn stops_engine(&self) -> bool {
        !self.unknown.is_empty() || !self.missing.is_empty()
    }

    pub fn issues(&self, path: &str) -> Vec<ContentIssue> {
        let mut out: Vec<ContentIssue> = self.unknown.iter()
            .map(|f| ContentIssue::new(codes::ENGINE_INVALID, path).field(f.clone()).detail("unknown field"))
            .collect();
        if !self.missing.is_empty() {
            out.push(ContentIssue::new(codes::BLOCKED, path).missing(self.missing.iter().cloned().collect()));
        }
        out
    }

    pub fn needs(&self) -> EngineNeeds {
        let v = |s: &BTreeSet<String>| s.iter().filter(|x| !x.is_empty()).cloned().collect();
        EngineNeeds {
            components: v(&self.components),
            faults: v(&self.faults),
            dynamic: vec![],
            behaviors: vec![],
            calibration: v(&self.calibration),
            node_overrides: v(&self.node_overrides),
            metrics: v(&self.metrics),
        }
    }
}
```

- [ ] **Step 4: Put the scan in front of the engine stage.** Replace the experiment block in `checks.rs` `check_lesson`, and change `_ctx` to `ctx`:

```rust
    if let Some(e) = &l.experiment {
        let (control_issues, paths) = crate::controls::check_controls(&path, e);
        let choice_issues = crate::choices::check_choices(&path, e);
        let structural_ok = e.base.is_object()
            && !control_issues.iter().chain(&choice_issues).any(|i| i.blocking);
        out.issues.extend(control_issues);
        out.issues.extend(choice_issues);

        let mut scan = crate::readiness::Scan::default();
        scan.input(&crate::engine_input::normalized(&e.base), ctx);
        for p in paths.iter().flatten() {
            match p {
                crate::controls::ControlPath::Calibration(f) => { scan.calibration.insert(f.clone()); }
                crate::controls::ControlPath::NodeConfig(_, k)
                    if sim_core::components::NODE_OVERRIDE_KEYS.contains(&k.as_str()) => { scan.node_overrides.insert(k.clone()); }
                _ => {}
            }
        }
        for g in &e.goals {
            scan.metric(&g.metric, ctx);
        }
        for m in e.choices.iter().flat_map(|c| c.expect.keys()) {
            scan.metric(m, ctx);
        }
        out.issues.extend(scan.issues(&path));
        out.needs = scan.needs();
        out.missing = scan.missing.iter().cloned().collect();
        if !scan.missing.is_empty() {
            out.readiness = Some(Readiness::Blocked);
        }
        if structural_ok && !scan.stops_engine() {
            let paths: Vec<_> = paths.into_iter().flatten().collect();
            crate::experiment::check_engine(&path, e, &paths, &mut out);
        }
    }
```

- [ ] **Step 5: Run the tests**

Run: `./dev cargo test -p content`
Expected: all pass. In `planned_component_blocks_without_running`, the edge from `web` to `cache` raises no engine issue because the engine never runs.

- [ ] **Step 6: Commit**

```bash
git add crates/content
git commit -m "feat(content): readiness scan, blocked items and unknown fields

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 13: Run choices and grade them

**Files:**
- Modify: `crates/content/src/experiment.rs` (replace the `run_choices` stub)

**Interfaces:**
- Produces: one `RunSummary` per choice, labelled `choice:<id>`.
- Codes covered: `content.correct-fails`, `content.wrong-passes`, `content.wrong-extra-fail` (warning).

- [ ] **Step 1: Write the failing tests** (add them to the `experiment.rs` tests):

```rust
    fn item(edit: impl FnOnce(&mut serde_json::Value)) -> crate::ItemReport {
        let mut t = good_tree();
        edit_json(&mut t, "l0-fx-capacity", |v| edit(&mut v["experiment"]));
        validate_tree(&t).items.into_iter().find(|i| i.id == "l0-fx-capacity").unwrap()
    }

    #[test]
    fn good_lesson_runs_every_choice() {
        let it = item(|_| {});
        let labels: Vec<&str> = it.runs.iter().map(|r| r.label.as_str()).collect();
        assert_eq!(labels, vec!["choice:A", "choice:B", "choice:C"]);
        // Measured while writing the plan: 2 vCPU -> p95 4.68; 1 vCPU -> 953.86 and 21,391 rejected.
        assert!(it.runs[0].metrics.p95 < 10.0);
        assert!(it.runs[1].metrics.requests_rejected > 1_000.0);
        assert_eq!(it.runs[1].events, vec!["node.overloaded"]);
    }

    #[test]
    fn correct_choice_missing_a_goal() {
        let it = item(|e| e["goals"][0]["value"] = 1.into());
        let i = it.issues.iter().find(|i| i.code == codes::CORRECT_FAILS).unwrap();
        assert_eq!((i.id.as_deref(), i.field.as_deref()), (Some("A"), Some("fast")));
        assert!(i.measured.unwrap() > 1.0);
    }

    #[test]
    fn wrong_choice_passing_a_listed_goal() {
        let it = item(|e| e["choices"][2] = json!({"id": "C", "misconception": "M2", "set": {"cpu": 4},
                                                   "failsGoals": ["fast", "no-drops"]}));
        let goals: Vec<_> = it.issues.iter().filter(|i| i.code == codes::WRONG_PASSES)
            .filter_map(|i| i.field.clone()).collect();
        assert_eq!(goals, vec!["fast", "no-drops"]);
        assert!(!it.passed);
    }

    #[test]
    fn wrong_choice_failing_an_unlisted_goal_only_warns() {
        let it = item(|e| e["choices"][2]["failsGoals"] = json!(["fast"]));
        let w = it.issues.iter().find(|i| i.code == codes::WRONG_EXTRA_FAIL).unwrap();
        assert_eq!((w.id.as_deref(), w.field.as_deref(), w.blocking), (Some("C"), Some("no-drops"), false));
        assert!(it.passed);
    }
```

- [ ] **Step 2: Run and see them fail**

Run: `./dev cargo test -p content experiment`
Expected: the 4 new tests fail (no runs yet).

- [ ] **Step 3: Implement**: replace `run_choices` in `experiment.rs`, and add the imports `use crate::report::RunSummary; use sim_core::{grade, simulate};`:

```rust
fn run_choices(path: &str, exp: &Experiment, controls: &[(&ControlPath, &Control)], out: &mut Outcome) {
    for c in &exp.choices {
        let check = engine_check(&lesson_input(&exp.base, controls, &c.set));
        let input = match check {
            crate::engine_input::EngineCheck::Accepted(i) => i,
            failed => {
                if let Some(issue) = failed.issue(codes::ENGINE_INVALID, path) {
                    out.issues.push(issue.id(c.id.clone()));
                }
                continue;
            }
        };
        let result = match simulate(&input) {
            Ok(r) => r,
            Err(e) => {
                out.issues.push(crate::issue::ContentIssue::new(codes::ENGINE_INVALID, path).id(c.id.clone()).engine(e));
                continue;
            }
        };
        out.runs.push(RunSummary::of(format!("choice:{}", c.id), &result));
        for g in grade(&result, &exp.goals).goals {
            let listed = c.fails_goals.contains(&g.id);
            let code = match (c.correct, listed, g.passed) {
                (true, _, false) => codes::CORRECT_FAILS,
                (false, true, true) => codes::WRONG_PASSES,
                (false, false, false) => codes::WRONG_EXTRA_FAIL,
                _ => continue,
            };
            out.issues.push(crate::issue::ContentIssue::new(code, path).id(c.id.clone()).field(g.id.clone()).measured(g.measured));
        }
        out.issues.extend(expect_issues(path, c, &result)); // Task 14
    }
}

/// Task 14.
fn expect_issues(_path: &str, _c: &Choice, _r: &sim_core::SimResult) -> Vec<crate::issue::ContentIssue> {
    vec![]
}
```

- [ ] **Step 4: Run the tests**

Run: `./dev cargo test -p content`
Expected: all pass, `good_tree_has_no_issues` included: A passes both goals, and B and C fail both.

- [ ] **Step 5: Commit**

```bash
git add crates/content
git commit -m "feat(content): run choices and grade correct and wrong choices

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 14: Numeric expectations and expected events

**Files:**
- Modify: `crates/content/src/experiment.rs` (replace the `expect_issues` stub)

**Interfaces:**
- Codes covered: `content.expect` (measured value attached). This uses the same comparison as golden fixtures: `sim_core::grade::compare` and `sim_core::fixture::parse_op`.

- [ ] **Step 1: Write the failing tests** (add them to the `experiment.rs` tests):

```rust
    #[test]
    fn failed_numeric_expectation_reports_the_measured_value() {
        let it = item(|e| e["choices"][0]["expect"] = json!({"p95": {"<=": 1, ">=": 0}}));
        let x: Vec<_> = it.issues.iter().filter(|i| i.code == codes::EXPECT).collect();
        assert_eq!(x.len(), 1, "only <= 1 fails");
        assert_eq!((x[0].id.as_deref(), x[0].field.as_deref(), x[0].detail.as_deref()), (Some("A"), Some("p95"), Some("<= 1")));
        assert!((x[0].measured.unwrap() - 4.68).abs() < 0.1);
    }

    #[test]
    fn missing_event() {
        let it = item(|e| e["choices"][1]["expectEvents"] = json!(["node.overloaded", "db.promoted"]));
        let x: Vec<_> = it.issues.iter().filter(|i| i.code == codes::EXPECT).collect();
        assert_eq!(x.len(), 1);
        assert_eq!(x[0].field.as_deref(), Some("event:db.promoted"));
    }

    #[test]
    fn unknown_ops_are_reported_once() {
        let it = item(|e| e["choices"][0]["expect"] = json!({"p95": {"<": 3}}));
        assert_eq!(it.issues.iter().filter(|i| i.code == codes::EXPECT).count(), 1);
    }
```

The last test passes only because `structural_ok` is false (an unknown op is a blocking structural `content.expect`), so the engine stage never runs for it. Keep it as a guard against double reporting.

- [ ] **Step 2: Run and see them fail**

Run: `./dev cargo test -p content experiment`
Expected: the first two fail.

- [ ] **Step 3: Implement**: replace the `expect_issues` stub, and add the imports `use sim_core::fixture::parse_op; use sim_core::grade::compare; use sim_core::metric_value;`:

```rust
fn expect_issues(path: &str, c: &Choice, r: &sim_core::SimResult) -> Vec<crate::issue::ContentIssue> {
    let mut out = vec![];
    for (metric, ops) in &c.expect {
        let measured = metric_value(&r.metrics, metric);
        for (op, expected) in ops {
            let Some(parsed) = parse_op(op) else { continue }; // reported structurally
            if !measured.is_some_and(|v| compare(v, parsed, *expected)) {
                out.push(crate::issue::ContentIssue::new(codes::EXPECT, path).id(c.id.clone())
                    .field(metric.clone()).measured(measured).detail(format!("{op} {expected}")));
            }
        }
    }
    for code in &c.expect_events {
        if !r.events.iter().any(|e| &e.code == code) {
            out.push(crate::issue::ContentIssue::new(codes::EXPECT, path).id(c.id.clone())
                .field(format!("event:{code}")).detail("event did not occur"));
        }
    }
    out
}
```

`format!("{op} {expected}")` prints `<= 1` for `1.0`, because Rust's `Display` for `f64` drops the trailing `.0`.

- [ ] **Step 4: Run the tests**

Run: `./dev cargo test -p content`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add crates/content
git commit -m "feat(content): numeric expectations and expected events

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

