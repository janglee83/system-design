# Caching patterns: cache-aside, hit ratio, invalidation, write policies — research note

- Level: L2
- Feeds lessons: `l2-cache-aside`, `l2-cache-hit-ratio`, `l2-cache-invalidation`,
  `l2-write-patterns`, `l2-read-heavy-recipe`
- Researched: 2026-10-19

## Key facts (in our words)

1. **Cache-aside (lazy loading)**: the app reads the cache; on a miss it reads the database and fills
   the cache. Only requested data is cached; the first read of each key is slow. [1][2]
2. **Write-through** writes the cache and database together (fresh cache, slower writes, cache full of
   data nobody reads); **write-back/write-behind** acknowledges after the cache write and persists
   later (fast, risk of loss); **write-around** writes only the database. [1][2][9]
3. **TTL bounds staleness**; deleting the key on update ("invalidate") is usually preferred over
   updating it, because concurrent updates can leave the wrong value behind. [1][3]
4. **Facebook's memcache** uses demand-filled look-aside caching, deletes on write, and *leases* to
   stop stale sets and thundering herds; they also note that cache invalidation across regions is the
   hard part. [3]
5. **Hit ratio depends on working set vs cache size and on access skew.** Popular keys (Zipf-like
   distributions) let a small cache absorb most reads; Redis' `allkeys-lru` suits that case. [4][5]
6. **"There are only two hard things in computer science: cache invalidation and naming things."**
   (Phil Karlton, as recorded by Fowler.) [6]
7. **Layered read path**: CDN for static, application cache for hot objects, replicas for the rest,
   primary for writes — the standard read-heavy recipe. [7][9][10]
8. **TAO** (Facebook's graph store) is a write-through cache tier over MySQL designed for a
   read-dominated social graph. [8]

## Engine mapping

- `redis`/`memcached` and `cache` edges are planned (1b), with a hit rate derived from cache size and
  key space (spec §6.1) and `cache-down` fault → `l2-cache-aside`, `l2-cache-hit-ratio`,
  `l2-read-heavy-recipe` need 1b only.
- TTL/invalidation and `staleReads` → gap `cache-ttl-staleness-model`; write policies → gap
  `write-policy`.

## Misconceptions

- "Update the cache on write; that's always freshest." Races can store old values. [1][3]
- "Bigger TTL is always better." Higher hit ratio, staler data. [1]
- "A cache can replace capacity planning for the DB." Cold start and cache loss send all reads back. [3]

## Sources

Primary:
1. *Caching patterns* (Database Caching Strategies Using Redis whitepaper) — AWS —
   https://docs.aws.amazon.com/whitepapers/latest/database-caching-strategies-using-redis/caching-patterns.html — accessed 2026-10-19.
2. *Cache-Aside pattern* — Azure Architecture Center, Microsoft —
   https://learn.microsoft.com/en-us/azure/architecture/patterns/cache-aside — accessed 2026-10-19.
3. *Scaling Memcache at Facebook* — R. Nishtala et al., NSDI '13 —
   https://pdos.csail.mit.edu/6.824/papers/memcache-fb.pdf — 2013.
4. *Key eviction* — Redis docs — https://redis.io/docs/latest/develop/reference/eviction/ — accessed 2026-10-19.
5. *Web Caching and Zipf-like Distributions: Evidence and Implications* — L. Breslau, P. Cao, L. Fan,
   G. Phillips, S. Shenker, INFOCOM — https://pages.cs.wisc.edu/~cao/papers/zipf-implications.html — 1999.
6. *TwoHardThings* — Martin Fowler — https://martinfowler.com/bliki/TwoHardThings.html — 2009.
7. *Caching Overview* — AWS — https://aws.amazon.com/caching/ — accessed 2026-10-19.
8. *TAO: Facebook's Distributed Data Store for the Social Graph* — N. Bronson et al., USENIX ATC —
   https://www.usenix.org/system/files/conference/atc13/atc13-bronson.pdf — 2013.

Books:
9. [B38] *Web Scalability for Startup Engineers* — Ejsmont — ch. 6 "Caching".
10. [B4] *Understanding Distributed Systems* — part "Scalability", chapters "HTTP caching" and
    "Caching".
11. [B14] *Redis in Action* — Carlson — chapter on caching with Redis.

Repos:
12. [G1] donnemartin/system-design-primer — "Cache" (cache-aside, write-through, write-behind,
    refresh-ahead) — https://github.com/donnemartin/system-design-primer.
13. [G19] MicrosoftDocs/architecture-center — cache-aside pattern source —
    https://github.com/MicrosoftDocs/architecture-center.
