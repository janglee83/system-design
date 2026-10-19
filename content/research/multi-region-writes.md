# Multi-region writes — research note

- Level: L6
- Feeds lessons: `l6-multi-region-writes` (challenge `c-l6-capstone`)
- Builds on: `replication-strategies-and-quorums`, `conflict-resolution-and-crdts`,
  `clocks-and-ordering`, `multi-region-and-geo-routing`
- Researched: 2026-10-19

## Key facts (in our words)

1. **Three families of answers to "where do writes go?"**: (a) one home region per record (writes
   for a user go to that user's region); (b) multi-leader / active-active with asynchronous
   replication and conflict resolution; (c) a globally consistent database that runs consensus
   across regions. Each trades latency, availability and correctness differently. [1][11]
2. **Home-region partitioning avoids conflicts.** If each user (or tenant, or shard) has exactly one
   writable region, there is a single leader per record and no write conflicts; reads elsewhere may
   be stale. Facebook's TAO keeps one leader region per shard and forwards writes there while
   follower regions serve reads. [2][11]
3. **Active-active with async replication is fast and always writable** — each region commits
   locally — but two regions can change the same record concurrently. The system then needs a
   rule: last-writer-wins by timestamp, merge via CRDTs, or application-level resolution. [1][3]
4. **DynamoDB global tables** replicate asynchronously between regions (typically within about a
   second) and resolve concurrent updates to the same item with last-writer-wins; AWS also added a
   multi-Region strong consistency mode, which costs higher write latency. [3]
5. **LWW silently drops writes.** With last-writer-wins, one of two concurrent updates is discarded
   without error, and clock skew decides which. That is fine for "last seen" timestamps and wrong
   for counters or carts. [11][4]
6. **Causal consistency is the strongest model that stays available under partition**, and systems
   such as COPS provide causal+ consistency across data centres with local-latency operations. [5]
7. **Spanner commits across regions with consensus and TrueTime.** Each shard is a Paxos group
   that can span regions; TrueTime exposes clock uncertainty and Spanner waits it out ("commit
   wait") to give externally consistent transactions. Writes pay cross-region quorum latency. [6]
8. **CockroachDB-style locality options** let tables be "regional" (fast writes in one home region)
   or "global" (fast reads everywhere, slow writes), choosing per table instead of per system. [7]
9. **Quorum placement decides survivability.** Cassandra's `LOCAL_QUORUM` acknowledges after a
   majority in the local data centre (fast, survives remote outage); `EACH_QUORUM` requires a
   majority in every data centre (stronger, slower, less available). [8]
10. **Uniqueness and invariants are the hard cases.** "Usernames are unique" or "balance never
    negative" cannot be checked locally in two regions at once; route such writes to one place
    (home region or consensus), or reserve quotas per region in advance. [11][12]
11. **Conflict rate grows with write overlap and replication delay.** Conflicts need two writes to
    the same key inside one replication-lag window; keeping lag short and routing a user's writes to
    one region keeps the rate low. [1][11]

## Numbers worth remembering

- Async replication lag between regions: typically sub-second to a few seconds. [3]
- Cross-region consensus write: ≥ one RTT to a majority of regions (e.g. 3 regions on two
  continents → ~70–150 ms per commit). [6]
- Conflict window ≈ replication lag; overlapping writes per key per lag window → conflicts.

## Engine mapping

- Gaps `multi-region-writes`, `regions-and-geo-routing`, `conflict-resolution`: write policy per
  data set (home-region / active-active LWW / active-active CRDT / consensus), inter-region lag,
  metrics `writeConflicts`, `lostUpdates` and `p95` per region.
- Clock skew (`clock-skew` gap) changes which write LWW keeps — good for a misconception choice.

## Misconceptions

- "Active-active means no data loss and no conflicts." It means conflicts are resolved, often by
  dropping one write. [3][11]
- "Strong consistency across regions is free with a good database." Every write pays inter-region
  round trips. [6]
- "Timestamps decide the true order." Clocks drift; LWW picks by clock, not by causality. [4]

## Analogy ideas

- Two shop branches sharing one stock list by post: each branch sells from its own copy and posts
  updates; if both sell the last unit before the letters arrive, someone must apologise.

## Caveats

- DynamoDB's strong-consistency multi-region mode is recent; check current docs for its limits.

## Sources

Primary:
1. *Multi-Region fundamentals — data replication and conflicts* — AWS Prescriptive Guidance —
   https://docs.aws.amazon.com/prescriptive-guidance/latest/aws-multi-region-fundamentals/introduction.html — 2024.
2. *TAO: Facebook's Distributed Data Store for the Social Graph* — N. Bronson et al., USENIX ATC —
   https://www.usenix.org/conference/atc13/technical-sessions/presentation/bronson — 2013.
3. *Global tables — multi-Region replication for DynamoDB* — AWS docs —
   https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/GlobalTables.html — accessed 2026-10-19.
4. *There is No Now* — Justin Sheehy, ACM Queue — https://queue.acm.org/detail.cfm?id=2745385 — 2015.
5. *Don't Settle for Eventual: Scalable Causal Consistency for Wide-Area Storage with COPS* —
   W. Lloyd, M. Freedman, M. Kaminsky, D. Andersen, SOSP — https://dl.acm.org/doi/10.1145/2043556.2043593 — 2011.
6. *Spanner: Google's Globally-Distributed Database* — J. Corbett et al., OSDI —
   https://research.google/pubs/spanner-googles-globally-distributed-database-2/ — 2012.
7. *Multi-region capabilities overview* (table localities) — Cockroach Labs docs —
   https://www.cockroachlabs.com/docs/stable/multiregion-overview — accessed 2026-10-19.
8. *Tunable consistency* (consistency levels incl. LOCAL_QUORUM, EACH_QUORUM) — Apache Cassandra docs —
   https://cassandra.apache.org/doc/latest/cassandra/architecture/dynamo.html — accessed 2026-10-19.

Books:
11. [B1] *Designing Data-Intensive Applications* — Kleppmann — ch. 5 "Multi-Leader Replication"
    (use cases, handling write conflicts, topologies) and ch. 9 (linearizability cost).
12. [B4] *Understanding Distributed Systems*, 2nd ed. — Vitillo — "Coordination avoidance" (CRDTs,
    causal consistency) chapter.
13. [B13] *Cassandra: The Definitive Guide*, 3rd ed. — Carpenter, Hewitt — ch. 6 "The Cassandra
    Architecture" (data centres, consistency levels).

Repos:
14. [G31] jepsen-io/maelstrom — multi-node CRDT/broadcast workloads with partitions —
    https://github.com/jepsen-io/maelstrom.
15. [G21] jhuangtw/xg2xg — Spanner and its open-source equivalents — https://github.com/jhuangtw/xg2xg.
