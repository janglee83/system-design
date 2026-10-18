# Sub-project 1: `sim` engine — Design

Date: 2026-10-18
Status: Draft, awaiting review

## 1. Context

We are building an internal/personal learning platform for system design, inspired by the
feature set of syscraft.app: guided experiments, a free-form Lab, graded challenges with
chaos faults, request tracing and replay, and an AI tutor. Features and UX ideas may be
reused; **all written content (lessons, challenge text, explanations), names, logos and
illustrations are original**. No text is copied from Syscraft or from any book.

Decisions already made:

- Audience: internal / personal use. No billing, leaderboard or quotas in early versions.
- App: Next.js + React + TypeScript.
- **Engine: Rust core with a TypeScript shell ("H1").** The engine is written once in Rust
  and built to two targets: WebAssembly for the browser and Node, and a native binary for
  fast, parallel content validation. Everything outside the engine stays TypeScript.
- Content: bilingual VI + EN.
- "Workflow" means both a repeatable development process (spec → plan → code → test per
  sub-project, plus a content pipeline) and, later, a multi-agent Workflow that mass-produces
  content and uses the content validator as its judge.

### 1.1 Product-wide rules (apply to every sub-project)

- **Audience:** absolute beginners. The curriculum goes from level 0 (never heard of a load
  balancer) to 100 (can design, defend and debug large distributed systems), in levels L0–L6
  with an exit check per level. See `.claude/agents/content-researcher.md`.
- **Content is original.** Research draws on many public sources (papers, official docs,
  engineering blogs, courses) and may use learning products and books, including Syscraft, as a
  map of topics and structure. Learner-facing text, exercises, scenarios, hints and visuals are
  written by us; nothing is copied or lightly reworded.
- **UI:** at least equal to the reference product in features and interaction quality; layout
  patterns may be similar, visual identity is our own.
- **No runtime dependency on the reference site.** The product, its backend and CI never call
  it. Parity uses reference numbers captured once during development and committed to
  `fixtures/parity` (numbers, structure and pass/fail only; no text).
- **Parity target:** for the same design and scenario, every goal's pass/fail matches the
  reference exactly; measured numbers match within the tolerances in plan 1a, Task 15.
- **Dev environment:** every build and test runs in the Docker dev container (`./dev <cmd>`).

Build order (each item gets its own spec → plan → implementation cycle):

1. **`sim` engine** (this document)
2. Content format + `content validate` CLI
3. Canvas editor + Lab
4. Experiment lessons, reading lessons, concept map
5. Challenges (modes, stars, "where did it break?" quiz, hints)
6. Progress storage (SQLite, local) and AI tutor (Claude API)
7. Multi-agent content production workflow

## 2. Goal

A pure, deterministic engine that takes an architecture graph, a workload and a list of
faults, simulates about 10 seconds of virtual time, and returns metrics, a replayable
timeline, sampled request traces and notable events. A grader turns results plus goals
into a verdict.

Requirements:

- Runs in the browser (main thread and Web Worker) and in Node through WebAssembly.
- Runs natively from a CLI that validates many scenarios in parallel.
- Same input produces bit-identical output on every target.
- Fast enough that a 10-node, 10-second run feels instant in the browser.

The engine must be **directionally right** (more replicas never make the bottleneck slower;
a database with no replica cannot survive losing its primary), not accurate to the
millisecond against real production systems.

## 3. Architecture (H1)

```
            ┌─────────────────────────── Rust ───────────────────────────┐
            │  sim-core   (pure library: model, simulate, validate, grade)│
            │     ▲                    ▲                                 │
            │  sim-wasm (wasm-bindgen) sim-cli (native, rayon)           │
            └─────┼────────────────────┼─────────────────────────────────┘
                  │ .wasm + generated .d.ts                │ binary
            ┌─────▼──────── TypeScript ──────────┐    used by content
            │  @sd/sim  (thin wrapper: load wasm, │    pipeline and CI
            │   Worker helper, typed-array views) │
            │     ▲                               │
            │  apps/web (Next.js), packages/content│
            └─────────────────────────────────────┘
```

- **`crates/sim-core`**: all logic. No I/O, no clock, no OS randomness, no threads.
  `#![forbid(unsafe_code)]`. Depends only on `serde` and `libm`.
- **`crates/sim-wasm`**: `wasm-bindgen` bindings around `sim-core`. Owns the JS ↔ WASM
  boundary format (section 5).
- **`crates/sim-cli`**: native binary. Reads scenario files, runs them in parallel with
  `rayon`, prints results or a validation report as JSON. Used by the content pipeline
  (sub-project 2) and CI.
- **`packages/sim`** (`@sd/sim`): TypeScript wrapper. Loads the WASM module, exposes a typed
  async API, offers a Web Worker helper so runs never block the UI, and turns raw
  typed-array buffers into convenient views.

### 3.1 Single source of truth for types

Types are defined once as Rust structs/enums with `serde` and `tsify`. The build generates
`.d.ts` files that `@sd/sim` re-exports. TypeScript never hand-writes engine types, so the
two sides cannot drift. A CI check fails if the generated types are out of date.

## 4. Public API

Rust (`sim-core`):

```rust
pub fn simulate(input: &SimInput) -> Result<SimResult, Vec<ValidationIssue>>;
pub fn validate_graph(graph: &Graph, limits: Option<&GraphLimits>) -> Vec<ValidationIssue>;
pub fn grade(result: &SimResult, goals: &[Goal]) -> Verdict;
pub fn list_components() -> Vec<ComponentMeta>; // palette + inspector metadata for the UI
```

TypeScript (`@sd/sim`):

```ts
init(): Promise<void>                                   // loads the wasm once
simulate(input: SimInput): SimRun                       // see section 5
validateGraph(graph: Graph, limits?: GraphLimits): ValidationIssue[]
grade(run: SimRun, goals: Goal[]): Verdict
listComponents(): ComponentMeta[]
createSimWorker(): SimWorker                            // same API, off the main thread
```

### 4.1 `SimInput`

| Field | Type | Notes |
|---|---|---|
| `graph` | `Graph` | Nodes and edges; identical to what the canvas saves |
| `workload` | `Workload` | Traffic shape and scenario parameters |
| `faults` | `Fault[]` | Injected failures, each with a start time |
| `durationMs` | `u32` | Default `10_000` |
| `seed` | `u32` | Drives the PRNG; same input → identical output |
| `calibration` | `CalibrationOverrides?` | Optional overrides of world parameters (section 6.7) |

`Graph`:

- `nodes: { id, kind, label, replicas, config }[]`. `kind` is a component kind
  (`client`, `lb`, `web-server`, `postgres`, …). `config` is validated against the
  component's schema and merged over its defaults.
- `edges: { id, from, to, kind }[]` with `kind ∈ 'http' | 'db' | 'cache' | 'msg'`.

`Workload`:

- `profile`: `'read-heavy' | 'write-heavy' | 'mixed' | 'chat' | 'feed' | 'jobs'`
- `baseRps`, `writeRatio`, `clients`, `clientTimeoutMs`
- `surge?: { factor, atMs, durationMs }`
- `params?: Record<string, number>` for scenario values (group size, friends per user,
  connection-drop rate, drop length, …)

`Fault`: `{ kind: FaultKind, target?: nodeId, atMs }`. The fault kinds for v1:

`traffic-surge-3x`, `instance-down`, `instance-slow`, `lb-node-down`, `cache-down`,
`db-overloaded`, `db-primary-down`, `db-replica-down`, `db-stalled`, `broker-down`,
`object-storage-down`, `kv-node-down`, `third-party-down`, `third-party-slow`.

When `target` is omitted, the engine picks a matching node deterministically from `seed`.

### 4.2 `SimResult`

- `metrics: Metrics`
  - Core: `p50`, `p95`, `p99` (ms), `availability` (0–1), `throughputRps`,
    `costPerMonth`, `spofCount`, `peakBusy` (0–1), `peakDbConnections`, `cacheOps`.
  - Scenario metrics, `null` when not applicable to the design: `duplicateIds`,
    `outOfOrderIds`, `lostUpdates`, `writeConflicts`, `duplicateWrites`, `staleReads`,
    `peakQueueDepth`, `lostMessages`, `statusFlaps`, `staleOnline`, `inboxWritesPerSec`.
  - Breakdowns per request class (read, write, message, heartbeat, …).
- `timeline`: one frame every 100 ms with per-node `{ inFlight, queued, busy, rejected,
  status }` and per-edge rates. Used for animation and scrubbing.
- `traces`: about 300 sampled requests. Each trace is a list of
  `{ tMs, nodeId, action, waitMs, serviceMs }` steps plus the final outcome
  (`delivered | rejected | timeout | unreachable`).
- `events`: notable happenings with time, node and a structured code plus params
  (e.g. `{ code: 'db.promoted', node: 'pg1', atMs: 3600 }`). The UI turns codes into
  localized text; the engine never emits prose.

### 4.3 Validation

`validate_graph` runs before simulation and returns structured issues
(`{ code, nodeId?, edgeId?, params }`):

- edge kind not accepted by the target component (e.g. a cache pointing at a database)
- no client node, or a client with no outgoing path
- a request path with no component that can terminate it
- cycles on the synchronous request path
- limits exceeded (node count, total instances, allowed kinds) when `limits` is given

`simulate` refuses to run a graph with blocking issues and returns them instead.

### 4.4 Grading

```
Goal    = { id, metric: MetricKey | CustomCheck, op: '<=' | '>=' | '==', value }
Verdict = { passed, score, stars, goals: [{ id, passed, measured }] }
```

Custom checks cover structural goals such as "web servers only reachable through a
public entry point". Grading is separate from simulation so one run can be scored against
several challenge modes, and Lab runs are not scored at all.

## 5. JS ↔ WASM boundary

The boundary is crossed **once per run**. The format is chosen so the large parts of the
result are not serialized.

- **Input**: `SimInput` passed as a JS object, deserialized with `serde-wasm-bindgen`
  (inputs are small).
- **`metrics`, `events`, verdicts**: returned as plain JS objects via
  `serde-wasm-bindgen` (small).
- **`timeline`**: kept in WASM memory as flat `f32` columns
  (`frames × nodes × fields`). JS receives a `Float32Array` view plus a small header
  (frame count, node order, field order). `@sd/sim` wraps it in a typed accessor
  (`run.timeline.node('web').busy(frameIndex)`). Views are copied out before the next run
  so they are never invalidated.
- **`traces`**: not converted up front. `run.trace(i)` and `run.traceSummaries()` fetch
  on demand, because only "Follow request" and the diagnosis quiz need them.
- **Lifetime**: `SimRun` owns the WASM-side result and exposes `free()`; the wrapper also
  registers a `FinalizationRegistry` as a safety net.

Target budget, measured in the browser for 10 nodes and 10 s of virtual time: under 50 ms
for `simulate` including the boundary, and under 5 ms to read all of `metrics`.

## 6. Simulation model

### 6.1 Main loop

Fixed 10 ms virtual ticks (1,000 ticks for 10 s). On every tick:

1. **Generate traffic.** Each client emits the tick's request volume from the workload,
   with Poisson noise from the seeded PRNG, split into request classes.
2. **Route along edges.** Load balancers split across healthy replicas (round robin or
   least connections). Web tiers try the cache first; cache misses fall through to the
   database at a hit rate derived from cache size and key space. Writes go to the primary;
   reads go to replicas when present.
3. **Serve.** Each node is a queue with `c` workers. It completes at most
   `capacity × tick` units of work; the rest queue. A full queue or exhausted memory
   rejects work. Work that waits longer than `clientTimeoutMs` counts as abandoned and
   lowers availability.
4. **Accumulate latency.** End-to-end latency is service time plus queueing time plus
   per-edge network delay along the path. Percentiles are computed from per-class latency
   histograms (fixed log-scale buckets, so results are deterministic and cheap).
5. **Apply faults and dynamic features** scheduled for this tick.
6. Every 10 ticks, **record a timeline frame**.

### 6.2 Component plugins

```rust
pub trait ComponentModel {
    fn kind(&self) -> &'static str;
    fn meta(&self) -> ComponentMeta;          // label keys, icon, category, config schema
    fn accepts(&self) -> &'static [EdgeKind]; // valid inbound edge kinds
    fn defaults(&self) -> Config;
    fn cost_per_month(&self, cfg: &Config, replicas: u32) -> f64;
    fn capacity(&self, cfg: &Config) -> Capacity; // rps, workers, mem_mb
    fn step(&self, state: &mut NodeState, inflow: &Inflow, ctx: &mut TickCtx) -> StepOutput;
    fn on_fault(&self, _f: &Fault, _s: &mut NodeState, _ctx: &mut TickCtx) -> Vec<SimEvent> {
        vec![]
    }
}
```

Components are registered in a static registry. v1 components: `client`, `lb`,
`api-gateway`, `web-server`, `worker`, `redis`, `memcached`, `postgres`, `kv-store`,
`queue`, `cdn`, `object-storage`. Adding a component means adding one file in
`components/` and one registry line.

### 6.3 Dynamic features (evaluated per tick)

- **Auto scaling**: target busy %, min/max instances, cooldown.
- **Retries**: count and backoff (fixed / exponential). Retries add load.
- **Circuit breaker**: opens when the failure rate crosses a threshold, half-opens after a
  recovery window.
- **Database failover**: primary loss promotes a replica after a failover delay; with no
  replica, writes fail until the end of the run.
- **Rate limiting**: per-client requests per minute.

### 6.4 Behaviors

Scenario-specific logic lives in `behaviors/` and attaches to nodes through `config`:

- `id_generator`: `uuid | snowflake | db-sequence`. Produces `duplicateIds` and
  `outOfOrderIds`; `db-sequence` fails against stores without auto-increment.
- `presence`: heartbeat interval, offline-after timeout, connection drops. Produces
  `statusFlaps` and `staleOnline`.
- `fanout`: group/friend fan-out on write. Produces `inboxWritesPerSec` and queue load.

### 6.5 Sampled traces

Every N-th request (N chosen so about 300 traces are kept) is walked hop by hop through the
same queues, receiving the actual waiting time of each queue at that tick. This keeps
traces faithful enough for the "which component made this slow?" quiz without paying for
per-request simulation.

### 6.6 Determinism

- One seeded PRNG (`rand_pcg::Pcg32`, or a hand-written PCG to avoid the dependency) is the
  only source of randomness.
- Transcendental math (`exp`, `ln`, `pow`, `sqrt`) goes through `libm`, never the
  platform's math library, so native and WASM produce identical bits.
- No `HashMap` iteration in the hot path; nodes and edges are stored in `Vec`s ordered by id
  (or `BTreeMap`).
- No fused multiply-add or fast-math flags; release builds use the same float semantics on
  every target.
- CI runs every golden scenario natively **and** under WASM (Node) and asserts the two
  results are byte-identical after serialization.

### 6.7 Customizable world parameters

Everything that describes the simulated world (not the simulator itself) can be changed per
run, so lessons, challenges and the Lab can model slower hardware, other cloud prices or
slower networks.

- **Run level:** `SimInput.calibration` overrides any field of `Calibration`: web rps per vCPU,
  web service time, queue per GB, web cost per vCPU; LB rps, service time, queue seconds and
  cost per replica; Postgres qps, service time, queue seconds, cost per instance and failover
  time; network delay per edge kind; the utilization cap used for latency. Missing fields use
  the defaults, which are fitted to the reference runs (`fixtures/parity`).
- **Node level:** `node.config` may set `rpsPerInstance`, `serviceMs` and `costPerMonth`
  (price of one instance) for that node only.
- **Not overridable:** tick length, frame interval and trace count (engine mechanics).
- **Validation:** non-finite, negative, or zero-where-positive values are blocking issues
  (`calibration.invalid` with the field name, `config.invalid` with node and field).
- **API:** `defaultCalibration()` returns the defaults so the UI can show and edit them.
  Named presets ("default cloud", "on-prem", "cross-region network") are content/UI data,
  not engine code.
- Parity fixtures always run with defaults. Same input, including overrides, gives the same
  output.

## 7. Calibration and testing

All tunable constants live in `calibration.rs`, each with a comment explaining the estimate
(requests per vCPU, network delay per edge kind, failover delay, cache hit curve, memory per
in-flight request, …).

### 7.1 Golden scenarios as language-neutral JSON

Golden scenarios live in `fixtures/golden/*.json` at the repo root, not inside a crate:

```json
{
  "id": "web-tier-surge-scaled",
  "input": { "graph": {}, "workload": {}, "faults": [], "seed": 7 },
  "expect": {
    "p95": { "<=": 100 },
    "availability": { ">=": 0.999 },
    "spofCount": { "==": 0 }
  }
}
```

The same files are consumed by Rust tests, by the `@sd/sim` TS tests through WASM, and later
by the content pipeline. They are the contract for the engine.

Initial set (about 15), asserting ranges rather than exact values, for example:

- One web server under a 3× surge is overloaded; LB + 5 web servers meets
  p95 ≤ 100 ms and availability ≥ 99.9%.
- A cache in front of the database lowers peak database connections on a read-heavy
  workload.
- UUID IDs come out of order, Snowflake IDs are unique and ordered, and database-issued IDs
  fail on a key-value store.
- A heartbeat timeout shorter than a drop causes flaps; a very long one leaves departed
  users shown online.
- Losing the primary with no replica drops availability; adding a replica promotes it.

### 7.2 Test layers

| Layer | Rust (`sim-core`) | TypeScript (`@sd/sim`) |
|---|---|---|
| Unit | `cargo test`, one module per component | wrapper behavior: init, free, typed views |
| Property | `proptest`: determinism, monotonicity (more replicas never raise p95), flow conservation (requests = served + rejected + timed out + in flight), cost equals sum of components, 0 ≤ availability ≤ 1, p50 ≤ p95 ≤ p99 | — |
| Golden | all `fixtures/golden/*.json` | all `fixtures/golden/*.json` through WASM |
| Snapshot | `insta` snapshots of full results | — |
| Cross-target | native vs WASM byte-identical results | — |
| Benchmark | `criterion`: 10 nodes, 10 s run, native | `vitest bench`: same run through WASM, including boundary |

## 8. Repository layout

```
system-design/
├─ Cargo.toml              (workspace)
├─ crates/
│  ├─ sim-core/            ← this sub-project
│  │  ├─ src/
│  │  │  ├─ lib.rs
│  │  │  ├─ types.rs           SimInput, SimResult, Graph, Fault… (serde + tsify)
│  │  │  ├─ simulate.rs        tick loop
│  │  │  ├─ validate.rs
│  │  │  ├─ grade.rs
│  │  │  ├─ rng.rs
│  │  │  ├─ calibration.rs
│  │  │  ├─ histogram.rs
│  │  │  ├─ components/        one file per component kind + registry
│  │  │  └─ behaviors/         id_generator.rs, presence.rs, fanout.rs
│  │  ├─ tests/                unit, property, golden, snapshots
│  │  └─ benches/
│  ├─ sim-wasm/            ← this sub-project
│  └─ sim-cli/             ← this sub-project
├─ packages/
│  ├─ sim/                 ← this sub-project (@sd/sim TS wrapper)
│  ├─ content/             (sub-project 2)
│  └─ ui/                  (later)
├─ apps/web/               (sub-project 3+)
├─ fixtures/golden/        ← this sub-project
├─ package.json / pnpm-workspace.yaml
└─ docs/superpowers/specs/
```

### 8.1 Tooling and build

- Rust stable, pinned with `rust-toolchain.toml`, target `wasm32-unknown-unknown`.
- `wasm-pack build --target bundler` for Next.js and `--target nodejs` for Node tests;
  `wasm-opt -O3` in release.
- `clippy -D warnings` and `rustfmt` for Rust; TypeScript strict, ESLint and Prettier for TS.
- pnpm workspaces for JS packages. A root script `pnpm build:sim` runs the wasm build and
  copies the output and generated `.d.ts` into `packages/sim`.
- One `pnpm test` at the root runs `cargo test`, the cross-target check and the TS tests.

## 9. Scope

**In scope:** `sim-core` (engine, validator, grader, 12 components, three behaviors, 14 fault
kinds), `sim-wasm`, `sim-cli`, `@sd/sim`, the golden fixtures, all test layers and
benchmarks, and a demo.

**Out of scope:** UI, canvas, animation, lesson content format, storage, AI, and AI-chosen
chaos mode.

## 10. Done when

- `cargo test`, `clippy` and the TS tests all pass.
- All golden scenarios pass natively and through WASM, with byte-identical results.
- Benchmarks meet budget: under 50 ms per run through WASM in Node including the
  boundary, and `sim-cli` validates 100 golden-sized scenarios in under 2 s on 8 cores.
- `sim-cli run fixtures/golden/web-tier-surge-*.json` prints metrics for
  "1 web server" and "LB + 5 web servers" under a 3× surge, side by side.
- `@sd/sim` can be imported from a Next.js page and run in a Web Worker (smoke test).
