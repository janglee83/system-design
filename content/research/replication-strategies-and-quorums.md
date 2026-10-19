# Replication strategies, quorums and anti-entropy — research note

- Level: L4
- Feeds lessons: `l4-replication-strategies`, `l4-quorums`, `l4-anti-entropy`
  (background for `l5-kv-store-design`)
- Researched: 2026-10-19

## Key facts (in our words)

1. **Three families**: single-leader (all writes through one node), multi-leader (several nodes
   accept writes, conflicts possible), leaderless (clients write to several replicas directly, as in
   Dynamo and Cassandra). [1][9]
2. **Quorums**: with N replicas, a write waits for W acknowledgements and a read for R replies; if
   R + W > N, every read overlaps at least one replica with the latest acknowledged write. Gifford's
   weighted voting (1979) is the classic origin. [2][3]
3. **Tunable consistency**: Cassandra lets each request choose ONE, QUORUM, ALL, LOCAL_QUORUM… trading
   latency and availability for freshness. [4]
4. **Sloppy quorums and hinted handoff**: Dynamo writes to the next healthy nodes on the ring when
   home replicas are down and hands the data back later, staying writable at the cost of R + W > N
   guarantees. [3]
5. **Probabilistically bounded staleness**: even partial quorums (R + W ≤ N) are often fresh within
   milliseconds; staleness can be measured and predicted. [5]
6. **Anti-entropy**: replicas repair divergence by read repair (fix on read), hinted handoff, and
   background comparison with Merkle trees that find differing ranges cheaply. [3][6][10]
7. **Gossip/epidemic protocols** spread updates and membership with probabilistic guarantees (Demers
   et al.). [7]
8. **Chain replication** orders replicas in a chain (writes at head, reads at tail) for strong
   consistency with high throughput. [8]

## Engine mapping

- `kv-store`, `kv-node-down`, `staleReads` planned; N/R/W configuration is not → gap
  `kv-quorum-config`. Anti-entropy is reading+check.

## Misconceptions

- "Quorum means majority, always." Any R + W > N works; majority is one case. [2][9]
- "R + W > N guarantees linearizability." Not with sloppy quorums, clock-based conflict resolution or
  concurrent writes. [9]
- "Replication = backup." Replicas copy mistakes instantly. [9]

## Sources

Primary:
1. *PostgreSQL 18 Documentation, "High Availability, Load Balancing, and Replication"* — PGDG —
   https://www.postgresql.org/docs/current/high-availability.html — 2026.
2. *Weighted Voting for Replicated Data* — David K. Gifford, SOSP — https://dl.acm.org/doi/10.1145/800215.806583 — 1979.
3. *Dynamo: Amazon's Highly Available Key-value Store* — G. DeCandia et al., SOSP —
   https://www.allthingsdistributed.com/files/amazon-dynamo-sosp2007.pdf — 2007.
4. *Dynamo (architecture): tunable consistency* — Apache Cassandra docs —
   https://cassandra.apache.org/doc/latest/cassandra/architecture/dynamo.html — accessed 2026-10-19.
5. *Probabilistically Bounded Staleness for Practical Partial Quorums* — P. Bailis et al., VLDB —
   http://www.bailis.org/papers/pbs-vldb2012.pdf — 2012.
6. *Repair* — Apache Cassandra docs —
   https://cassandra.apache.org/doc/latest/cassandra/managing/operating/repair.html — accessed 2026-10-19.
7. *Epidemic Algorithms for Replicated Database Maintenance* — A. Demers et al., PODC —
   https://dl.acm.org/doi/10.1145/41840.41841 — 1987.
8. *Chain Replication for Supporting High Throughput and Availability* — R. van Renesse,
   F. Schneider, OSDI — https://www.cs.cornell.edu/home/rvr/papers/OSDI04.pdf — 2004.

Books:
9. [B1] *Designing Data-Intensive Applications* — ch. 5 "Replication" (leaderless replication,
   quorums, sloppy quorums) — [B2] ch. 6.
10. [B3] *Database Internals* — ch. 11 "Replication and Consistency", ch. 12 "Anti-Entropy and
    Dissemination".
11. [B13] *Cassandra: The Definitive Guide*, 3rd ed. — architecture chapter (consistency levels,
    hinted handoff, repair).
12. [B6] *Patterns of Distributed Systems* — Joshi — "Majority Quorum", "Leader and Followers".

Repos:
13. [G23] papers-we-love/papers-we-love — distributed systems section —
    https://github.com/papers-we-love/papers-we-love.
14. [G26] ept/ddia-references — chapter 5 references — https://github.com/ept/ddia-references.
