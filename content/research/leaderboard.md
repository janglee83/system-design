# Real-time leaderboards and top-k — research note

- Level: L5
- Feeds lessons: `l5-leaderboard`
- Builds on: `caching-patterns`, `sharding`, `indexes-and-storage-engines`
- Researched: 2026-10-19

## Key facts (in our words)

1. **The hard query is "what is my rank?", not "who is top 10?".** Top-N on a database is an index
   scan of N rows. A user's rank needs "how many players have a higher score", which a plain B-tree
   index answers by counting rows — work that grows with the number of players. [3][10]
2. **Sorted sets solve rank in logarithmic time.** A Redis sorted set keeps members ordered by score;
   `ZADD`/`ZINCRBY` update a score and `ZRANK`/`ZREVRANK` return a position, each in O(log N), and
   `ZRANGE … REV` returns the top N in O(log N + N). [1][2]
3. **Under the hood: a skip list plus a hash table.** Redis implements sorted sets with a skip list
   (ordered by score, with span counts so ranks can be computed while walking) and a hash table from
   member to score. Skip lists give balanced-tree performance with simpler code, using randomised
   levels. [2][4]
4. **Memory is the constraint.** Every member of a sorted set lives in RAM; tens of millions of
   players fit on one large instance, but you must estimate bytes per entry (member id, score,
   skip-list pointers) and plan replicas for failover. [1][11]
5. **The database stays the source of truth.** Score events are written durably (database or log)
   and the sorted set is a derived, rebuildable view. If the cache is lost, rebuild from the log or
   table. [11][12]
6. **Sharding a leaderboard has two shapes.** Shard by score range (rank = players in higher ranges
   + rank within the shard, but hot ranges move as scores rise) or shard by player hash (writes
   spread evenly, but top-N needs a scatter-gather: take each shard's top N and merge). [11][12]
7. **Approximate ranks are often enough.** For "you are in the top 3%", keep a histogram of score
   buckets and report a percentile instead of an exact rank; only the top few hundred need exact
   positions. [11]
8. **Time-boxed boards are separate keys.** Daily/weekly/monthly leaderboards use one key per period
   (for example `lb:2026-10`), which also makes expiry and archiving trivial. [6][11]
9. **Ties need a rule.** Equal scores sort by member name in Redis; products often encode "who got
   there first" into the score (score plus a time-based fraction) to make ties deterministic. [1]
10. **SQL can rank, at a cost.** `RANK()`/`DENSE_RANK()` window functions compute ranks over a sorted
    result; fine for batch reports, expensive per request on millions of rows. [3]
11. **Trending/top-k over streams uses sketches.** When the set of items is huge (search terms,
    hashtags), the Count–Min sketch estimates frequencies in fixed memory and a small heap keeps the
    current top k. [5]
12. **Managed patterns exist**: AWS describes building real-time gaming leaderboards on ElastiCache
    (Redis) sorted sets with the database as the system of record. [6]

## Numbers worth remembering

- Sorted-set ops: O(log N); 10 M members → about 23 levels of comparisons (log₂ 10⁷ ≈ 23).
- Memory per entry is tens of bytes plus the member string — estimate ≥ 100 B/entry for planning
  (rough planning number, measure in practice).
- Top-N merge over S shards reads S × N entries.

## Engine mapping

- Gap `sorted-set-ops`: a `redis` mode with sorted-set operations whose cost grows with log N, a
  memory-per-entry setting that limits instance capacity, and a rebuild-from-database path after
  `cache-down`.
- Without the gap, the lesson can still contrast "rank query on postgres" (high `serviceMs`
  override) vs "rank from redis" using node overrides; mark that as an approximation.

## Misconceptions

- "Add an index on score and rank is cheap." Counting rows above you is still linear. [3][10]
- "The cache is the leaderboard." It is a view; keep the durable log of score changes. [11]
- "Shard by player and top-10 is still one query." It becomes scatter-gather. [12]

## Analogy ideas

- A marathon finish: the timing mat (database) records every runner; the big screen (sorted set)
  shows positions instantly and can be redrawn from the mat's records.

## Caveats

- Redis complexities are from the docs; constant factors and memory per entry depend on encoding
  (small sets use a compact listpack encoding).

## Sources

Primary:
1. *Redis sorted sets* (data type guide) — Redis —
   https://redis.io/docs/latest/develop/data-types/sorted-sets/ — accessed 2026-10-19.
2. *ZADD* and *ZRANK* command references (time complexity) — Redis —
   https://redis.io/docs/latest/commands/zadd/ and https://redis.io/docs/latest/commands/zrank/ —
   accessed 2026-10-19.
3. *PostgreSQL 18 Documentation*, §3.5 "Window Functions" and §9.22 "Window Functions" —
   https://www.postgresql.org/docs/current/tutorial-window.html — accessed 2026-10-19.
4. *Skip Lists: A Probabilistic Alternative to Balanced Trees* — William Pugh, Communications of
   the ACM 33(6) — https://dl.acm.org/doi/10.1145/78973.78977 — 1990.
5. *An Improved Data Stream Summary: The Count-Min Sketch and its Applications* — G. Cormode,
   S. Muthukrishnan, Journal of Algorithms — https://www.sciencedirect.com/science/article/pii/S0196677403001913 — 2005.
6. *Building a real-time gaming leaderboard with Amazon ElastiCache for Redis* — AWS Database Blog —
   https://aws.amazon.com/blogs/database/building-a-real-time-gaming-leaderboard-with-amazon-elasticache-for-redis/ — 2019.
7. *Redis source: t_zset.c* (skip list with span fields used for rank) — redis/redis on GitHub —
   https://github.com/redis/redis/blob/unstable/src/t_zset.c — accessed 2026-10-19.

Books:
10. [B1] *Designing Data-Intensive Applications* — Kleppmann — ch. 3 "Storage and Retrieval" (B-trees,
    in-memory databases).
11. [B41] *System Design Interview*, vol. 2 — Xu, Lam — "Real-time Gaming Leaderboard" chapter
    (topic map only).
12. [B14] *Redis in Action* — Carlson — ch. 1 (sorted sets for ranking articles) and ch. 6
    (application components).

Repos:
13. [G10] kdn251/interviews — skip lists, heaps and top-k refreshers — https://github.com/kdn251/interviews.
14. [G1] donnemartin/system-design-primer — "Design Amazon's sales rank by category" —
    https://github.com/donnemartin/system-design-primer.
