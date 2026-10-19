# When caches fail: stampedes, hot keys and cold starts — research note

- Level: L2
- Feeds lessons: `l2-cache-failures` (background for `c-l2-hot-product`, `l6-incident-debugging`)
- Researched: 2026-10-19

## Key facts (in our words)

1. **Cache stampede (thundering herd / dog-piling):** when a popular key expires or the cache
   restarts, many requests miss at once and all hit the database to rebuild the same value. [1][2][3]
2. **Fixes:** let only one request rebuild (locks, leases, promises/request coalescing), serve the
   stale value while one worker refreshes, add jitter to TTLs, or refresh early with probability that
   rises near expiry ("XFetch"). [1][2][3]
3. **Facebook's leases** both prevent stale sets and limit how often a key can be rebuilt; their
   "gutter" pool absorbs traffic for failed cache servers so the database is not flooded. [1]
4. **Instagram** used promises so concurrent misses for the same key wait on a single backend fetch. [2]
5. **Hot keys** overload one cache shard regardless of cluster size; mitigations include replicating
   hot keys across shards, local in-process caches, and splitting a key into sub-keys. [1][4][8]
6. **Cold cache after failover or deploy** behaves like a cache outage; warming the cache or ramping
   traffic (slow start) protects the database. [1][5]
7. **Cache dependency becomes hard dependency:** if the database cannot survive the cache vanishing,
   the cache is part of your availability budget. [6][9]

## Engine mapping

- `cache-down` fault (planned 1b) shows the cache-loss case. Synchronized expiry, key popularity skew
  and coalescing are not in the spec → gap `cache-stampede-and-hot-keys`.

## Misconceptions

- "If the cache dies we just get slower." Often the database falls over. [1][6]
- "Adding cache nodes fixes a hot key." The key still lives on one node. [4][8]
- "TTLs should be round numbers." Identical TTLs expire together. [3]

## Sources

Primary:
1. *Scaling Memcache at Facebook* — Nishtala et al., NSDI '13 —
   https://pdos.csail.mit.edu/6.824/papers/memcache-fb.pdf — 2013.
2. *Thundering Herds & Promises* — Instagram Engineering —
   https://medium.com/instagram-engineering/thundering-herds-promises-82191c8af57d — 2017.
3. *Optimal Probabilistic Cache Stampede Prevention* — A. Vattani, F. Chierichetti, K. Lowenstein,
   VLDB — https://cseweb.ucsd.edu/~avattani/papers/cache_stampede.pdf — 2015.
4. *Key eviction* and *client-side caching* — Redis docs —
   https://redis.io/docs/latest/develop/reference/client-side-caching/ — accessed 2026-10-19.
5. *Edit target group attributes for your ALB* (slow start mode) — AWS docs —
   https://docs.aws.amazon.com/elasticloadbalancing/latest/application/edit-target-group-attributes.html — accessed 2026-10-19.
6. *Site Reliability Engineering*, ch. 22 "Addressing Cascading Failures" — Mike Ulrich, Google —
   https://sre.google/sre-book/addressing-cascading-failures/ — 2016.
7. *Caching challenges and strategies* — Matt Brinkley, Jas Chhabra, Amazon Builders' Library —
   https://aws.amazon.com/builders-library/caching-challenges-and-strategies/ — 2019.

Books:
8. [B4] *Understanding Distributed Systems* — part "Scalability", chapter "Caching" (and
   "Partitioning" on hot spots).
9. [B19] *Release It!*, 2nd ed. — Nygard — stability antipatterns ("dogpile", "self-denial").
10. [B1] *Designing Data-Intensive Applications* — ch. 6 "Partitioning" (skewed workloads and hot
    spots).

Repos:
11. [G11] binhnguyennus/awesome-scalability — caching posts under "Scalability → Cache" —
    https://github.com/binhnguyennus/awesome-scalability.
