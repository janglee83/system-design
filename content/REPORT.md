# Content researcher report — run of 2026-10-18/19

Branch `content/curriculum`, commits `3fdf78d..HEAD` (this report is the last commit).

## What was created

| Path | What |
|---|---|
| `content/curriculum.json` | Full 0→100 map: 7 levels, 127 lessons, 37 challenges, 51 engine gaps with the lessons/challenges that need them |
| `content/tools/gen_curriculum.py` | Data + validator that generates `curriculum.json` |
| `content/research/*.md` | 21 research notes covering every L0 and L1 topic |
| `content/drafts/l0-*.md` | 13 complete L0 lesson drafts, VI + EN, each with a shared experiment/check spec |
| `content/README.md` | Folder layout, file conventions, 10-point authoring checklist, pre-publish checklist |
| `content/REPORT.md` | This report |

## Counts

- Levels: 7 (L0–L6), each with entry assumptions, outcomes, an exit check that names a challenge, lessons and challenges.
- Lessons: 127 — by level {'L0': 13, 'L1': 18, 'L2': 20, 'L3': 19, 'L4': 16, 'L5': 20, 'L6': 21}.
  - Formats: 95 experiments, 32 reading+check.
  - Readiness: {'ready-1a': 22, 'needs-1b': 19, 'blocked-by-gap': 54, 'not-needed': 32}.
- Challenges: 37 — by level {'L0': 3, 'L1': 5, 'L2': 5, 'L3': 5, 'L4': 4, 'L5': 10, 'L6': 5}; readiness {'ready-1a': 5, 'needs-1b': 11, 'blocked-by-gap': 21}. Every challenge has goals (metric + op + value) and 1–4 modes.
- Research notes: 21 (11 for L0, 10 for L1), 6–8 sources each.
- Distinct sources: 63 (61 distinct URLs plus two print sources: Kleppmann's *Designing Data-Intensive Applications* and Little's 1961 paper). Primary sources dominate: IETF RFCs (1034, 9110, 9293), PostgreSQL/Redis/NGINX/HAProxy/Kubernetes/AWS documentation, Google SRE book and workbook, papers (Tail at Scale, Maglev, Memcache at Facebook, Akamai, Power of Two Choices, Little's Law), Amazon Builders' Library, engineering blogs (Stack Overflow, Netflix, Cloudflare).
- Drafts: 13 (all L0 lessons). 10 L0 lessons are experiments that run on the 1a engine; 3 are reading+check (HTTP, DNS, availability nines); the cache lesson is reading+check until `redis` ships.

## Coverage versus the reference topic map

Every topic on the reference map is covered: web-tier scaling (L1), CDN (L1), stateless servers (L1),
choosing and sharding databases (L2), read-heavy scaling with caches and replicas (L2), message queues
(L3), multi-data-center (L6), estimation (L0, L5), interview framework (L5), rate limiter (L3, L5),
consistent hashing (L4), key-value store with CAP/quorum/internals (L4, L5), unique IDs (L4, L5), URL
shortener, web crawler, notifications, news feed, chat with inboxes/IDs/presence, autocomplete, flash
sale, background jobs (L3, L5). Beyond it: queueing theory and percentiles from L0, cost as a
requirement, health checks/N+1/zones/rolling deploys, connection pooling, replication lag, cache
stampedes, isolation anomalies, search indexing, delivery semantics and idempotency, retry storms and
jitter, load shedding, bulkheads, fallbacks, DLQs, observability and SLOs, CAP/PACELC, consistency
models, logical clocks, gossip, leader election, CRDTs, anti-entropy, file sync, video, payments,
leaderboard, proximity, metrics pipeline, job scheduler, geo-routing and DR, multi-region writes, Raft,
2PC, sagas, outbox, CDC, event sourcing/CQRS, backpressure, adaptive concurrency, hedged requests,
capacity planning, cost trade-offs, burn-rate alerting, incident debugging, chaos engineering, safe
deployments and zero-downtime migrations.

## How experiment numbers were checked

I re-implemented the 1a tick model from plan 1a (Task 6 formulas) in a scratch Python script and ran
every L0 experiment choice and the L0/L1 challenge targets through it. Results agree with the plan's
golden fixtures except one (below). All expected values in drafts are marked "≈" and must be confirmed
with `sim-cli check` before publishing.

Lessons ready on 1a (22): l0-client-server, l0-latency-and-distance, l0-throughput-and-capacity, l0-queueing-and-utilization, l0-percentiles, l0-database-basics, l0-single-point-of-failure, l0-cost-basics, l0-estimation-basics, l1-vertical-scaling, l1-vertical-limits, l1-horizontal-scaling, l1-load-balancer-intro, l1-n-plus-one, l1-lb-redundancy, l1-public-entry-point, l2-indexes, l2-read-replicas, l2-db-failover, l3-observability-basics, l6-capacity-planning, l6-cost-tradeoffs.

Challenges ready on 1a (5): c-l0-first-launch, c-l0-exit-coffee-shop, c-l1-no-single-point, c-l2-failover-drill, c-l6-cost-cut.

## Open questions

1. **Golden fixture vs formula.** Plan 1a's `web-tier-surge-single` expects availability ≤ 0.95, but
   the plan's own formula (reject fraction = rejected ÷ (queue + arrivals) per tick) gives about 0.97
   in my re-implementation. Either the fixture or the formula will change; I avoided availability-only
   goals for overload lessons and graded on `p95` and `requestsRejected` instead.
2. **Steady-state percentiles.** In 1a every request in a tick has the same latency, so p50 = p95 = p99
   under constant load. Tail lessons need bursts (used in `l0-percentiles`). Is per-request variance
   planned (e.g. `instance-slow`, service-time distribution)?
3. **Web replicas without an LB in L0.** `l0-single-point-of-failure` uses `replicas: 2` on a web node
   reached directly by the client, before the load balancer is taught. The engine accepts this; product
   should confirm it is acceptable pedagogically (the text says "something splits traffic; L1 shows
   what").
4. **Edge delay semantics.** I treat `edgeDelayHttpMs` as round-trip time on the wire for the latency
   lesson. Confirm the engine intends one value per hop (it adds it once).
5. **Database size in L0.** Postgres has no size setting; I use per-node `rpsPerInstance`/`costPerMonth`
   overrides as "standard/large" presets. A real `postgres.cpu` setting would read more naturally.
6. **Experiment control format.** Drafts use a provisional spec (`controls` mapping to config paths,
   `choices` with expected values). Sub-project 2 should confirm or replace it.
7. **Custom structural checks.** Spec §4.4 mentions custom checks (e.g. "writes must reach a durable
   store"); none exist in 1a. Several later lessons would benefit.

## Engine gaps (features not in the sim-engine spec)

| Gap | What is needed | Uses | Needed by |
|---|---|---|---|
| `third-party-node` | An external dependency node kind (payment/email/SMS provider) that third-party-down / third-party-slow faults target. | 12 | l3-timeouts, l3-circuit-breakers, l3-bulkheads, c-l3-flaky-payment, c-l3-exit-order-pipeline, l5-notification-system, l5-payment-system, c-l5-notifications, c-l5-exit-marketplace, l6-sagas, c-l6-payment-saga, c-l6-capstone |
| `regions-and-geo-routing` | Multiple regions with cross-region edge delay, geo/latency routing of clients, and a region-down fault. | 7 | l1-dns-and-global-entry, l6-multi-region-basics, l6-geo-routing, l6-active-passive-dr, l6-multi-region-writes, c-l6-global-checkout-lite, c-l6-capstone |
| `static-request-share-and-cdn-hit-model` | Workload share of static/cacheable requests and how a CDN edge hit ratio is computed (TTL, object popularity). Confirm whether plan 1b already intends this. | 5 | l1-cdn-static-content, l1-object-storage-for-assets, c-l1-photo-news, l5-video-streaming, c-l5-exit-marketplace |
| `idempotency-keys` | Consumer/API deduplication by idempotency key, turning duplicate deliveries/retries into duplicateWrites = 0. | 5 | l3-idempotency, c-l3-exit-order-pipeline, l5-notification-system, l5-payment-system, c-l5-notifications |
| `kv-quorum-config` | kv-store replication factor N and read/write quorum R/W, with staleReads and availability depending on them under kv-node-down. | 5 | l4-quorums, c-l4-kv-quorum, c-l4-exit-ring, l5-kv-store-design, c-l5-kv-store |
| `partitioning-scheme` | Key partitioning scheme for kv-store (modulo vs consistent hashing, virtual nodes) and a 'keys moved on resize' metric. | 5 | l4-consistent-hashing, l4-virtual-nodes, c-l4-exit-ring, l5-kv-store-design, c-l5-kv-store |
| `distributed-transactions` | Multi-service transactions: 2PC coordinator (with coordinator-down blocking) and sagas with compensation; inconsistency metric. | 4 | l6-two-phase-commit, l6-sagas, c-l6-payment-saga, c-l6-capstone |
| `sql-sharding` | Partitioned postgres (N shards) with a chosen shard key, key skew producing hot shards, and cross-shard queries. | 3 | l2-sharding-basics, l2-shard-keys, c-l2-orders-sharding |
| `load-shedding` | Server-side shedding/adaptive concurrency limit: reject early when queue wait exceeds a budget, optionally by priority. | 3 | l3-load-shedding, c-l3-public-api, l6-adaptive-concurrency |
| `rate-limit-algorithms` | Choice of rate-limit algorithm (token bucket, leaky bucket, fixed window, sliding window) and burst behaviour; spec only has per-client requests per minute. | 3 | l3-rate-limit-algorithms, l5-rate-limiter-design, c-l5-rate-limiter |
| `conflict-resolution` | Concurrent writes to replicas resolved by LWW, version vectors or CRDT merge, with lostUpdates metric. | 3 | l4-conflict-resolution, c-l4-exit-ring, l6-multi-region-writes |
| `inventory-concurrency-control` | Limited inventory decremented concurrently, with an oversold metric and strategies (row lock, atomic decrement, reservation queue). | 3 | l5-flash-sale, c-l5-flash-sale, c-l5-exit-marketplace |
| `outbox-cdc` | Dual-write inconsistency metric, transactional outbox relay and change-data-capture stream from postgres. | 3 | l6-outbox-pattern, l6-change-data-capture, c-l6-payment-saga |
| `deployment-model` | Rolling / canary deployments and a 'bad deploy' fault (new version slower or erroring on a fraction of instances), with rollback. | 2 | l1-rolling-deploys, l6-safe-deployments |
| `session-state-model` | Per-user session state: web-server sessionState local|shared, LB stickiness, and a lostSessions metric when an instance holding local sessions dies. | 2 | l1-stateless-servers, l1-session-store |
| `autoscaling-warmup-delay` | Instance warm-up time before a newly launched instance takes traffic, so sudden spikes can outrun autoscaling. | 2 | l1-autoscaling, c-l1-day-and-night |
| `replication-lag-model` | Replication lag between primary and replicas producing staleReads (and read-your-writes violations) when reads go to replicas. | 2 | l2-replication-lag, l6-active-passive-dr |
| `cache-ttl-staleness-model` | Cache TTL and invalidation-on-write settings producing staleReads vs hit ratio trade-off. | 2 | l2-cache-invalidation, c-l2-hot-product |
| `cache-stampede-and-hot-keys` | Key popularity skew (hot keys), synchronized expiry causing stampedes on the database, and mitigations (request coalescing, jittered TTL). | 2 | l2-cache-failures, c-l2-hot-product |
| `search-index-component` | Search engine component (inverted index) fed asynchronously from the database, with indexing lag. | 2 | l2-search-indexing, l6-change-data-capture |
| `delivery-semantics` | Queue delivery settings (at-most-once / at-least-once, ack timeout, redelivery) producing lostMessages vs duplicates. | 2 | l3-delivery-semantics, c-l3-exit-order-pipeline |
| `per-hop-timeouts` | Timeout configured per edge/dependency (not only the client timeout), freeing workers when a dependency is slow. | 2 | l3-timeouts, c-l3-flaky-payment |
| `retry-jitter` | Jitter option on retry backoff (none/full/equal) so synchronized retries spread out. | 2 | l3-retry-storms-jitter, c-l3-retry-storm |
| `network-partition-fault` | Network partition between groups of nodes (both sides alive, cannot talk), needed for CAP and split-brain experiments. | 2 | l4-cap-theorem, l4-leader-election |
| `leader-election-leases` | Leader election with leases/fencing and a splitBrain metric under partitions or pauses. | 2 | l4-leader-election, l5-job-scheduler |
| `long-lived-connections` | Long-lived (WebSocket) connections with a per-server connection capacity, reconnect storms when a server dies. | 2 | l5-chat-system, c-l5-chat |
| `crawler-behaviors` | Crawler-specific behaviour: URL frontier, per-host politeness rate, duplicate URL/content detection. | 2 | l5-web-crawler, c-l5-crawler |
| `autocomplete-topk` | Precomputed top-k prefix index (trie) with an update pipeline and freshness metric. | 2 | l5-search-autocomplete, c-l5-autocomplete |
| `event-log-stream` | Partitioned append-only log (Kafka-like) with retention, consumer groups and consumer lag metric. | 2 | l5-metrics-pipeline, l6-event-sourcing-cqrs |
| `multi-region-writes` | Writes accepted in several regions with cross-region replication delay and conflict counting. | 2 | l6-multi-region-writes, c-l6-capstone |
| `connection-setup-cost` | Cost of DNS lookup + TCP/TLS handshakes on new connections vs reused ones (first request vs repeat request). | 1 | l0-dns-and-network-path |
| `lb-algorithm-effect` | LB algorithm (round-robin, least-conn, two-choices) actually reacting to per-instance queue length when instances differ (e.g. under instance-slow). In 1a the LB splits equally. | 1 | l1-lb-algorithms |
| `health-check-detection-delay` | Delay between an instance failing and the LB noticing (check interval x unhealthy threshold); requests sent to the dead instance meanwhile fail. | 1 | l1-health-checks |
| `fail-open` | LB behaviour when all targets fail health checks (fail open vs fail closed). | 1 | l1-health-checks |
| `connection-draining` | Graceful removal of an instance (in-flight requests finish) vs abrupt removal during deploy or scale-in. | 1 | l1-rolling-deploys |
| `zones-and-zone-down-fault` | Availability-zone attribute per instance/node, cross-zone LB setting, and a correlated zone-down fault. | 1 | l1-availability-zones |
| `gateway-path-routing` | API gateway routing requests by path/route to different backend services with their own capacity. | 1 | l1-reverse-proxy-and-gateway |
| `postgres-max-connections` | Enforced max_connections on postgres plus a connection-pool setting on web servers; peakDbConnections then causes rejections. | 1 | l2-connection-pooling |
| `write-policy` | Cache write policies: write-through, write-back (with loss on cache-down), write-around. | 1 | l2-write-patterns |
| `transaction-isolation-model` | Concurrent updates to the same rows under isolation levels / locking / optimistic concurrency producing lostUpdates or writeConflicts. | 1 | l2-transactions-isolation |
| `bulkheads` | Separate worker pools per dependency inside a service so one slow dependency cannot take all workers. | 1 | l3-bulkheads |
| `fallbacks` | Degraded/fallback responses (cached or default answer) when a dependency fails, counted separately from errors. | 1 | l3-graceful-degradation |
| `dead-letter-queue` | Moving messages that fail N times to a dead-letter queue instead of retrying forever (poison messages). | 1 | l3-dead-letter-queues |
| `clock-skew` | Per-node clock skew/drift affecting timestamp ordering and last-write-wins. | 1 | l4-clocks-and-ordering |
| `gossip-membership` | Gossip-based membership/failure dissemination with convergence time. | 1 | l4-gossip |
| `chunked-upload-dedupe` | Chunked uploads with content-hash deduplication and sync notifications. | 1 | l5-file-sync |
| `sorted-set-ops` | Cache component supporting sorted-set operations (rank/top-N) with their own cost. | 1 | l5-leaderboard |
| `geo-index` | Geospatial index (geohash/quadtree) and query fan-out by area. | 1 | l5-proximity-service |
| `consensus-replication` | Replicated state machine (Raft-like group of 3/5) with majority commit, leader failover time and unavailability without quorum. | 1 | l6-consensus-raft |
| `backpressure-producer-feedback` | Producer slowing or blocking when a downstream queue is full (backpressure signal), vs unbounded queue growth. | 1 | l6-backpressure |
| `hedged-requests` | Hedged/backup requests sent after a delay to another replica, with the extra-load cost. | 1 | l6-tail-latency-hedging |

Highest impact: `third-party-node` (the spec has third-party faults but no node kind for them to
target), `regions-and-geo-routing`, `kv-quorum-config`, `partitioning-scheme`, `idempotency-keys`,
`static-request-share-and-cdn-hit-model`.

## Top concerns

1. **Most of the curriculum above L1 cannot run yet**: only 22 lessons and 5 challenges run on 1a; 54 lessons and 21 challenges need features the spec does not plan. The engine roadmap should be prioritised against `engineGaps`.
2. **Expected numbers are from my re-implementation, not the real engine**, and one golden fixture already disagrees with the formula. Every draft must pass `sim-cli check` before publishing; thresholds were chosen with margin, but the failover drill and exit checks are close to their limits.
3. **Research depth stops at L1.** Notes exist for L0 and L1 only; L2–L6 lessons in the map rely on my background knowledge and need their own cited notes (papers listed in the agent file) before drafting. Vietnamese text also needs a native-speaker review for tone and terminology consistency.
