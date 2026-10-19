# Hedged requests and tail-tolerant design — research note

- Level: L6 (deepens `percentiles-and-tail-latency`)
- Feeds lessons: `l6-tail-latency-hedging`
- Builds on: `percentiles-and-tail-latency`, `timeouts-retries-backoff`, `adaptive-concurrency-limits`
- Researched: 2026-10-19

## Key facts (in our words)

1. **Fan-out turns rare slowness into common slowness.** If one server answers slowly 1% of the time
   and a request waits for 100 servers, about 63% of requests (1 − 0.99¹⁰⁰) hit at least one slow
   answer. Large services cannot remove every cause of slowness, so they design to tolerate it. [1]
2. **Hedged request**: send the request to one replica; if no reply arrives within a delay, send a
   second copy to another replica and use whichever answers first, cancelling the other. [1][11]
3. **Wait before hedging.** Sending the hedge only after the request has been outstanding longer
   than the 95th-percentile expected latency limits extra load to about 5% while cutting the tail.
   In Google's example with BigTable, hedging after 10 ms cut the 99.9th-percentile latency for
   reading 1,000 keys from 1,800 ms to 74 ms while sending only about 2% more requests. [1]
4. **Tied requests** go further: send to two servers at once, each knowing about the other, and the
   first to *start* executing tells the other to cancel — avoiding duplicate work while still
   dodging queues. [1]
5. **Only for idempotent, read-like operations.** A hedged write can execute twice; hedging needs
   the same idempotency guarantees as retries. [2][3]
6. **gRPC supports hedging** in its retry design: a hedging policy with `maxAttempts`,
   `hedgingDelay` and non-fatal status codes, throttled by a retry/hedging budget so hedges stop when
   the server is failing. [2]
7. **Envoy can hedge on per-try timeout**: when a per-try timeout fires it may send another attempt
   without cancelling the first, and use the first response. [3]
8. **Databases do it too.** Cassandra's `speculative_retry` table option sends a read to another
   replica when the first is slower than a chosen percentile or fixed time. [4]
9. **Hedging is dangerous under overload.** Every hedge is extra load; if slowness is caused by global
   overload rather than one unlucky server, hedges make it worse. Budgets (e.g. at most 5–10% extra)
   and backing off when error rates rise keep it safe. [1][2][5]
10. **Other tail tools**: micro-partitioning (many small shards so load moves easily), selective
    replication of hot items, probation of slow machines, good-enough answers (return partial
    results when a few leaves are late) and canary requests to catch queries of death before full
    fan-out. [1][12]
11. **Redundancy can reduce latency in general.** Studies of DNS and key-value lookups showed that
    issuing redundant copies of small requests lowers mean and tail latency when system utilisation
    is low enough. [6]

## Numbers worth remembering

- P(at least one slow among n) = 1 − (1 − p)ⁿ: p = 1%, n = 100 → 63%. [1]
- Hedge at ~p95 → ≤ ~5% extra requests. [1]
- Google example: p99.9 1,800 ms → 74 ms with ~2% extra requests. [1]

## Engine mapping

- Gap `hedged-requests`: per-edge hedging delay (none / p95 / immediate) to another replica, extra
  load counted in `peakBusy`/cost, effect on `p99` under `instance-slow` (one slow replica) vs under
  `traffic-surge-3x` (global overload, where hedging hurts).
- Needs per-request latency variance (open question from L0: 1a gives all requests in a tick the
  same latency).

## Misconceptions

- "Hedging doubles load." With a p95 delay it adds a few percent. [1]
- "Hedge everything, including payments." Only idempotent operations. [2]
- "Hedging always helps." Not when the whole fleet is overloaded. [1][5]
- "Average latency is what users feel in fan-out." The slowest leaf decides. [1]

## Analogy ideas

- Calling a second taxi company only if the first has not answered within a minute, then cancelling
  whichever comes second.

## Caveats

- The BigTable figures are from one benchmark in the paper; use them as an illustration.

## Sources

Primary:
1. *The Tail at Scale* — Jeffrey Dean, Luiz André Barroso, Communications of the ACM 56(2) —
   https://research.google/pubs/the-tail-at-scale/ — 2013.
2. *gRFC A6: gRPC Retry Design* (retry and hedging policies, throttling) — gRPC proposals —
   https://github.com/grpc/proposal/blob/master/A6-client-retries.md — 2017.
3. *HTTP routing — Request hedging* — Envoy documentation —
   https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/http/http_routing — accessed 2026-10-19.
4. *Data Definition — speculative_retry* — Apache Cassandra documentation —
   https://cassandra.apache.org/doc/latest/cassandra/developing/cql/ddl.html — accessed 2026-10-19.
5. *Timeouts, retries, and backoff with jitter* — Marc Brooker, Amazon Builders' Library —
   https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/ — 2019.
6. *Low Latency via Redundancy* — A. Vulimiri, P. B. Godfrey, R. Mittal, J. Sherry, S. Ratnasamy,
   S. Shenker, CoNEXT — https://arxiv.org/abs/1306.3707 — 2013.
7. *Achieving Rapid Response Times in Large Online Services* (talk) — Jeff Dean, Berkeley AMPLab —
   https://research.google/pubs/achieving-rapid-response-times-in-large-online-services/ — 2012.

Books:
11. [B1] *Designing Data-Intensive Applications* — Kleppmann — ch. 1 "Describing Performance"
    (tail latency amplification).
12. [B25] *The Datacenter as a Computer*, 3rd ed. — Barroso, Hölzle, Ranganathan — ch. 2
    "Workloads and Software Infrastructure" (tail-tolerant techniques).
13. [B31] *Designing Distributed Systems*, 2nd ed. — Burns — "Scatter/Gather" chapter (leaf
    stragglers).

Repos:
14. [G25] aphyr/distsys-class — latency and failure-mode outline — https://github.com/aphyr/distsys-class.
15. [G1] donnemartin/system-design-primer — latency numbers and performance vs scalability —
    https://github.com/donnemartin/system-design-primer.
