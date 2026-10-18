# Sharding and shard keys — research note

- Level: L2
- Feeds lessons: `l2-sharding-basics`, `l2-shard-keys` (background for `l4-consistent-hashing`)
- Researched: 2026-10-19

## Key facts (in our words)

1. **Sharding (partitioning) splits one dataset across several databases**, each owning a subset of
   keys, so writes and storage scale with the number of shards. [7][8]
2. **Strategies:** by key range (good for range scans, risk of hot ranges), by hash of key (even
   spread, no range scans), by directory/lookup table (flexible, extra hop). [7][8][1]
3. **Shard key choice decides everything.** A good key has high cardinality, spreads writes evenly
   and keeps data that is queried together on one shard. DynamoDB and MongoDB both warn against
   low-cardinality or monotonically increasing keys (e.g. timestamps) that funnel writes to one
   partition. [1][2]
4. **Cross-shard queries and transactions are expensive**; designs try to make most requests touch
   one shard (e.g. shard by tenant or workspace). [3][4]
5. **Notion sharded PostgreSQL by workspace** into many logical shards on fewer physical hosts so it
   could move shards later; **Figma** horizontally sharded Postgres tables with a proxy layer. [3][4]
6. **Instagram** embedded the logical shard id in each 64-bit ID so any service can route by ID. [5]
7. **Vitess** (MySQL) routes queries to shards and supports resharding online. [6]
8. **Resharding is the hard part:** plan many small logical shards up front, then move them. [3][7]

## Engine mapping

- No sharded postgres in the spec (kv-store is planned, but not partitioned SQL) → gap
  `sql-sharding` (N shards, shard key, skew → hot shard, cross-shard queries).

## Misconceptions

- "Sharding is the first step for scale." Replicas and caches usually come first; sharding adds
  permanent complexity. [7][9]
- "Hashing makes everything even." A hot key still lands on one shard. [2][8]
- "We can pick the shard key later." Changing it means moving all data. [3]

## Sources

Primary:
1. *Best practices for designing and using partition keys effectively* — DynamoDB docs —
   https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-partition-key-design.html —
   accessed 2026-10-19.
2. *Sharding* — MongoDB Manual — https://www.mongodb.com/docs/manual/sharding/ — accessed 2026-10-19.
3. *Herding elephants: Lessons learned from sharding Postgres at Notion* — Garrett Fidalgo, Notion —
   https://www.notion.com/blog/sharding-postgres-at-notion — 2021.
4. *How Figma's databases team lived to tell the scale* — Sammy Steele, Figma —
   https://www.figma.com/blog/how-figmas-databases-team-lived-to-tell-the-scale/ — 2024.
5. *Sharding & IDs at Instagram* — Instagram Engineering —
   https://medium.com/instagram-engineering/sharding-ids-at-instagram-1cf5a71e5a5c — 2012.
6. *Vitess documentation* — Vitess / CNCF — https://vitess.io/docs/ — accessed 2026-10-19.

Books:
7. [B1] *Designing Data-Intensive Applications* — ch. 6 "Partitioning" ([B2] ch. 7 "Sharding").
8. [B4] *Understanding Distributed Systems* — part "Scalability", chapter "Partitioning".
9. [B39] *The Art of Scalability*, 2nd ed. — Abbott, Fisher — AKF scale cube, Z-axis splits.
10. [B31] *Designing Distributed Systems*, 2nd ed. — Burns — "Sharded Services".

Repos:
11. [G1] donnemartin/system-design-primer — "Sharding", "Federation" —
    https://github.com/donnemartin/system-design-primer.
12. [G4] ashishps1/awesome-system-design-resources — sharding articles —
    https://github.com/ashishps1/awesome-system-design-resources.
