# Reference product — coverage matrix

Read on 2026-10-19 from the public pages `https://dashboard.syscraft.app/learn`, `/concepts` and
`/challenges` (no login, no API calls, no simulation runs). We recorded **structure only**: ids,
format, difficulty, minutes, number of objectives/steps/takeaways, concept ids, linked challenges,
modes. No lesson text, questions, hints, scenarios or visuals were copied, and no page snapshots are
kept in the repo. Their titles are referred to by id. Teaching techniques are described in our own
words.

Their counts: **38 lessons** (21 articles, 16 guided experiments, 1 mixed), **44 concepts**,
**17 challenges** with 1–5 modes each. Ours: see `curriculum.json` (lessons, challenges and levels
after this update are listed in `REPORT.md`).

Legend for format: A = article (reading), GE = guided experiment, M = mixed. Diff = 1 easy, 2 medium,
3 hard. Obj/Steps/TA = number of objectives, steps, takeaways.

## Lessons

| Their id | Domain | Fmt | Diff | Min | Obj | Steps | TA | Their concepts | Our coverage |
|---|---|---|---|---|---|---|---|---|---|
| scale-the-web-tier | scalability | A | 1 | 8 | 3 | 4 | 3 | vertical/horizontal scaling, LB | `l1-vertical-scaling`, `l1-vertical-limits`, `l1-horizontal-scaling`, `l1-load-balancer-intro` |
| content-delivery-network | caching | A | 1 | 7 | 3 | 4 | 2 | CDN (prereq cache tier) | `l1-cdn-static-content`, `l1-object-storage-for-assets` |
| stateless-web-tier | scalability | A | 2 | 6 | 2 | 4 | 2 | stateless web tier | `l1-stateless-servers`, `l1-session-store` |
| scale-the-data-tier | databases | A | 2 | 10 | 3 | 5 | 2 | relational vs NoSQL, sharding | `l2-sql-vs-nosql`, `l2-sharding-basics`, `l2-shard-keys` |
| scale-database-reads | databases | M | 2 | 8 | 2 | 3 | 2 | replication, cache tier | `l2-read-replicas`, `l2-cache-aside`, `l2-read-heavy-recipe` |
| message-queue | messaging | A | 2 | 6 | 2 | 4 | 2 | message queue | `l3-sync-vs-async`, `l3-message-queues` |
| multi-data-center | distributed-systems | A | 2 | 6 | 2 | 3 | 1 | multi-data-center | `l6-multi-region-basics`, `l6-geo-routing` (we place it later, after CAP) |
| horizontal-scaling-lab | scalability | GE | 2 | 8 | 1 | 3 | 1 | horizontal scaling | `l1-horizontal-scaling`, `l1-load-balancer-intro` |
| cache-read-traffic | caching | GE | 2 | 8 | 1 | 3 | 1 | cache tier | `l2-cache-aside`, `l2-cache-hit-ratio` (`l0-cache-basics` as intro) |
| relational-database-capacity | databases | GE | 2 | 8 | 1 | 3 | 1 | replication | `l0-database-basics` (bottleneck), `l2-read-replicas` |
| replication-and-sharding | databases | GE | 3 | 12 | 4 | 5 | 5 | replication, sharding, SQL/NoSQL | `l2-read-replicas`, `l2-sharding-basics`, `l2-shard-keys` |
| background-jobs | messaging | GE | 3 | 15 | 4 | 8 | 7 | message queue (workers, prefetch, partitions) | `l3-scaling-workers`, `l3-background-jobs`; **added** `l3-consumer-prefetch-and-partitions` |
| regional-failover | distributed-systems | GE | 3 | 10 | 3 | 4 | 4 | multi-DC, HA, vertical scaling (memory, DNS routing, storage regions) | `l6-geo-routing`, `l6-active-passive-dr`, `l1-dns-and-global-entry` |
| concurrency-correctness | concurrency | GE | 3 | 15 | 4 | 8 | 6 | concurrency control, idempotency | `l2-transactions-isolation`, `l5-flash-sale`, `l3-idempotency`; **added** `l5-hotel-booking` |
| back-of-the-envelope-estimation | scalability | A | 1 | 8 | 3 | 3 | 3 | estimation, latency numbers, HA | `l0-estimation-basics`, `l0-latency-and-distance`, `l0-availability-nines`, `l5-estimation-deep-dive` |
| capacity-planning-lab | scalability | GE | 1 | 6 | 2 | 2 | 1 | estimation, horizontal scaling, HA | `l0-estimation-basics`; **added** challenge `c-l0-size-from-estimate` |
| system-design-interview-framework | scalability | A | 1 | 10 | 3 | 6 | 3 | interview framework | `l5-interview-framework` |
| rate-limiter | scalability | A | 2 | 10 | 3 | 6 | 3 | rate limiter, token bucket | `l3-rate-limiting`, `l3-rate-limit-algorithms`, `l5-rate-limiter-design` |
| rate-limiter-lab | reliability | GE | 2 | 10 | 3 | 4 | 4 | rate limiter, token bucket (windows, buckets, shared counters) | `l3-rate-limit-algorithms`, `l5-rate-limiter-design` |
| consistent-hashing | distributed-systems | A | 3 | 9 | 3 | 5 | 3 | consistent hashing, virtual nodes | `l4-consistent-hashing`, `l4-virtual-nodes` |
| consistent-hashing-lab | distributed-systems | GE | 3 | 8 | 3 | 4 | 2 | same (modulo vs ring on cache-server loss) | `l4-consistent-hashing`; **added** challenge `c-l4-cache-ring` |
| key-value-store-design | distributed-systems | A | 3 | 10 | 3 | 5 | 3 | KV store, CAP, quorum | `l4-cap-theorem`, `l4-quorums`, `l5-kv-store-design` |
| key-value-store-failures | distributed-systems | A | 3 | 10 | 3 | 4 | 5 | vector clock, gossip, hinted handoff, Merkle tree, SSTable | `l4-conflict-resolution`, `l4-gossip`, `l4-anti-entropy`, `l5-kv-store-design` |
| quorum-lab | distributed-systems | GE | 3 | 10 | 3 | 5 | 4 | quorum, CAP, hinted handoff | `l4-quorums` |
| unique-id-generator | distributed-systems | A | 2 | 10 | 3 | 6 | 3 | unique IDs, snowflake | `l4-unique-ids`, `l5-unique-id-service` |
| unique-id-lab | distributed-systems | GE | 2 | 10 | 3 | 4 | 4 | same (multi-master, UUID, snowflake) | `l4-unique-ids` |
| url-shortener | distributed-systems | A | 2 | 10 | 3 | 6 | 3 | URL shortener, base62 | `l5-url-shortener` |
| url-shortener-lab | distributed-systems | GE | 2 | 10 | 3 | 4 | 4 | same (cache, redirects, codes) | `l5-url-shortener` |
| web-crawler | distributed-systems | A | 2 | 10 | 3 | 6 | 4 | crawler, URL frontier | `l5-web-crawler` |
| web-crawler-lab | distributed-systems | GE | 2 | 10 | 4 | 4 | 4 | same (duplicates, parser, DNS, politeness) | `l5-web-crawler` |
| notification-system | reliability | A | 2 | 10 | 3 | 6 | 4 | notification system | `l5-notification-system` |
| notification-system-lab | reliability | GE | 2 | 10 | 4 | 4 | 4 | notifications, idempotency (retries, dedupe, capping) | `l5-notification-system`, `l3-idempotency` |
| news-feed | scalability | A | 2 | 10 | 3 | 6 | 4 | news feed, fanout | `l5-news-feed`, `l3-pubsub-fanout` |
| news-feed-lab | scalability | GE | 2 | 10 | 3 | 4 | 4 | fanout on write/read/hybrid | `l5-news-feed` |
| chat-system | distributed-systems | A | 2 | 12 | 3 | 7 | 4 | chat, WebSocket, presence | `l5-chat-system`, `l5-chat-presence` |
| chat-system-lab | distributed-systems | GE | 2 | 8 | 3 | 3 | 3 | chat, presence (inboxes, IDs, heartbeats) | `l5-chat-system`, `l5-chat-presence`, `l4-failure-detection` |
| search-autocomplete | scalability | A | 2 | 12 | 3 | 9 | 4 | autocomplete, trie | `l5-search-autocomplete` |
| search-autocomplete-lab | scalability | GE | 2 | 10 | 3 | 4 | 4 | same (trie cache, offline gathering) | `l5-search-autocomplete` |

**Every one of their 38 lessons maps to at least one of ours.** Two topics were only partly covered
and were added: consumer prefetch/partitions (`l3-consumer-prefetch-and-partitions`) and a booking-style
concurrency case (`l5-hotel-booking`).

## Concepts (44)

All map to our concept ids or lessons: vertical/horizontal scaling, load balancer, stateless web tier,
CDN, cache tier, relational vs NoSQL, replication, sharding, message queue, multi-data-center, high
availability, back-of-the-envelope estimation, latency numbers, interview framework, rate limiter,
token bucket, consistent hashing, virtual nodes, key-value store, CAP, quorum, consistency models,
vector clock, gossip, hinted handoff, Merkle tree, SSTable, unique-id generator, snowflake ID, URL
shortener, base-62, web crawler, URL frontier, notification system, idempotency, news feed, fanout,
chat system, WebSocket, online presence, search autocomplete, trie, concurrency control.

Their concept records carry: aliases, type, domains, difficulty, summary, definition, explanation,
mechanism, key points, applicability, trade-offs, misconceptions, relations and related component ids.
We added `latency-numbers`, `frequency-capping`, `offline-aggregation`, `dns-cache` and
`content-dedupe` as concept ids on existing lessons so our concept map has no hole against theirs.

## Challenges (17)

| Their id | Type | Diff | Minutes | Modes (budget) | Our coverage |
|---|---|---|---|---|---|
| scale-web-tier | scale | 1 | 10–20 | standard 200, lean 112, failure 200 | `c-l1-launch-day` |
| scale-read-heavy | scale | 2 | 15–30 | standard 1500, lean 650, abuse 650, failure 800, orders 1500 | `c-l2-read-heavy-catalog` |
| static-asset-offload | fix | 2 | 10–20 | standard, failure, region (900 each) | `c-l1-photo-news` |
| zero-to-millions | scale | 3 | 25–45 | standard 2000, lean 1150, abuse 1250, failure 1500, chaos 1500 | **added** `c-l2-zero-to-millions` |
| background-jobs | fix | 3 | 20–40 | steady, burst, crash (400) | `c-l3-email-backlog`; **added** `c-l3-photo-pipeline` |
| flash-sale | fix | 3 | 20–40 | presale, launch, stall (700) | `c-l5-flash-sale` |
| capacity-estimation | scale | 1 | 10–25 | peak (78) | **added** `c-l0-size-from-estimate` |
| rate-limiter | fix | 2 | 10–25 | login 200, burst 200, scale-out 250 | `c-l3-public-api`, `c-l5-rate-limiter` |
| consistent-hashing | fix | 3 | 10–25 | offline, even (950) | **added** `c-l4-cache-ring` |
| key-value-store | fix | 3 | 10–25 | consistent, replica-down, fast-read, fast-write, chaos (600) | `c-l4-kv-quorum`, `c-l5-kv-store` |
| unique-id-generator | fix | 2 | 10–25 | requirements, outage (6000) | `c-l4-unique-ids` |
| url-shortener | fix | 2 | 10–25 | book-load, cache-down (3000) | `c-l5-url-shortener` |
| web-crawler | build | 2 | 10–25 | book-load, polite (400) | `c-l5-crawler` |
| notification-system | fix | 2 | 10–25 | book-load, provider-down, slow-provider, chaos (300) | `c-l5-notifications` |
| news-feed | fix | 2 | 10–25 | book-load, celebrity, spam, chaos (800) | `c-l5-news-feed` |
| chat-system | fix | 2 | 10–20 | book-load, tunnels, chaos (1000) | `c-l5-chat` |
| search-autocomplete | fix | 2 | 10–25 | book-load, cache-offline 650, data-gathering 650 | `c-l5-autocomplete` |

## What we cover that they do not (sample)

All of L0 (HTTP, DNS, latency, queueing, percentiles, cost); health checks, N+1, zones, rolling
deploys; indexes, connection pooling, replication lag, failover drills, cache invalidation and
stampedes, isolation anomalies, search indexing; delivery semantics, timeouts, retries/jitter, circuit
breakers, bulkheads, load shedding, DLQs, observability, SLOs; PACELC, consistency models, logical
clocks, leader election, CRDTs; file sync, video, payments, leaderboard, proximity, metrics pipeline,
job scheduler; all of L6 (multi-region writes, Raft, 2PC, sagas, outbox, CDC, event sourcing,
backpressure, hedging, capacity and cost planning, incident debugging, chaos engineering, safe
deployments, migrations).

## Teaching techniques worth adopting (our description)

1. **Fail first, then fix.** Their first experiment step often sets a goal that the *starting* design
   is expected to break (the goal asserts the bad outcome), so the learner sees the failure before
   touching anything. We will add an "observe the break" step 0 to every experiment spec.
2. **Named step verbs.** Steps are labelled with a verb (observe, compare, analyse, check, fix it,
   break it, stress it, trade off, prove it, extend, apply). "Fix it" and "analyse" dominate. Verbs
   tell the learner what kind of thinking the step wants; we will add a `verb` field to our steps.
3. **Progressive unlocking of controls.** Each experiment step declares which controls it unlocks, so
   early steps have few knobs. We will map our `controls` to steps.
4. **Condition-based feedback.** Feedback is a list of messages guarded by metric expressions
   (verdicts with a tone, nudges, observations). This is a cleaner way to write our per-misconception
   feedback: each wrong choice's message becomes "when p95 > X and cpu == 1".
5. **Paired lessons.** Each classic design has an article followed by a lab on the same concept, and
   both link to the same challenge. Our L5 lessons are single experiments; we will keep a short reading
   section before each L5 experiment instead of separate lessons.
6. **Modes named after the story.** Modes such as "celebrity", "tunnels", "provider-down",
   "cache-offline", "abuse", "orders" read better than generic names. We will name extra modes after
   what happens in them, keeping `standard/tight-budget/chaos` as the base set.
7. **Concept records with misconceptions and trade-offs.** Their concept schema has explicit
   misconception and trade-off fields; our concept map (sub-project 4) should too.
8. **Practice links.** Every lesson links to the challenges that practise it; our `curriculum.json`
   now lists challenge prerequisites, and the UI can invert them.

## Where we deliberately differ

- We start at L0 (no HTTP/latency/queueing lessons there) and teach failure handling (L3) and
  distributed fundamentals (L4) before the classic designs (L5).
- We put multi-data-center later (L6) because it needs CAP and replication lag first.
- Every lesson has a check or experiment; none are reading-only.
