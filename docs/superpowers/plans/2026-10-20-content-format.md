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
