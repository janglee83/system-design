# What a cache is (for beginners) — research note

- Level: L0 (concept), L2 (practice)
- Feeds lessons: `l0-cache-basics`; background for `l1-cdn-static-content`,
  `l2-cache-aside`, `l2-cache-invalidation`
- Researched: 2026-10-18

## Key facts (in our words)

1. **A cache is a fast, small copy of data that is slow or expensive to get.** It holds a subset
   of the data, usually in memory, and usually temporarily. [1]
2. **Hit and miss.** If the data is in the cache, it is a *hit* (fast). If not, a *miss*: fetch
   from the source, then usually keep a copy. Hit ratio = hits / (hits + misses). [1][3]
3. **Memory is much faster than disk or a network round trip.** Main memory ~100 ns; SSD random
   read ~16 µs; data-centre round trip ~500 µs. That gap is why caches pay off. [4]
4. **Caches exist at every layer:** browser, DNS resolvers, CDNs, application caches (Redis,
   Memcached), and inside the database. [1][2]
5. **Freshness has a time limit.** HTTP caches decide freshness by age vs `max-age`; stale entries
   can be revalidated with a conditional request (`304 Not Modified`). In application caches the
   same idea is a TTL. [2]
6. **Caches are copies, so they can be wrong.** If the source changes, the cache may serve old
   data until it expires or is invalidated. Large deployments invest heavily in invalidation.
   [5]
7. **Caches are bounded.** When full, they evict entries (Redis: LRU, LFU, random, TTL-based
   policies). A policy that matches the access pattern keeps the hit ratio high. [3]
8. **A cache shields the database.** Facebook's memcache tier absorbs the vast majority of reads
   so the databases see a fraction of the traffic. [5]

## Numbers worth remembering

| Access | Approx. time [4] |
|---|---|
| Main memory reference | 100 ns |
| SSD random read | 16 µs |
| Same-data-centre round trip | 500 µs |

## How this maps to the engine

- No cache component in 1a. `redis` and `memcached` are planned (spec §6.2) with a hit rate
  derived from cache size and key space (spec §6.1, step 2) and a `cache-down` fault.
- L0 lesson is therefore `reading+check`; mark `engine.availableIn = "1b"` to upgrade it to an
  experiment later. Not an engine gap (planned).
- TTL/staleness behaviour (`staleReads`) is listed as a metric but no mechanism is described →
  engine gap for L2 (`cache-ttl-staleness-model`).

## Misconceptions

- "A cache stores everything forever." (Bounded and temporary. [1][3])
- "A cache is just a faster database." (It is a copy; the source of truth is elsewhere. [1])
- "Adding a cache can only help." (Stale data, cold starts, and a cache outage that suddenly
  sends all traffic to the database. [5])

## Analogy ideas (ours)

- Keeping the spices you use every day on the counter instead of in the storeroom: fast to
  reach, limited space, and you must notice when a jar runs out or goes off.

## Sources

1. *Caching Overview* — Amazon Web Services — https://aws.amazon.com/caching/ — accessed
   2026-10-18.
2. *HTTP caching* — MDN Web Docs, Mozilla —
   https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Caching — last modified 2026-08-14.
3. *Key eviction* — Redis documentation —
   https://redis.io/docs/latest/develop/reference/eviction/ — accessed 2026-10-18.
4. *Latency Numbers Every Programmer Should Know* (interactive) — Colin Scott, after Peter
   Norvig and Jeff Dean —
   https://colin-scott.github.io/personal_website/research/interactive_latency.html — 2020
   values.
5. *Scaling Memcache at Facebook* — Rajesh Nishtala et al., USENIX NSDI '13 —
   https://pdos.csail.mit.edu/6.824/papers/memcache-fb.pdf — April 2013.
6. *Designs, Lessons and Advice from Building Large Distributed Systems* — Jeff Dean, LADIS
   keynote — https://www.cs.cornell.edu/projects/ladis2009/talks/dean-keynote-ladis2009.pdf —
   2009.
