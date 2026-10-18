# Sim Engine 1a (End-to-End Slice) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a working end-to-end slice of the simulation engine: Rust core with 4 components and 3 fault kinds, validator, grader, golden fixtures, native CLI, WebAssembly build and the `@sd/sim` TypeScript wrapper, all tested.

**Architecture:** `crates/sim-core` is a pure Rust library running a fixed-tick fluid queueing model with sampled request traces. `crates/sim-cli` (native, rayon) and `crates/sim-wasm` (wasm-bindgen) wrap the same core. `packages/sim` is a thin TS wrapper over the wasm build. Types are defined once in Rust and exported to TypeScript with `ts-rs`. Golden scenarios in `fixtures/golden/*.json` are the shared contract for Rust, CLI and TS tests.

**Tech Stack:** Docker dev container (Rust 1.85.1 image) for every command; Rust, serde, libm, ts-rs, proptest, insta, criterion, clap, rayon, wasm-bindgen 0.2.100, serde-wasm-bindgen, wasm-pack 0.13.1, binaryen (npm `wasm-opt`); Node 24, pnpm 10, TypeScript 5, vitest.

**Spec:** `docs/superpowers/specs/2026-10-18-sim-engine-design.md`

**Follow-up plan (not in this document):** `2026-10-18-sim-engine-1b.md` adds the remaining 8 components (`api-gateway`, `worker`, `redis`, `memcached`, `kv-store`, `queue`, `cdn`, `object-storage`), dynamic features (auto scaling, retries, circuit breaker, rate limit), behaviors (`id_generator`, `presence`, `fanout`), the other 11 fault kinds, the Web Worker helper and the browser smoke test.

### Deliberate deviations from the spec (kept small, revisit in 1b)

1. **Type export uses `ts-rs` instead of `tsify`.** Same goal (types written once in Rust, generated `.d.ts`), but `ts-rs` generates files natively during `cargo test`, independent of the wasm build, which makes the "generated types are up to date" CI check a plain `git diff`.
2. **Component behavior is role-based in 1a.** The `ComponentModel` trait carries metadata, cost and capacity plus a `Role` (`Client`, `Balancer`, `Service`, `Database`). The tick loop implements each role. The per-component `step()` hook from spec §6.2 is added in 1b when cache/queue/behaviors need it.
3. **Browser target is `wasm-pack --target web`** (plain ES module with `init()`), not `--target bundler`. It works in pages and Web Workers without bundler WASM configuration. The Next.js + Web Worker smoke test moves to plan 1b because `apps/web` does not exist yet.

## Global Constraints

- **Every build/test command runs inside the dev container via `./dev <command>`** (for example `./dev cargo test -p sim-core`). Nothing is installed on the host besides Docker.
- Rust toolchain is pinned to `1.85.1` (`rust-toolchain.toml` and the Docker base image `rust:1.85.1-bookworm` must agree). The workspace uses `resolver = "3"` and `rust-version = "1.85"` so cargo only selects dependency versions compatible with 1.85.
- `wasm-bindgen` crate is pinned to `=0.2.100`, matching `wasm-bindgen-cli 0.2.100` installed in the image.
- Performance budgets are measured inside the dev container.
- `sim-core` has no runtime dependencies other than `serde` and `libm` (`ts-rs` is optional, behind feature `ts`).
- `sim-core` starts with `#![forbid(unsafe_code)]`. No I/O, no clock, no OS randomness, no threads.
- All randomness comes from the seeded PCG32 in `rng.rs`. Transcendental math (`exp`, `ln`, `pow`, `sqrt`, `cos`, `floor`, `round`) goes through `libm`.
- No `HashMap`/`HashSet` anywhere in `sim-core`; use `Vec` sorted by id or `BTreeMap`/`BTreeSet`.
- Same `SimInput` → byte-identical `serde_json` output natively and under WASM.
- Default `durationMs` is `10_000`; tick is 10 ms; one timeline frame every 100 ms.
- World parameters are never read from constants inside components or the engine: they come from a resolved `Calibration` (defaults + `SimInput.calibration` overrides) and per-node config overrides (`rpsPerInstance`, `serviceMs`, `costPerMonth`). Only engine mechanics (`TICK_MS`, `FRAME_EVERY_TICKS`, `TRACE_TARGET`) are constants.
- Engine never emits prose: events and validation issues carry codes plus params.
- JSON field names are camelCase; enum values are kebab-case (`"web-server"`, `"db-primary-down"`), goal ops are `"<="`, `">="`, `"=="`.
- Performance budgets: under 50 ms per 10-node, 10 s run through WASM in Node including the boundary; `sim-cli check` on 100 golden-sized fixtures under 2 s on 8 cores.
- Lesson/challenge prose is out of scope; nothing copied from Syscraft or any book.
- Every commit message ends with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. A load balancer whose children are all down or that has no children: requests must count as `requestsUnreachable`, never NaN or a panic. (Test in Task 6.)
2. `baseRps = 0`, or `durationMs` shorter than one tick: all metrics finite (zeros), timeline has at least 1 frame, no division by zero. (Test in Task 6.)
3. Very large numbers (`replicas = 1000`, `baseRps = 1e7`): run finishes, metrics finite. (Test in Task 6.)
4. A fault whose `target` does not exist or has the wrong kind: ignored with event `fault.no-target`, never a panic. (Test in Task 7.)
5. Calling `SimRun` methods after `free()`: a clear JS `Error("SimRun already freed")`, not a wasm trap. (Test in Task 13.)

## File Map

| Path | Responsibility |
|---|---|
| `Dockerfile`, `compose.yaml`, `dev` | Dev container with the whole toolchain; `./dev` runs any command in it |
| `rust-toolchain.toml`, `Cargo.toml` | Pinned toolchain, Rust workspace, release profile |
| `package.json`, `pnpm-workspace.yaml` | JS workspace and root scripts |
| `crates/sim-core/src/lib.rs` | Public API re-exports |
| `crates/sim-core/src/types.rs` | All input/output types (serde + optional ts-rs) |
| `crates/sim-core/src/rng.rs` | PCG32, normal and Poisson sampling |
| `crates/sim-core/src/histogram.rs` | Log-bucket weighted histogram, percentiles |
| `crates/sim-core/src/calibration.rs` | Every tunable constant, with rationale |
| `crates/sim-core/src/components/mod.rs` | `ComponentModel` trait, `Role`, registry, config helpers |
| `crates/sim-core/src/components/{client,lb,web_server,postgres}.rs` | One component each |
| `crates/sim-core/src/validate.rs` | Graph validation |
| `crates/sim-core/src/engine.rs` | Tick loop, routing, queues, metrics accumulation |
| `crates/sim-core/src/faults.rs` | Fault scheduling and application |
| `crates/sim-core/src/traces.rs` | Sampled request traces |
| `crates/sim-core/src/simulate.rs` | `simulate()` entry point |
| `crates/sim-core/src/grade.rs` | Goals → verdict, metric lookup by key |
| `crates/sim-core/src/fixture.rs` | Golden fixture format and checker |
| `crates/sim-core/tests/*.rs` | Golden, property, snapshot tests |
| `crates/sim-core/benches/simulate.rs` | criterion benchmark |
| `crates/sim-cli/src/main.rs` | `run`, `result`, `check` commands |
| `crates/sim-wasm/src/lib.rs` | wasm-bindgen API and boundary format |
| `packages/sim/src/*.ts` | `@sd/sim` wrapper, timeline view, errors |
| `packages/sim/src/generated/*.ts` | ts-rs output (committed) |
| `packages/sim/test/*.test.ts` | Wrapper, golden-through-wasm, cross-target, budget |
| `fixtures/golden/*.json` | Engine contract scenarios |

---


### Task 0: Dev container and workspace scaffold

**Files:**
- Create: `Dockerfile`, `compose.yaml`, `dev`, `.dockerignore`, `rust-toolchain.toml`, `Cargo.toml`, `crates/sim-core/Cargo.toml`, `crates/sim-core/src/lib.rs`, `crates/sim-core/benches/simulate.rs`, `package.json`, `pnpm-workspace.yaml`
- Modify: `.gitignore`

**Interfaces:**
- Produces: `./dev <cmd>` runs `<cmd>` in the container with the repo mounted at `/work`; a compiling Rust workspace with crate `sim-core`; a pnpm workspace.

- [ ] **Step 1: Write `Dockerfile`**

```dockerfile
FROM rust:1.85.1-bookworm

# Rust targets and tools. Versions are pinned so every machine and CI builds the same bits.
RUN rustup target add wasm32-unknown-unknown \
 && rustup component add clippy rustfmt \
 && cargo install wasm-pack --version 0.13.1 --locked \
 && cargo install wasm-bindgen-cli --version 0.2.100 --locked \
 && rm -rf /usr/local/cargo/registry /usr/local/cargo/git

# Node 24 copied from the official image, plus pnpm 10.
COPY --from=node:24-bookworm-slim /usr/local/bin/node /usr/local/bin/node
COPY --from=node:24-bookworm-slim /usr/local/lib/node_modules /usr/local/lib/node_modules
RUN ln -s /usr/local/lib/node_modules/npm/bin/npm-cli.js /usr/local/bin/npm \
 && ln -s /usr/local/lib/node_modules/npm/bin/npx-cli.js /usr/local/bin/npx \
 && npm install -g pnpm@10

ENV npm_config_store_dir=/pnpm-store \
    CARGO_TERM_COLOR=always
WORKDIR /work
```

- [ ] **Step 2: Write `compose.yaml`**

Build output and dependency caches live in named volumes, not in the macOS bind mount, so builds stay fast.

```yaml
services:
  dev:
    build: .
    image: system-design-dev:1
    working_dir: /work
    volumes:
      - .:/work
      - cargo-target:/work/target
      - cargo-registry:/usr/local/cargo/registry
      - cargo-git:/usr/local/cargo/git
      - node-modules-root:/work/node_modules
      - node-modules-sim:/work/packages/sim/node_modules
      - pnpm-store:/pnpm-store

volumes:
  cargo-target:
  cargo-registry:
  cargo-git:
  node-modules-root:
  node-modules-sim:
  pnpm-store:
```

- [ ] **Step 3: Write the `./dev` helper and `.dockerignore`**

`dev`:

```sh
#!/usr/bin/env sh
# Run any command inside the dev container, e.g. ./dev cargo test -p sim-core
set -e
cd "$(dirname "$0")"
if [ -t 0 ] && [ -t 1 ]; then
  exec docker compose run --rm dev "$@"
else
  exec docker compose run --rm -T dev "$@"
fi
```

Make it executable: `chmod +x dev`.

`.dockerignore`:

```
target
node_modules
packages/*/node_modules
packages/sim/wasm
.playwright-mcp
*.png
.git
```

- [ ] **Step 4: Build the image and check every tool**

Run:

```bash
docker compose build dev
./dev sh -c 'rustc --version && cargo --version && wasm-pack --version && wasm-bindgen --version && node --version && pnpm --version && rustup target list --installed'
```

Expected: `rustc 1.85.1`, `wasm-pack 0.13.1`, `wasm-bindgen 0.2.100`, `v24.x`, `10.x`, and `wasm32-unknown-unknown` in the target list.

- [ ] **Step 5: Create `rust-toolchain.toml`**

```toml
[toolchain]
channel = "1.85.1"
components = ["clippy", "rustfmt"]
targets = ["wasm32-unknown-unknown"]
```

- [ ] **Step 6: Create the workspace `Cargo.toml`**

```toml
[workspace]
resolver = "3"
members = ["crates/sim-core"]

[workspace.package]
version = "0.1.0"
edition = "2021"
rust-version = "1.85"
license = "UNLICENSED"
publish = false

[profile.release]
opt-level = 3
lto = true
codegen-units = 1
```

- [ ] **Step 7: Create `crates/sim-core/Cargo.toml`**

```toml
[package]
name = "sim-core"
version.workspace = true
edition.workspace = true
rust-version.workspace = true
license.workspace = true
publish.workspace = true

[features]
ts = ["dep:ts-rs"]

[dependencies]
serde = { version = "1", features = ["derive"] }
libm = "0.2"
ts-rs = { version = "10", optional = true }

[dev-dependencies]
serde_json = "1"
proptest = "1"
insta = { version = "1", features = ["json"] }
criterion = "0.5"

[[bench]]
name = "simulate"
harness = false
```

- [ ] **Step 8: Write `crates/sim-core/src/lib.rs` with a smoke test, and a stub bench**

`crates/sim-core/src/lib.rs`:

```rust
#![forbid(unsafe_code)]

/// Crate version, reported by the CLI and the wasm wrapper alongside results.
pub fn engine_version() -> &'static str {
    env!("CARGO_PKG_VERSION")
}

#[cfg(test)]
mod tests {
    #[test]
    fn reports_version() {
        assert_eq!(super::engine_version(), "0.1.0");
    }
}
```

`crates/sim-core/benches/simulate.rs` (Task 14 replaces it):

```rust
fn main() {}
```

- [ ] **Step 9: Create the JS workspace files and update `.gitignore`**

`package.json`:

```json
{
  "name": "system-design",
  "private": true,
  "scripts": {
    "build:sim": "pnpm --filter @sd/sim build:wasm",
    "test": "cargo test --workspace && cargo clippy --workspace --all-targets -- -D warnings && pnpm -r test"
  }
}
```

`pnpm-workspace.yaml`:

```yaml
packages:
  - "packages/*"
  - "apps/*"
```

Append to `.gitignore`:

```
target/
packages/sim/wasm/
```

- [ ] **Step 10: Run the tests in the container**

Run: `./dev cargo test -p sim-core`
Expected: `test tests::reports_version ... ok`, 1 passed. `Cargo.lock` is created at the repo root.

- [ ] **Step 11: Commit**

```bash
git add Dockerfile compose.yaml dev .dockerignore rust-toolchain.toml Cargo.toml Cargo.lock crates package.json pnpm-workspace.yaml .gitignore
git commit -m "chore: add dev container and scaffold Rust/pnpm workspaces

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 1: Types and TypeScript export

**Files:**
- Create: `crates/sim-core/src/types.rs`, `packages/sim/src/generated/` (generated files)
- Modify: `crates/sim-core/src/lib.rs`

**Interfaces:**
- Produces (all `pub`, re-exported from `sim_core`): `EdgeKind`, `ConfigValue`, `Config`, `Node`, `Edge`, `Graph`, `Profile`, `Surge`, `Workload`, `FaultKind`, `Fault`, `CalibrationOverrides`, `SimInput` (with `calibration: Option<CalibrationOverrides>`), `Metrics`, `Timeline`, `TIMELINE_FIELDS`, `RequestClass`, `TraceAction`, `TraceOutcome`, `TraceStep`, `Trace`, `SimEvent`, `SimResult`, `ValidationIssue`, `GraphLimits`, `GoalOp`, `Goal`, `GoalResult`, `Verdict`. Field names exactly as in the code below.

- [ ] **Step 1: Write the failing test**

Append to `crates/sim-core/src/lib.rs`:

```rust
pub mod types;
pub use types::*;

#[cfg(test)]
mod type_tests {
    use super::*;

    #[test]
    fn minimal_input_gets_defaults() {
        let json = r#"{
            "graph": {
                "nodes": [
                    {"id": "users", "kind": "client"},
                    {"id": "web", "kind": "web-server", "config": {"cpu": 2}}
                ],
                "edges": [{"id": "e1", "from": "users", "to": "web", "kind": "http"}]
            },
            "workload": {"baseRps": 100}
        }"#;
        let input: SimInput = serde_json::from_str(json).unwrap();
        assert_eq!(input.duration_ms, 10_000);
        assert_eq!(input.seed, 0);
        assert!(input.faults.is_empty());
        assert_eq!(input.workload.profile, Profile::Mixed);
        assert_eq!(input.workload.write_ratio, 0.2);
        assert_eq!(input.workload.client_timeout_ms, 1000.0);
        assert_eq!(input.graph.nodes[0].replicas, 1);
        assert_eq!(input.graph.nodes[1].config.get("cpu"), Some(&ConfigValue::Num(2.0)));
        assert_eq!(input.graph.edges[0].kind, EdgeKind::Http);
        assert_eq!(input.calibration, None);
    }

    #[test]
    fn calibration_overrides_are_optional_per_field() {
        let json = r#"{"graph":{"nodes":[],"edges":[]},"workload":{"baseRps":1},
                       "calibration":{"webRpsPerVcpu":3000,"edgeDelayDbMs":5}}"#;
        let input: SimInput = serde_json::from_str(json).unwrap();
        let c = input.calibration.unwrap();
        assert_eq!(c.web_rps_per_vcpu, Some(3000.0));
        assert_eq!(c.edge_delay_db_ms, Some(5.0));
        assert_eq!(c.web_cost_per_vcpu, None);
    }

    #[test]
    fn enums_use_kebab_case_and_goal_ops_use_symbols() {
        let f: Fault = serde_json::from_str(r#"{"kind":"traffic-surge-3x","atMs":2000}"#).unwrap();
        assert_eq!(f.kind, FaultKind::TrafficSurge3x);
        assert_eq!(f.target, None);
        assert_eq!(
            serde_json::to_string(&FaultKind::DbPrimaryDown).unwrap(),
            r#""db-primary-down""#
        );
        let g: Goal = serde_json::from_str(r#"{"id":"p95","metric":"p95","op":"<=","value":100}"#).unwrap();
        assert_eq!(g.op, GoalOp::Le);
    }

    #[test]
    fn config_value_accessors() {
        assert_eq!(ConfigValue::Num(3.0).as_f64(), Some(3.0));
        assert_eq!(ConfigValue::Str("x".into()).as_f64(), None);
        assert_eq!(ConfigValue::Str("x".into()).as_str(), Some("x"));
        assert_eq!(ConfigValue::Bool(true).as_bool(), Some(true));
    }
}
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `./dev cargo test -p sim-core type_tests`
Expected: compile error `file not found for module types`.

- [ ] **Step 3: Write `crates/sim-core/src/types.rs`**

```rust
//! Every type that crosses the engine boundary. JSON uses camelCase fields and kebab-case enums.
//! With feature `ts`, `cargo test export_bindings` writes matching TypeScript files.

use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

macro_rules! exported {
    ($item:item) => {
        #[cfg_attr(feature = "ts", derive(ts_rs::TS), ts(export))]
        $item
    };
}

// ---------- graph ----------

exported! {
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum EdgeKind { Http, Db, Cache, Msg }
}

exported! {
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(untagged)]
pub enum ConfigValue { Bool(bool), Num(f64), Str(String) }
}

impl ConfigValue {
    pub fn as_f64(&self) -> Option<f64> {
        match self { ConfigValue::Num(v) => Some(*v), _ => None }
    }
    pub fn as_str(&self) -> Option<&str> {
        match self { ConfigValue::Str(v) => Some(v), _ => None }
    }
    pub fn as_bool(&self) -> Option<bool> {
        match self { ConfigValue::Bool(v) => Some(*v), _ => None }
    }
}

pub type Config = BTreeMap<String, ConfigValue>;

fn default_replicas() -> u32 { 1 }

exported! {
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Node {
    pub id: String,
    pub kind: String,
    #[serde(default)]
    pub label: String,
    #[serde(default = "default_replicas")]
    pub replicas: u32,
    #[serde(default)]
    pub config: Config,
}
}

exported! {
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Edge { pub id: String, pub from: String, pub to: String, pub kind: EdgeKind }
}

exported! {
#[derive(Debug, Clone, PartialEq, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Graph { pub nodes: Vec<Node>, pub edges: Vec<Edge> }
}

// ---------- workload and faults ----------

exported! {
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum Profile { ReadHeavy, WriteHeavy, Mixed, Chat, Feed, Jobs }
}

exported! {
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Surge { pub factor: f64, pub at_ms: u32, pub duration_ms: u32 }
}

fn default_profile() -> Profile { Profile::Mixed }
fn default_write_ratio() -> f64 { 0.2 }
fn default_clients() -> u32 { 1000 }
fn default_timeout() -> f64 { 1000.0 }

exported! {
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Workload {
    #[serde(default = "default_profile")]
    pub profile: Profile,
    pub base_rps: f64,
    #[serde(default = "default_write_ratio")]
    pub write_ratio: f64,
    #[serde(default = "default_clients")]
    pub clients: u32,
    #[serde(default = "default_timeout")]
    pub client_timeout_ms: f64,
    #[serde(default)]
    pub surge: Option<Surge>,
    #[serde(default)]
    pub params: BTreeMap<String, f64>,
}
}

exported! {
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum FaultKind {
    #[serde(rename = "traffic-surge-3x")]
    TrafficSurge3x,
    InstanceDown,
    InstanceSlow,
    LbNodeDown,
    CacheDown,
    DbOverloaded,
    DbPrimaryDown,
    DbReplicaDown,
    DbStalled,
    BrokerDown,
    ObjectStorageDown,
    KvNodeDown,
    ThirdPartyDown,
    ThirdPartySlow,
}
}

exported! {
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Fault {
    pub kind: FaultKind,
    #[serde(default)]
    pub target: Option<String>,
    pub at_ms: u32,
}
}

// Each field overrides the same-named field of `calibration::Calibration` for one run.
// Missing fields keep the defaults. Validation rejects unusable values (see Task 4).
exported! {
#[derive(Debug, Clone, PartialEq, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CalibrationOverrides {
    #[serde(default)] #[cfg_attr(feature = "ts", ts(optional))] pub web_rps_per_vcpu: Option<f64>,
    #[serde(default)] #[cfg_attr(feature = "ts", ts(optional))] pub web_service_ms: Option<f64>,
    #[serde(default)] #[cfg_attr(feature = "ts", ts(optional))] pub web_queue_per_gb: Option<f64>,
    #[serde(default)] #[cfg_attr(feature = "ts", ts(optional))] pub web_cost_per_vcpu: Option<f64>,
    #[serde(default)] #[cfg_attr(feature = "ts", ts(optional))] pub lb_rps_per_replica: Option<f64>,
    #[serde(default)] #[cfg_attr(feature = "ts", ts(optional))] pub lb_service_ms: Option<f64>,
    #[serde(default)] #[cfg_attr(feature = "ts", ts(optional))] pub lb_queue_seconds: Option<f64>,
    #[serde(default)] #[cfg_attr(feature = "ts", ts(optional))] pub lb_cost_per_replica: Option<f64>,
    #[serde(default)] #[cfg_attr(feature = "ts", ts(optional))] pub pg_qps_per_instance: Option<f64>,
    #[serde(default)] #[cfg_attr(feature = "ts", ts(optional))] pub pg_service_ms: Option<f64>,
    #[serde(default)] #[cfg_attr(feature = "ts", ts(optional))] pub pg_queue_seconds: Option<f64>,
    #[serde(default)] #[cfg_attr(feature = "ts", ts(optional))] pub pg_cost_per_instance: Option<f64>,
    #[serde(default)] #[cfg_attr(feature = "ts", ts(optional))] pub pg_failover_ms: Option<f64>,
    #[serde(default)] #[cfg_attr(feature = "ts", ts(optional))] pub edge_delay_http_ms: Option<f64>,
    #[serde(default)] #[cfg_attr(feature = "ts", ts(optional))] pub edge_delay_db_ms: Option<f64>,
    #[serde(default)] #[cfg_attr(feature = "ts", ts(optional))] pub edge_delay_cache_ms: Option<f64>,
    #[serde(default)] #[cfg_attr(feature = "ts", ts(optional))] pub edge_delay_msg_ms: Option<f64>,
    #[serde(default)] #[cfg_attr(feature = "ts", ts(optional))] pub max_utilization_for_latency: Option<f64>,
}
}

fn default_duration() -> u32 { 10_000 }

exported! {
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SimInput {
    pub graph: Graph,
    pub workload: Workload,
    #[serde(default)]
    pub faults: Vec<Fault>,
    #[serde(default = "default_duration")]
    pub duration_ms: u32,
    #[serde(default)]
    pub seed: u32,
    #[serde(default)]
    #[cfg_attr(feature = "ts", ts(optional))]
    pub calibration: Option<CalibrationOverrides>,
}
}

// ---------- results ----------

exported! {
#[derive(Debug, Clone, PartialEq, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Metrics {
    pub p50: f64,
    pub p95: f64,
    pub p99: f64,
    pub availability: f64,
    pub throughput_rps: f64,
    pub cost_per_month: f64,
    pub spof_count: u32,
    /// Client edges that point at something other than a public entry point (lb, gateway, cdn).
    pub exposed_backends: u32,
    pub peak_busy: f64,
    pub peak_db_connections: f64,
    pub cache_ops: f64,
    pub requests_total: f64,
    pub requests_ok: f64,
    pub requests_rejected: f64,
    pub requests_timed_out: f64,
    pub requests_unreachable: f64,
    pub duplicate_ids: Option<f64>,
    pub out_of_order_ids: Option<f64>,
    pub lost_updates: Option<f64>,
    pub write_conflicts: Option<f64>,
    pub duplicate_writes: Option<f64>,
    pub stale_reads: Option<f64>,
    pub peak_queue_depth: Option<f64>,
    pub lost_messages: Option<f64>,
    pub status_flaps: Option<f64>,
    pub stale_online: Option<f64>,
    pub inbox_writes_per_sec: Option<f64>,
}
}

/// Field order inside each timeline cell.
pub const TIMELINE_FIELDS: [&str; 5] = ["inFlight", "queued", "busy", "rejected", "up"];

exported! {
#[derive(Debug, Clone, PartialEq, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Timeline {
    pub frame_ms: u32,
    pub node_ids: Vec<String>,
    pub fields: Vec<String>,
    /// Flat: data[(frame * node_ids.len() + node) * fields.len() + field]
    pub data: Vec<f32>,
}
}

exported! {
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum RequestClass { Read, Write }
}

exported! {
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum TraceAction { Send, Serve, Reject, Down }
}

exported! {
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum TraceOutcome { Delivered, Rejected, Timeout, Unreachable }
}

exported! {
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TraceStep {
    pub t_ms: f64,
    pub node_id: String,
    pub action: TraceAction,
    pub wait_ms: f64,
    pub service_ms: f64,
}
}

exported! {
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Trace {
    pub id: u32,
    pub class: RequestClass,
    pub start_ms: f64,
    pub latency_ms: f64,
    pub outcome: TraceOutcome,
    pub steps: Vec<TraceStep>,
}
}

exported! {
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SimEvent {
    pub at_ms: u32,
    pub node: Option<String>,
    pub code: String,
    #[serde(default)]
    pub params: BTreeMap<String, f64>,
}
}

exported! {
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SimResult {
    pub engine_version: String,
    pub metrics: Metrics,
    pub timeline: Timeline,
    pub traces: Vec<Trace>,
    pub events: Vec<SimEvent>,
}
}

// ---------- validation and grading ----------

exported! {
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ValidationIssue {
    pub code: String,
    pub node_id: Option<String>,
    pub edge_id: Option<String>,
    /// Config or calibration field the issue is about, when relevant.
    #[serde(default)]
    pub field: Option<String>,
    pub blocking: bool,
}
}

exported! {
#[derive(Debug, Clone, PartialEq, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GraphLimits {
    #[serde(default)]
    pub max_nodes: Option<u32>,
    #[serde(default)]
    pub max_instances: Option<u32>,
    #[serde(default)]
    pub allowed_kinds: Option<Vec<String>>,
}
}

exported! {
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum GoalOp {
    #[serde(rename = "<=")] Le,
    #[serde(rename = ">=")] Ge,
    #[serde(rename = "==")] Eq,
}
}

exported! {
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Goal { pub id: String, pub metric: String, pub op: GoalOp, pub value: f64 }
}

exported! {
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GoalResult { pub id: String, pub passed: bool, pub measured: Option<f64> }
}

exported! {
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Verdict { pub passed: bool, pub score: u32, pub stars: u8, pub goals: Vec<GoalResult> }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `./dev cargo test -p sim-core type_tests`
Expected: 4 passed.

- [ ] **Step 5: Generate the TypeScript types**

Run: `./dev sh -c 'TS_RS_EXPORT_DIR=/work/packages/sim/src/generated cargo test -p sim-core --features ts export_bindings'`
Expected: tests named `export_bindings_*` pass and `packages/sim/src/generated/` contains `SimInput.ts`, `SimResult.ts`, `Metrics.ts`, `FaultKind.ts`, `Goal.ts`, `Verdict.ts` (one file per type). Open `FaultKind.ts` and confirm it contains `"traffic-surge-3x"` and `"db-primary-down"`.

- [ ] **Step 6: Commit**

```bash
git add crates/sim-core/src packages/sim/src/generated
git commit -m "feat(sim-core): add engine types with TypeScript export

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Seeded random numbers

**Files:**
- Create: `crates/sim-core/src/rng.rs`
- Modify: `crates/sim-core/src/lib.rs` (add `pub mod rng;`)

**Interfaces:**
- Produces: `pub struct Pcg32` with `Pcg32::new(seed: u32) -> Pcg32`, `next_u32(&mut self) -> u32`, `next_f64(&mut self) -> f64` (in `[0, 1)`), `normal(&mut self) -> f64` (mean 0, sd 1), `poisson(&mut self, lambda: f64) -> f64`.

- [ ] **Step 1: Write the failing tests**

Create `crates/sim-core/src/rng.rs` containing only the tests for now:

```rust
#[cfg(test)]
mod tests {
    use super::Pcg32;

    #[test]
    fn same_seed_same_sequence() {
        let mut a = Pcg32::new(42);
        let mut b = Pcg32::new(42);
        for _ in 0..1000 {
            assert_eq!(a.next_u32(), b.next_u32());
        }
    }

    #[test]
    fn different_seeds_differ() {
        let mut a = Pcg32::new(1);
        let mut b = Pcg32::new(2);
        let same = (0..100).filter(|_| a.next_u32() == b.next_u32()).count();
        assert!(same < 5);
    }

    #[test]
    fn unit_floats_are_in_range() {
        let mut r = Pcg32::new(7);
        for _ in 0..10_000 {
            let x = r.next_f64();
            assert!((0.0..1.0).contains(&x));
        }
    }

    #[test]
    fn poisson_mean_matches_lambda() {
        for &(lambda, lo, hi) in &[(5.0, 4.85, 5.15), (240.0, 238.0, 242.0)] {
            let mut r = Pcg32::new(3);
            let n = 20_000;
            let sum: f64 = (0..n).map(|_| r.poisson(lambda)).sum();
            let mean = sum / n as f64;
            assert!(mean > lo && mean < hi, "lambda {lambda}: mean {mean}");
        }
    }

    #[test]
    fn poisson_handles_zero_and_negative() {
        let mut r = Pcg32::new(3);
        assert_eq!(r.poisson(0.0), 0.0);
        assert_eq!(r.poisson(-1.0), 0.0);
    }
}
```

Add `pub mod rng;` to `lib.rs`.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `./dev cargo test -p sim-core rng::`
Expected: compile error `cannot find type Pcg32`.

- [ ] **Step 3: Implement `Pcg32` above the tests in `rng.rs`**

```rust
//! PCG32 (O'Neill, XSH-RR variant). The only source of randomness in the engine.
//! All math goes through libm so native and wasm builds produce identical bits.

pub struct Pcg32 {
    state: u64,
    inc: u64,
}

const MULTIPLIER: u64 = 6_364_136_223_846_793_005;
const STREAM: u64 = 0xda3e_39cb_94b9_5bdb;

impl Pcg32 {
    pub fn new(seed: u32) -> Self {
        let mut rng = Pcg32 { state: 0, inc: (STREAM << 1) | 1 };
        rng.next_u32();
        rng.state = rng.state.wrapping_add(u64::from(seed) ^ 0x853c_49e6_748f_ea9b);
        rng.next_u32();
        rng
    }

    pub fn next_u32(&mut self) -> u32 {
        let old = self.state;
        self.state = old.wrapping_mul(MULTIPLIER).wrapping_add(self.inc);
        let xorshifted = (((old >> 18) ^ old) >> 27) as u32;
        let rot = (old >> 59) as u32;
        xorshifted.rotate_right(rot)
    }

    /// Uniform in [0, 1).
    pub fn next_f64(&mut self) -> f64 {
        f64::from(self.next_u32()) / 4_294_967_296.0
    }

    /// Standard normal via Box-Muller.
    pub fn normal(&mut self) -> f64 {
        let u1 = 1.0 - self.next_f64(); // (0, 1], safe for log
        let u2 = self.next_f64();
        libm::sqrt(-2.0 * libm::log(u1)) * libm::cos(2.0 * core::f64::consts::PI * u2)
    }

    /// Poisson sample. Exact (Knuth) for small lambda, normal approximation above 30.
    pub fn poisson(&mut self, lambda: f64) -> f64 {
        if lambda <= 0.0 || !lambda.is_finite() {
            return 0.0;
        }
        if lambda < 30.0 {
            let limit = libm::exp(-lambda);
            let mut k = 0.0;
            let mut p = 1.0;
            loop {
                p *= self.next_f64();
                if p <= limit {
                    return k;
                }
                k += 1.0;
            }
        }
        let x = lambda + libm::sqrt(lambda) * self.normal();
        libm::round(x).max(0.0)
    }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `./dev cargo test -p sim-core rng::`
Expected: 5 passed.

- [ ] **Step 5: Commit**

```bash
git add crates/sim-core/src
git commit -m "feat(sim-core): add seeded PCG32 with normal and Poisson sampling

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Latency histogram

**Files:**
- Create: `crates/sim-core/src/histogram.rs`
- Modify: `crates/sim-core/src/lib.rs` (add `pub mod histogram;`)

**Interfaces:**
- Produces: `pub struct Histogram` with `Histogram::new() -> Histogram`, `record(&mut self, value_ms: f64, weight: f64)`, `total(&self) -> f64`, `percentile(&self, p: f64) -> f64` (`p` in `[0, 1]`, returns 0 when empty).

- [ ] **Step 1: Write the failing tests**

Create `crates/sim-core/src/histogram.rs` with:

```rust
#[cfg(test)]
mod tests {
    use super::Histogram;

    fn close(actual: f64, expected: f64) -> bool {
        (actual - expected).abs() <= expected * 0.051
    }

    #[test]
    fn empty_histogram_returns_zero() {
        let h = Histogram::new();
        assert_eq!(h.percentile(0.95), 0.0);
        assert_eq!(h.total(), 0.0);
    }

    #[test]
    fn uniform_values_give_expected_percentiles() {
        let mut h = Histogram::new();
        for v in 1..=100 {
            h.record(f64::from(v), 1.0);
        }
        assert!(close(h.percentile(0.50), 50.0), "{}", h.percentile(0.50));
        assert!(close(h.percentile(0.95), 95.0), "{}", h.percentile(0.95));
        assert!(close(h.percentile(0.99), 99.0), "{}", h.percentile(0.99));
    }

    #[test]
    fn weights_are_respected() {
        let mut h = Histogram::new();
        h.record(10.0, 99.0);
        h.record(1000.0, 1.0);
        assert!(close(h.percentile(0.95), 10.0));
        assert!(close(h.percentile(1.0), 1000.0));
    }

    #[test]
    fn ignores_bad_samples() {
        let mut h = Histogram::new();
        h.record(f64::NAN, 1.0);
        h.record(5.0, 0.0);
        h.record(5.0, -1.0);
        h.record(f64::INFINITY, 1.0);
        assert_eq!(h.total(), 0.0);
    }

    #[test]
    fn huge_and_tiny_values_are_clamped_into_range() {
        let mut h = Histogram::new();
        h.record(0.0, 1.0);
        h.record(1e12, 1.0);
        assert!(h.percentile(0.0) > 0.0);
        assert!(h.percentile(1.0).is_finite());
    }
}
```

Add `pub mod histogram;` to `lib.rs`.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `./dev cargo test -p sim-core histogram::`
Expected: compile error `cannot find type Histogram`.

- [ ] **Step 3: Implement the histogram above the tests**

```rust
//! Weighted latency histogram with fixed log-scale buckets (5% wide), so percentiles are
//! deterministic and cheap. Bucket i >= 1 covers (MIN * R^(i-1), MIN * R^i].

const MIN_MS: f64 = 0.01;
const RATIO: f64 = 1.05;
const BUCKETS: usize = 400; // upper bound ~ 0.01 * 1.05^399 ≈ 2.9e6 ms

pub struct Histogram {
    counts: Vec<f64>,
    total: f64,
}

impl Default for Histogram {
    fn default() -> Self {
        Self::new()
    }
}

impl Histogram {
    pub fn new() -> Self {
        Histogram { counts: vec![0.0; BUCKETS], total: 0.0 }
    }

    fn bucket(value_ms: f64) -> usize {
        if value_ms <= MIN_MS {
            return 0;
        }
        let i = libm::ceil(libm::log(value_ms / MIN_MS) / libm::log(RATIO));
        (i as usize).min(BUCKETS - 1)
    }

    fn upper(i: usize) -> f64 {
        MIN_MS * libm::pow(RATIO, i as f64)
    }

    pub fn record(&mut self, value_ms: f64, weight: f64) {
        if !value_ms.is_finite() || !weight.is_finite() || weight <= 0.0 {
            return;
        }
        self.counts[Self::bucket(value_ms.max(0.0))] += weight;
        self.total += weight;
    }

    pub fn total(&self) -> f64 {
        self.total
    }

    pub fn percentile(&self, p: f64) -> f64 {
        if self.total <= 0.0 {
            return 0.0;
        }
        let target = p.clamp(0.0, 1.0) * self.total;
        let mut cumulative = 0.0;
        for (i, c) in self.counts.iter().enumerate() {
            cumulative += c;
            if *c > 0.0 && cumulative >= target {
                return Self::upper(i);
            }
        }
        Self::upper(BUCKETS - 1)
    }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `./dev cargo test -p sim-core histogram::`
Expected: 5 passed.

- [ ] **Step 5: Commit**

```bash
git add crates/sim-core/src
git commit -m "feat(sim-core): add log-bucket latency histogram

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Calibration (overridable world parameters) and the first four components

**Files:**
- Create: `crates/sim-core/src/calibration.rs`, `crates/sim-core/src/components/mod.rs`, `crates/sim-core/src/components/client.rs`, `crates/sim-core/src/components/lb.rs`, `crates/sim-core/src/components/web_server.rs`, `crates/sim-core/src/components/postgres.rs`
- Modify: `crates/sim-core/src/lib.rs`

**Interfaces:**
- Consumes: `Node`, `EdgeKind`, `ConfigValue`, `CalibrationOverrides` (Task 1).
- Produces:
  - Engine mechanics constants: `TICK_MS`, `FRAME_EVERY_TICKS`, `TRACE_TARGET`.
  - `pub struct Calibration` (fields listed in Step 3, same names as `CalibrationOverrides` without `Option`), `impl Default`, `Calibration::resolve(Option<&CalibrationOverrides>) -> Calibration`, `Calibration::edge_delay_ms(&self, EdgeKind) -> f64`, `pub fn invalid_overrides(&CalibrationOverrides) -> Vec<&'static str>` (camelCase field names).
  - `pub enum Role { Client, Balancer, Service, Database }`, `pub struct Capacity { rps, service_ms, max_queue }` (per instance), `FieldKind`, `ConfigField`, `ComponentMeta`.
  - `pub trait ComponentModel: Sync` with `kind()`, `meta()`, `instances(&Node) -> u32`, `capacity_per_instance(&Node, &Calibration) -> Capacity`, `cost_per_month(&Node, &Calibration) -> f64`.
  - `pub fn get(kind) -> Option<&'static dyn ComponentModel>`, `pub fn list_components() -> Vec<ComponentMeta>`, `pub fn num(&Node, key, default) -> f64`, `pub fn num_or_zero(&Node, key, default) -> f64`.
  - Per-node overrides: `pub const NODE_OVERRIDE_KEYS: [&str; 3] = ["rpsPerInstance", "serviceMs", "costPerMonth"]`, `pub fn effective_capacity(&dyn ComponentModel, &Node, &Calibration) -> Capacity`, `pub fn effective_cost(&dyn ComponentModel, &Node, &Calibration) -> f64` (`costPerMonth` is the price of **one** instance).

- [ ] **Step 1: Write the failing tests**

Create `crates/sim-core/src/components/mod.rs` with only:

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use crate::calibration::Calibration;
    use crate::types::{ConfigValue, EdgeKind, Node};

    fn node(kind: &str, replicas: u32, config: &[(&str, f64)]) -> Node {
        Node {
            id: "n".into(),
            kind: kind.into(),
            label: String::new(),
            replicas,
            config: config.iter().map(|(k, v)| (k.to_string(), ConfigValue::Num(*v))).collect(),
        }
    }

    fn cal() -> Calibration {
        Calibration::default()
    }

    #[test]
    fn registry_lists_the_four_v1a_kinds_in_order() {
        let kinds: Vec<String> = list_components().into_iter().map(|m| m.kind).collect();
        assert_eq!(kinds, vec!["client", "lb", "postgres", "web-server"]);
        assert!(get("nope").is_none());
    }

    #[test]
    fn web_server_cost_and_capacity_scale_with_cpu_and_memory() {
        let web = get("web-server").unwrap();
        let n = node("web-server", 3, &[("cpu", 2.0), ("memoryGb", 4.0)]);
        assert_eq!(web.instances(&n), 3);
        assert_eq!(web.cost_per_month(&n, &cal()), 135.0);
        let cap = web.capacity_per_instance(&n, &cal());
        assert_eq!(cap.rps, 18_000.0);
        assert_eq!(cap.max_queue, 8_000.0);
        assert_eq!(web.meta().accepts, vec![EdgeKind::Http]);
    }

    #[test]
    fn web_server_defaults_to_one_cpu_two_gb() {
        let web = get("web-server").unwrap();
        let n = node("web-server", 1, &[]);
        assert_eq!(web.capacity_per_instance(&n, &cal()).rps, 9_000.0);
        assert_eq!(web.cost_per_month(&n, &cal()), 22.5);
    }

    #[test]
    fn run_level_calibration_changes_capacity_and_cost() {
        let web = get("web-server").unwrap();
        let n = node("web-server", 2, &[]);
        let slow = Calibration { web_rps_per_vcpu: 3_000.0, web_cost_per_vcpu: 40.0, ..Calibration::default() };
        assert_eq!(web.capacity_per_instance(&n, &slow).rps, 3_000.0);
        assert_eq!(web.cost_per_month(&n, &slow), 80.0);
    }

    #[test]
    fn node_level_overrides_win_over_calibration() {
        let web = get("web-server").unwrap();
        let n = node("web-server", 3, &[("rpsPerInstance", 1_234.0), ("serviceMs", 7.0), ("costPerMonth", 10.0)]);
        let cap = effective_capacity(web, &n, &cal());
        assert_eq!((cap.rps, cap.service_ms), (1_234.0, 7.0));
        assert_eq!(effective_cost(web, &n, &cal()), 30.0, "price of one instance x 3");
        let plain = node("web-server", 3, &[]);
        assert_eq!(effective_cost(web, &plain, &cal()), 67.5);
    }

    #[test]
    fn postgres_instances_include_read_replicas() {
        let pg = get("postgres").unwrap();
        let n = node("postgres", 1, &[("readReplicas", 2.0)]);
        assert_eq!(pg.instances(&n), 3);
        assert_eq!(pg.cost_per_month(&n, &cal()), 540.0);
        assert_eq!(pg.meta().role, Role::Database);
        assert_eq!(pg.meta().accepts, vec![EdgeKind::Db]);
    }

    #[test]
    fn lb_is_an_entry_point_and_client_accepts_nothing() {
        let lb = get("lb").unwrap();
        assert!(lb.meta().is_entry);
        assert_eq!(lb.cost_per_month(&node("lb", 2, &[]), &cal()), 50.0);
        let client = get("client").unwrap();
        assert!(client.meta().accepts.is_empty());
        assert_eq!(client.meta().role, Role::Client);
        assert_eq!(client.cost_per_month(&node("client", 1, &[]), &cal()), 0.0);
    }

    #[test]
    fn num_falls_back_to_default_for_missing_or_non_numeric() {
        let mut n = node("web-server", 1, &[]);
        assert_eq!(num(&n, "cpu", 1.0), 1.0);
        n.config.insert("cpu".into(), ConfigValue::Str("two".into()));
        assert_eq!(num(&n, "cpu", 1.0), 1.0);
        n.config.insert("cpu".into(), ConfigValue::Num(-3.0));
        assert_eq!(num(&n, "cpu", 1.0), 1.0, "non-positive values fall back too");
    }
}
```

Create `crates/sim-core/src/calibration.rs` with only:

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::{CalibrationOverrides, EdgeKind};

    #[test]
    fn defaults_are_the_parity_fitted_values() {
        let c = Calibration::default();
        assert_eq!(c.web_rps_per_vcpu, 9_000.0);
        assert_eq!(c.web_cost_per_vcpu, 22.5);
        assert_eq!(c.edge_delay_ms(EdgeKind::Db), 0.8);
    }

    #[test]
    fn resolve_applies_only_the_given_fields() {
        let o = CalibrationOverrides { web_rps_per_vcpu: Some(3_000.0), edge_delay_http_ms: Some(40.0), ..Default::default() };
        let c = Calibration::resolve(Some(&o));
        assert_eq!(c.web_rps_per_vcpu, 3_000.0);
        assert_eq!(c.edge_delay_ms(EdgeKind::Http), 40.0);
        assert_eq!(c.web_cost_per_vcpu, 22.5);
        assert_eq!(Calibration::resolve(None), Calibration::default());
    }

    #[test]
    fn invalid_overrides_are_named() {
        let o = CalibrationOverrides {
            web_rps_per_vcpu: Some(0.0),
            pg_cost_per_instance: Some(-1.0),
            lb_service_ms: Some(f64::NAN),
            max_utilization_for_latency: Some(1.0),
            edge_delay_db_ms: Some(0.0), // zero delay is allowed
            ..Default::default()
        };
        assert_eq!(
            invalid_overrides(&o),
            vec!["webRpsPerVcpu", "lbServiceMs", "pgCostPerInstance", "maxUtilizationForLatency"]
        );
        assert!(invalid_overrides(&CalibrationOverrides::default()).is_empty());
    }
}
```

Add to `lib.rs`: `pub mod calibration;`, `pub mod components;`, `pub use calibration::Calibration;`, `pub use components::list_components;`.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `./dev cargo test -p sim-core components:: calibration::`
Expected: compile errors (`Calibration`, `list_components`, `get`, `Role`, `num`, `effective_capacity` not found).

- [ ] **Step 3: Implement `calibration.rs` above its tests**

```rust
//! World parameters of the simulation. Defaults are teaching-scale estimates; values marked
//! "Parity" were fitted to reference runs captured during development (fixtures/parity).
//! Every run may override any field through `SimInput.calibration`, and nodes may override
//! capacity and price through their config. Engine mechanics below are fixed.

use crate::types::{CalibrationOverrides, EdgeKind};
use serde::{Deserialize, Serialize};

/// Virtual time step. 1,000 ticks simulate 10 s.
pub const TICK_MS: f64 = 10.0;
/// One timeline frame every 10 ticks (100 ms).
pub const FRAME_EVERY_TICKS: u32 = 10;
/// Target number of sampled request traces per run.
pub const TRACE_TARGET: u32 = 300;

#[cfg_attr(feature = "ts", derive(ts_rs::TS), ts(export))]
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Calibration {
    pub web_rps_per_vcpu: f64,
    pub web_service_ms: f64,
    pub web_queue_per_gb: f64,
    pub web_cost_per_vcpu: f64,
    pub lb_rps_per_replica: f64,
    pub lb_service_ms: f64,
    pub lb_queue_seconds: f64,
    pub lb_cost_per_replica: f64,
    pub pg_qps_per_instance: f64,
    pub pg_service_ms: f64,
    pub pg_queue_seconds: f64,
    pub pg_cost_per_instance: f64,
    pub pg_failover_ms: f64,
    pub edge_delay_http_ms: f64,
    pub edge_delay_db_ms: f64,
    pub edge_delay_cache_ms: f64,
    pub edge_delay_msg_ms: f64,
    pub max_utilization_for_latency: f64,
}

impl Default for Calibration {
    fn default() -> Self {
        Calibration {
            // Parity: run 807734e1 showed 53.33% CPU at 4,800 rps per 1-vCPU instance.
            web_rps_per_vcpu: 9_000.0,
            web_service_ms: 2.0,
            // Queued requests one GB of memory holds before the process rejects work.
            web_queue_per_gb: 2_000.0,
            // Parity: 5 x 1-vCPU web servers + 2 LB replicas cost $162.5/month.
            web_cost_per_vcpu: 22.5,
            lb_rps_per_replica: 60_000.0,
            lb_service_ms: 0.2,
            lb_queue_seconds: 0.05,
            lb_cost_per_replica: 25.0,
            pg_qps_per_instance: 5_000.0,
            pg_service_ms: 3.0,
            pg_queue_seconds: 0.5,
            pg_cost_per_instance: 180.0,
            // Time from losing the primary to a replica accepting writes.
            pg_failover_ms: 600.0,
            // Same-region, same-AZ network delay per hop.
            edge_delay_http_ms: 0.5,
            edge_delay_db_ms: 0.8,
            edge_delay_cache_ms: 0.3,
            edge_delay_msg_ms: 1.0,
            // Latency uses service / (1 - utilization); capped so latency stays finite and the
            // queue itself carries the overload.
            max_utilization_for_latency: 0.95,
        }
    }
}

macro_rules! apply_overrides {
    ($cal:ident, $o:ident, $($field:ident),* $(,)?) => {
        $( if let Some(v) = $o.$field { $cal.$field = v; } )*
    };
}

impl Calibration {
    /// Defaults with the given overrides applied. Call `invalid_overrides` first.
    pub fn resolve(overrides: Option<&CalibrationOverrides>) -> Calibration {
        let mut c = Calibration::default();
        if let Some(o) = overrides {
            apply_overrides!(
                c, o,
                web_rps_per_vcpu, web_service_ms, web_queue_per_gb, web_cost_per_vcpu,
                lb_rps_per_replica, lb_service_ms, lb_queue_seconds, lb_cost_per_replica,
                pg_qps_per_instance, pg_service_ms, pg_queue_seconds, pg_cost_per_instance,
                pg_failover_ms, edge_delay_http_ms, edge_delay_db_ms, edge_delay_cache_ms,
                edge_delay_msg_ms, max_utilization_for_latency,
            );
        }
        c
    }

    pub fn edge_delay_ms(&self, kind: EdgeKind) -> f64 {
        match kind {
            EdgeKind::Http => self.edge_delay_http_ms,
            EdgeKind::Db => self.edge_delay_db_ms,
            EdgeKind::Cache => self.edge_delay_cache_ms,
            EdgeKind::Msg => self.edge_delay_msg_ms,
        }
    }
}

/// camelCase names of overrides that cannot be used: non-finite values, capacities that are
/// not positive, times/costs/queues that are negative, a utilization cap outside (0, 1).
/// Order: positive-only fields, then non-negative fields in declaration order, then the cap.
pub fn invalid_overrides(o: &CalibrationOverrides) -> Vec<&'static str> {
    let positive = [
        ("webRpsPerVcpu", o.web_rps_per_vcpu),
        ("lbRpsPerReplica", o.lb_rps_per_replica),
        ("pgQpsPerInstance", o.pg_qps_per_instance),
    ];
    let non_negative = [
        ("webServiceMs", o.web_service_ms),
        ("webQueuePerGb", o.web_queue_per_gb),
        ("webCostPerVcpu", o.web_cost_per_vcpu),
        ("lbServiceMs", o.lb_service_ms),
        ("lbQueueSeconds", o.lb_queue_seconds),
        ("lbCostPerReplica", o.lb_cost_per_replica),
        ("pgServiceMs", o.pg_service_ms),
        ("pgQueueSeconds", o.pg_queue_seconds),
        ("pgCostPerInstance", o.pg_cost_per_instance),
        ("pgFailoverMs", o.pg_failover_ms),
        ("edgeDelayHttpMs", o.edge_delay_http_ms),
        ("edgeDelayDbMs", o.edge_delay_db_ms),
        ("edgeDelayCacheMs", o.edge_delay_cache_ms),
        ("edgeDelayMsgMs", o.edge_delay_msg_ms),
    ];
    let mut bad = Vec::new();
    for (name, value) in positive {
        if let Some(v) = value {
            if !(v.is_finite() && v > 0.0) {
                bad.push(name);
            }
        }
    }
    for (name, value) in non_negative {
        if let Some(v) = value {
            if !(v.is_finite() && v >= 0.0) {
                bad.push(name);
            }
        }
    }
    if let Some(v) = o.max_utilization_for_latency {
        if !(v.is_finite() && v > 0.0 && v < 1.0) {
            bad.push("maxUtilizationForLatency");
        }
    }
    bad
}
```

- [ ] **Step 4: Implement the component framework above the tests in `components/mod.rs`**

```rust
//! Component registry. Each kind lives in its own file; adding a kind means one new file and
//! one line in REGISTRY. Components read world parameters from `Calibration`, never from
//! constants, so every number is overridable per run.

mod client;
mod lb;
pub mod postgres;
mod web_server;

use crate::calibration::Calibration;
use crate::types::{ConfigValue, EdgeKind, Node};
use serde::{Deserialize, Serialize};

#[cfg_attr(feature = "ts", derive(ts_rs::TS), ts(export))]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum Role {
    Client,
    Balancer,
    Service,
    Database,
}

#[cfg_attr(feature = "ts", derive(ts_rs::TS), ts(export))]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum FieldKind {
    Number,
    Choice,
}

#[cfg_attr(feature = "ts", derive(ts_rs::TS), ts(export))]
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConfigField {
    pub key: String,
    pub kind: FieldKind,
    pub default: ConfigValue,
    pub min: Option<f64>,
    pub max: Option<f64>,
    pub options: Vec<String>,
}

impl ConfigField {
    pub fn number(key: &str, default: f64, min: f64, max: f64) -> Self {
        ConfigField {
            key: key.into(),
            kind: FieldKind::Number,
            default: ConfigValue::Num(default),
            min: Some(min),
            max: Some(max),
            options: vec![],
        }
    }
    pub fn choice(key: &str, default: &str, options: &[&str]) -> Self {
        ConfigField {
            key: key.into(),
            kind: FieldKind::Choice,
            default: ConfigValue::Str(default.into()),
            min: None,
            max: None,
            options: options.iter().map(|s| s.to_string()).collect(),
        }
    }
}

#[cfg_attr(feature = "ts", derive(ts_rs::TS), ts(export))]
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ComponentMeta {
    pub kind: String,
    /// i18n key for the display name, resolved by the UI (engine never emits prose).
    pub label_key: String,
    pub category: String,
    pub role: Role,
    pub accepts: Vec<EdgeKind>,
    pub is_entry: bool,
    pub fields: Vec<ConfigField>,
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Capacity {
    /// Requests per second one instance completes at 100% busy.
    pub rps: f64,
    /// Service time of one request on an idle instance.
    pub service_ms: f64,
    /// Requests one instance can hold waiting before it rejects new work.
    pub max_queue: f64,
}

pub trait ComponentModel: Sync {
    fn kind(&self) -> &'static str;
    fn meta(&self) -> ComponentMeta;
    fn instances(&self, node: &Node) -> u32 {
        node.replicas.max(1)
    }
    fn capacity_per_instance(&self, node: &Node, cal: &Calibration) -> Capacity;
    fn cost_per_month(&self, node: &Node, cal: &Calibration) -> f64;
}

/// Sorted by kind so listings are stable.
static REGISTRY: [&dyn ComponentModel; 4] =
    [&client::Client, &lb::LoadBalancer, &postgres::Postgres, &web_server::WebServer];

pub fn get(kind: &str) -> Option<&'static dyn ComponentModel> {
    REGISTRY.iter().copied().find(|c| c.kind() == kind)
}

pub fn list_components() -> Vec<ComponentMeta> {
    REGISTRY.iter().map(|c| c.meta()).collect()
}

/// Positive numeric config value, or `default` when missing, non-numeric or not positive.
pub fn num(node: &Node, key: &str, default: f64) -> f64 {
    match node.config.get(key).and_then(ConfigValue::as_f64) {
        Some(v) if v.is_finite() && v > 0.0 => v,
        _ => default,
    }
}

/// Non-negative numeric config value (0 allowed), or `default`.
pub fn num_or_zero(node: &Node, key: &str, default: f64) -> f64 {
    match node.config.get(key).and_then(ConfigValue::as_f64) {
        Some(v) if v.is_finite() && v >= 0.0 => v,
        _ => default,
    }
}

/// Config keys any node may set to override its own capacity and price.
pub const NODE_OVERRIDE_KEYS: [&str; 3] = ["rpsPerInstance", "serviceMs", "costPerMonth"];

/// Capacity after per-node overrides `rpsPerInstance` (> 0) and `serviceMs` (>= 0).
/// Invalid values are rejected by validation before a run, so they are ignored here.
pub fn effective_capacity(model: &dyn ComponentModel, node: &Node, cal: &Calibration) -> Capacity {
    let mut cap = model.capacity_per_instance(node, cal);
    if let Some(v) = node.config.get("rpsPerInstance").and_then(ConfigValue::as_f64) {
        if v.is_finite() && v > 0.0 {
            cap.rps = v;
        }
    }
    if let Some(v) = node.config.get("serviceMs").and_then(ConfigValue::as_f64) {
        if v.is_finite() && v >= 0.0 {
            cap.service_ms = v;
        }
    }
    cap
}

/// Monthly cost after the per-node override `costPerMonth` (price of ONE instance).
pub fn effective_cost(model: &dyn ComponentModel, node: &Node, cal: &Calibration) -> f64 {
    match node.config.get("costPerMonth").and_then(ConfigValue::as_f64) {
        Some(v) if v.is_finite() && v >= 0.0 => v * f64::from(model.instances(node)),
        _ => model.cost_per_month(node, cal),
    }
}

pub(crate) fn meta(
    kind: &str,
    category: &str,
    role: Role,
    accepts: &[EdgeKind],
    is_entry: bool,
    fields: Vec<ConfigField>,
) -> ComponentMeta {
    ComponentMeta {
        kind: kind.into(),
        label_key: format!("component.{kind}"),
        category: category.into(),
        role,
        accepts: accepts.to_vec(),
        is_entry,
        fields,
    }
}
```

- [ ] **Step 5: Write the four component files**

`components/client.rs`:

```rust
use super::{meta, Capacity, ComponentMeta, ComponentModel, Role};
use crate::calibration::Calibration;
use crate::types::Node;

pub struct Client;

impl ComponentModel for Client {
    fn kind(&self) -> &'static str {
        "client"
    }
    fn meta(&self) -> ComponentMeta {
        meta("client", "general", Role::Client, &[], false, vec![])
    }
    fn capacity_per_instance(&self, _node: &Node, _cal: &Calibration) -> Capacity {
        Capacity { rps: f64::INFINITY, service_ms: 0.0, max_queue: 0.0 }
    }
    fn cost_per_month(&self, _node: &Node, _cal: &Calibration) -> f64 {
        0.0
    }
}
```

`components/lb.rs`:

```rust
use super::{meta, Capacity, ComponentMeta, ComponentModel, ConfigField, Role};
use crate::calibration::Calibration;
use crate::types::{EdgeKind, Node};

pub struct LoadBalancer;

impl ComponentModel for LoadBalancer {
    fn kind(&self) -> &'static str {
        "lb"
    }
    fn meta(&self) -> ComponentMeta {
        meta(
            "lb",
            "general",
            Role::Balancer,
            &[EdgeKind::Http],
            true,
            vec![ConfigField::choice("algorithm", "round-robin", &["round-robin", "least-conn"])],
        )
    }
    fn capacity_per_instance(&self, _node: &Node, cal: &Calibration) -> Capacity {
        Capacity {
            rps: cal.lb_rps_per_replica,
            service_ms: cal.lb_service_ms,
            max_queue: cal.lb_rps_per_replica * cal.lb_queue_seconds,
        }
    }
    fn cost_per_month(&self, node: &Node, cal: &Calibration) -> f64 {
        cal.lb_cost_per_replica * f64::from(self.instances(node))
    }
}
```

`components/web_server.rs`:

```rust
use super::{meta, num, Capacity, ComponentMeta, ComponentModel, ConfigField, Role};
use crate::calibration::Calibration;
use crate::types::{EdgeKind, Node};

const DEFAULT_CPU: f64 = 1.0;
const DEFAULT_MEMORY_GB: f64 = 2.0;

pub struct WebServer;

impl ComponentModel for WebServer {
    fn kind(&self) -> &'static str {
        "web-server"
    }
    fn meta(&self) -> ComponentMeta {
        meta(
            "web-server",
            "compute",
            Role::Service,
            &[EdgeKind::Http],
            false,
            vec![
                ConfigField::number("cpu", DEFAULT_CPU, 1.0, 16.0),
                ConfigField::number("memoryGb", DEFAULT_MEMORY_GB, 1.0, 64.0),
            ],
        )
    }
    fn capacity_per_instance(&self, node: &Node, cal: &Calibration) -> Capacity {
        let cpu = num(node, "cpu", DEFAULT_CPU);
        let mem = num(node, "memoryGb", DEFAULT_MEMORY_GB);
        Capacity {
            rps: cal.web_rps_per_vcpu * cpu,
            service_ms: cal.web_service_ms,
            max_queue: cal.web_queue_per_gb * mem,
        }
    }
    fn cost_per_month(&self, node: &Node, cal: &Calibration) -> f64 {
        cal.web_cost_per_vcpu * num(node, "cpu", DEFAULT_CPU) * f64::from(self.instances(node))
    }
}
```

`components/postgres.rs`:

```rust
use super::{meta, num_or_zero, Capacity, ComponentMeta, ComponentModel, ConfigField, Role};
use crate::calibration::Calibration;
use crate::types::{EdgeKind, Node};

/// One primary (takes writes and reads) plus `readReplicas` read-only replicas.
/// `node.replicas` is ignored for this kind; use `readReplicas`.
pub struct Postgres;

impl Postgres {
    pub fn read_replicas(node: &Node) -> u32 {
        num_or_zero(node, "readReplicas", 0.0) as u32
    }
}

impl ComponentModel for Postgres {
    fn kind(&self) -> &'static str {
        "postgres"
    }
    fn meta(&self) -> ComponentMeta {
        meta(
            "postgres",
            "data",
            Role::Database,
            &[EdgeKind::Db],
            false,
            vec![ConfigField::number("readReplicas", 0.0, 0.0, 5.0)],
        )
    }
    fn instances(&self, node: &Node) -> u32 {
        1 + Self::read_replicas(node)
    }
    fn capacity_per_instance(&self, _node: &Node, cal: &Calibration) -> Capacity {
        Capacity {
            rps: cal.pg_qps_per_instance,
            service_ms: cal.pg_service_ms,
            max_queue: cal.pg_qps_per_instance * cal.pg_queue_seconds,
        }
    }
    fn cost_per_month(&self, node: &Node, cal: &Calibration) -> f64 {
        cal.pg_cost_per_instance * f64::from(self.instances(node))
    }
}
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `./dev cargo test -p sim-core components:: calibration::`
Expected: 11 passed (8 in `components::`, 3 in `calibration::`).

- [ ] **Step 7: Commit**

```bash
git add crates/sim-core/src
git commit -m "feat(sim-core): add overridable calibration and client, lb, web-server, postgres components

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Graph validation

**Files:**
- Create: `crates/sim-core/src/validate.rs`, `crates/sim-core/src/test_util.rs`
- Modify: `crates/sim-core/src/lib.rs`

**Interfaces:**
- Consumes: `Graph`, `GraphLimits`, `ValidationIssue` (Task 1); `components::get`, `ComponentModel::instances`, `ComponentMeta::accepts` (Task 4).
- Produces: `pub fn validate_graph(graph: &Graph, limits: Option<&GraphLimits>) -> Vec<ValidationIssue>`, `pub fn has_blocking(issues: &[ValidationIssue]) -> bool`, `pub mod codes` with the string constants below. Test helpers (cfg(test) only): `test_util::{node, edge, graph, web_tier}`.

Issue codes (all blocking unless noted): `node.duplicate-id`, `node.unknown-kind`, `edge.unknown-node`, `edge.not-accepted`, `graph.no-client`, `client.no-path`, `graph.cycle`, `node.unreachable` (non-blocking), `config.invalid` (a per-node override in `NODE_OVERRIDE_KEYS` that is not a finite number, or `rpsPerInstance` ≤ 0, or `serviceMs`/`costPerMonth` < 0; `field` names the key), `limits.too-many-nodes`, `limits.too-many-instances`, `limits.kind-not-allowed`. (`calibration.invalid` is checked in `simulate`, Task 6.)

- [ ] **Step 1: Add shared test helpers**

Create `crates/sim-core/src/test_util.rs` (compiled only for tests):

```rust
use crate::types::*;

pub fn node(id: &str, kind: &str, replicas: u32, config: &[(&str, f64)]) -> Node {
    Node {
        id: id.into(),
        kind: kind.into(),
        label: String::new(),
        replicas,
        config: config.iter().map(|(k, v)| (k.to_string(), ConfigValue::Num(*v))).collect(),
    }
}

pub fn edge(from: &str, to: &str, kind: EdgeKind) -> Edge {
    Edge { id: format!("{from}->{to}"), from: from.into(), to: to.into(), kind }
}

pub fn graph(nodes: Vec<Node>, edges: Vec<Edge>) -> Graph {
    Graph { nodes, edges }
}

/// users -> lb(lb_replicas) -> web(web_replicas); used by many tests.
pub fn web_tier(lb_replicas: u32, web_replicas: u32) -> Graph {
    graph(
        vec![
            node("users", "client", 1, &[]),
            node("lb", "lb", lb_replicas, &[]),
            node("web", "web-server", web_replicas, &[]),
        ],
        vec![edge("users", "lb", EdgeKind::Http), edge("lb", "web", EdgeKind::Http)],
    )
}

pub fn input(graph: Graph, base_rps: f64) -> SimInput {
    SimInput {
        graph,
        workload: Workload {
            profile: Profile::Mixed,
            base_rps,
            write_ratio: 0.2,
            clients: 1000,
            client_timeout_ms: 1000.0,
            surge: None,
            params: Default::default(),
        },
        faults: vec![],
        duration_ms: 10_000,
        seed: 1,
        calibration: None,
    }
}
```

In `lib.rs` add:

```rust
pub mod validate;
pub use validate::{has_blocking, validate_graph};

#[cfg(test)]
pub(crate) mod test_util;
```

- [ ] **Step 2: Write the failing tests**

Create `crates/sim-core/src/validate.rs` with:

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_util::{edge, graph, node, web_tier};
    use crate::types::{EdgeKind, GraphLimits};

    fn codes_of(issues: &[ValidationIssue]) -> Vec<&str> {
        issues.iter().map(|i| i.code.as_str()).collect()
    }

    #[test]
    fn valid_web_tier_has_no_issues() {
        assert!(validate_graph(&web_tier(2, 3), None).is_empty());
    }

    #[test]
    fn duplicate_ids_and_unknown_kinds_are_blocking() {
        let g = graph(
            vec![node("a", "client", 1, &[]), node("a", "client", 1, &[]), node("x", "mainframe", 1, &[])],
            vec![edge("a", "x", EdgeKind::Http)],
        );
        let issues = validate_graph(&g, None);
        assert!(codes_of(&issues).contains(&codes::DUPLICATE_ID));
        assert!(codes_of(&issues).contains(&codes::UNKNOWN_KIND));
        assert!(has_blocking(&issues));
    }

    #[test]
    fn edge_to_missing_node_is_reported() {
        let g = graph(vec![node("users", "client", 1, &[])], vec![edge("users", "ghost", EdgeKind::Http)]);
        let issues = validate_graph(&g, None);
        assert_eq!(issues[0].code, codes::EDGE_UNKNOWN_NODE);
        assert_eq!(issues[0].edge_id.as_deref(), Some("users->ghost"));
    }

    #[test]
    fn edge_kind_must_be_accepted_by_target() {
        let mut g = web_tier(1, 1);
        g.nodes.push(node("pg", "postgres", 1, &[]));
        g.edges.push(edge("web", "pg", EdgeKind::Http)); // postgres only accepts db edges
        let issues = validate_graph(&g, None);
        assert_eq!(codes_of(&issues), vec![codes::EDGE_NOT_ACCEPTED]);
        assert_eq!(issues[0].edge_id.as_deref(), Some("web->pg"));
    }

    #[test]
    fn graph_needs_a_client_with_a_path() {
        let g = graph(vec![node("web", "web-server", 1, &[])], vec![]);
        assert!(codes_of(&validate_graph(&g, None)).contains(&codes::NO_CLIENT));

        let g = graph(vec![node("users", "client", 1, &[])], vec![]);
        assert_eq!(codes_of(&validate_graph(&g, None)), vec![codes::CLIENT_NO_PATH]);
    }

    #[test]
    fn cycles_are_blocking() {
        let mut g = web_tier(1, 1);
        g.nodes.push(node("lb2", "lb", 1, &[]));
        g.edges.push(edge("web", "lb2", EdgeKind::Http));
        g.edges.push(edge("lb2", "lb", EdgeKind::Http));
        let issues = validate_graph(&g, None);
        assert!(codes_of(&issues).contains(&codes::CYCLE));
        assert!(has_blocking(&issues));
    }

    #[test]
    fn unreachable_nodes_are_a_warning_only() {
        let mut g = web_tier(1, 1);
        g.nodes.push(node("orphan", "web-server", 1, &[]));
        let issues = validate_graph(&g, None);
        assert_eq!(codes_of(&issues), vec![codes::UNREACHABLE]);
        assert!(!has_blocking(&issues));
    }

    #[test]
    fn invalid_per_node_overrides_are_blocking_and_name_the_field() {
        let mut g = web_tier(1, 1);
        g.nodes[2].config.insert("rpsPerInstance".into(), crate::types::ConfigValue::Num(0.0));
        g.nodes[2].config.insert("costPerMonth".into(), crate::types::ConfigValue::Str("cheap".into()));
        g.nodes[2].config.insert("serviceMs".into(), crate::types::ConfigValue::Num(4.0)); // valid
        let issues = validate_graph(&g, None);
        let fields: Vec<&str> = issues.iter().filter(|i| i.code == codes::CONFIG_INVALID)
            .map(|i| i.field.as_deref().unwrap()).collect();
        assert_eq!(fields, vec!["costPerMonth", "rpsPerInstance"]);
        assert!(issues.iter().all(|i| i.node_id.as_deref() == Some("web")));
        assert!(has_blocking(&issues));
    }

    #[test]
    fn limits_are_enforced() {
        let g = web_tier(2, 5); // 3 nodes, 7 instances (client not counted)
        let limits = GraphLimits {
            max_nodes: Some(2),
            max_instances: Some(6),
            allowed_kinds: Some(vec!["client".into(), "web-server".into()]),
        };
        let codes = validate_graph(&g, Some(&limits)).into_iter().map(|i| i.code).collect::<Vec<_>>();
        assert!(codes.contains(&codes::TOO_MANY_NODES.to_string()));
        assert!(codes.contains(&codes::TOO_MANY_INSTANCES.to_string()));
        assert!(codes.contains(&codes::KIND_NOT_ALLOWED.to_string()));

        let ok = GraphLimits { max_nodes: Some(3), max_instances: Some(7), allowed_kinds: None };
        assert!(validate_graph(&g, Some(&ok)).is_empty());
    }
}
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `./dev cargo test -p sim-core validate::`
Expected: compile errors (`validate_graph`, `codes` not found).

- [ ] **Step 4: Implement validation above the tests**

```rust
//! Structural checks run before every simulation. Issues carry codes, never prose.

use crate::components::{self, NODE_OVERRIDE_KEYS};
use crate::types::{Graph, GraphLimits, Node, ValidationIssue};
use std::collections::{BTreeMap, BTreeSet};

pub mod codes {
    pub const DUPLICATE_ID: &str = "node.duplicate-id";
    pub const UNKNOWN_KIND: &str = "node.unknown-kind";
    pub const EDGE_UNKNOWN_NODE: &str = "edge.unknown-node";
    pub const EDGE_NOT_ACCEPTED: &str = "edge.not-accepted";
    pub const NO_CLIENT: &str = "graph.no-client";
    pub const CLIENT_NO_PATH: &str = "client.no-path";
    pub const CYCLE: &str = "graph.cycle";
    pub const UNREACHABLE: &str = "node.unreachable";
    pub const CONFIG_INVALID: &str = "config.invalid";
    pub const CALIBRATION_INVALID: &str = "calibration.invalid";
    pub const TOO_MANY_NODES: &str = "limits.too-many-nodes";
    pub const TOO_MANY_INSTANCES: &str = "limits.too-many-instances";
    pub const KIND_NOT_ALLOWED: &str = "limits.kind-not-allowed";
}

fn issue(code: &str, node: Option<&str>, edge: Option<&str>, blocking: bool) -> ValidationIssue {
    ValidationIssue {
        code: code.into(),
        node_id: node.map(String::from),
        edge_id: edge.map(String::from),
        field: None,
        blocking,
    }
}

pub(crate) fn field_issue(code: &str, node: Option<&str>, field: &str) -> ValidationIssue {
    ValidationIssue {
        code: code.into(),
        node_id: node.map(String::from),
        edge_id: None,
        field: Some(field.into()),
        blocking: true,
    }
}

/// Per-node overrides must be usable numbers. Keys are checked in sorted order.
fn check_node_overrides(n: &Node, issues: &mut Vec<ValidationIssue>) {
    let mut keys = NODE_OVERRIDE_KEYS;
    keys.sort_unstable();
    for key in keys {
        let Some(value) = n.config.get(key) else { continue };
        let ok = match value.as_f64() {
            Some(v) if v.is_finite() => if key == "rpsPerInstance" { v > 0.0 } else { v >= 0.0 },
            _ => false,
        };
        if !ok {
            issues.push(field_issue(codes::CONFIG_INVALID, Some(&n.id), key));
        }
    }
}

pub fn has_blocking(issues: &[ValidationIssue]) -> bool {
    issues.iter().any(|i| i.blocking)
}

pub fn validate_graph(graph: &Graph, limits: Option<&GraphLimits>) -> Vec<ValidationIssue> {
    let mut issues = Vec::new();

    let mut by_id: BTreeMap<&str, &Node> = BTreeMap::new();
    for n in &graph.nodes {
        if by_id.insert(n.id.as_str(), n).is_some() {
            issues.push(issue(codes::DUPLICATE_ID, Some(&n.id), None, true));
        }
        if components::get(&n.kind).is_none() {
            issues.push(issue(codes::UNKNOWN_KIND, Some(&n.id), None, true));
        }
        check_node_overrides(n, &mut issues);
    }

    // Adjacency over edges whose endpoints exist.
    let mut adj: BTreeMap<&str, Vec<&str>> = BTreeMap::new();
    for e in &graph.edges {
        match (by_id.get(e.from.as_str()), by_id.get(e.to.as_str())) {
            (Some(_), Some(target)) => {
                if let Some(model) = components::get(&target.kind) {
                    if !model.meta().accepts.contains(&e.kind) {
                        issues.push(issue(codes::EDGE_NOT_ACCEPTED, None, Some(&e.id), true));
                    }
                }
                adj.entry(e.from.as_str()).or_default().push(e.to.as_str());
            }
            _ => issues.push(issue(codes::EDGE_UNKNOWN_NODE, None, Some(&e.id), true)),
        }
    }

    let clients: Vec<&str> =
        graph.nodes.iter().filter(|n| n.kind == "client").map(|n| n.id.as_str()).collect();
    if clients.is_empty() {
        issues.push(issue(codes::NO_CLIENT, None, None, true));
    }
    for c in &clients {
        if adj.get(c).map_or(true, |v| v.is_empty()) {
            issues.push(issue(codes::CLIENT_NO_PATH, Some(c), None, true));
        }
    }

    if let Some(at) = find_cycle(&by_id, &adj) {
        issues.push(issue(codes::CYCLE, Some(at), None, true));
    }

    // Reachability from clients (warning only).
    let mut seen: BTreeSet<&str> = clients.iter().copied().collect();
    let mut stack: Vec<&str> = clients.clone();
    while let Some(id) = stack.pop() {
        for next in adj.get(id).into_iter().flatten() {
            if seen.insert(next) {
                stack.push(next);
            }
        }
    }
    for n in &graph.nodes {
        if !seen.contains(n.id.as_str()) && n.kind != "client" && !clients.is_empty() {
            issues.push(issue(codes::UNREACHABLE, Some(&n.id), None, false));
        }
    }

    if let Some(l) = limits {
        check_limits(graph, l, &mut issues);
    }
    issues
}

/// Iterative DFS with colors; returns a node on a cycle, if any.
fn find_cycle<'a>(by_id: &BTreeMap<&'a str, &Node>, adj: &BTreeMap<&'a str, Vec<&'a str>>) -> Option<&'a str> {
    #[derive(Clone, Copy, PartialEq)]
    enum Color { White, Grey, Black }
    let mut color: BTreeMap<&str, Color> = by_id.keys().map(|k| (*k, Color::White)).collect();
    for &start in by_id.keys() {
        if color[start] != Color::White {
            continue;
        }
        let mut stack: Vec<(&str, usize)> = vec![(start, 0)];
        color.insert(start, Color::Grey);
        while let Some((id, idx)) = stack.pop() {
            let children = adj.get(id).map(Vec::as_slice).unwrap_or(&[]);
            if idx < children.len() {
                stack.push((id, idx + 1));
                let next = children[idx];
                match color[next] {
                    Color::Grey => return Some(next),
                    Color::White => {
                        color.insert(next, Color::Grey);
                        stack.push((next, 0));
                    }
                    Color::Black => {}
                }
            } else {
                color.insert(id, Color::Black);
            }
        }
    }
    None
}

fn check_limits(graph: &Graph, limits: &GraphLimits, issues: &mut Vec<ValidationIssue>) {
    if let Some(max) = limits.max_nodes {
        if graph.nodes.len() as u32 > max {
            issues.push(issue(codes::TOO_MANY_NODES, None, None, true));
        }
    }
    if let Some(max) = limits.max_instances {
        let total: u32 = graph
            .nodes
            .iter()
            .filter(|n| n.kind != "client")
            .filter_map(|n| components::get(&n.kind).map(|m| m.instances(n)))
            .sum();
        if total > max {
            issues.push(issue(codes::TOO_MANY_INSTANCES, None, None, true));
        }
    }
    if let Some(allowed) = &limits.allowed_kinds {
        for n in &graph.nodes {
            if !allowed.iter().any(|k| k == &n.kind) {
                issues.push(issue(codes::KIND_NOT_ALLOWED, Some(&n.id), None, true));
            }
        }
    }
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `./dev cargo test -p sim-core validate::`
Expected: 9 passed.

- [ ] **Step 6: Commit**

```bash
git add crates/sim-core/src
git commit -m "feat(sim-core): add graph validation with structured issue codes

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Tick engine and `simulate()`

**Files:**
- Create: `crates/sim-core/src/engine.rs`, `crates/sim-core/src/simulate.rs`
- Modify: `crates/sim-core/src/lib.rs`

**Interfaces:**
- Consumes: types (Task 1), `Pcg32` (Task 2), `Histogram` (Task 3), components and calibration (Task 4), `validate_graph`/`has_blocking` (Task 5).
- Produces:
  - `pub fn simulate(input: &SimInput) -> Result<SimResult, Vec<ValidationIssue>>` (Err holds only blocking issues).
  - `pub(crate) struct Engine<'a>` with `Engine::new(&'a SimInput) -> Engine<'a>`, `run(&mut self)`, `finish(self) -> SimResult`, and these fields used by Tasks 7–8: `nodes: Vec<NodeRt>`, `events: Vec<SimEvent>`, `rate_multiplier: f64`, `now_ms: f64`, `input: &'a SimInput`.
  - `pub(crate) struct NodeRt` with fields `id, kind, role, is_entry, cap, instances_total, instances_up, primary_up, promote_at_ms: Option<f64>, children: Vec<(usize, EdgeKind)>, queue`, per-tick `wait_ms, lat_ms, fail_reject_r, fail_reject_w, fail_down_r, fail_down_w`.
  - `pub(crate) cal: Calibration` on `Engine` (the resolved world parameters; use `self.cal.edge_delay_ms(kind)`, `self.cal.pg_failover_ms`, …), `Engine::targets(&self, i: usize) -> Vec<(usize, EdgeKind)>`.
  - `simulate` rejects invalid `input.calibration` with one blocking `calibration.invalid` issue per bad field (`field` = camelCase name).

**Model summary (read before coding):** each 10 ms tick: (1) the client emits a Poisson number of requests, split read/write by `writeRatio`; (2) a forward pass over nodes in topological order runs each node's queue (capacity = per-instance rps × instances up) and forwards what it served to its targets, split equally (a balancer skips children with no instance up; a database is terminal); (3) a reverse pass computes, for every node, the probability that a read/write entering it succeeds (`ok`), the same ignoring queue rejections (`okd`, so we can tell "down" from "rejected"), and the expected end-to-end latency below it; (4) the client books generated requests as ok / rejected / unreachable / timed out (latency above `clientTimeoutMs`) and records latency in the histogram. A node's queue is capped at `min(maxQueue × instances, capacity × timeout)`; overflow is rejected.

- [ ] **Step 1: Write the failing tests**

Create `crates/sim-core/src/simulate.rs` with only:

```rust
#[cfg(test)]
mod tests {
    use super::simulate;
    use crate::test_util::{edge, graph, input, node, web_tier};
    use crate::types::*;

    fn surge(mut i: SimInput) -> SimInput {
        i.workload.surge = Some(Surge { factor: 3.0, at_ms: 2_000, duration_ms: 6_000 });
        i
    }

    fn conserved(m: &Metrics) -> bool {
        let sum = m.requests_ok + m.requests_rejected + m.requests_timed_out + m.requests_unreachable;
        (sum - m.requests_total).abs() <= 1e-6 * m.requests_total.max(1.0)
    }

    #[test]
    fn light_load_is_fast_and_available() {
        let r = simulate(&input(web_tier(2, 2), 2_000.0)).unwrap();
        let m = &r.metrics;
        assert!(m.availability > 0.999, "{m:?}");
        assert!(m.p95 < 20.0, "{m:?}");
        assert_eq!(m.spof_count, 0);
        assert_eq!(m.exposed_backends, 0);
        assert_eq!(m.cost_per_month, 2.0 * 25.0 + 2.0 * 22.5);
        assert!((m.requests_total - 20_000.0).abs() < 600.0, "{}", m.requests_total);
        assert!(conserved(m));
    }

    #[test]
    fn single_web_server_falls_over_under_3x_surge() {
        let g = graph(
            vec![node("users", "client", 1, &[]), node("web", "web-server", 1, &[])],
            vec![edge("users", "web", EdgeKind::Http)],
        );
        let r = simulate(&surge(input(g, 8_000.0))).unwrap();
        let m = &r.metrics;
        assert!(m.p95 >= 300.0, "{m:?}");
        assert!(m.availability < 0.95, "{m:?}");
        assert_eq!(m.spof_count, 1);
        assert_eq!(m.exposed_backends, 1);
        assert!(m.requests_rejected > 0.0);
        assert!(r.events.iter().any(|e| e.code == "node.overloaded" && e.node.as_deref() == Some("web")));
        assert!(conserved(m));
    }

    #[test]
    fn lb_plus_five_web_servers_survive_the_surge() {
        let r = simulate(&surge(input(web_tier(2, 5), 8_000.0))).unwrap();
        let m = &r.metrics;
        assert!(m.p95 <= 100.0, "{m:?}");
        assert!(m.availability >= 0.999, "{m:?}");
        assert_eq!(m.spof_count, 0);
        assert!(m.cost_per_month <= 200.0);
    }

    #[test]
    fn postgres_behind_web_tier_reports_db_connections() {
        let mut g = web_tier(2, 2);
        g.nodes.push(node("pg", "postgres", 1, &[("readReplicas", 1.0)]));
        g.edges.push(edge("web", "pg", EdgeKind::Db));
        let r = simulate(&input(g, 2_000.0)).unwrap();
        assert!(r.metrics.availability > 0.999, "{:?}", r.metrics);
        assert!(r.metrics.peak_db_connections > 0.0);
        assert_eq!(r.metrics.cost_per_month, 50.0 + 45.0 + 360.0);
    }

    #[test]
    fn timeline_has_one_frame_per_100ms() {
        let r = simulate(&input(web_tier(1, 1), 1_000.0)).unwrap();
        let t = &r.timeline;
        assert_eq!(t.frame_ms, 100);
        assert_eq!(t.node_ids, vec!["lb", "users", "web"]);
        assert_eq!(t.fields, vec!["inFlight", "queued", "busy", "rejected", "up"]);
        assert_eq!(t.data.len(), 100 * 3 * 5);
    }

    #[test]
    fn same_input_gives_identical_result() {
        let i = surge(input(web_tier(2, 3), 9_000.0));
        assert_eq!(simulate(&i).unwrap(), simulate(&i).unwrap());
        let mut other = i.clone();
        other.seed = 99;
        assert_ne!(simulate(&i).unwrap().metrics, simulate(&other).unwrap().metrics);
    }

    #[test]
    fn invalid_graph_returns_blocking_issues() {
        let g = graph(vec![node("web", "web-server", 1, &[])], vec![]);
        let err = simulate(&input(g, 100.0)).unwrap_err();
        assert!(err.iter().all(|i| i.blocking));
        assert!(err.iter().any(|i| i.code == "graph.no-client"));
    }

    // Review focus 1: balancer with nowhere to send traffic.
    #[test]
    fn balancer_without_children_makes_requests_unreachable() {
        let g = graph(
            vec![node("users", "client", 1, &[]), node("lb", "lb", 2, &[])],
            vec![edge("users", "lb", EdgeKind::Http)],
        );
        let m = simulate(&input(g, 1_000.0)).unwrap().metrics;
        assert_eq!(m.availability, 0.0);
        assert!((m.requests_unreachable - m.requests_total).abs() < 1e-6);
        assert!(m.p95.is_finite());
    }

    // Review focus 2: no traffic, or a run shorter than one tick.
    #[test]
    fn zero_traffic_and_tiny_duration_stay_finite() {
        let mut i = input(web_tier(1, 1), 0.0);
        i.duration_ms = 5;
        let r = simulate(&i).unwrap();
        let m = &r.metrics;
        assert_eq!(m.requests_total, 0.0);
        assert_eq!(m.availability, 1.0);
        assert_eq!(m.p95, 0.0);
        assert_eq!(m.throughput_rps, 0.0);
        assert_eq!(r.timeline.data.len(), 3 * 5, "exactly one frame");
    }

    #[test]
    fn slower_hardware_override_makes_the_scaled_design_fail() {
        let mut i = surge(input(web_tier(2, 5), 8_000.0));
        i.calibration = Some(CalibrationOverrides { web_rps_per_vcpu: Some(3_000.0), ..Default::default() });
        let m = simulate(&i).unwrap().metrics;
        assert!(m.availability < 0.95, "{m:?}");
    }

    #[test]
    fn empty_overrides_equal_defaults() {
        let base = input(web_tier(2, 3), 5_000.0);
        let mut with_empty = base.clone();
        with_empty.calibration = Some(CalibrationOverrides::default());
        assert_eq!(simulate(&base).unwrap().metrics, simulate(&with_empty).unwrap().metrics);
    }

    #[test]
    fn per_node_overrides_change_only_that_node() {
        let mut g = web_tier(2, 2);
        g.nodes[2].config.insert("costPerMonth".into(), ConfigValue::Num(100.0));
        g.nodes[2].config.insert("rpsPerInstance".into(), ConfigValue::Num(500.0));
        let m = simulate(&input(g, 2_000.0)).unwrap().metrics;
        assert_eq!(m.cost_per_month, 50.0 + 200.0);
        assert!(m.availability < 0.9, "2 x 500 rps cannot serve 2,000 rps: {m:?}");
    }

    #[test]
    fn invalid_calibration_is_rejected_with_field_names() {
        let mut i = input(web_tier(1, 1), 100.0);
        i.calibration = Some(CalibrationOverrides {
            web_rps_per_vcpu: Some(-5.0),
            max_utilization_for_latency: Some(2.0),
            ..Default::default()
        });
        let err = simulate(&i).unwrap_err();
        let fields: Vec<&str> = err.iter().map(|e| e.field.as_deref().unwrap()).collect();
        assert_eq!(fields, vec!["webRpsPerVcpu", "maxUtilizationForLatency"]);
        assert!(err.iter().all(|e| e.code == "calibration.invalid" && e.blocking));
    }

    // Review focus 3: very large numbers.
    #[test]
    fn huge_numbers_finish_with_finite_metrics() {
        let r = simulate(&input(web_tier(1000, 1000), 1e7)).unwrap();
        let m = &r.metrics;
        for v in [m.p50, m.p95, m.p99, m.availability, m.throughput_rps, m.cost_per_month, m.peak_busy] {
            assert!(v.is_finite(), "{m:?}");
        }
    }
}
```

Add to `lib.rs`:

```rust
mod engine;
pub mod simulate;
pub use simulate::simulate;
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `./dev cargo test -p sim-core simulate::`
Expected: compile errors (`simulate` function and `engine.rs` missing).

- [ ] **Step 3: Write `simulate()` above the tests in `simulate.rs`**

```rust
//! Public entry point: validate, run the tick engine, return the result.

use crate::calibration::invalid_overrides;
use crate::engine::Engine;
use crate::types::{SimInput, SimResult, ValidationIssue};
use crate::validate::{codes, field_issue, has_blocking, validate_graph};

pub fn simulate(input: &SimInput) -> Result<SimResult, Vec<ValidationIssue>> {
    let mut issues = validate_graph(&input.graph, None);
    if let Some(o) = &input.calibration {
        for field in invalid_overrides(o) {
            issues.push(field_issue(codes::CALIBRATION_INVALID, None, field));
        }
    }
    if has_blocking(&issues) {
        return Err(issues.into_iter().filter(|i| i.blocking).collect());
    }
    let mut engine = Engine::new(input);
    engine.run();
    Ok(engine.finish())
}
```

- [ ] **Step 4: Write `crates/sim-core/src/engine.rs`**

```rust
//! Fixed-tick fluid queueing model. Read the "Model summary" in the plan before changing it.

use crate::calibration::*;
use crate::components::{self, effective_capacity, effective_cost, Capacity, Role};
use crate::histogram::Histogram;
use crate::rng::Pcg32;
use crate::types::*;
use std::collections::{BTreeMap, BTreeSet};

pub(crate) struct NodeRt {
    pub id: String,
    pub kind: String,
    pub role: Role,
    pub is_entry: bool,
    pub cap: Capacity,
    pub cost: f64,
    pub instances_total: u32,
    pub instances_up: u32,
    /// Databases only: false while the primary is lost (writes fail).
    pub primary_up: bool,
    /// Databases only: when a replica will be promoted after losing the primary.
    pub promote_at_ms: Option<f64>,
    pub children: Vec<(usize, EdgeKind)>,
    pub queue: f64,
    // Forward pass, reset every tick.
    pub in_read: f64,
    pub in_write: f64,
    pub served_read: f64,
    pub served_write: f64,
    pub rejected: f64,
    pub busy: f64,
    pub wait_ms: f64,
    pub lat_ms: f64,
    pub fail_reject_r: f64,
    pub fail_reject_w: f64,
    pub fail_down_r: f64,
    pub fail_down_w: f64,
    // Reverse pass, recomputed every tick.
    pub ok_r: f64,
    pub ok_w: f64,
    pub okd_r: f64,
    pub okd_w: f64,
    pub path_lat_ms: f64,
    overload_reported: bool,
}

impl NodeRt {
    fn new(n: &Node, cal: &Calibration) -> NodeRt {
        let model = components::get(&n.kind).expect("graph was validated");
        let meta = model.meta();
        let instances = model.instances(n);
        NodeRt {
            id: n.id.clone(),
            kind: n.kind.clone(),
            role: meta.role,
            is_entry: meta.is_entry,
            cap: effective_capacity(model, n, cal),
            cost: effective_cost(model, n, cal),
            instances_total: instances,
            instances_up: instances,
            primary_up: true,
            promote_at_ms: None,
            children: Vec::new(),
            queue: 0.0,
            in_read: 0.0,
            in_write: 0.0,
            served_read: 0.0,
            served_write: 0.0,
            rejected: 0.0,
            busy: 0.0,
            wait_ms: 0.0,
            lat_ms: 0.0,
            fail_reject_r: 0.0,
            fail_reject_w: 0.0,
            fail_down_r: 0.0,
            fail_down_w: 0.0,
            ok_r: 0.0,
            ok_w: 0.0,
            okd_r: 0.0,
            okd_w: 0.0,
            path_lat_ms: 0.0,
            overload_reported: false,
        }
    }
}

#[derive(Default)]
struct Totals {
    total: f64,
    ok: f64,
    rejected: f64,
    timed_out: f64,
    unreachable: f64,
}

pub(crate) struct Engine<'a> {
    pub input: &'a SimInput,
    /// Resolved world parameters (defaults + input.calibration).
    pub(crate) cal: Calibration,
    pub nodes: Vec<NodeRt>,
    pub events: Vec<SimEvent>,
    /// Multiplies client traffic; faults such as traffic-surge-3x change it.
    pub rate_multiplier: f64,
    pub now_ms: f64,
    order: Vec<usize>,
    clients: Vec<usize>,
    ticks: u32,
    traffic_rng: Pcg32,
    hist: Histogram,
    totals: Totals,
    timeline: Vec<f32>,
    peak_busy: f64,
    peak_db_connections: f64,
}

/// Kahn's algorithm; ties broken by index (= node id order) for determinism.
fn topo_order(nodes: &[NodeRt]) -> Vec<usize> {
    let mut indeg = vec![0usize; nodes.len()];
    for n in nodes {
        for &(c, _) in &n.children {
            indeg[c] += 1;
        }
    }
    let mut ready: BTreeSet<usize> = (0..nodes.len()).filter(|&i| indeg[i] == 0).collect();
    let mut order = Vec::with_capacity(nodes.len());
    while let Some(i) = ready.pop_first() {
        order.push(i);
        for &(c, _) in &nodes[i].children {
            indeg[c] -= 1;
            if indeg[c] == 0 {
                ready.insert(c);
            }
        }
    }
    order
}

impl<'a> Engine<'a> {
    pub fn new(input: &'a SimInput) -> Self {
        let mut sorted: Vec<&Node> = input.graph.nodes.iter().collect();
        sorted.sort_by(|a, b| a.id.cmp(&b.id));
        let index: BTreeMap<&str, usize> =
            sorted.iter().enumerate().map(|(i, n)| (n.id.as_str(), i)).collect();
        let cal = Calibration::resolve(input.calibration.as_ref());
        let mut nodes: Vec<NodeRt> = sorted.iter().map(|n| NodeRt::new(n, &cal)).collect();

        let mut edges: Vec<&Edge> = input.graph.edges.iter().collect();
        edges.sort_by(|a, b| (&a.from, &a.to, &a.id).cmp(&(&b.from, &b.to, &b.id)));
        for e in edges {
            let (from, to) = (index[e.from.as_str()], index[e.to.as_str()]);
            nodes[from].children.push((to, e.kind));
        }

        let order = topo_order(&nodes);
        let clients = (0..nodes.len()).filter(|&i| nodes[i].role == Role::Client).collect();
        let ticks = (libm::ceil(f64::from(input.duration_ms) / TICK_MS) as u32).max(1);

        Engine {
            input,
            cal,
            nodes,
            events: Vec::new(),
            rate_multiplier: 1.0,
            now_ms: 0.0,
            order,
            clients,
            ticks,
            traffic_rng: Pcg32::new(input.seed),
            hist: Histogram::new(),
            totals: Totals::default(),
            timeline: Vec::new(),
            peak_busy: 0.0,
            peak_db_connections: 0.0,
        }
    }

    pub fn timeout_ms(&self) -> f64 {
        let t = self.input.workload.client_timeout_ms;
        if t.is_finite() && t > 0.0 { t } else { 1000.0 }
    }

    fn write_ratio(&self) -> f64 {
        let w = self.input.workload.write_ratio;
        if w.is_finite() { w.clamp(0.0, 1.0) } else { 0.2 }
    }

    fn rate_at(&self, t_ms: f64) -> f64 {
        let w = &self.input.workload;
        let mut rate = w.base_rps.max(0.0);
        if let Some(s) = &w.surge {
            let start = f64::from(s.at_ms);
            if t_ms >= start && t_ms < start + f64::from(s.duration_ms) {
                rate *= s.factor.max(0.0);
            }
        }
        rate * self.rate_multiplier
    }

    pub fn run(&mut self) {
        for k in 0..self.ticks {
            self.now_ms = f64::from(k) * TICK_MS;
            self.tick();
            if (k + 1) % FRAME_EVERY_TICKS == 0 || k + 1 == self.ticks {
                self.record_frame();
            }
        }
    }

    fn tick(&mut self) {
        let timeout_s = self.timeout_ms() / 1000.0;
        let lambda = self.rate_at(self.now_ms) * TICK_MS / 1000.0;
        let generated = self.traffic_rng.poisson(lambda);
        let write_ratio = self.write_ratio();

        for n in &mut self.nodes {
            n.in_read = 0.0;
            n.in_write = 0.0;
        }
        let share = generated / self.clients.len() as f64;
        for &c in &self.clients {
            self.nodes[c].in_write = share * write_ratio;
            self.nodes[c].in_read = share * (1.0 - write_ratio);
        }

        for k in 0..self.order.len() {
            let i = self.order[k];
            self.serve(i, timeout_s);
            self.forward(i);
        }
        self.track_peaks();
        for k in (0..self.order.len()).rev() {
            let i = self.order[k];
            self.resolve(i);
        }
        self.book_clients();
    }

    /// Where node i sends traffic this tick. Balancers skip children with nothing up;
    /// databases are terminal.
    pub fn targets(&self, i: usize) -> Vec<(usize, EdgeKind)> {
        let n = &self.nodes[i];
        match n.role {
            Role::Database => Vec::new(),
            Role::Balancer => n
                .children
                .iter()
                .copied()
                .filter(|&(c, _)| self.nodes[c].instances_up > 0)
                .collect(),
            Role::Client | Role::Service => n.children.clone(),
        }
    }

    fn serve(&mut self, i: usize, timeout_s: f64) {
        let now = self.now_ms;
        let max_util = self.cal.max_utilization_for_latency;
        let n = &mut self.nodes[i];
        n.served_read = 0.0;
        n.served_write = 0.0;
        n.rejected = 0.0;
        n.busy = 0.0;
        n.wait_ms = 0.0;
        n.lat_ms = 0.0;
        n.fail_reject_r = 0.0;
        n.fail_reject_w = 0.0;
        n.fail_down_r = 0.0;
        n.fail_down_w = 0.0;

        if n.role == Role::Client {
            n.served_read = n.in_read;
            n.served_write = n.in_write;
            return;
        }
        if n.instances_up == 0 {
            n.fail_down_r = 1.0;
            n.fail_down_w = 1.0;
            n.queue = 0.0;
            return;
        }

        let writes_down = n.role == Role::Database && !n.primary_up;
        if writes_down {
            n.fail_down_w = 1.0;
        }
        let in_write = if writes_down { 0.0 } else { n.in_write };
        let arriving = n.in_read + in_write;

        let instances = f64::from(n.instances_up);
        let cap_rps = n.cap.rps * instances;
        let per_tick = cap_rps * TICK_MS / 1000.0;
        let queue_limit = (n.cap.max_queue * instances).min(cap_rps * timeout_s);

        let total = n.queue + arriving;
        let served = total.min(per_tick);
        let remaining = total - served;
        let rejected = (remaining - queue_limit).max(0.0);
        n.queue = remaining - rejected;
        n.rejected = rejected;
        n.busy = if per_tick > 0.0 { served / per_tick } else { 0.0 };

        let rho = if per_tick > 0.0 { (arriving / per_tick).min(max_util) } else { max_util };
        n.wait_ms = if cap_rps > 0.0 { n.queue / cap_rps * 1000.0 } else { 0.0 };
        n.lat_ms = n.cap.service_ms / (1.0 - rho) + n.wait_ms;

        let reject_frac = if total > 0.0 { rejected / total } else { 0.0 };
        n.fail_reject_r = reject_frac;
        n.fail_reject_w = if writes_down { 0.0 } else { reject_frac };

        let read_share = if arriving > 0.0 { n.in_read / arriving } else { 1.0 };
        n.served_read = served * read_share;
        n.served_write = served - n.served_read;

        if rejected > 0.0 && !n.overload_reported {
            n.overload_reported = true;
            let mut params = BTreeMap::new();
            params.insert("busy".to_string(), n.busy);
            self.events.push(SimEvent {
                at_ms: now as u32,
                node: Some(n.id.clone()),
                code: "node.overloaded".into(),
                params,
            });
        }
    }

    fn forward(&mut self, i: usize) {
        let targets = self.targets(i);
        if targets.is_empty() {
            return;
        }
        let w = 1.0 / targets.len() as f64;
        let read = self.nodes[i].served_read * w;
        let write = self.nodes[i].served_write * w;
        for (c, _) in targets {
            self.nodes[c].in_read += read;
            self.nodes[c].in_write += write;
        }
    }

    fn track_peaks(&mut self) {
        for n in &self.nodes {
            if n.role == Role::Client {
                continue;
            }
            self.peak_busy = self.peak_busy.max(n.busy);
            if n.role == Role::Database {
                let conns = (n.served_read + n.served_write) * n.lat_ms / TICK_MS + n.queue;
                self.peak_db_connections = self.peak_db_connections.max(conns);
            }
        }
    }

    fn resolve(&mut self, i: usize) {
        let targets = self.targets(i);
        let role = self.nodes[i].role;
        let (cr, cw, cdr, cdw, clat) = if targets.is_empty() {
            match role {
                // Nowhere to send the request: it cannot complete.
                Role::Client | Role::Balancer => (0.0, 0.0, 0.0, 0.0, 0.0),
                // Services without downstream and databases answer by themselves.
                Role::Service | Role::Database => (1.0, 1.0, 1.0, 1.0, 0.0),
            }
        } else {
            let w = 1.0 / targets.len() as f64;
            let mut acc = (0.0, 0.0, 0.0, 0.0, 0.0);
            for (c, kind) in targets {
                let ch = &self.nodes[c];
                acc.0 += w * ch.ok_r;
                acc.1 += w * ch.ok_w;
                acc.2 += w * ch.okd_r;
                acc.3 += w * ch.okd_w;
                acc.4 += w * (self.cal.edge_delay_ms(kind) + ch.path_lat_ms);
            }
            acc
        };
        let n = &mut self.nodes[i];
        n.ok_r = (1.0 - n.fail_down_r) * (1.0 - n.fail_reject_r) * cr;
        n.ok_w = (1.0 - n.fail_down_w) * (1.0 - n.fail_reject_w) * cw;
        n.okd_r = (1.0 - n.fail_down_r) * cdr;
        n.okd_w = (1.0 - n.fail_down_w) * cdw;
        n.path_lat_ms = n.lat_ms + clat;
    }

    fn book_clients(&mut self) {
        let timeout = self.timeout_ms();
        for &c in &self.clients {
            let n = &self.nodes[c];
            let (gr, gw) = (n.in_read, n.in_write);
            let generated = gr + gw;
            if generated <= 0.0 {
                continue;
            }
            let unreachable = gr * (1.0 - n.okd_r) + gw * (1.0 - n.okd_w);
            let rejected = gr * (n.okd_r - n.ok_r) + gw * (n.okd_w - n.ok_w);
            // Computed as the remainder so the four buckets always add up to the total.
            let good = generated - unreachable - rejected;
            self.totals.total += generated;
            self.totals.unreachable += unreachable;
            self.totals.rejected += rejected;
            if n.path_lat_ms > timeout {
                self.totals.timed_out += good;
                self.hist.record(timeout, good);
            } else {
                self.totals.ok += good;
                self.hist.record(n.path_lat_ms, good);
            }
        }
    }

    fn record_frame(&mut self) {
        for n in &self.nodes {
            let in_flight = (n.served_read + n.served_write) * n.lat_ms / TICK_MS + n.queue;
            let up = if n.instances_up > 0 { 1.0 } else { 0.0 };
            self.timeline
                .extend_from_slice(&[in_flight as f32, n.queue as f32, n.busy as f32, n.rejected as f32, up]);
        }
    }

    fn reachable(&self) -> BTreeSet<usize> {
        let mut seen: BTreeSet<usize> = self.clients.iter().copied().collect();
        let mut stack: Vec<usize> = self.clients.clone();
        while let Some(i) = stack.pop() {
            for &(c, _) in &self.nodes[i].children {
                if seen.insert(c) {
                    stack.push(c);
                }
            }
        }
        seen
    }

    pub fn finish(self) -> SimResult {
        let t = &self.totals;
        let duration_s = f64::from(self.input.duration_ms.max(1)) / 1000.0;
        let spof_count = self
            .reachable()
            .into_iter()
            .filter(|&i| self.nodes[i].role != Role::Client && self.nodes[i].instances_total == 1)
            .count() as u32;
        let exposed_backends = self
            .clients
            .iter()
            .flat_map(|&c| self.nodes[c].children.iter())
            .filter(|&&(target, _)| !self.nodes[target].is_entry)
            .count() as u32;
        let cost_per_month = self.nodes.iter().map(|n| n.cost).sum();

        let metrics = Metrics {
            p50: self.hist.percentile(0.50),
            p95: self.hist.percentile(0.95),
            p99: self.hist.percentile(0.99),
            availability: if t.total > 0.0 { t.ok / t.total } else { 1.0 },
            throughput_rps: t.ok / duration_s,
            cost_per_month,
            spof_count,
            exposed_backends,
            peak_busy: self.peak_busy,
            peak_db_connections: self.peak_db_connections,
            cache_ops: 0.0,
            requests_total: t.total,
            requests_ok: t.ok,
            requests_rejected: t.rejected,
            requests_timed_out: t.timed_out,
            requests_unreachable: t.unreachable,
            ..Metrics::default()
        };

        SimResult {
            engine_version: crate::engine_version().to_string(),
            metrics,
            timeline: Timeline {
                frame_ms: (TICK_MS as u32) * FRAME_EVERY_TICKS,
                node_ids: self.nodes.iter().map(|n| n.id.clone()).collect(),
                fields: TIMELINE_FIELDS.iter().map(|s| s.to_string()).collect(),
                data: self.timeline,
            },
            traces: Vec::new(),
            events: self.events,
        }
    }
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `./dev cargo test -p sim-core simulate::`
Expected: 14 passed. If a threshold test fails (for example p95 of the overloaded server lands at 280 ms), do **not** loosen the test first: print the metrics with `--nocapture`, check the model against the "Model summary", and only then adjust a constant in `calibration.rs` with a comment explaining why.

- [ ] **Step 6: Run clippy**

Run: `./dev cargo clippy -p sim-core --all-targets -- -D warnings`
Expected: no warnings.

- [ ] **Step 7: Commit**

```bash
git add crates/sim-core/src
git commit -m "feat(sim-core): add tick engine and simulate()

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Faults (traffic surge, instance down, LB node down, database primary down)

**Files:**
- Create: `crates/sim-core/src/faults.rs`
- Modify: `crates/sim-core/src/engine.rs`, `crates/sim-core/src/lib.rs` (add `mod faults;`)

**Interfaces:**
- Consumes: `Engine` fields `nodes`, `events`, `rate_multiplier`, `now_ms`, `input`, `cal` (Task 6; failover delay is `self.cal.pg_failover_ms`); `Pcg32` (Task 2).
- Produces: `pub(crate) struct FaultQueue` with `FaultQueue::new(faults: &[Fault]) -> FaultQueue` and `due(&mut self, now_ms: f64) -> Vec<Fault>`; `impl Engine { pub(crate) fn apply_due_faults(&mut self) }`. Event codes: `fault.traffic-surge`, `instance.down`, `lb.node-down`, `db.primary-down`, `db.no-replica`, `db.promoted`, `fault.no-target`, `fault.unsupported`.

Supported in 1a: `traffic-surge-3x`, `instance-down` (targets a `Service` node), `lb-node-down` (targets a `Balancer`), `db-primary-down` (targets a `Database`). Every other kind emits `fault.unsupported` and changes nothing (plan 1b implements them).

- [ ] **Step 1: Write the failing tests**

Create `crates/sim-core/src/faults.rs` with:

```rust
#[cfg(test)]
mod tests {
    use crate::simulate;
    use crate::test_util::{edge, graph, input, node, web_tier};
    use crate::types::*;

    fn with_pg(read_replicas: f64) -> Graph {
        let mut g = web_tier(2, 3);
        g.nodes.push(node("pg", "postgres", 1, &[("readReplicas", read_replicas)]));
        g.edges.push(edge("web", "pg", EdgeKind::Db));
        g
    }

    fn fault(kind: FaultKind, target: Option<&str>, at_ms: u32) -> Fault {
        Fault { kind, target: target.map(String::from), at_ms }
    }

    fn codes(r: &SimResult) -> Vec<&str> {
        r.events.iter().map(|e| e.code.as_str()).collect()
    }

    #[test]
    fn losing_the_only_database_breaks_most_requests() {
        let mut i = input(with_pg(0.0), 2_000.0);
        i.faults = vec![fault(FaultKind::DbPrimaryDown, Some("pg"), 3_000)];
        let r = simulate(&i).unwrap();
        assert!(r.metrics.availability < 0.75, "{:?}", r.metrics);
        assert!(codes(&r).contains(&"db.primary-down"));
        assert!(codes(&r).contains(&"db.no-replica"));
    }

    #[test]
    fn a_read_replica_is_promoted_after_failover() {
        let mut i = input(with_pg(1.0), 2_000.0);
        i.faults = vec![fault(FaultKind::DbPrimaryDown, Some("pg"), 3_000)];
        let r = simulate(&i).unwrap();
        assert!(r.metrics.availability > 0.95, "{:?}", r.metrics);
        let promoted = r.events.iter().find(|e| e.code == "db.promoted").expect("promotion event");
        assert_eq!(promoted.at_ms, 3_600);
    }

    #[test]
    fn redundant_web_tier_survives_losing_one_instance() {
        let mut i = input(web_tier(2, 2), 2_000.0);
        i.faults = vec![fault(FaultKind::InstanceDown, Some("web"), 3_000)];
        let r = simulate(&i).unwrap();
        assert!(r.metrics.availability > 0.99, "{:?}", r.metrics);
        assert!(codes(&r).contains(&"instance.down"));
    }

    #[test]
    fn single_web_instance_down_makes_requests_unreachable() {
        let mut i = input(web_tier(2, 1), 2_000.0);
        i.faults = vec![fault(FaultKind::InstanceDown, None, 3_000)]; // auto-picks "web"
        let m = simulate(&i).unwrap().metrics;
        assert!(m.availability < 0.75, "{m:?}");
        assert!(m.requests_unreachable > 0.0);
    }

    #[test]
    fn traffic_surge_fault_triples_load_from_its_start() {
        let mut i = input(web_tier(2, 5), 1_000.0);
        i.faults = vec![fault(FaultKind::TrafficSurge3x, None, 3_000)];
        let m = simulate(&i).unwrap().metrics;
        // 3 s at 1,000 rps + 7 s at 3,000 rps = 24,000 requests.
        assert!((m.requests_total - 24_000.0).abs() < 800.0, "{}", m.requests_total);
    }

    #[test]
    fn lb_node_down_reduces_balancer_instances() {
        let mut i = input(web_tier(1, 2), 2_000.0);
        i.faults = vec![fault(FaultKind::LbNodeDown, Some("lb"), 3_000)];
        let r = simulate(&i).unwrap();
        assert!(codes(&r).contains(&"lb.node-down"));
        assert!(r.metrics.availability < 0.75, "single LB replica lost");
    }

    // Review focus 4: bad targets never panic.
    #[test]
    fn missing_or_mismatched_targets_are_ignored_with_an_event() {
        let mut i = input(with_pg(0.0), 1_000.0);
        i.faults = vec![
            fault(FaultKind::InstanceDown, Some("ghost"), 1_000),
            fault(FaultKind::DbPrimaryDown, Some("web"), 1_000),
        ];
        let r = simulate(&i).unwrap();
        assert_eq!(codes(&r).iter().filter(|c| **c == "fault.no-target").count(), 2);
        assert!(r.metrics.availability > 0.999);
    }

    #[test]
    fn unsupported_kinds_are_reported_not_applied() {
        let mut i = input(web_tier(2, 2), 1_000.0);
        i.faults = vec![fault(FaultKind::CacheDown, None, 1_000)];
        let r = simulate(&i).unwrap();
        assert!(codes(&r).contains(&"fault.unsupported"));
        assert!(r.metrics.availability > 0.999);
    }

    #[test]
    fn fault_order_in_input_does_not_matter() {
        let a = fault(FaultKind::InstanceDown, None, 2_000);
        let b = fault(FaultKind::DbPrimaryDown, None, 2_000);
        let mut i1 = input(with_pg(1.0), 2_000.0);
        i1.faults = vec![a.clone(), b.clone()];
        let mut i2 = i1.clone();
        i2.faults = vec![b, a];
        assert_eq!(simulate(&i1).unwrap(), simulate(&i2).unwrap());
    }
}
```

Add `mod faults;` to `lib.rs`.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `./dev cargo test -p sim-core faults::`
Expected: the new tests fail (no `db.primary-down` event, availability unchanged), because faults are not applied yet.

- [ ] **Step 3: Implement fault scheduling and application above the tests in `faults.rs`**

```rust
//! Fault injection. Faults fire at the first tick whose start time is >= atMs.

use crate::components::Role;
use crate::engine::Engine;
use crate::types::{Fault, FaultKind, SimEvent};
use std::collections::BTreeMap;

pub(crate) struct FaultQueue {
    /// Sorted descending so `due` can pop from the end.
    pending: Vec<Fault>,
}

impl FaultQueue {
    pub fn new(faults: &[Fault]) -> Self {
        let mut pending = faults.to_vec();
        pending.sort_by(|a, b| {
            (b.at_ms, b.kind, b.target.as_deref()).cmp(&(a.at_ms, a.kind, a.target.as_deref()))
        });
        FaultQueue { pending }
    }

    pub fn due(&mut self, now_ms: f64) -> Vec<Fault> {
        let mut out = Vec::new();
        while let Some(f) = self.pending.last() {
            if f64::from(f.at_ms) <= now_ms {
                out.push(self.pending.pop().expect("checked"));
            } else {
                break;
            }
        }
        out
    }
}

fn event(at_ms: f64, node: Option<&str>, code: &str, params: &[(&str, f64)]) -> SimEvent {
    SimEvent {
        at_ms: at_ms as u32,
        node: node.map(String::from),
        code: code.into(),
        params: params.iter().map(|(k, v)| (k.to_string(), *v)).collect::<BTreeMap<_, _>>(),
    }
}

impl<'a> Engine<'a> {
    pub(crate) fn apply_due_faults(&mut self) {
        let now = self.now_ms;

        // Finish pending database promotions first.
        for n in &mut self.nodes {
            if let Some(at) = n.promote_at_ms {
                if at <= now {
                    n.promote_at_ms = None;
                    n.primary_up = true;
                    self.events.push(event(at, Some(&n.id), "db.promoted", &[]));
                }
            }
        }

        for f in self.fault_queue.due(now) {
            self.apply_fault(&f);
        }
    }

    fn pick_target(&mut self, f: &Fault, role: Role) -> Option<usize> {
        let eligible = |n: &crate::engine::NodeRt| {
            n.role == role && n.instances_up > 0 && (role != Role::Database || n.primary_up)
        };
        match &f.target {
            Some(id) => self.nodes.iter().position(|n| &n.id == id && eligible(n)),
            None => {
                let candidates: Vec<usize> =
                    (0..self.nodes.len()).filter(|&i| eligible(&self.nodes[i])).collect();
                if candidates.is_empty() {
                    None
                } else {
                    Some(candidates[self.fault_rng.next_u32() as usize % candidates.len()])
                }
            }
        }
    }

    fn apply_fault(&mut self, f: &Fault) {
        let now = self.now_ms;
        let failover_ms = self.cal.pg_failover_ms;
        let role = match f.kind {
            FaultKind::TrafficSurge3x => {
                self.rate_multiplier *= 3.0;
                self.events.push(event(now, None, "fault.traffic-surge", &[("factor", 3.0)]));
                return;
            }
            FaultKind::InstanceDown => Role::Service,
            FaultKind::LbNodeDown => Role::Balancer,
            FaultKind::DbPrimaryDown => Role::Database,
            _ => {
                self.events.push(event(now, f.target.as_deref(), "fault.unsupported", &[]));
                return;
            }
        };

        let Some(i) = self.pick_target(f, role) else {
            self.events.push(event(now, f.target.as_deref(), "fault.no-target", &[]));
            return;
        };

        let n = &mut self.nodes[i];
        n.instances_up -= 1;
        let remaining = f64::from(n.instances_up);
        match f.kind {
            FaultKind::InstanceDown => {
                self.events.push(event(now, Some(&n.id), "instance.down", &[("remaining", remaining)]));
            }
            FaultKind::LbNodeDown => {
                self.events.push(event(now, Some(&n.id), "lb.node-down", &[("remaining", remaining)]));
            }
            FaultKind::DbPrimaryDown => {
                n.primary_up = false;
                self.events.push(event(now, Some(&n.id), "db.primary-down", &[("replicas", remaining)]));
                if n.instances_up > 0 {
                    n.promote_at_ms = Some(now + failover_ms);
                } else {
                    self.events.push(event(now, Some(&n.id), "db.no-replica", &[]));
                }
            }
            _ => unreachable!("filtered above"),
        }
    }
}
```

- [ ] **Step 4: Wire the fault queue into the engine**

In `engine.rs`:

1. Add the import at the top: `use crate::faults::FaultQueue;`
2. Add two fields to `pub(crate) struct Engine<'a>` (after `pub now_ms: f64,`):

```rust
    pub(crate) fault_queue: FaultQueue,
    pub(crate) fault_rng: Pcg32,
```

3. Initialise them in `Engine::new` (after `now_ms: 0.0,`):

```rust
            fault_queue: FaultQueue::new(&input.faults),
            fault_rng: Pcg32::new(input.seed ^ 0x5bd1_e995),
```

4. Make `NodeRt` visible to `faults.rs`: it is already `pub(crate)`; no change.
5. In `fn tick(&mut self)`, make the first line:

```rust
        self.apply_due_faults();
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `./dev cargo test -p sim-core`
Expected: all tests pass, including the 9 new `faults::` tests and every earlier test.

- [ ] **Step 6: Commit**

```bash
git add crates/sim-core/src
git commit -m "feat(sim-core): add surge, instance, LB and database primary faults

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Sampled request traces

**Files:**
- Create: `crates/sim-core/src/traces.rs`
- Modify: `crates/sim-core/src/engine.rs`, `crates/sim-core/src/lib.rs` (add `mod traces;`)

**Interfaces:**
- Consumes: `Engine::targets`, `Engine.cal` (for `edge_delay_ms`), `NodeRt` per-tick fields (Task 6); `TRACE_TARGET` (Task 4).
- Produces: `impl Engine { pub(crate) fn sample_trace(&mut self) }`; `SimResult.traces` filled with about `TRACE_TARGET` traces (ids 0, 1, 2, …). Each trace starts with a `send` step at the client and ends with `serve` (delivered/timeout), `reject` or `down`.

- [ ] **Step 1: Write the failing tests**

Create `crates/sim-core/src/traces.rs` with:

```rust
#[cfg(test)]
mod tests {
    use crate::simulate;
    use crate::test_util::{edge, graph, input, node, web_tier};
    use crate::types::*;

    #[test]
    fn about_300_traces_starting_at_the_client() {
        let r = simulate(&input(web_tier(2, 2), 2_000.0)).unwrap();
        assert!((250..=350).contains(&r.traces.len()), "{}", r.traces.len());
        for (k, t) in r.traces.iter().enumerate() {
            assert_eq!(t.id, k as u32);
            assert_eq!(t.steps[0].node_id, "users");
            assert_eq!(t.steps[0].action, TraceAction::Send);
            assert!(t.latency_ms >= 0.0);
        }
        assert!(r.traces.iter().all(|t| t.outcome == TraceOutcome::Delivered));
        let last = r.traces[0].steps.last().unwrap();
        assert_eq!(last.node_id, "web");
        assert_eq!(last.action, TraceAction::Serve);
    }

    #[test]
    fn overloaded_server_produces_rejected_traces_with_waiting_time() {
        let g = graph(
            vec![node("users", "client", 1, &[]), node("web", "web-server", 1, &[])],
            vec![edge("users", "web", EdgeKind::Http)],
        );
        let mut i = input(g, 8_000.0);
        i.workload.surge = Some(Surge { factor: 3.0, at_ms: 2_000, duration_ms: 6_000 });
        let r = simulate(&i).unwrap();
        assert!(r.traces.iter().any(|t| t.outcome == TraceOutcome::Rejected));
        let slow = r.traces.iter().filter(|t| t.outcome == TraceOutcome::Delivered).map(|t| t.latency_ms);
        assert!(slow.fold(0.0_f64, f64::max) > 100.0, "some delivered request waited in the queue");
        let waited = r.traces.iter().flat_map(|t| &t.steps).any(|s| s.wait_ms > 50.0);
        assert!(waited);
    }

    #[test]
    fn balancer_with_no_children_gives_unreachable_traces() {
        let g = graph(
            vec![node("users", "client", 1, &[]), node("lb", "lb", 2, &[])],
            vec![edge("users", "lb", EdgeKind::Http)],
        );
        let r = simulate(&input(g, 1_000.0)).unwrap();
        assert!(!r.traces.is_empty());
        assert!(r.traces.iter().all(|t| t.outcome == TraceOutcome::Unreachable));
    }

    #[test]
    fn no_traffic_means_no_traces() {
        assert!(simulate(&input(web_tier(1, 1), 0.0)).unwrap().traces.is_empty());
    }

    #[test]
    fn traces_do_not_change_traffic_metrics_between_runs() {
        let i = input(web_tier(2, 3), 5_000.0);
        let a = simulate(&i).unwrap();
        let b = simulate(&i).unwrap();
        assert_eq!(a.traces, b.traces);
        assert_eq!(a.metrics, b.metrics);
    }
}
```

Add `mod traces;` to `lib.rs`.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `./dev cargo test -p sim-core traces::`
Expected: `about_300_traces_starting_at_the_client` and the other non-empty checks fail (traces are empty).

- [ ] **Step 3: Implement trace sampling above the tests in `traces.rs`**

```rust
//! Sampled request traces: every Nth tick one virtual request walks the graph using that
//! tick's queue state. Uses its own PRNG stream so traffic numbers never depend on sampling.

use crate::components::Role;
use crate::engine::Engine;
use crate::types::{RequestClass, Trace, TraceAction, TraceOutcome, TraceStep};

impl<'a> Engine<'a> {
    pub(crate) fn sample_trace(&mut self) {
        let Some(&client) = self.clients_slice().first() else { return };
        let generated = self.nodes[client].in_read + self.nodes[client].in_write;
        if generated <= 0.0 {
            return;
        }
        let start = self.now_ms;
        let write_ratio = self.input.workload.write_ratio.clamp(0.0, 1.0);
        let class = if self.trace_rng.next_f64() < write_ratio { RequestClass::Write } else { RequestClass::Read };

        let mut t = start;
        let mut steps = vec![TraceStep {
            t_ms: t,
            node_id: self.nodes[client].id.clone(),
            action: TraceAction::Send,
            wait_ms: 0.0,
            service_ms: 0.0,
        }];
        let mut current = client;
        let outcome = loop {
            let targets = self.targets(current);
            if targets.is_empty() {
                break match self.nodes[current].role {
                    Role::Client | Role::Balancer => TraceOutcome::Unreachable,
                    Role::Service | Role::Database => TraceOutcome::Delivered,
                };
            }
            let pick = self.trace_rng.next_u32() as usize % targets.len();
            let (next, kind) = targets[pick];
            t += self.cal.edge_delay_ms(kind);
            let n = &self.nodes[next];
            let (down, reject) = match class {
                RequestClass::Read => (n.fail_down_r, n.fail_reject_r),
                RequestClass::Write => (n.fail_down_w, n.fail_reject_w),
            };
            let roll_down = self.trace_rng.next_f64();
            let roll_reject = self.trace_rng.next_f64();
            if roll_down < down {
                steps.push(TraceStep { t_ms: t, node_id: n.id.clone(), action: TraceAction::Down, wait_ms: 0.0, service_ms: 0.0 });
                break TraceOutcome::Unreachable;
            }
            if roll_reject < reject {
                steps.push(TraceStep { t_ms: t, node_id: n.id.clone(), action: TraceAction::Reject, wait_ms: 0.0, service_ms: 0.0 });
                break TraceOutcome::Rejected;
            }
            let service = (n.lat_ms - n.wait_ms).max(0.0);
            steps.push(TraceStep { t_ms: t, node_id: n.id.clone(), action: TraceAction::Serve, wait_ms: n.wait_ms, service_ms: service });
            t += n.lat_ms;
            current = next;
        };

        let latency = t - start;
        let outcome = if outcome == TraceOutcome::Delivered && latency > self.timeout_ms() {
            TraceOutcome::Timeout
        } else {
            outcome
        };
        let id = self.traces.len() as u32;
        self.traces.push(Trace { id, class, start_ms: start, latency_ms: latency, outcome, steps });
    }
}
```

- [ ] **Step 4: Wire trace sampling into the engine**

In `engine.rs`:

1. Add the imports `use crate::types::Trace;` is covered by `use crate::types::*;` (no change needed).
2. Add fields to `Engine` (after `fault_rng`):

```rust
    pub(crate) trace_rng: Pcg32,
    pub(crate) traces: Vec<Trace>,
    trace_every: u32,
```

3. Initialise them in `Engine::new` (after `fault_rng: ...,`):

```rust
            trace_rng: Pcg32::new(input.seed ^ 0x9e37_79b9),
            traces: Vec::new(),
            trace_every: (ticks / TRACE_TARGET).max(1),
```

4. Add this accessor inside `impl<'a> Engine<'a>`:

```rust
    pub(crate) fn clients_slice(&self) -> &[usize] {
        &self.clients
    }
```

5. In `fn run`, replace the loop body with:

```rust
            self.now_ms = f64::from(k) * TICK_MS;
            self.tick();
            if k % self.trace_every == 0 {
                self.sample_trace();
            }
            if (k + 1) % FRAME_EVERY_TICKS == 0 || k + 1 == self.ticks {
                self.record_frame();
            }
```

6. In `fn finish`, replace `traces: Vec::new(),` with `traces: self.traces,`. Because `self.traces` and `self.timeline` / `self.events` are moved out field by field, keep `finish(self)` taking `self` by value (it already does).

- [ ] **Step 5: Run the tests to verify they pass**

Run: `./dev cargo test -p sim-core`
Expected: all tests pass, including 5 new `traces::` tests.

- [ ] **Step 6: Commit**

```bash
git add crates/sim-core/src
git commit -m "feat(sim-core): add sampled request traces

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Grading

**Files:**
- Create: `crates/sim-core/src/grade.rs`
- Modify: `crates/sim-core/src/lib.rs`

**Interfaces:**
- Consumes: `Metrics`, `SimResult`, `Goal`, `GoalOp`, `GoalResult`, `Verdict` (Task 1).
- Produces: `pub fn metric_value(m: &Metrics, key: &str) -> Option<f64>` (keys are the camelCase JSON names of `Metrics` fields), `pub fn compare(measured: f64, op: GoalOp, value: f64) -> bool`, `pub fn grade(result: &SimResult, goals: &[Goal]) -> Verdict`.

Scoring rule: `score = round(100 × passed / total)`; `stars = 5` when every goal passes, otherwise `floor(4 × passed / total)`; no goals → passed, score 100, 5 stars. `==` uses a tolerance of `1e-9 × max(1, |value|)`. Unknown metric keys and `null` metrics fail the goal with `measured = null`.

- [ ] **Step 1: Write the failing tests**

Create `crates/sim-core/src/grade.rs` with:

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::*;

    fn result(m: Metrics) -> SimResult {
        SimResult {
            engine_version: "test".into(),
            metrics: m,
            timeline: Timeline::default(),
            traces: vec![],
            events: vec![],
        }
    }

    fn goal(id: &str, metric: &str, op: GoalOp, value: f64) -> Goal {
        Goal { id: id.into(), metric: metric.into(), op, value }
    }

    fn sample() -> Metrics {
        Metrics { p95: 37.0, availability: 0.8031, cost_per_month: 163.0, spof_count: 1, ..Metrics::default() }
    }

    #[test]
    fn all_goals_passing_gives_five_stars() {
        let v = grade(
            &result(sample()),
            &[goal("lat", "p95", GoalOp::Le, 100.0), goal("cost", "costPerMonth", GoalOp::Le, 200.0)],
        );
        assert!(v.passed);
        assert_eq!((v.score, v.stars), (100, 5));
        assert_eq!(v.goals[0].measured, Some(37.0));
    }

    #[test]
    fn two_of_five_gives_score_40_and_one_star() {
        let goals = [
            goal("lat", "p95", GoalOp::Le, 100.0),
            goal("avail", "availability", GoalOp::Ge, 0.999),
            goal("spof", "spofCount", GoalOp::Eq, 0.0),
            goal("cost", "costPerMonth", GoalOp::Le, 200.0),
            goal("exposed", "exposedBackends", GoalOp::Eq, 1.0),
        ];
        let v = grade(&result(sample()), &goals);
        assert!(!v.passed);
        assert_eq!(v.goals.iter().filter(|g| g.passed).count(), 2);
        assert_eq!((v.score, v.stars), (40, 1));
    }

    #[test]
    fn unknown_and_null_metrics_fail_with_no_measurement() {
        let v = grade(
            &result(sample()),
            &[goal("x", "noSuchMetric", GoalOp::Le, 1.0), goal("ids", "duplicateIds", GoalOp::Eq, 0.0)],
        );
        assert!(v.goals.iter().all(|g| !g.passed && g.measured.is_none()));
    }

    #[test]
    fn equality_has_a_tiny_tolerance() {
        assert!(compare(0.1 + 0.2, GoalOp::Eq, 0.3));
        assert!(!compare(0.31, GoalOp::Eq, 0.3));
        assert!(compare(5.0, GoalOp::Ge, 5.0));
        assert!(compare(5.0, GoalOp::Le, 5.0));
    }

    #[test]
    fn no_goals_passes() {
        let v = grade(&result(sample()), &[]);
        assert!(v.passed);
        assert_eq!((v.score, v.stars), (100, 5));
    }

    #[test]
    fn every_metrics_field_has_a_key() {
        // Keep metric_value in sync with Metrics: serialize Metrics and look up each key.
        let json = serde_json::to_value(Metrics::default()).unwrap();
        for key in json.as_object().unwrap().keys() {
            let known = metric_value(&Metrics { duplicate_ids: Some(0.0), out_of_order_ids: Some(0.0), lost_updates: Some(0.0), write_conflicts: Some(0.0), duplicate_writes: Some(0.0), stale_reads: Some(0.0), peak_queue_depth: Some(0.0), lost_messages: Some(0.0), status_flaps: Some(0.0), stale_online: Some(0.0), inbox_writes_per_sec: Some(0.0), ..Metrics::default() }, key);
            assert!(known.is_some(), "metric_value does not know {key}");
        }
    }
}
```

Add to `lib.rs`: `pub mod grade;` and `pub use grade::{grade, metric_value};`.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `./dev cargo test -p sim-core grade::`
Expected: compile errors (`grade`, `compare`, `metric_value` not found).

- [ ] **Step 3: Implement grading above the tests**

```rust
//! Goals -> verdict. Grading is separate from simulation so one run can be scored against
//! several challenge modes, and Lab runs are not scored at all.

use crate::types::{GoalOp, GoalResult, Goal, Metrics, SimResult, Verdict};

pub fn metric_value(m: &Metrics, key: &str) -> Option<f64> {
    Some(match key {
        "p50" => m.p50,
        "p95" => m.p95,
        "p99" => m.p99,
        "availability" => m.availability,
        "throughputRps" => m.throughput_rps,
        "costPerMonth" => m.cost_per_month,
        "spofCount" => f64::from(m.spof_count),
        "exposedBackends" => f64::from(m.exposed_backends),
        "peakBusy" => m.peak_busy,
        "peakDbConnections" => m.peak_db_connections,
        "cacheOps" => m.cache_ops,
        "requestsTotal" => m.requests_total,
        "requestsOk" => m.requests_ok,
        "requestsRejected" => m.requests_rejected,
        "requestsTimedOut" => m.requests_timed_out,
        "requestsUnreachable" => m.requests_unreachable,
        "duplicateIds" => return m.duplicate_ids,
        "outOfOrderIds" => return m.out_of_order_ids,
        "lostUpdates" => return m.lost_updates,
        "writeConflicts" => return m.write_conflicts,
        "duplicateWrites" => return m.duplicate_writes,
        "staleReads" => return m.stale_reads,
        "peakQueueDepth" => return m.peak_queue_depth,
        "lostMessages" => return m.lost_messages,
        "statusFlaps" => return m.status_flaps,
        "staleOnline" => return m.stale_online,
        "inboxWritesPerSec" => return m.inbox_writes_per_sec,
        _ => return None,
    })
}

pub fn compare(measured: f64, op: GoalOp, value: f64) -> bool {
    match op {
        GoalOp::Le => measured <= value,
        GoalOp::Ge => measured >= value,
        GoalOp::Eq => (measured - value).abs() <= 1e-9 * value.abs().max(1.0),
    }
}

pub fn grade(result: &SimResult, goals: &[Goal]) -> Verdict {
    let results: Vec<GoalResult> = goals
        .iter()
        .map(|g| {
            let measured = metric_value(&result.metrics, &g.metric);
            GoalResult {
                id: g.id.clone(),
                passed: measured.is_some_and(|v| compare(v, g.op, g.value)),
                measured,
            }
        })
        .collect();
    let total = results.len() as u32;
    let passed = results.iter().filter(|r| r.passed).count() as u32;
    if total == 0 {
        return Verdict { passed: true, score: 100, stars: 5, goals: results };
    }
    let all = passed == total;
    Verdict {
        passed: all,
        score: libm::round(100.0 * f64::from(passed) / f64::from(total)) as u32,
        stars: if all { 5 } else { (4 * passed / total) as u8 },
        goals: results,
    }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `./dev cargo test -p sim-core grade::`
Expected: 6 passed.

- [ ] **Step 5: Commit**

```bash
git add crates/sim-core/src
git commit -m "feat(sim-core): add goal grading and metric lookup

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Golden fixtures, property tests and snapshots

**Files:**
- Create: `crates/sim-core/src/fixture.rs`, `crates/sim-core/tests/golden.rs`, `crates/sim-core/tests/properties.rs`, `fixtures/golden/*.json` (10 files listed below), `crates/sim-core/tests/snapshots/` (generated)
- Modify: `crates/sim-core/src/lib.rs`

**Interfaces:**
- Consumes: `simulate` (Task 6), `metric_value`, `compare` (Task 9).
- Produces:
  - `pub struct Fixture { id: String, description: String, input: SimInput, expect: BTreeMap<String, BTreeMap<String, f64>>, expect_events: Vec<String> }` (serde camelCase; `expect` maps metric key → `{ "<=" | ">=" | "==": value }`, several ops allowed per metric).
  - `pub struct FixtureFailure { metric: String, op: String, expected: f64, measured: Option<f64> }`; for a missing event, `metric = "event:<code>"`, `op = "present"`, `expected = 1`.
  - `pub struct FixtureReport { id: String, passed: bool, failures: Vec<FixtureFailure>, validation: Vec<ValidationIssue>, metrics: Option<Metrics> }`.
  - `pub fn check_fixture(f: &Fixture) -> FixtureReport`.

- [ ] **Step 1: Write the fixture checker with a unit test**

Create `crates/sim-core/src/fixture.rs`:

```rust
//! Golden/parity fixture format shared by Rust tests, the CLI and the wasm build.

use crate::grade::{compare, metric_value};
use crate::simulate;
use crate::types::{GoalOp, Metrics, SimInput, ValidationIssue};
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

#[cfg_attr(feature = "ts", derive(ts_rs::TS), ts(export))]
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Fixture {
    pub id: String,
    #[serde(default)]
    pub description: String,
    pub input: SimInput,
    #[serde(default)]
    pub expect: BTreeMap<String, BTreeMap<String, f64>>,
    #[serde(default)]
    pub expect_events: Vec<String>,
}

#[cfg_attr(feature = "ts", derive(ts_rs::TS), ts(export))]
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FixtureFailure {
    pub metric: String,
    pub op: String,
    pub expected: f64,
    pub measured: Option<f64>,
}

#[cfg_attr(feature = "ts", derive(ts_rs::TS), ts(export))]
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FixtureReport {
    pub id: String,
    pub passed: bool,
    pub failures: Vec<FixtureFailure>,
    pub validation: Vec<ValidationIssue>,
    pub metrics: Option<Metrics>,
}

pub fn parse_op(op: &str) -> Option<GoalOp> {
    match op {
        "<=" => Some(GoalOp::Le),
        ">=" => Some(GoalOp::Ge),
        "==" => Some(GoalOp::Eq),
        _ => None,
    }
}

pub fn check_fixture(f: &Fixture) -> FixtureReport {
    let result = match simulate(&f.input) {
        Ok(r) => r,
        Err(issues) => {
            return FixtureReport {
                id: f.id.clone(),
                passed: false,
                failures: vec![],
                validation: issues,
                metrics: None,
            }
        }
    };
    let mut failures = Vec::new();
    for (metric, conditions) in &f.expect {
        let measured = metric_value(&result.metrics, metric);
        for (op, expected) in conditions {
            let ok = match (parse_op(op), measured) {
                (Some(op), Some(v)) => compare(v, op, *expected),
                _ => false,
            };
            if !ok {
                failures.push(FixtureFailure { metric: metric.clone(), op: op.clone(), expected: *expected, measured });
            }
        }
    }
    for code in &f.expect_events {
        if !result.events.iter().any(|e| &e.code == code) {
            failures.push(FixtureFailure {
                metric: format!("event:{code}"),
                op: "present".into(),
                expected: 1.0,
                measured: None,
            });
        }
    }
    FixtureReport {
        id: f.id.clone(),
        passed: failures.is_empty(),
        failures,
        validation: vec![],
        metrics: Some(result.metrics),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_util::{input, web_tier};

    #[test]
    fn reports_each_failed_condition_and_missing_event() {
        let mut expect = BTreeMap::new();
        expect.insert("p95".to_string(), BTreeMap::from([("<=".to_string(), 0.001), (">=".to_string(), 0.0)]));
        expect.insert("nope".to_string(), BTreeMap::from([("==".to_string(), 1.0)]));
        let f = Fixture {
            id: "t".into(),
            description: String::new(),
            input: input(web_tier(1, 1), 1_000.0),
            expect,
            expect_events: vec!["db.promoted".into()],
        };
        let r = check_fixture(&f);
        assert!(!r.passed);
        let metrics: Vec<&str> = r.failures.iter().map(|x| x.metric.as_str()).collect();
        assert_eq!(metrics, vec!["nope", "p95", "event:db.promoted"]);
    }
}
```

Add to `lib.rs`: `pub mod fixture;`.

Run: `./dev cargo test -p sim-core fixture::`
Expected: 1 passed.

- [ ] **Step 2: Write the ten golden fixtures**

Each file is a `Fixture`. Write them exactly:

`fixtures/golden/web-tier-light.json`:

```json
{
  "id": "web-tier-light",
  "description": "LB with 2 replicas in front of 2 web servers at 2,000 rps: fast, available, no single point of failure.",
  "input": {
    "graph": {
      "nodes": [
        {"id": "users", "kind": "client"},
        {"id": "lb", "kind": "lb", "replicas": 2},
        {"id": "web", "kind": "web-server", "replicas": 2}
      ],
      "edges": [
        {"id": "e1", "from": "users", "to": "lb", "kind": "http"},
        {"id": "e2", "from": "lb", "to": "web", "kind": "http"}
      ]
    },
    "workload": {"baseRps": 2000},
    "seed": 1
  },
  "expect": {
    "availability": {">=": 0.999},
    "p95": {"<=": 20},
    "spofCount": {"==": 0},
    "exposedBackends": {"==": 0},
    "costPerMonth": {"==": 95}
  }
}
```

`fixtures/golden/web-tier-surge-single.json`:

```json
{
  "id": "web-tier-surge-single",
  "description": "One 1-vCPU web server reached directly by clients; traffic triples for 6 s.",
  "input": {
    "graph": {
      "nodes": [
        {"id": "users", "kind": "client"},
        {"id": "web", "kind": "web-server"}
      ],
      "edges": [{"id": "e1", "from": "users", "to": "web", "kind": "http"}]
    },
    "workload": {"baseRps": 8000, "surge": {"factor": 3, "atMs": 2000, "durationMs": 6000}},
    "seed": 1
  },
  "expect": {
    "p95": {">=": 300},
    "availability": {"<=": 0.95},
    "spofCount": {"==": 1},
    "exposedBackends": {"==": 1}
  },
  "expectEvents": ["node.overloaded"]
}
```

`fixtures/golden/web-tier-surge-scaled.json`:

```json
{
  "id": "web-tier-surge-scaled",
  "description": "Same surge, behind an LB with 2 replicas and 5 web servers.",
  "input": {
    "graph": {
      "nodes": [
        {"id": "users", "kind": "client"},
        {"id": "lb", "kind": "lb", "replicas": 2},
        {"id": "web", "kind": "web-server", "replicas": 5}
      ],
      "edges": [
        {"id": "e1", "from": "users", "to": "lb", "kind": "http"},
        {"id": "e2", "from": "lb", "to": "web", "kind": "http"}
      ]
    },
    "workload": {"baseRps": 8000, "surge": {"factor": 3, "atMs": 2000, "durationMs": 6000}},
    "seed": 1
  },
  "expect": {
    "p95": {"<=": 100},
    "availability": {">=": 0.999},
    "spofCount": {"==": 0},
    "costPerMonth": {"<=": 200}
  }
}
```

`fixtures/golden/reference-surge-pass.json` (shape of the parity reference run: 11 s, surge 4.0–5.5 s):

```json
{
  "id": "reference-surge-pass",
  "description": "11 s run, 8,000 rps base, 3x for 1.5 s from 4 s; LB x2 and 5 web servers pass every goal.",
  "input": {
    "graph": {
      "nodes": [
        {"id": "users", "kind": "client"},
        {"id": "lb", "kind": "lb", "replicas": 2},
        {"id": "web", "kind": "web-server", "replicas": 5}
      ],
      "edges": [
        {"id": "e1", "from": "users", "to": "lb", "kind": "http"},
        {"id": "e2", "from": "lb", "to": "web", "kind": "http"}
      ]
    },
    "workload": {"baseRps": 8000, "surge": {"factor": 3, "atMs": 4000, "durationMs": 1500}},
    "durationMs": 11000,
    "seed": 1
  },
  "expect": {
    "p95": {"<=": 100},
    "availability": {">=": 0.999},
    "costPerMonth": {"==": 162.5},
    "requestsTotal": {">=": 110000, "<=": 114000}
  }
}
```

`fixtures/golden/db-primary-down-no-replica.json`:

```json
{
  "id": "db-primary-down-no-replica",
  "description": "Losing the only PostgreSQL instance at 3 s breaks every request that needs it.",
  "input": {
    "graph": {
      "nodes": [
        {"id": "users", "kind": "client"},
        {"id": "lb", "kind": "lb", "replicas": 2},
        {"id": "web", "kind": "web-server", "replicas": 3},
        {"id": "pg", "kind": "postgres", "config": {"readReplicas": 0}}
      ],
      "edges": [
        {"id": "e1", "from": "users", "to": "lb", "kind": "http"},
        {"id": "e2", "from": "lb", "to": "web", "kind": "http"},
        {"id": "e3", "from": "web", "to": "pg", "kind": "db"}
      ]
    },
    "workload": {"baseRps": 2000},
    "faults": [{"kind": "db-primary-down", "target": "pg", "atMs": 3000}],
    "seed": 1
  },
  "expect": {"availability": {"<=": 0.75}, "spofCount": {"==": 1}},
  "expectEvents": ["db.primary-down", "db.no-replica"]
}
```

`fixtures/golden/db-primary-down-with-replica.json`:

```json
{
  "id": "db-primary-down-with-replica",
  "description": "With one read replica, the replica is promoted 600 ms after the primary is lost.",
  "input": {
    "graph": {
      "nodes": [
        {"id": "users", "kind": "client"},
        {"id": "lb", "kind": "lb", "replicas": 2},
        {"id": "web", "kind": "web-server", "replicas": 3},
        {"id": "pg", "kind": "postgres", "config": {"readReplicas": 1}}
      ],
      "edges": [
        {"id": "e1", "from": "users", "to": "lb", "kind": "http"},
        {"id": "e2", "from": "lb", "to": "web", "kind": "http"},
        {"id": "e3", "from": "web", "to": "pg", "kind": "db"}
      ]
    },
    "workload": {"baseRps": 2000},
    "faults": [{"kind": "db-primary-down", "target": "pg", "atMs": 3000}],
    "seed": 1
  },
  "expect": {"availability": {">=": 0.95}, "spofCount": {"==": 0}},
  "expectEvents": ["db.primary-down", "db.promoted"]
}
```

`fixtures/golden/web-instance-down-redundant.json`:

```json
{
  "id": "web-instance-down-redundant",
  "description": "Two web servers behind an LB; losing one at 3 s is absorbed.",
  "input": {
    "graph": {
      "nodes": [
        {"id": "users", "kind": "client"},
        {"id": "lb", "kind": "lb", "replicas": 2},
        {"id": "web", "kind": "web-server", "replicas": 2}
      ],
      "edges": [
        {"id": "e1", "from": "users", "to": "lb", "kind": "http"},
        {"id": "e2", "from": "lb", "to": "web", "kind": "http"}
      ]
    },
    "workload": {"baseRps": 2000},
    "faults": [{"kind": "instance-down", "target": "web", "atMs": 3000}],
    "seed": 1
  },
  "expect": {"availability": {">=": 0.99}},
  "expectEvents": ["instance.down"]
}
```

`fixtures/golden/lb-without-backends.json`:

```json
{
  "id": "lb-without-backends",
  "description": "A load balancer with nothing behind it: every request is unreachable.",
  "input": {
    "graph": {
      "nodes": [
        {"id": "users", "kind": "client"},
        {"id": "lb", "kind": "lb", "replicas": 2}
      ],
      "edges": [{"id": "e1", "from": "users", "to": "lb", "kind": "http"}]
    },
    "workload": {"baseRps": 1000},
    "seed": 1
  },
  "expect": {"availability": {"==": 0}, "requestsOk": {"==": 0}}
}
```

`fixtures/golden/traffic-surge-fault.json`:

```json
{
  "id": "traffic-surge-fault",
  "description": "The traffic-surge-3x fault triples load from 3 s to the end of the run.",
  "input": {
    "graph": {
      "nodes": [
        {"id": "users", "kind": "client"},
        {"id": "lb", "kind": "lb", "replicas": 2},
        {"id": "web", "kind": "web-server", "replicas": 5}
      ],
      "edges": [
        {"id": "e1", "from": "users", "to": "lb", "kind": "http"},
        {"id": "e2", "from": "lb", "to": "web", "kind": "http"}
      ]
    },
    "workload": {"baseRps": 1000},
    "faults": [{"kind": "traffic-surge-3x", "atMs": 3000}],
    "seed": 1
  },
  "expect": {"requestsTotal": {">=": 23200, "<=": 24800}, "availability": {">=": 0.999}},
  "expectEvents": ["fault.traffic-surge"]
}
```

`fixtures/golden/slow-hardware-surge.json` (run-level calibration override):

```json
{
  "id": "slow-hardware-surge",
  "description": "The scaled design that passes on default hardware fails when each vCPU only handles 3,000 rps.",
  "input": {
    "graph": {
      "nodes": [
        {"id": "users", "kind": "client"},
        {"id": "lb", "kind": "lb", "replicas": 2},
        {"id": "web", "kind": "web-server", "replicas": 5}
      ],
      "edges": [
        {"id": "e1", "from": "users", "to": "lb", "kind": "http"},
        {"id": "e2", "from": "lb", "to": "web", "kind": "http"}
      ]
    },
    "workload": {"baseRps": 8000, "surge": {"factor": 3, "atMs": 2000, "durationMs": 6000}},
    "calibration": {"webRpsPerVcpu": 3000},
    "seed": 1
  },
  "expect": {"availability": {"<=": 0.95}, "costPerMonth": {"==": 162.5}},
  "expectEvents": ["node.overloaded"]
}
```

- [ ] **Step 3: Write the golden test and snapshot test**

`crates/sim-core/tests/golden.rs`:

```rust
use sim_core::fixture::{check_fixture, Fixture};
use std::path::PathBuf;

fn fixtures() -> Vec<Fixture> {
    let dir = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../fixtures/golden");
    let mut paths: Vec<PathBuf> = std::fs::read_dir(&dir)
        .expect("fixtures/golden exists")
        .map(|e| e.unwrap().path())
        .filter(|p| p.extension().is_some_and(|x| x == "json"))
        .collect();
    paths.sort();
    paths
        .iter()
        .map(|p| {
            let text = std::fs::read_to_string(p).unwrap();
            serde_json::from_str(&text).unwrap_or_else(|e| panic!("{}: {e}", p.display()))
        })
        .collect()
}

#[test]
fn all_golden_fixtures_pass() {
    let all = fixtures();
    assert!(all.len() >= 10, "expected at least 10 golden fixtures, found {}", all.len());
    let failures: Vec<String> = all
        .iter()
        .map(check_fixture)
        .filter(|r| !r.passed)
        .map(|r| format!("{}: failures={:?} validation={:?} metrics={:?}", r.id, r.failures, r.validation, r.metrics))
        .collect();
    assert!(failures.is_empty(), "{failures:#?}");
}

#[test]
fn golden_metrics_snapshots() {
    for f in fixtures() {
        let result = sim_core::simulate(&f.input).expect("golden inputs are valid");
        insta::assert_json_snapshot!(f.id.clone(), result.metrics);
    }
}
```

- [ ] **Step 4: Write the property tests**

`crates/sim-core/tests/properties.rs`:

```rust
use proptest::prelude::*;
use sim_core::{simulate, Metrics, SimInput};

fn build(lb: u32, web: u32, cpu: u32, pg: Option<u32>, rps: f64, seed: u32, surge: bool) -> SimInput {
    let mut nodes = vec![
        serde_json::json!({"id": "users", "kind": "client"}),
        serde_json::json!({"id": "lb", "kind": "lb", "replicas": lb}),
        serde_json::json!({"id": "web", "kind": "web-server", "replicas": web, "config": {"cpu": cpu}}),
    ];
    let mut edges = vec![
        serde_json::json!({"id": "e1", "from": "users", "to": "lb", "kind": "http"}),
        serde_json::json!({"id": "e2", "from": "lb", "to": "web", "kind": "http"}),
    ];
    if let Some(replicas) = pg {
        nodes.push(serde_json::json!({"id": "pg", "kind": "postgres", "config": {"readReplicas": replicas}}));
        edges.push(serde_json::json!({"id": "e3", "from": "web", "to": "pg", "kind": "db"}));
    }
    let surge = if surge {
        serde_json::json!({"factor": 3, "atMs": 2000, "durationMs": 3000})
    } else {
        serde_json::Value::Null
    };
    serde_json::from_value(serde_json::json!({
        "graph": {"nodes": nodes, "edges": edges},
        "workload": {"baseRps": rps, "surge": surge},
        "durationMs": 3000,
        "seed": seed
    }))
    .unwrap()
}

fn finite(m: &Metrics) -> bool {
    [m.p50, m.p95, m.p99, m.availability, m.throughput_rps, m.cost_per_month, m.peak_busy, m.requests_total]
        .iter()
        .all(|v| v.is_finite())
}

proptest! {
    #![proptest_config(ProptestConfig::with_cases(48))]

    #[test]
    fn deterministic(lb in 1u32..4, web in 1u32..8, cpu in 1u32..4, pg in proptest::option::of(0u32..3),
                     rps in 0.0f64..60_000.0, seed in any::<u32>(), surge in any::<bool>()) {
        let i = build(lb, web, cpu, pg, rps, seed, surge);
        prop_assert_eq!(simulate(&i).unwrap(), simulate(&i).unwrap());
    }

    #[test]
    fn bounded_ordered_and_conserved(lb in 1u32..4, web in 1u32..8, cpu in 1u32..4, pg in proptest::option::of(0u32..3),
                                     rps in 0.0f64..60_000.0, seed in any::<u32>(), surge in any::<bool>()) {
        let m = simulate(&build(lb, web, cpu, pg, rps, seed, surge)).unwrap().metrics;
        prop_assert!(finite(&m));
        prop_assert!((0.0..=1.0).contains(&m.availability));
        prop_assert!(m.p50 <= m.p95 && m.p95 <= m.p99);
        let sum = m.requests_ok + m.requests_rejected + m.requests_timed_out + m.requests_unreachable;
        prop_assert!((sum - m.requests_total).abs() <= 1e-6 * m.requests_total.max(1.0));
    }

    // Spec §7.2 monotonicity, refined: with no database behind the web tier, adding a web
    // replica never lowers availability; when the smaller design already answered everything,
    // it never raises p95 either. (With a database, extra web capacity can legitimately push
    // more load into the database and time requests out there.)
    #[test]
    fn more_web_replicas_never_hurt(lb in 1u32..4, web in 1u32..6, cpu in 1u32..3,
                                    rps in 0.0f64..60_000.0, seed in any::<u32>(), surge in any::<bool>()) {
        let a = simulate(&build(lb, web, cpu, None, rps, seed, surge)).unwrap().metrics;
        let b = simulate(&build(lb, web + 1, cpu, None, rps, seed, surge)).unwrap().metrics;
        prop_assert!(b.availability >= a.availability - 1e-9, "{a:?} vs {b:?}");
        if a.requests_rejected == 0.0 && a.requests_timed_out == 0.0 && a.requests_unreachable == 0.0 {
            prop_assert!(b.p95 <= a.p95 + 1e-9, "{a:?} vs {b:?}");
        }
    }
}
```

- [ ] **Step 5: Run the golden and property tests; create snapshots**

Run: `./dev sh -c 'INSTA_UPDATE=always cargo test -p sim-core --test golden --test properties'`
Expected: `all_golden_fixtures_pass`, `golden_metrics_snapshots`, and the 3 property tests pass; 10 files appear under `crates/sim-core/tests/snapshots/`. If a golden fixture fails, read the printed metrics: fix the engine or a calibration constant, never the fixture's expectation, unless the expectation contradicts the scenario description (then fix both and say why in the commit message).

Run again without updating: `./dev cargo test -p sim-core`
Expected: all tests pass and no `.snap.new` files are created.

- [ ] **Step 6: Commit**

```bash
git add crates/sim-core fixtures/golden
git commit -m "test(sim-core): add golden fixtures, property tests and metric snapshots

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: Native CLI (`sim-cli`)

**Files:**
- Create: `crates/sim-cli/Cargo.toml`, `crates/sim-cli/src/main.rs`, `crates/sim-cli/tests/cli.rs`
- Modify: `Cargo.toml` (workspace members)

**Interfaces:**
- Consumes: `sim_core::{simulate, SimInput, SimResult}`, `sim_core::fixture::{Fixture, check_fixture, FixtureReport}`.
- Produces: binary `sim-cli` with commands
  - `sim-cli run <file>...` → pretty JSON array `[{ "file", "metrics", "events" }]` (each file is a `Fixture` or a bare `SimInput`).
  - `sim-cli result <file>` → the full `SimResult` as **compact** JSON on stdout (used by the cross-target check; must equal the wasm `simulateJson` output byte for byte).
  - `sim-cli check <path>...` → files or directories of fixtures, checked in parallel; prints `PASS <id>` / `FAIL <id> <metric> <op> <expected> measured=<v>` lines sorted by id, then `N passed, M failed`; exit code 1 if any failed. `--json` prints the `FixtureReport` array instead.

- [ ] **Step 1: Create the crate and add it to the workspace**

In `Cargo.toml` change `members = ["crates/sim-core"]` to `members = ["crates/sim-core", "crates/sim-cli"]`.

`crates/sim-cli/Cargo.toml`:

```toml
[package]
name = "sim-cli"
version.workspace = true
edition.workspace = true
rust-version.workspace = true
license.workspace = true
publish.workspace = true

[dependencies]
sim-core = { path = "../sim-core" }
clap = { version = "4", features = ["derive"] }
rayon = "1"
serde = { version = "1", features = ["derive"] }
serde_json = "1"

[dev-dependencies]
assert_cmd = "2"
tempfile = "3"
```

- [ ] **Step 2: Write the failing integration tests**

`crates/sim-cli/tests/cli.rs`:

```rust
use assert_cmd::Command;
use std::path::PathBuf;

fn golden_dir() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../fixtures/golden")
}

#[test]
fn check_passes_on_golden_fixtures() {
    let out = Command::cargo_bin("sim-cli").unwrap().arg("check").arg(golden_dir()).assert().success();
    let stdout = String::from_utf8(out.get_output().stdout.clone()).unwrap();
    assert!(stdout.contains("PASS web-tier-light"));
    assert!(stdout.contains("0 failed"));
}

#[test]
fn check_fails_with_exit_code_1() {
    let dir = tempfile::tempdir().unwrap();
    let bad = std::fs::read_to_string(golden_dir().join("web-tier-light.json"))
        .unwrap()
        .replace(r#""p95": {"<=": 20}"#, r#""p95": {"<=": 0.0001}"#);
    std::fs::write(dir.path().join("bad.json"), bad).unwrap();
    let out = Command::cargo_bin("sim-cli").unwrap().arg("check").arg(dir.path()).assert().code(1);
    let stdout = String::from_utf8(out.get_output().stdout.clone()).unwrap();
    assert!(stdout.contains("FAIL web-tier-light p95 <= 0.0001"));
}

#[test]
fn result_matches_library_output() {
    let file = golden_dir().join("web-tier-surge-scaled.json");
    let out = Command::cargo_bin("sim-cli").unwrap().arg("result").arg(&file).assert().success();
    let stdout = String::from_utf8(out.get_output().stdout.clone()).unwrap();
    let fixture: sim_core::fixture::Fixture =
        serde_json::from_str(&std::fs::read_to_string(&file).unwrap()).unwrap();
    let expected = serde_json::to_string(&sim_core::simulate(&fixture.input).unwrap()).unwrap();
    assert_eq!(stdout.trim_end(), expected);
}

#[test]
fn run_accepts_bare_sim_input() {
    let dir = tempfile::tempdir().unwrap();
    let text = std::fs::read_to_string(golden_dir().join("web-tier-light.json")).unwrap();
    let v: serde_json::Value = serde_json::from_str(&text).unwrap();
    std::fs::write(dir.path().join("input.json"), v["input"].to_string()).unwrap();
    let out = Command::cargo_bin("sim-cli").unwrap().arg("run").arg(dir.path().join("input.json")).assert().success();
    let parsed: serde_json::Value = serde_json::from_slice(&out.get_output().stdout).unwrap();
    assert!(parsed[0]["metrics"]["availability"].as_f64().unwrap() > 0.999);
}

/// Spec budget: 100 golden-sized fixtures in under 2 s on 8 cores. Release build only:
/// `./dev cargo test -p sim-cli --release -- --ignored`
#[test]
#[ignore]
fn checks_100_fixtures_under_two_seconds() {
    let dir = tempfile::tempdir().unwrap();
    let text = std::fs::read_to_string(golden_dir().join("web-tier-surge-scaled.json")).unwrap();
    for k in 0..100 {
        std::fs::write(dir.path().join(format!("f{k:03}.json")), &text).unwrap();
    }
    let start = std::time::Instant::now();
    Command::cargo_bin("sim-cli").unwrap().arg("check").arg(dir.path()).assert().success();
    let elapsed = start.elapsed();
    assert!(elapsed.as_secs_f64() < 2.0, "took {elapsed:?}");
}
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `./dev cargo test -p sim-cli`
Expected: build error, `src/main.rs` missing.

- [ ] **Step 4: Implement `crates/sim-cli/src/main.rs`**

```rust
use clap::{Parser, Subcommand};
use rayon::prelude::*;
use sim_core::fixture::{check_fixture, Fixture, FixtureReport};
use sim_core::{simulate, SimInput};
use std::path::{Path, PathBuf};
use std::process::ExitCode;

#[derive(Parser)]
#[command(name = "sim-cli", version, about = "Run and check system design simulations")]
struct Cli {
    #[command(subcommand)]
    command: Cmd,
}

#[derive(Subcommand)]
enum Cmd {
    /// Run inputs or fixtures and print metrics and events.
    Run { files: Vec<PathBuf> },
    /// Print the full result of one input or fixture as compact JSON.
    Result { file: PathBuf },
    /// Check fixtures (files or directories) and report pass/fail.
    Check {
        paths: Vec<PathBuf>,
        #[arg(long)]
        json: bool,
    },
}

/// A file holds either a Fixture (has an "input" key) or a bare SimInput.
fn load_input(path: &Path) -> Result<SimInput, String> {
    let text = std::fs::read_to_string(path).map_err(|e| format!("{}: {e}", path.display()))?;
    let value: serde_json::Value = serde_json::from_str(&text).map_err(|e| format!("{}: {e}", path.display()))?;
    let input = if value.get("input").is_some() { value["input"].clone() } else { value };
    serde_json::from_value(input).map_err(|e| format!("{}: {e}", path.display()))
}

fn load_fixture(path: &Path) -> Result<Fixture, String> {
    let text = std::fs::read_to_string(path).map_err(|e| format!("{}: {e}", path.display()))?;
    serde_json::from_str(&text).map_err(|e| format!("{}: {e}", path.display()))
}

fn expand(paths: &[PathBuf]) -> Vec<PathBuf> {
    let mut out = Vec::new();
    for p in paths {
        if p.is_dir() {
            if let Ok(entries) = std::fs::read_dir(p) {
                out.extend(
                    entries
                        .filter_map(|e| e.ok().map(|e| e.path()))
                        .filter(|f| f.extension().is_some_and(|x| x == "json")),
                );
            }
        } else {
            out.push(p.clone());
        }
    }
    out.sort();
    out
}

fn main() -> ExitCode {
    match Cli::parse().command {
        Cmd::Run { files } => {
            let mut rows = Vec::new();
            for f in &files {
                let input = match load_input(f) {
                    Ok(i) => i,
                    Err(e) => {
                        eprintln!("{e}");
                        return ExitCode::from(2);
                    }
                };
                match simulate(&input) {
                    Ok(r) => rows.push(serde_json::json!({"file": f, "metrics": r.metrics, "events": r.events})),
                    Err(issues) => rows.push(serde_json::json!({"file": f, "validation": issues})),
                }
            }
            println!("{}", serde_json::to_string_pretty(&rows).expect("serializable"));
            ExitCode::SUCCESS
        }
        Cmd::Result { file } => match load_input(&file).map(|i| simulate(&i)) {
            Ok(Ok(r)) => {
                println!("{}", serde_json::to_string(&r).expect("serializable"));
                ExitCode::SUCCESS
            }
            Ok(Err(issues)) => {
                println!("{}", serde_json::to_string(&issues).expect("serializable"));
                ExitCode::from(1)
            }
            Err(e) => {
                eprintln!("{e}");
                ExitCode::from(2)
            }
        },
        Cmd::Check { paths, json } => {
            let files = expand(&paths);
            let mut reports: Vec<FixtureReport> = files
                .par_iter()
                .map(|f| match load_fixture(f) {
                    Ok(fx) => check_fixture(&fx),
                    Err(e) => FixtureReport {
                        id: e,
                        passed: false,
                        failures: vec![],
                        validation: vec![],
                        metrics: None,
                    },
                })
                .collect();
            reports.sort_by(|a, b| a.id.cmp(&b.id));
            let failed = reports.iter().filter(|r| !r.passed).count();
            if json {
                println!("{}", serde_json::to_string_pretty(&reports).expect("serializable"));
            } else {
                for r in &reports {
                    if r.passed {
                        println!("PASS {}", r.id);
                    } else if !r.validation.is_empty() {
                        let codes: Vec<&str> = r.validation.iter().map(|i| i.code.as_str()).collect();
                        println!("FAIL {} validation {}", r.id, codes.join(","));
                    } else if r.failures.is_empty() {
                        println!("FAIL {} unreadable", r.id);
                    } else {
                        for f in &r.failures {
                            let measured = f.measured.map_or("null".to_string(), |v| v.to_string());
                            println!("FAIL {} {} {} {} measured={}", r.id, f.metric, f.op, f.expected, measured);
                        }
                    }
                }
                println!("{} passed, {} failed", reports.len() - failed, failed);
            }
            if failed > 0 { ExitCode::from(1) } else { ExitCode::SUCCESS }
        }
    }
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `./dev cargo test -p sim-cli`
Expected: 4 passed, 1 ignored.

Run: `./dev cargo test -p sim-cli --release -- --ignored`
Expected: `checks_100_fixtures_under_two_seconds ... ok`.

- [ ] **Step 6: Commit**

```bash
git add Cargo.toml Cargo.lock crates/sim-cli
git commit -m "feat(sim-cli): add run, result and parallel check commands

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 12: WebAssembly bindings (`sim-wasm`)

**Files:**
- Create: `crates/sim-wasm/Cargo.toml`, `crates/sim-wasm/src/lib.rs`
- Modify: `Cargo.toml` (workspace members)

**Interfaces:**
- Consumes: `sim_core::{simulate, validate_graph, grade, list_components, SimInput, SimResult, Graph, GraphLimits, Goal}`, `sim_core::fixture::{Fixture, check_fixture}`.
- Produces (JS names, generated by wasm-bindgen):
  - `simulate(input: object): SimRun` — throws a plain JS object `{ kind: "validation", issues: ValidationIssue[] }` when the graph is invalid, or `{ kind: "input", message }` when the input does not parse.
  - `class SimRun` with `metrics()`, `events()`, `timelineHeader()` → `{ frameMs, frames, nodeIds, fields }`, `timelineData(): Float32Array`, `traceCount(): number`, `trace(i): Trace`, `traceSummaries(): { id, class, outcome, latencyMs }[]`, `resultJson(): string`, `free()`.
  - `validateGraph(graph, limits?)`, `grade(run, goals)`, `listComponents()`, `defaultCalibration()` (the `Calibration` defaults, for the UI's parameter editor), `checkFixture(json: string)`, `simulateJson(json: string): string` (full compact `SimResult` JSON for a `Fixture` or bare `SimInput`; byte-identical to `sim-cli result`), `engineVersion(): string`.

- [ ] **Step 1: Create the crate**

In `Cargo.toml` set `members = ["crates/sim-core", "crates/sim-cli", "crates/sim-wasm"]`.

`crates/sim-wasm/Cargo.toml`:

```toml
[package]
name = "sim-wasm"
version.workspace = true
edition.workspace = true
rust-version.workspace = true
license.workspace = true
publish.workspace = true

[lib]
crate-type = ["cdylib", "rlib"]

[dependencies]
sim-core = { path = "../sim-core" }
wasm-bindgen = "=0.2.100"
serde = { version = "1", features = ["derive"] }
serde-wasm-bindgen = "0.6"
serde_json = "1"

# wasm-opt runs from packages/sim with a pinned binaryen (see Task 13), not from wasm-pack.
[package.metadata.wasm-pack.profile.release]
wasm-opt = false
```

- [ ] **Step 2: Write `crates/sim-wasm/src/lib.rs`**

```rust
//! JS boundary. Crossed once per run: small parts (metrics, events, verdicts) as JS objects,
//! the timeline as a Float32Array, traces only on demand.

use serde::Serialize;
use sim_core::fixture::{check_fixture as core_check, Fixture};
use sim_core::{Goal, Graph, GraphLimits, SimInput, SimResult};
use wasm_bindgen::prelude::*;

fn to_js<T: Serialize>(value: &T) -> Result<JsValue, JsValue> {
    value
        .serialize(&serde_wasm_bindgen::Serializer::json_compatible())
        .map_err(|e| JsValue::from_str(&e.to_string()))
}

fn input_error(message: String) -> JsValue {
    to_js(&serde_json::json!({"kind": "input", "message": message})).unwrap_or(JsValue::NULL)
}

/// A JSON document is a Fixture (has "input") or a bare SimInput. Same rule as sim-cli.
fn parse_input_json(json: &str) -> Result<SimInput, String> {
    let value: serde_json::Value = serde_json::from_str(json).map_err(|e| e.to_string())?;
    let input = if value.get("input").is_some() { value["input"].clone() } else { value };
    serde_json::from_value(input).map_err(|e| e.to_string())
}

#[wasm_bindgen]
pub struct SimRun {
    result: SimResult,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct TimelineHeader<'a> {
    frame_ms: u32,
    frames: usize,
    node_ids: &'a [String],
    fields: &'a [String],
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct TraceSummary<'a> {
    id: u32,
    class: &'a sim_core::RequestClass,
    outcome: &'a sim_core::TraceOutcome,
    latency_ms: f64,
}

#[wasm_bindgen]
impl SimRun {
    pub fn metrics(&self) -> Result<JsValue, JsValue> {
        to_js(&self.result.metrics)
    }

    pub fn events(&self) -> Result<JsValue, JsValue> {
        to_js(&self.result.events)
    }

    #[wasm_bindgen(js_name = timelineHeader)]
    pub fn timeline_header(&self) -> Result<JsValue, JsValue> {
        let t = &self.result.timeline;
        let cell = t.node_ids.len() * t.fields.len();
        let frames = if cell == 0 { 0 } else { t.data.len() / cell };
        to_js(&TimelineHeader { frame_ms: t.frame_ms, frames, node_ids: &t.node_ids, fields: &t.fields })
    }

    /// Copied into a JS-owned Float32Array, so it stays valid after free().
    #[wasm_bindgen(js_name = timelineData)]
    pub fn timeline_data(&self) -> Vec<f32> {
        self.result.timeline.data.clone()
    }

    #[wasm_bindgen(js_name = traceCount)]
    pub fn trace_count(&self) -> u32 {
        self.result.traces.len() as u32
    }

    pub fn trace(&self, index: u32) -> Result<JsValue, JsValue> {
        match self.result.traces.get(index as usize) {
            Some(t) => to_js(t),
            None => Err(JsValue::from_str("trace index out of range")),
        }
    }

    #[wasm_bindgen(js_name = traceSummaries)]
    pub fn trace_summaries(&self) -> Result<JsValue, JsValue> {
        let rows: Vec<TraceSummary> = self
            .result
            .traces
            .iter()
            .map(|t| TraceSummary { id: t.id, class: &t.class, outcome: &t.outcome, latency_ms: t.latency_ms })
            .collect();
        to_js(&rows)
    }

    #[wasm_bindgen(js_name = resultJson)]
    pub fn result_json(&self) -> String {
        serde_json::to_string(&self.result).expect("serializable")
    }
}

#[wasm_bindgen]
pub fn simulate(input: JsValue) -> Result<SimRun, JsValue> {
    let input: SimInput = serde_wasm_bindgen::from_value(input).map_err(|e| input_error(e.to_string()))?;
    match sim_core::simulate(&input) {
        Ok(result) => Ok(SimRun { result }),
        Err(issues) => Err(to_js(&serde_json::json!({"kind": "validation", "issues": issues}))?),
    }
}

#[wasm_bindgen(js_name = simulateJson)]
pub fn simulate_json(json: &str) -> Result<String, JsValue> {
    let input = parse_input_json(json).map_err(input_error)?;
    match sim_core::simulate(&input) {
        Ok(result) => Ok(serde_json::to_string(&result).expect("serializable")),
        Err(issues) => Ok(serde_json::to_string(&issues).expect("serializable")),
    }
}

#[wasm_bindgen(js_name = validateGraph)]
pub fn validate_graph(graph: JsValue, limits: JsValue) -> Result<JsValue, JsValue> {
    let graph: Graph = serde_wasm_bindgen::from_value(graph).map_err(|e| input_error(e.to_string()))?;
    let limits: Option<GraphLimits> = if limits.is_undefined() || limits.is_null() {
        None
    } else {
        Some(serde_wasm_bindgen::from_value(limits).map_err(|e| input_error(e.to_string()))?)
    };
    to_js(&sim_core::validate_graph(&graph, limits.as_ref()))
}

#[wasm_bindgen]
pub fn grade(run: &SimRun, goals: JsValue) -> Result<JsValue, JsValue> {
    let goals: Vec<Goal> = serde_wasm_bindgen::from_value(goals).map_err(|e| input_error(e.to_string()))?;
    to_js(&sim_core::grade(&run.result, &goals))
}

#[wasm_bindgen(js_name = listComponents)]
pub fn list_components() -> Result<JsValue, JsValue> {
    to_js(&sim_core::list_components())
}

#[wasm_bindgen(js_name = defaultCalibration)]
pub fn default_calibration() -> Result<JsValue, JsValue> {
    to_js(&sim_core::Calibration::default())
}

#[wasm_bindgen(js_name = checkFixture)]
pub fn check_fixture(json: &str) -> Result<JsValue, JsValue> {
    let fixture: Fixture = serde_json::from_str(json).map_err(|e| input_error(e.to_string()))?;
    to_js(&core_check(&fixture))
}

#[wasm_bindgen(js_name = engineVersion)]
pub fn engine_version() -> String {
    sim_core::engine_version().to_string()
}
```

- [ ] **Step 3: Check that it compiles for wasm and natively**

Run: `./dev cargo check -p sim-wasm --target wasm32-unknown-unknown`
Expected: `Finished` with no errors.

Run: `./dev cargo clippy -p sim-wasm --target wasm32-unknown-unknown -- -D warnings`
Expected: no warnings.

(Behavior is tested through Node in Task 13; JS values cannot be created in native `cargo test`.)

- [ ] **Step 4: Commit**

```bash
git add Cargo.toml Cargo.lock crates/sim-wasm
git commit -m "feat(sim-wasm): add wasm-bindgen API with typed-array timeline

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 13: `@sd/sim` TypeScript wrapper

**Files:**
- Create: `packages/sim/package.json`, `packages/sim/tsconfig.json`, `packages/sim/vitest.config.ts`, `packages/sim/scripts/build-wasm.mjs`, `packages/sim/src/{types.ts,binding.ts,errors.ts,timeline.ts,run.ts,sim.ts,node.ts,web.ts,index.ts}`, `packages/sim/test/{helpers.ts,run.test.ts,golden.test.ts,cross-target.test.ts,budget.test.ts}`

**Interfaces:**
- Consumes: the wasm API from Task 12; generated types in `packages/sim/src/generated/` (Task 1, Task 4, Task 10 — regenerate in Step 1).
- Produces:
  - `createSim(binding: WasmBinding): Sim` where `Sim = { simulate(input: SimInput): SimRun; simulateJson(json: string): string; validateGraph(graph: Graph, limits?: GraphLimits): ValidationIssue[]; grade(run: SimRun, goals: Goal[]): Verdict; listComponents(): ComponentMeta[]; defaultCalibration(): Calibration; checkFixture(json: string): FixtureReport; engineVersion(): string }`
  - `class SimRun` with getters `metrics`, `events`, `timeline: TimelineView`, methods `traceSummaries()`, `trace(i)`, `resultJson()`, `free()`; every member throws `Error("SimRun already freed")` after `free()`.
  - `class TimelineView` with `frames`, `frameMs`, `nodeIds`, `fields`, `value(frame, nodeId, field)`, `series(nodeId, field): Float32Array`.
  - `class SimValidationError extends Error { issues: ValidationIssue[] }` and `class SimInputError extends Error`.
  - `@sd/sim/node` exports a ready `sim` for Node; `@sd/sim/web` exports `loadSim(wasmUrl?)` for browsers/workers (tested in plan 1b).

- [ ] **Step 1: Regenerate TypeScript types**

Run: `./dev sh -c 'rm -rf packages/sim/src/generated && TS_RS_EXPORT_DIR=/work/packages/sim/src/generated cargo test -p sim-core --features ts export_bindings'`
Expected: `packages/sim/src/generated/` now also contains `ComponentMeta.ts`, `Role.ts`, `Calibration.ts`, `CalibrationOverrides.ts`, `Fixture.ts`, `FixtureReport.ts`, `FixtureFailure.ts`. Open `SimInput.ts` and confirm `calibration?: CalibrationOverrides`.

- [ ] **Step 2: Package scaffolding**

`packages/sim/package.json`:

```json
{
  "name": "@sd/sim",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./src/index.ts",
    "./node": "./src/node.ts",
    "./web": "./src/web.ts"
  },
  "scripts": {
    "build:wasm": "node scripts/build-wasm.mjs",
    "pretest": "node scripts/build-wasm.mjs",
    "test": "vitest run",
    "typecheck": "tsc --noEmit"
  },
  "devDependencies": {
    "@types/node": "^24.0.0",
    "binaryen": "^123.0.0",
    "typescript": "^5.6.0",
    "vitest": "^3.0.0"
  }
}
```

`packages/sim/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "skipLibCheck": true,
    "types": ["node"],
    "allowJs": true,
    "noEmit": true
  },
  "include": ["src", "test", "scripts"]
}
```

`packages/sim/vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: { testTimeout: 30_000, hookTimeout: 300_000 },
});
```

`packages/sim/scripts/build-wasm.mjs`:

```js
// Builds crates/sim-wasm for Node (CommonJS) and the web (ES module + init), then runs a
// pinned wasm-opt. Output goes to packages/sim/wasm/{node,web} (gitignored).
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const pkg = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const crate = path.resolve(pkg, "../../crates/sim-wasm");
const wasmOpt = path.join(pkg, "node_modules/.bin/wasm-opt");
const features = [
  "--enable-bulk-memory",
  "--enable-reference-types",
  "--enable-multivalue",
  "--enable-mutable-globals",
  "--enable-sign-ext",
  "--enable-nontrapping-float-to-int",
];

for (const [target, dir] of [["nodejs", "node"], ["web", "web"]]) {
  const out = path.join(pkg, "wasm", dir);
  execFileSync(
    "wasm-pack",
    ["build", crate, "--release", "--target", target, "--out-dir", out, "--out-name", "sim_wasm", "--no-pack"],
    { stdio: "inherit" },
  );
  const wasm = path.join(out, "sim_wasm_bg.wasm");
  execFileSync(wasmOpt, ["-O3", ...features, wasm, "-o", wasm], { stdio: "inherit" });
}
```

Install dependencies: `./dev pnpm install`
Expected: `packages/sim/node_modules/.bin/wasm-opt` exists; a `pnpm-lock.yaml` is created at the root.

Build: `./dev pnpm --filter @sd/sim build:wasm`
Expected: `packages/sim/wasm/node/sim_wasm.js`, `packages/sim/wasm/node/sim_wasm_bg.wasm`, `packages/sim/wasm/web/sim_wasm.js` exist.

- [ ] **Step 3: Write the failing tests**

`packages/sim/test/helpers.ts`:

```ts
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { SimInput } from "../src/types";

export const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
export const goldenDir = path.join(repoRoot, "fixtures/golden");

export function goldenFiles(): string[] {
  return fs.readdirSync(goldenDir).filter((f) => f.endsWith(".json")).sort().map((f) => path.join(goldenDir, f));
}

export function webTier(lb: number, web: number, baseRps: number): SimInput {
  return {
    graph: {
      nodes: [
        { id: "users", kind: "client", label: "", replicas: 1, config: {} },
        { id: "lb", kind: "lb", label: "", replicas: lb, config: {} },
        { id: "web", kind: "web-server", label: "", replicas: web, config: {} },
      ],
      edges: [
        { id: "e1", from: "users", to: "lb", kind: "http" },
        { id: "e2", from: "lb", to: "web", kind: "http" },
      ],
    },
    workload: { profile: "mixed", baseRps, writeRatio: 0.2, clients: 1000, clientTimeoutMs: 1000, surge: null, params: {} },
    faults: [],
    durationMs: 10000,
    seed: 1,
  };
}
```

`packages/sim/test/run.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { sim } from "../src/node";
import { SimValidationError } from "../src/errors";
import { webTier } from "./helpers";

describe("SimRun", () => {
  it("exposes metrics, events and a typed timeline", () => {
    const run = sim.simulate(webTier(2, 2, 2000));
    expect(run.metrics.availability).toBeGreaterThan(0.999);
    expect(run.timeline.frames).toBe(100);
    expect(run.timeline.nodeIds).toEqual(["lb", "users", "web"]);
    const busy = run.timeline.series("web", "busy");
    expect(busy).toBeInstanceOf(Float32Array);
    expect(busy.length).toBe(100);
    expect(run.timeline.value(99, "web", "up")).toBe(1);
    expect(() => run.timeline.value(0, "nope", "busy")).toThrow(/unknown node/);
    run.free();
  });

  it("loads traces on demand", () => {
    const run = sim.simulate(webTier(2, 2, 2000));
    const summaries = run.traceSummaries();
    expect(summaries.length).toBeGreaterThan(200);
    const first = run.trace(0);
    expect(first.steps[0]?.nodeId).toBe("users");
    expect(first.outcome).toBe("delivered");
    run.free();
  });

  it("grades a run against goals", () => {
    const run = sim.simulate(webTier(2, 5, 8000));
    const verdict = sim.grade(run, [
      { id: "lat", metric: "p95", op: "<=", value: 100 },
      { id: "spof", metric: "spofCount", op: "==", value: 0 },
    ]);
    expect(verdict).toMatchObject({ passed: true, score: 100, stars: 5 });
    run.free();
  });

  // Review focus 5.
  it("throws a clear error after free()", () => {
    const run = sim.simulate(webTier(1, 1, 100));
    run.free();
    expect(() => run.metrics).toThrow("SimRun already freed");
    expect(() => run.trace(0)).toThrow("SimRun already freed");
    expect(() => run.free()).not.toThrow();
  });

  it("turns invalid graphs into SimValidationError", () => {
    const input = webTier(1, 1, 100);
    input.graph.nodes = input.graph.nodes.filter((n) => n.kind !== "client");
    input.graph.edges = [];
    try {
      sim.simulate(input);
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(SimValidationError);
      expect((e as SimValidationError).issues.map((i) => i.code)).toContain("graph.no-client");
    }
  });

  it("lists component metadata for the palette", () => {
    expect(sim.listComponents().map((c) => c.kind)).toEqual(["client", "lb", "postgres", "web-server"]);
  });

  it("exposes default calibration and applies overrides", () => {
    const defaults = sim.defaultCalibration();
    expect(defaults.webRpsPerVcpu).toBe(9000);
    expect(defaults.webCostPerVcpu).toBe(22.5);
    const input = webTier(2, 5, 8000);
    input.workload.surge = { factor: 3, atMs: 2000, durationMs: 6000 };
    const fast = sim.simulate(input);
    input.calibration = { webRpsPerVcpu: 3000 };
    const slow = sim.simulate(input);
    expect(fast.metrics.availability).toBeGreaterThan(0.999);
    expect(slow.metrics.availability).toBeLessThan(0.95);
    fast.free();
    slow.free();
  });

  it("rejects invalid calibration with the field name", () => {
    const input = webTier(1, 1, 100);
    input.calibration = { webRpsPerVcpu: -1 };
    try {
      sim.simulate(input);
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(SimValidationError);
      expect((e as SimValidationError).issues[0]).toMatchObject({ code: "calibration.invalid", field: "webRpsPerVcpu" });
    }
  });
});
```

`packages/sim/test/golden.test.ts`:

```ts
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { sim } from "../src/node";
import { goldenFiles } from "./helpers";

describe("golden fixtures through wasm", () => {
  for (const file of goldenFiles()) {
    it(path.basename(file), () => {
      const report = sim.checkFixture(fs.readFileSync(file, "utf8"));
      expect(report.failures).toEqual([]);
      expect(report.validation).toEqual([]);
      expect(report.passed).toBe(true);
    });
  }
});
```

`packages/sim/test/cross-target.test.ts`:

```ts
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { sim } from "../src/node";
import { goldenFiles, repoRoot } from "./helpers";

const cli = path.join(repoRoot, "target/release/sim-cli");

describe("native and wasm produce byte-identical results", () => {
  beforeAll(() => {
    execFileSync("cargo", ["build", "--release", "-p", "sim-cli"], { cwd: repoRoot, stdio: "inherit" });
  });

  for (const file of goldenFiles()) {
    it(path.basename(file), () => {
      const native = execFileSync(cli, ["result", file], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }).trimEnd();
      const wasm = sim.simulateJson(fs.readFileSync(file, "utf8"));
      expect(wasm.length).toBe(native.length);
      expect(wasm === native).toBe(true);
    });
  }
});
```

`packages/sim/test/budget.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { sim } from "../src/node";
import type { SimInput } from "../src/types";

function tenNodes(): SimInput {
  const nodes: SimInput["graph"]["nodes"] = [
    { id: "users", kind: "client", label: "", replicas: 1, config: {} },
    { id: "lb", kind: "lb", label: "", replicas: 2, config: {} },
  ];
  const edges: SimInput["graph"]["edges"] = [{ id: "e0", from: "users", to: "lb", kind: "http" }];
  for (let k = 1; k <= 4; k++) {
    nodes.push({ id: `web${k}`, kind: "web-server", label: "", replicas: 2, config: {} });
    nodes.push({ id: `pg${k}`, kind: "postgres", label: "", replicas: 1, config: { readReplicas: 1 } });
    edges.push({ id: `a${k}`, from: "lb", to: `web${k}`, kind: "http" });
    edges.push({ id: `b${k}`, from: `web${k}`, to: `pg${k}`, kind: "db" });
  }
  return {
    graph: { nodes, edges },
    workload: { profile: "mixed", baseRps: 20000, writeRatio: 0.2, clients: 1000, clientTimeoutMs: 1000, surge: null, params: {} },
    faults: [],
    durationMs: 10000,
    seed: 7,
  };
}

describe("performance budget (spec §5)", () => {
  it("runs 10 nodes for 10 s in under 50 ms including the boundary", () => {
    const input = tenNodes();
    sim.simulate(input).free(); // warm up
    const times: number[] = [];
    for (let k = 0; k < 20; k++) {
      const t0 = performance.now();
      const run = sim.simulate(input);
      void run.metrics;
      void run.timeline.series("web1", "busy");
      run.free();
      times.push(performance.now() - t0);
    }
    times.sort((a, b) => a - b);
    const median = times[10]!;
    expect(median).toBeLessThan(50);
  });
});
```

Run: `./dev pnpm --filter @sd/sim exec vitest run`
Expected: fails to import `../src/node` (files do not exist yet).

- [ ] **Step 4: Write the wrapper sources**

`packages/sim/src/types.ts`:

```ts
export type { SimInput } from "./generated/SimInput";
export type { SimResult } from "./generated/SimResult";
export type { Metrics } from "./generated/Metrics";
export type { Graph } from "./generated/Graph";
export type { Node } from "./generated/Node";
export type { Edge } from "./generated/Edge";
export type { EdgeKind } from "./generated/EdgeKind";
export type { Workload } from "./generated/Workload";
export type { Fault } from "./generated/Fault";
export type { FaultKind } from "./generated/FaultKind";
export type { Goal } from "./generated/Goal";
export type { GoalOp } from "./generated/GoalOp";
export type { Verdict } from "./generated/Verdict";
export type { ValidationIssue } from "./generated/ValidationIssue";
export type { GraphLimits } from "./generated/GraphLimits";
export type { Trace } from "./generated/Trace";
export type { TraceStep } from "./generated/TraceStep";
export type { TraceOutcome } from "./generated/TraceOutcome";
export type { RequestClass } from "./generated/RequestClass";
export type { SimEvent } from "./generated/SimEvent";
export type { ComponentMeta } from "./generated/ComponentMeta";
export type { Calibration } from "./generated/Calibration";
export type { CalibrationOverrides } from "./generated/CalibrationOverrides";
export type { Fixture } from "./generated/Fixture";
export type { FixtureReport } from "./generated/FixtureReport";
```

`packages/sim/src/binding.ts`:

```ts
// Shape of the wasm-bindgen module (identical for the nodejs and web targets).
export interface TimelineHeader {
  frameMs: number;
  frames: number;
  nodeIds: string[];
  fields: string[];
}

export interface TraceSummary {
  id: number;
  class: "read" | "write";
  outcome: "delivered" | "rejected" | "timeout" | "unreachable";
  latencyMs: number;
}

export interface RawRun {
  metrics(): unknown;
  events(): unknown;
  timelineHeader(): TimelineHeader;
  timelineData(): Float32Array;
  traceCount(): number;
  trace(i: number): unknown;
  traceSummaries(): TraceSummary[];
  resultJson(): string;
  free(): void;
}

export interface WasmBinding {
  simulate(input: unknown): RawRun;
  simulateJson(json: string): string;
  validateGraph(graph: unknown, limits: unknown): unknown;
  grade(run: RawRun, goals: unknown): unknown;
  listComponents(): unknown;
  defaultCalibration(): unknown;
  checkFixture(json: string): unknown;
  engineVersion(): string;
}
```

`packages/sim/src/errors.ts`:

```ts
import type { ValidationIssue } from "./types";

export class SimValidationError extends Error {
  constructor(readonly issues: ValidationIssue[]) {
    super(`invalid graph: ${issues.map((i) => i.code).join(", ")}`);
    this.name = "SimValidationError";
  }
}

export class SimInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SimInputError";
  }
}

/** Converts what the wasm side throws into typed errors. */
export function rethrow(e: unknown): never {
  if (e && typeof e === "object" && "kind" in e) {
    const err = e as { kind: string; issues?: ValidationIssue[]; message?: string };
    if (err.kind === "validation") throw new SimValidationError(err.issues ?? []);
    if (err.kind === "input") throw new SimInputError(err.message ?? "invalid input");
  }
  throw e;
}
```

`packages/sim/src/timeline.ts`:

```ts
import type { TimelineHeader } from "./binding";

export class TimelineView {
  private readonly nodeIndex: Map<string, number>;
  private readonly fieldIndex: Map<string, number>;

  constructor(private readonly header: TimelineHeader, readonly data: Float32Array) {
    this.nodeIndex = new Map(header.nodeIds.map((id, i) => [id, i]));
    this.fieldIndex = new Map(header.fields.map((f, i) => [f, i]));
  }

  get frames(): number { return this.header.frames; }
  get frameMs(): number { return this.header.frameMs; }
  get nodeIds(): readonly string[] { return this.header.nodeIds; }
  get fields(): readonly string[] { return this.header.fields; }

  private offset(frame: number, nodeId: string, field: string): number {
    const n = this.nodeIndex.get(nodeId);
    if (n === undefined) throw new Error(`unknown node ${nodeId}`);
    const f = this.fieldIndex.get(field);
    if (f === undefined) throw new Error(`unknown field ${field}`);
    if (frame < 0 || frame >= this.frames) throw new Error(`frame ${frame} out of range`);
    return (frame * this.header.nodeIds.length + n) * this.header.fields.length + f;
  }

  value(frame: number, nodeId: string, field: string): number {
    return this.data[this.offset(frame, nodeId, field)]!;
  }

  series(nodeId: string, field: string): Float32Array {
    const out = new Float32Array(this.frames);
    for (let k = 0; k < this.frames; k++) out[k] = this.value(k, nodeId, field);
    return out;
  }
}
```

`packages/sim/src/run.ts`:

```ts
import type { RawRun, TraceSummary } from "./binding";
import { TimelineView } from "./timeline";
import type { Metrics, SimEvent, Trace } from "./types";

const registry = new FinalizationRegistry<RawRun>((raw) => {
  try { raw.free(); } catch { /* already freed */ }
});

export class SimRun {
  #raw: RawRun | null;
  #timeline: TimelineView | null = null;

  constructor(raw: RawRun) {
    this.#raw = raw;
    registry.register(this, raw, this);
  }

  #live(): RawRun {
    if (!this.#raw) throw new Error("SimRun already freed");
    return this.#raw;
  }

  /** @internal used by Sim.grade */
  raw(): RawRun { return this.#live(); }

  get metrics(): Metrics { return this.#live().metrics() as Metrics; }
  get events(): SimEvent[] { return this.#live().events() as SimEvent[]; }

  get timeline(): TimelineView {
    const raw = this.#live();
    this.#timeline ??= new TimelineView(raw.timelineHeader(), raw.timelineData());
    return this.#timeline;
  }

  traceSummaries(): TraceSummary[] { return this.#live().traceSummaries(); }
  trace(i: number): Trace { return this.#live().trace(i) as Trace; }
  resultJson(): string { return this.#live().resultJson(); }

  free(): void {
    if (!this.#raw) return;
    registry.unregister(this);
    this.#raw.free();
    this.#raw = null;
  }
}
```

`packages/sim/src/sim.ts`:

```ts
import type { WasmBinding } from "./binding";
import { rethrow } from "./errors";
import { SimRun } from "./run";
import type { Calibration, ComponentMeta, FixtureReport, Goal, Graph, GraphLimits, SimInput, ValidationIssue, Verdict } from "./types";

export interface Sim {
  simulate(input: SimInput): SimRun;
  simulateJson(json: string): string;
  validateGraph(graph: Graph, limits?: GraphLimits): ValidationIssue[];
  grade(run: SimRun, goals: Goal[]): Verdict;
  listComponents(): ComponentMeta[];
  defaultCalibration(): Calibration;
  checkFixture(json: string): FixtureReport;
  engineVersion(): string;
}

export function createSim(binding: WasmBinding): Sim {
  const call = <T>(fn: () => T): T => {
    try { return fn(); } catch (e) { return rethrow(e); }
  };
  return {
    simulate: (input) => new SimRun(call(() => binding.simulate(input))),
    simulateJson: (json) => call(() => binding.simulateJson(json)),
    validateGraph: (graph, limits) => call(() => binding.validateGraph(graph, limits ?? null)) as ValidationIssue[],
    grade: (run, goals) => call(() => binding.grade(run.raw(), goals)) as Verdict,
    listComponents: () => call(() => binding.listComponents()) as ComponentMeta[],
    defaultCalibration: () => call(() => binding.defaultCalibration()) as Calibration,
    checkFixture: (json) => call(() => binding.checkFixture(json)) as FixtureReport,
    engineVersion: () => binding.engineVersion(),
  };
}
```

`packages/sim/src/node.ts`:

```ts
import { createRequire } from "node:module";
import type { WasmBinding } from "./binding";
import { createSim } from "./sim";

const require = createRequire(import.meta.url);
const binding = require("../wasm/node/sim_wasm.js") as WasmBinding;

export const sim = createSim(binding);
```

`packages/sim/src/web.ts`:

```ts
import init, * as binding from "../wasm/web/sim_wasm.js";
import type { WasmBinding } from "./binding";
import { createSim, type Sim } from "./sim";

let ready: Promise<Sim> | null = null;

/** Loads the wasm once (in a page or a Web Worker) and returns the API. */
export function loadSim(wasmUrl?: string | URL): Promise<Sim> {
  ready ??= init(wasmUrl ? { module_or_path: wasmUrl } : undefined).then(() =>
    createSim(binding as unknown as WasmBinding),
  );
  return ready;
}
```

`packages/sim/src/index.ts`:

```ts
export * from "./types";
export type { RawRun, TimelineHeader, TraceSummary, WasmBinding } from "./binding";
export { SimInputError, SimValidationError } from "./errors";
export { SimRun } from "./run";
export { createSim, type Sim } from "./sim";
export { TimelineView } from "./timeline";
```

- [ ] **Step 5: Run the tests and the type check**

Run: `./dev pnpm --filter @sd/sim test`
Expected: `pretest` rebuilds the wasm; `run.test.ts` 8 passed, `golden.test.ts` 10 passed, `cross-target.test.ts` 10 passed, `budget.test.ts` 1 passed. If cross-target fails, diff the two strings: the first differing number points at a non-`libm` math call or an unordered iteration in `sim-core`.

Run: `./dev pnpm --filter @sd/sim typecheck`
Expected: no errors. (If `web.ts` reports missing declarations for `../wasm/web/sim_wasm.js`, run the build first: wasm-pack emits `sim_wasm.d.ts` beside it.)

- [ ] **Step 6: Commit**

```bash
git add packages/sim pnpm-lock.yaml package.json
git commit -m "feat(sim): add @sd/sim TypeScript wrapper with golden, cross-target and budget tests

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 14: Benchmarks, type freshness check and root scripts

**Files:**
- Modify: `crates/sim-core/benches/simulate.rs`, `package.json`
- Create: `scripts/check-types.sh`, `README.md`

**Interfaces:**
- Consumes: everything above.
- Produces: `./dev pnpm test` runs the whole suite; `./dev sh scripts/check-types.sh` fails when generated TS types are stale; `./dev cargo bench -p sim-core` reports the native run time.

- [ ] **Step 1: Write the criterion benchmark**

Replace `crates/sim-core/benches/simulate.rs` with:

```rust
use criterion::{black_box, criterion_group, criterion_main, Criterion};
use sim_core::{simulate, SimInput};

fn ten_nodes() -> SimInput {
    let mut nodes = vec![
        serde_json::json!({"id": "users", "kind": "client"}),
        serde_json::json!({"id": "lb", "kind": "lb", "replicas": 2}),
    ];
    let mut edges = vec![serde_json::json!({"id": "e0", "from": "users", "to": "lb", "kind": "http"})];
    for k in 1..=4 {
        nodes.push(serde_json::json!({"id": format!("web{k}"), "kind": "web-server", "replicas": 2}));
        nodes.push(serde_json::json!({"id": format!("pg{k}"), "kind": "postgres", "config": {"readReplicas": 1}}));
        edges.push(serde_json::json!({"id": format!("a{k}"), "from": "lb", "to": format!("web{k}"), "kind": "http"}));
        edges.push(serde_json::json!({"id": format!("b{k}"), "from": format!("web{k}"), "to": format!("pg{k}"), "kind": "db"}));
    }
    serde_json::from_value(serde_json::json!({
        "graph": {"nodes": nodes, "edges": edges},
        "workload": {"baseRps": 20000},
        "seed": 7
    }))
    .unwrap()
}

fn bench(c: &mut Criterion) {
    let input = ten_nodes();
    c.bench_function("simulate 10 nodes x 10 s", |b| b.iter(|| simulate(black_box(&input)).unwrap()));
}

criterion_group!(benches, bench);
criterion_main!(benches);
```

Run: `./dev cargo bench -p sim-core -- --quick`
Expected: a line `simulate 10 nodes x 10 s  time: [...]` with a median well under 50 ms. Record the number in the commit message.

- [ ] **Step 2: Add the generated-types freshness check**

`scripts/check-types.sh`:

```sh
#!/usr/bin/env sh
# Regenerates TS types from Rust and fails if the committed files differ.
set -e
cd "$(dirname "$0")/.."
rm -rf packages/sim/src/generated
TS_RS_EXPORT_DIR="$(pwd)/packages/sim/src/generated" cargo test -q -p sim-core --features ts export_bindings >/dev/null
git diff --exit-code -- packages/sim/src/generated
git ls-files --others --exclude-standard --error-unmatch packages/sim/src/generated >/dev/null 2>&1 && {
  echo "new generated type files are not committed"; exit 1; } || true
echo "generated types are up to date"
```

Make it executable: `chmod +x scripts/check-types.sh`.

Run: `./dev sh scripts/check-types.sh`
Expected: `generated types are up to date`.

- [ ] **Step 3: Wire the root test script**

Replace the `scripts` block of the root `package.json` with:

```json
  "scripts": {
    "build:sim": "pnpm --filter @sd/sim build:wasm",
    "test:rust": "cargo test --workspace && cargo clippy --workspace --all-targets -- -D warnings && cargo clippy -p sim-wasm --target wasm32-unknown-unknown -- -D warnings",
    "test:perf": "cargo test -p sim-cli --release -- --ignored",
    "test:types": "sh scripts/check-types.sh",
    "test": "pnpm test:rust && pnpm test:types && pnpm -r test && pnpm test:perf"
  }
```

Run: `./dev pnpm test`
Expected: every step passes; the last lines are the vitest summary and `checks_100_fixtures_under_two_seconds ... ok`.

- [ ] **Step 4: Write `README.md`**

```markdown
# System Design Lab

Internal learning platform for system design. All commands run inside the dev container.

## Setup

    docker compose build dev
    ./dev pnpm install

## Everyday commands

| Command | What it does |
|---|---|
| `./dev pnpm test` | Full suite: Rust tests, clippy, type freshness, wasm + TS tests, CLI perf budget |
| `./dev cargo test -p sim-core` | Engine tests only |
| `./dev cargo run -p sim-cli -- check fixtures/golden` | Check golden fixtures |
| `./dev cargo run -p sim-cli -- run fixtures/golden/web-tier-surge-single.json fixtures/golden/web-tier-surge-scaled.json` | Compare two designs side by side |
| `./dev pnpm build:sim` | Build the wasm packages into `packages/sim/wasm/` |
| `./dev cargo bench -p sim-core` | Native benchmark |

## Layout

- `crates/sim-core` — the engine (pure Rust)
- `crates/sim-cli` — native CLI
- `crates/sim-wasm` — wasm bindings
- `packages/sim` — `@sd/sim` TypeScript wrapper
- `fixtures/golden` — engine contract scenarios
- `fixtures/parity` — reference results used to calibrate the engine (offline; the product never calls any external site)
- `docs/superpowers` — specs and plans
```

- [ ] **Step 5: Commit**

```bash
git add crates/sim-core/benches scripts package.json README.md
git commit -m "chore: add benchmark, type freshness check and root test script

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 15: Parity with reference runs (offline)

**Why:** the user requires that, for the same design and scenario, our engine reaches the **same pass/fail on every goal** as the reference product, and that measured numbers stay **within tolerance**. Reference results were captured once during development from the user's own account. The product and CI never contact that site; parity runs only against the committed files.

**What a parity fixture may contain:** the design graph (structure and numbers), scenario parameters, measured numbers, goal targets and pass/fail. **Never** text from the reference site (rule messages, labels, observations, lesson prose). The converter drops every string field except ids and enum-like codes.

**Files:**
- Create: `crates/sim-core/src/parity.rs`, `fixtures/parity/README.md`, `fixtures/parity/scale-web-tier-surge-pass.json`, `fixtures/parity/scale-web-tier-surge-direct.json`, `tools/parity/convert.mjs`, `tools/parity/scenarios.json`, `packages/sim/test/no-external-calls.test.ts`
- Modify: `crates/sim-core/src/lib.rs`, `crates/sim-cli/src/main.rs`, `crates/sim-cli/tests/cli.rs`, `.gitignore`

**Interfaces:**
- Consumes: `simulate`, `metric_value`, `compare` (Tasks 6, 9), `parse_op` (Task 10).
- Produces:
  - `pub struct ParityFixture { id, source: ParitySource { site, run_id, engine_version, captured_at }, input: SimInput, reference: ParityReference { metrics: BTreeMap<String, f64>, goals: Vec<ParityGoal { id, metric, op: String, value, passed }> }, tolerance: BTreeMap<String, Tolerance { rel: Option<f64>, abs: Option<f64> }> }`
  - `pub struct ParityReport { id, passed, goal_mismatches: Vec<GoalMismatch { id, reference_passed, our_passed, measured }>, metric_mismatches: Vec<MetricMismatch { metric, reference, measured, allowed }>, validation: Vec<ValidationIssue> }`
  - `pub fn check_parity(f: &ParityFixture) -> ParityReport`
  - CLI: `sim-cli parity <path>...` (same output style and exit codes as `check`).

**Comparison rules (exact values used by `default_tolerance`):**

| Metric | Rule |
|---|---|
| every goal's pass/fail | must be identical (100%) |
| `spofCount`, `exposedBackends`, `costPerMonth` | exact (abs 1e-9) |
| `p50`, `p95`, `p99` | within 15% relative, or 2 ms absolute when the reference is under 13 ms |
| `availability` | within 0.005 absolute |
| `requestsTotal`, `throughputRps` | within 2% relative |
| any other metric | within 10% relative |

A fixture may override a tolerance in its `tolerance` block; every override needs a `"reason"` in `fixtures/parity/README.md` and the user's approval.

- [ ] **Step 1: Write the failing test for `check_parity`**

Create `crates/sim-core/src/parity.rs` with:

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_util::{input, web_tier};

    fn fixture(reference_metrics: &[(&str, f64)], goals: Vec<ParityGoal>) -> ParityFixture {
        ParityFixture {
            id: "t".into(),
            source: ParitySource::default(),
            input: input(web_tier(2, 2), 2_000.0),
            reference: ParityReference {
                metrics: reference_metrics.iter().map(|(k, v)| (k.to_string(), *v)).collect(),
                goals,
            },
            tolerance: BTreeMap::new(),
        }
    }

    fn goal(id: &str, metric: &str, op: &str, value: f64, passed: bool) -> ParityGoal {
        ParityGoal { id: id.into(), metric: metric.into(), op: op.into(), value, passed }
    }

    #[test]
    fn matching_goals_and_close_metrics_pass() {
        let r = check_parity(&fixture(
            &[("availability", 1.0), ("costPerMonth", 95.0), ("spofCount", 0.0)],
            vec![goal("lat", "p95", "<=", 100.0, true), goal("spof", "spofCount", "==", 0.0, true)],
        ));
        assert!(r.passed, "{r:?}");
    }

    #[test]
    fn a_different_verdict_on_any_goal_fails() {
        let r = check_parity(&fixture(&[], vec![goal("lat", "p95", "<=", 100.0, false)]));
        assert!(!r.passed);
        assert_eq!(r.goal_mismatches.len(), 1);
        assert!(r.goal_mismatches[0].our_passed);
    }

    #[test]
    fn numbers_outside_tolerance_fail_and_structural_numbers_must_be_exact() {
        let r = check_parity(&fixture(&[("availability", 0.9), ("costPerMonth", 95.5)], vec![]));
        let metrics: Vec<&str> = r.metric_mismatches.iter().map(|m| m.metric.as_str()).collect();
        assert_eq!(metrics, vec!["availability", "costPerMonth"]);
    }

    #[test]
    fn small_latencies_use_an_absolute_window() {
        // Our p95 for this light load is a few ms; a 2 ms reference is within 2 ms abs.
        let ours = crate::simulate(&input(web_tier(2, 2), 2_000.0)).unwrap().metrics.p95;
        let r = check_parity(&fixture(&[("p95", (ours - 1.5).max(0.0))], vec![]));
        assert!(r.metric_mismatches.is_empty(), "{r:?}");
    }
}
```

Add to `lib.rs`: `pub mod parity;`.

Run: `./dev cargo test -p sim-core parity::`
Expected: compile errors (types and `check_parity` missing).

- [ ] **Step 2: Implement `parity.rs` above the tests**

```rust
//! Offline parity against reference results captured during development.
//! Goals must agree on pass/fail exactly; numbers must agree within tolerance.

use crate::fixture::parse_op;
use crate::grade::{compare, metric_value};
use crate::simulate;
use crate::types::{SimInput, ValidationIssue};
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

#[derive(Debug, Clone, PartialEq, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ParitySource {
    #[serde(default)]
    pub site: String,
    #[serde(default)]
    pub run_id: String,
    #[serde(default)]
    pub engine_version: String,
    #[serde(default)]
    pub captured_at: String,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ParityGoal {
    pub id: String,
    pub metric: String,
    pub op: String,
    pub value: f64,
    pub passed: bool,
}

#[derive(Debug, Clone, PartialEq, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ParityReference {
    #[serde(default)]
    pub metrics: BTreeMap<String, f64>,
    #[serde(default)]
    pub goals: Vec<ParityGoal>,
}

#[derive(Debug, Clone, Copy, PartialEq, Default, Serialize, Deserialize)]
pub struct Tolerance {
    #[serde(default)]
    pub rel: Option<f64>,
    #[serde(default)]
    pub abs: Option<f64>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ParityFixture {
    pub id: String,
    #[serde(default)]
    pub source: ParitySource,
    pub input: SimInput,
    pub reference: ParityReference,
    #[serde(default)]
    pub tolerance: BTreeMap<String, Tolerance>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GoalMismatch {
    pub id: String,
    pub reference_passed: bool,
    pub our_passed: bool,
    pub measured: Option<f64>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MetricMismatch {
    pub metric: String,
    pub reference: f64,
    pub measured: Option<f64>,
    pub allowed: f64,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ParityReport {
    pub id: String,
    pub passed: bool,
    pub goal_mismatches: Vec<GoalMismatch>,
    pub metric_mismatches: Vec<MetricMismatch>,
    pub validation: Vec<ValidationIssue>,
}

/// Allowed absolute difference for `metric` given the reference value.
pub fn allowed_difference(metric: &str, reference: f64, overrides: &BTreeMap<String, Tolerance>) -> f64 {
    if let Some(t) = overrides.get(metric) {
        let rel = t.rel.map_or(0.0, |r| r * reference.abs());
        return rel.max(t.abs.unwrap_or(0.0));
    }
    match metric {
        "spofCount" | "exposedBackends" | "costPerMonth" => 1e-9,
        "p50" | "p95" | "p99" => (0.15 * reference.abs()).max(if reference < 13.0 { 2.0 } else { 0.0 }),
        "availability" => 0.005,
        "requestsTotal" | "throughputRps" => 0.02 * reference.abs(),
        _ => 0.10 * reference.abs(),
    }
}

pub fn check_parity(f: &ParityFixture) -> ParityReport {
    let result = match simulate(&f.input) {
        Ok(r) => r,
        Err(issues) => {
            return ParityReport {
                id: f.id.clone(),
                passed: false,
                goal_mismatches: vec![],
                metric_mismatches: vec![],
                validation: issues,
            }
        }
    };
    let m = &result.metrics;

    let goal_mismatches: Vec<GoalMismatch> = f
        .reference
        .goals
        .iter()
        .filter_map(|g| {
            let measured = metric_value(m, &g.metric);
            let ours = match (parse_op(&g.op), measured) {
                (Some(op), Some(v)) => compare(v, op, g.value),
                _ => false,
            };
            (ours != g.passed).then(|| GoalMismatch {
                id: g.id.clone(),
                reference_passed: g.passed,
                our_passed: ours,
                measured,
            })
        })
        .collect();

    let metric_mismatches: Vec<MetricMismatch> = f
        .reference
        .metrics
        .iter()
        .filter_map(|(metric, &reference)| {
            let measured = metric_value(m, metric);
            let allowed = allowed_difference(metric, reference, &f.tolerance);
            let ok = measured.is_some_and(|v| (v - reference).abs() <= allowed);
            (!ok).then(|| MetricMismatch { metric: metric.clone(), reference, measured, allowed })
        })
        .collect();

    ParityReport {
        id: f.id.clone(),
        passed: goal_mismatches.is_empty() && metric_mismatches.is_empty(),
        goal_mismatches,
        metric_mismatches,
        validation: vec![],
    }
}
```

Run: `./dev cargo test -p sim-core parity::`
Expected: 4 passed.

- [ ] **Step 3: Add the two reference fixtures captured on 2026-10-18**

These numbers come from runs already made on the user's account (no new runs needed). Scenario shape inferred from the reference: 11 s run, 8,000 rps base, 3× for 1.5 s (112,000 requests in total), client timeout 1 s, pages only (no writes).

`fixtures/parity/scale-web-tier-surge-pass.json`:

```json
{
  "id": "scale-web-tier-surge-pass",
  "source": {"site": "reference", "runId": "807734e1-c0fa-4b84-a0f9-07c78d2bc887", "engineVersion": "2.2.4", "capturedAt": "2026-10-18"},
  "input": {
    "graph": {
      "nodes": [
        {"id": "users", "kind": "client"},
        {"id": "lb", "kind": "lb", "replicas": 2},
        {"id": "web", "kind": "web-server", "replicas": 5, "config": {"cpu": 1, "memoryGb": 2}}
      ],
      "edges": [
        {"id": "e1", "from": "users", "to": "lb", "kind": "http"},
        {"id": "e2", "from": "lb", "to": "web", "kind": "http"}
      ]
    },
    "workload": {"baseRps": 8000, "writeRatio": 0, "clientTimeoutMs": 1000, "surge": {"factor": 3, "atMs": 4000, "durationMs": 1500}},
    "durationMs": 11000,
    "seed": 1
  },
  "reference": {
    "metrics": {"p95": 7, "p99": 7, "availability": 1.0, "costPerMonth": 162.5, "spofCount": 0, "exposedBackends": 0, "requestsTotal": 112000},
    "goals": [
      {"id": "latency-p95", "metric": "p95", "op": "<=", "value": 100, "passed": true},
      {"id": "availability", "metric": "availability", "op": ">=", "value": 0.999, "passed": true},
      {"id": "single-entry", "metric": "exposedBackends", "op": "==", "value": 0, "passed": true},
      {"id": "no-single-point", "metric": "spofCount", "op": "==", "value": 0, "passed": true},
      {"id": "budget", "metric": "costPerMonth", "op": "<=", "value": 200, "passed": true}
    ]
  }
}
```

`fixtures/parity/scale-web-tier-surge-direct.json` (attempt #1: clients hit one web server directly):

```json
{
  "id": "scale-web-tier-surge-direct",
  "source": {"site": "reference", "runId": "attempt-1", "engineVersion": "2.2.4", "capturedAt": "2026-10-18"},
  "input": {
    "graph": {
      "nodes": [
        {"id": "users", "kind": "client"},
        {"id": "web", "kind": "web-server", "replicas": 1, "config": {"cpu": 1, "memoryGb": 2}}
      ],
      "edges": [{"id": "e1", "from": "users", "to": "web", "kind": "http"}]
    },
    "workload": {"baseRps": 8000, "writeRatio": 0, "clientTimeoutMs": 1000, "surge": {"factor": 3, "atMs": 4000, "durationMs": 1500}},
    "durationMs": 11000,
    "seed": 1
  },
  "reference": {
    "metrics": {"p95": 910, "availability": 0.805, "costPerMonth": 22.5, "spofCount": 1, "exposedBackends": 1},
    "goals": [
      {"id": "latency-p95", "metric": "p95", "op": "<=", "value": 100, "passed": false},
      {"id": "availability", "metric": "availability", "op": ">=", "value": 0.999, "passed": false},
      {"id": "single-entry", "metric": "exposedBackends", "op": "==", "value": 0, "passed": false},
      {"id": "no-single-point", "metric": "spofCount", "op": "==", "value": 0, "passed": false},
      {"id": "budget", "metric": "costPerMonth", "op": "<=", "value": 200, "passed": true}
    ]
  }
}
```

`fixtures/parity/README.md`:

```markdown
# Parity fixtures

Reference results used to calibrate the engine. Captured once, during development, from runs on
the project owner's own account. Nothing here is fetched at runtime or in CI.

Allowed content: graph structure and numbers, scenario parameters, measured numbers, goal
targets and pass/fail. Not allowed: any text from the reference site (messages, labels,
observations, lesson prose). `tools/parity/convert.mjs` enforces this.

Raw captures live in `fixtures/parity/raw/` and are gitignored.

## Tolerance overrides

None yet. Each override must be listed here with its reason and the owner's approval.
```

Append to `.gitignore`: `fixtures/parity/raw/`

- [ ] **Step 4: Add `sim-cli parity` and its test**

In `crates/sim-cli/src/main.rs`:

1. Add the import `use sim_core::parity::{check_parity, ParityFixture, ParityReport};`
2. Add a variant to `enum Cmd`:

```rust
    /// Compare against reference results (offline) and report mismatches.
    Parity {
        paths: Vec<PathBuf>,
        #[arg(long)]
        json: bool,
    },
```

3. Add this arm to the `match` in `main`:

```rust
        Cmd::Parity { paths, json } => {
            let files = expand(&paths);
            let mut reports: Vec<ParityReport> = files
                .par_iter()
                .map(|f| {
                    let parsed = std::fs::read_to_string(f)
                        .map_err(|e| e.to_string())
                        .and_then(|t| serde_json::from_str::<ParityFixture>(&t).map_err(|e| e.to_string()));
                    match parsed {
                        Ok(fx) => check_parity(&fx),
                        Err(e) => ParityReport {
                            id: format!("{}: {e}", f.display()),
                            passed: false,
                            goal_mismatches: vec![],
                            metric_mismatches: vec![],
                            validation: vec![],
                        },
                    }
                })
                .collect();
            reports.sort_by(|a, b| a.id.cmp(&b.id));
            let failed = reports.iter().filter(|r| !r.passed).count();
            if json {
                println!("{}", serde_json::to_string_pretty(&reports).expect("serializable"));
            } else {
                for r in &reports {
                    if r.passed {
                        println!("PASS {}", r.id);
                        continue;
                    }
                    for g in &r.goal_mismatches {
                        println!("FAIL {} goal {} reference={} ours={} measured={:?}", r.id, g.id, g.reference_passed, g.our_passed, g.measured);
                    }
                    for m in &r.metric_mismatches {
                        println!("FAIL {} metric {} reference={} measured={:?} allowed=±{}", r.id, m.metric, m.reference, m.measured, m.allowed);
                    }
                    if !r.validation.is_empty() || (r.goal_mismatches.is_empty() && r.metric_mismatches.is_empty()) {
                        println!("FAIL {} unreadable or invalid", r.id);
                    }
                }
                println!("{} passed, {} failed", reports.len() - failed, failed);
            }
            if failed > 0 { ExitCode::from(1) } else { ExitCode::SUCCESS }
        }
```

Append to `crates/sim-cli/tests/cli.rs`:

```rust
#[test]
fn parity_reports_every_reference_fixture() {
    let dir = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../fixtures/parity");
    let out = Command::cargo_bin("sim-cli").unwrap().arg("parity").arg(dir).assert();
    let stdout = String::from_utf8(out.get_output().stdout.clone()).unwrap();
    assert!(stdout.contains("scale-web-tier-surge-pass"));
    assert!(stdout.contains("scale-web-tier-surge-direct"));
    // Goal pass/fail must already agree; numeric calibration is Step 5.
    assert!(!stdout.contains(" goal "), "goal verdicts must match the reference:\n{stdout}");
}
```

Run: `./dev cargo test -p sim-cli parity`
Expected: passes (goal verdicts agree). Then run `./dev cargo run -q -p sim-cli -- parity fixtures/parity` and note any `metric` mismatches.

- [ ] **Step 5: Calibrate until parity passes**

Run `./dev cargo run -q -p sim-cli -- parity fixtures/parity`. For each `FAIL … metric …` line, adjust **only** `calibration.rs` (for example `WEB_QUEUE_PER_GB`, `WEB_SERVICE_MS`, `MAX_UTILIZATION_FOR_LATENCY`), with a comment naming the parity fixture that motivated the value. After every change run `./dev cargo test --workspace` too: golden fixtures and property tests must still pass. Stop when `sim-cli parity` prints `2 passed, 0 failed`.

If a metric cannot reach tolerance without breaking golden fixtures, stop and report to the user with the closest values; do not widen tolerances on your own.

Then make parity part of the suite: add `"test:parity": "cargo run -q -p sim-cli -- parity fixtures/parity"` to the root `package.json` scripts and append `&& pnpm test:parity` to `"test"`.

- [ ] **Step 6: Converter for future captures**

`tools/parity/scenarios.json` (maps a reference simulation + scenario to our workload timing):

```json
{
  "sim:scale-web-tier/surge": {
    "durationMs": 11000,
    "clientTimeoutMs": 1000,
    "writeRatio": 0,
    "surge": {"atMs": 4000, "durationMs": 1500}
  }
}
```

`tools/parity/convert.mjs`:

```js
// Usage: node tools/parity/convert.mjs fixtures/parity/raw/<run>.json <fixture-id>
// Converts a raw reference run into a parity fixture. Copies ONLY numbers, ids, enum codes
// and pass/fail. Fails loudly on unknown components, metrics or rules so nothing is guessed.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const [rawPath, id] = process.argv.slice(2);
if (!rawPath || !id) {
  console.error("usage: convert.mjs <raw.json> <fixture-id>");
  process.exit(2);
}
const raw = JSON.parse(fs.readFileSync(rawPath, "utf8"));
const scenarios = JSON.parse(fs.readFileSync(path.join(here, "scenarios.json"), "utf8"));

const KIND = {
  "component:client": "client",
  "component:load-balancer": "lb",
  "component:api-service": "web-server",
  "component:web-server": "web-server",
  "component:postgres": "postgres",
};
const METRIC = { p95_latency: "p95", p99_latency: "p99", availability: "availability", cost: "costPerMonth" };
const RULE = {
  "latency-p95": { metric: "p95", op: "<=", parse: (t) => Number(t.match(/[\d.]+/)[0]) },
  availability: { metric: "availability", op: ">=", parse: (t) => Number(t.match(/[\d.]+/)[0]) / 100 },
  "single-entry": { metric: "exposedBackends", op: "==", parse: () => 0 },
  "no-single-point": { metric: "spofCount", op: "==", parse: (t) => Number(t.match(/[\d.]+/)[0]) },
  budget: { metric: "costPerMonth", op: "<=", parse: (t) => Number(t.replace(/[^\d.]/g, "")) },
};

const fail = (msg) => { console.error(msg); process.exit(1); };

const nodes = raw.run.design.graph.nodes.map((n) => {
  const kind = KIND[n.componentId] ?? fail(`unknown component ${n.componentId}`);
  const config = {};
  const res = n.config?.resources;
  if (res?.cpu) config.cpu = res.cpu;
  if (res?.memoryGb) config.memoryGb = res.memoryGb;
  const rr = n.config?.replication?.readReplicas;
  if (typeof rr === "number") config.readReplicas = rr;
  return { id: n.id, kind, replicas: n.replicas ?? 1, config };
});
const edges = raw.run.design.graph.edges.map((e) => ({ id: e.id, from: e.from, to: e.to, kind: e.kind }));

const key = `${raw.run.simulation.id}/${raw.run.scenarioId}`;
const s = scenarios[key] ?? fail(`add ${key} to tools/parity/scenarios.json`);
const p = raw.run.parameters;
const workload = {
  baseRps: p.baseRps,
  writeRatio: s.writeRatio,
  clientTimeoutMs: s.clientTimeoutMs,
  surge: p.surgeMultiplier ? { factor: p.surgeMultiplier, atMs: s.surge.atMs, durationMs: s.surge.durationMs } : null,
};

const metrics = {};
for (const m of raw.result.metrics) {
  if (METRIC[m.id]) metrics[METRIC[m.id]] = m.value;
}
metrics.requestsTotal = Object.values(raw.result.outcomes).reduce((a, b) => a + b, 0);

const goals = raw.score.rules.map((r) => {
  const rule = RULE[r.ruleId] ?? fail(`unknown rule ${r.ruleId}`);
  return { id: r.ruleId, metric: rule.metric, op: rule.op, value: rule.parse(r.target ?? ""), passed: r.status === "passed" };
});

const fixture = {
  id,
  source: { site: "reference", runId: raw.run.id, engineVersion: raw.run.engineVersion, capturedAt: raw.run.completedAt?.slice(0, 10) ?? "" },
  input: { graph: { nodes, edges }, workload, durationMs: s.durationMs, seed: raw.run.seed ?? 1 },
  reference: { metrics, goals },
};
const out = path.join(here, "../../fixtures/parity", `${id}.json`);
fs.writeFileSync(out, JSON.stringify(fixture, null, 2) + "\n");
console.log(`wrote ${out}`);
```

Capturing a new reference run is a manual, user-approved step (each run costs the user's quota): the user opens the run in their logged-in browser, saves the JSON of `GET /api/runs/<id>` to `fixtures/parity/raw/<id>.json`, then runs `./dev node tools/parity/convert.mjs fixtures/parity/raw/<id>.json <fixture-id>`.

- [ ] **Step 7: Guard against external calls in runtime code**

`packages/sim/test/no-external-calls.test.ts`:

```ts
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { repoRoot } from "./helpers";

// Runtime code must never reach the reference site. Tools and fixtures are excluded on purpose.
const RUNTIME_DIRS = ["crates", "packages", "apps"];
const SKIP = new Set(["node_modules", "wasm", "target", "generated", "snapshots"]);
const FORBIDDEN = /https?:\/\/[^\s"'`]*syscraft/i;

function* files(dir: string): Generator<string> {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* files(full);
    else if (/\.(rs|ts|tsx|js|mjs|json|toml)$/.test(entry.name)) yield full;
  }
}

describe("no runtime calls to the reference site", () => {
  it("has no reference-site URLs in crates/, packages/ or apps/", () => {
    const offenders = RUNTIME_DIRS.flatMap((d) => [...files(path.join(repoRoot, d))]).filter((f) =>
      FORBIDDEN.test(fs.readFileSync(f, "utf8")),
    );
    expect(offenders).toEqual([]);
  });
});
```

Run: `./dev pnpm --filter @sd/sim exec vitest run test/no-external-calls.test.ts`
Expected: 1 passed.

- [ ] **Step 8: Run the full suite and commit**

Run: `./dev pnpm test`
Expected: everything passes, including `test:parity` with `2 passed, 0 failed`.

```bash
git add crates fixtures/parity tools/parity packages/sim/test .gitignore package.json
git commit -m "feat: add offline parity check against reference runs and calibrate engine

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
