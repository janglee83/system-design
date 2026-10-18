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
- Stack: TypeScript everywhere. Next.js for the UI later; the engine is plain TS.
- Content: bilingual VI + EN.
- "Workflow" means both a repeatable development process (spec → plan → code → test per
  sub-project, plus a content pipeline) and, later, a multi-agent Workflow that mass-produces
  content and uses the content validator as its judge.

Build order (each item gets its own spec → plan → implementation cycle):

1. **`sim` engine** (this document)
2. Content format + `content validate` CLI
3. Canvas editor + Lab
4. Experiment lessons, reading lessons, concept map
5. Challenges (modes, stars, "where did it break?" quiz, hints)
6. Progress storage (SQLite, local) and AI tutor (Claude API)
7. Multi-agent content production workflow

## 2. Goal

A pure, deterministic TypeScript library that takes an architecture graph, a workload and
a list of faults, simulates about 10 seconds of virtual time, and returns metrics, a
replayable timeline, sampled request traces and notable events. A separate grader turns
results plus goals into a verdict. The library must run unchanged in the browser, in Node
and in a Web Worker, and must be fast enough to validate hundreds of lessons in CI.

The engine must be **directionally right** (more replicas never make the bottleneck slower;
a database with no replica cannot survive losing its primary), not accurate to the
millisecond against real production systems.

## 3. Public API

```ts
simulate(input: SimInput): SimResult
validateGraph(graph: Graph, limits?: GraphLimits): ValidationIssue[]
grade(result: SimResult, goals: Goal[]): Verdict
listComponents(): ComponentMeta[]   // palette + inspector metadata for the UI
```

All functions are pure. No I/O, no `Date`, no `Math.random`.

### 3.1 `SimInput`

| Field | Type | Notes |
|---|---|---|
| `graph` | `Graph` | Nodes and edges; identical to what the canvas saves |
| `workload` | `Workload` | Traffic shape and scenario parameters |
| `faults` | `Fault[]` | Injected failures, each with a start time |
| `durationMs` | `number` | Default `10_000` |
| `seed` | `number` | Drives the PRNG; same input → identical output |

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

### 3.2 `SimResult`

- `metrics: Metrics`
  - Core: `p50`, `p95`, `p99` (ms), `availability` (0–1), `throughputRps`,
    `costPerMonth`, `spofCount`, `peakBusy` (0–1), `peakDbConnections`, `cacheOps`.
  - Scenario metrics, `null` when not applicable to the design: `duplicateIds`,
    `outOfOrderIds`, `lostUpdates`, `writeConflicts`, `duplicateWrites`, `staleReads`,
    `peakQueueDepth`, `lostMessages`, `statusFlaps`, `staleOnline`, `inboxWritesPerSec`.
  - Breakdowns per request class (read, write, message, heartbeat, …).
- `timeline: TimelineFrame[]`: one frame every 100 ms, with per-node
  `{ inFlight, queued, busy, rejected, status }` and per-edge rates. Used for animation
  and scrubbing.
- `traces: Trace[]`: a few hundred sampled requests. Each trace is a list of
  `{ tMs, nodeId, action, waitMs, serviceMs }` steps plus the final outcome
  (`delivered | rejected | timeout | unreachable`).
- `events: SimEvent[]`: notable happenings with time, node and a structured code plus
  params (e.g. `{ code: 'db.promoted', node: 'pg1', atMs: 3600 }`). The UI turns codes into
  localized text; the engine never emits prose.

### 3.3 Validation

`validateGraph` runs before simulation and returns structured issues
(`{ code, nodeId?, edgeId?, params }`):

- edge kind not accepted by the target component (e.g. a cache pointing at a database)
- no client node, or a client with no outgoing path
- a request path with no component that can terminate it
- cycles on the synchronous request path
- limits exceeded (node count, total instances, allowed kinds) when `limits` is given

`simulate` refuses to run a graph with blocking issues and returns them instead.

### 3.4 Grading

```ts
type Goal = { id, metric: MetricKey | CustomCheck, op: '<=' | '>=' | '==', value }
type Verdict = { passed, score, stars, goals: { id, passed, measured }[] }
```

Custom checks cover structural goals such as "web servers only reachable through a
public entry point". Grading is separate from simulation so one run can be scored against
several challenge modes, and Lab runs are not scored at all.

## 4. Simulation model

### 4.1 Main loop

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
   per-edge network delay along the path. Percentiles are computed from per-class
   latency distributions.
5. **Apply faults and dynamic features** scheduled for this tick.
6. Every 10 ticks, **record a timeline frame**.

### 4.2 Component plugins

```ts
interface ComponentModel {
  kind: string
  meta: ComponentMeta                     // label keys, icon, category, config schema
  accepts: EdgeKind[]                     // valid inbound edge kinds
  defaults: Config
  costPerMonth(cfg: Config, replicas: number): number
  capacity(cfg: Config): { rps: number; workers: number; memMb: number }
  step(state: NodeState, inflow: Inflow, ctx: TickContext): StepOutput
  onFault?(fault: Fault, state: NodeState, ctx: TickContext): SimEvent[]
}
```

v1 components: `client`, `lb`, `api-gateway`, `web-server`, `worker`, `redis`,
`memcached`, `postgres`, `kv-store`, `queue`, `cdn`, `object-storage`. Adding a component
means adding one file.

### 4.3 Dynamic features (evaluated per tick)

- **Auto scaling**: target busy %, min/max instances, cooldown.
- **Retries**: count and backoff (fixed / exponential). Retries add load.
- **Circuit breaker**: opens when the failure rate crosses a threshold, half-opens after a
  recovery window.
- **Database failover**: primary loss promotes a replica after a failover delay; with no
  replica, writes fail until the end of the run.
- **Rate limiting**: per-client requests per minute.

### 4.4 Behaviors

Scenario-specific logic lives in `behaviors/` and attaches to nodes through `config`:

- `id-generator`: `uuid | snowflake | db-sequence`. Produces `duplicateIds` and
  `outOfOrderIds`; `db-sequence` fails against stores without auto-increment.
- `presence`: heartbeat interval, offline-after timeout, connection drops. Produces
  `statusFlaps` and `staleOnline`.
- `fanout`: group/friend fan-out on write. Produces `inboxWritesPerSec` and queue load.

### 4.5 Sampled traces

Every N-th request (N chosen so about 300 traces are kept) is walked hop by hop through the
same queues, receiving the actual waiting time of each queue at that tick. This keeps
traces faithful enough for the "which component made this slow?" quiz without paying for
per-request simulation.

### 4.6 Determinism

A seeded PRNG (`mulberry32`) is the only source of randomness. Iteration order over nodes
and edges is sorted by id. Same input produces byte-identical output.

## 5. Calibration and testing

All tunable constants live in `calibration.ts`, each with a comment explaining the estimate
(requests per vCPU, network delay per edge kind, failover delay, cache hit curve, memory
per in-flight request, …).

Four test layers (`vitest`, `fast-check`):

1. **Component unit tests**: e.g. a 1-vCPU web server at 50% load has no queue; at 150% the
   queue grows and rejections start once memory is exhausted; a Postgres with one replica
   emits `db.promoted` after the failover delay when its primary goes down.
2. **Property tests**:
   - Determinism: the same seed gives the same result.
   - Monotonicity: more replicas on the bottleneck never raise p95.
   - Flow conservation: requests = served + rejected + timed out + in flight.
   - Cost equals the sum of component costs.
   - Bounds: 0 ≤ availability ≤ 1 and p50 ≤ p95 ≤ p99.
3. **Golden scenarios** (about 15), asserting ranges rather than exact values, for example:
   - One web server under a 3× surge is overloaded; LB + 5 web servers meets
     p95 ≤ 100 ms and availability ≥ 99.9%.
   - A cache in front of the database lowers peak database connections on a read-heavy
     workload.
   - UUID IDs come out of order, Snowflake IDs are unique and ordered, and database-issued
     IDs fail on a key-value store.
   - A heartbeat timeout shorter than a drop causes flaps; a very long one leaves departed
     users shown online.
   - Losing the primary with no replica drops availability; adding a replica promotes it.
4. **Snapshots** of full results for the golden scenarios, updated deliberately with
   `--update`.

**Performance budget:** a 10 s run with 10 nodes finishes in under 300 ms on Node. This is
enforced by a benchmark test.

## 6. Repository layout

pnpm workspaces monorepo:

```
system-design/
├─ packages/
│  ├─ sim/                 ← this sub-project
│  │  ├─ src/
│  │  │  ├─ types.ts
│  │  │  ├─ simulate.ts
│  │  │  ├─ validate.ts
│  │  │  ├─ grade.ts
│  │  │  ├─ rng.ts
│  │  │  ├─ calibration.ts
│  │  │  ├─ components/    one file per component kind
│  │  │  ├─ behaviors/     id-generator.ts, presence.ts, fanout.ts
│  │  │  └─ index.ts
│  │  ├─ test/             unit/, property/, golden/, __snapshots__/
│  │  └─ scripts/demo.ts
│  ├─ content/             (sub-project 2)
│  └─ ui/                  (later)
├─ apps/web/               (sub-project 3+)
└─ docs/superpowers/specs/
```

Tooling: TypeScript strict, vitest, fast-check, ESLint, Prettier. `packages/sim` has
**no runtime dependencies**.

## 7. Scope

**In scope:** the engine, the validator, the grader, the 12 components, the three behaviors,
the 14 fault kinds, the four test layers, the benchmark, and a demo script.

**Out of scope:** UI, canvas, animation, lesson content, storage, AI, and AI-chosen
chaos mode.

## 8. Done when

- All tests pass.
- All golden scenarios pass.
- The benchmark is under 300 ms.
- `pnpm --filter sim demo` runs "1 web server → LB + 5 web servers" under a 3× surge and
  prints metrics before and after.
