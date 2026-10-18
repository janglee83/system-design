# Read replicas, replication lag and database failover — research note

- Level: L2
- Feeds lessons: `l2-read-replicas`, `l2-replication-lag`, `l2-db-failover`
- Researched: 2026-10-19

## Key facts (in our words)

1. **Leader–follower replication**: one primary accepts writes and ships its change log (WAL in
   PostgreSQL, binlog in MySQL) to replicas, which replay it and can serve reads. [1][2][9]
2. **Asynchronous by default.** Replicas trail the primary; reads from a replica can return data the
   user just changed — "replication lag". Synchronous replication waits for a replica to confirm,
   adding latency and a dependency on that replica. [1][9]
3. **Read-your-writes and monotonic reads** are the guarantees most often broken by lag; common fixes
   are reading your own data from the primary for a short time or tracking the replica's position.
   [9][10]
4. **Replicas scale reads, not writes**: every replica still replays every write. [9][11]
5. **Failover = detect primary loss, choose a replica, promote it, re-point clients.** Tools such as
   Patroni (PostgreSQL) and Orchestrator (GitHub's MySQL) automate it; managed services (RDS
   Multi-AZ) fail over to a standby, typically in a minute or two. [3][4][5]
6. **Failover risks:** losing writes that never reached the new primary (async), split brain if the
   old primary keeps accepting writes, and clients caching the old address. GitHub's 2018 incident
   shows cross-site failover leaving data on both sides. [4][6][9]
7. **Aurora separates storage**: six copies across three AZs with quorum writes, so replicas share
   storage and failover avoids replaying a log. [7]

## Engine mapping

- 1a: `postgres.readReplicas` (0–5), `db-primary-down` fault, promotion after `pgFailoverMs`
  (600 ms); metrics `availability`, `spofCount`, events `db.primary-down`, `db.promoted`,
  `db.no-replica` → `l2-read-replicas` and `l2-db-failover` run on 1a (the 1a model aggregates
  replica capacity; spec §6.1 routes reads to replicas).
- `db-replica-down` is planned (1b). Lag and `staleReads` need gap `replication-lag-model`.

## Misconceptions

- "Replicas make writes faster." [9][11]
- "A replica is always up to date." [1][9]
- "Failover is instant and lossless." [4][6]

## Sources

Primary:
1. *PostgreSQL 18 Documentation, "High Availability, Load Balancing, and Replication"* — PGDG —
   https://www.postgresql.org/docs/current/high-availability.html — 2026.
2. *MySQL 8.4 Reference Manual, "Replication"* — Oracle —
   https://dev.mysql.com/doc/refman/8.4/en/replication.html — accessed 2026-10-19.
3. *Patroni documentation* — Zalando / Patroni project — https://patroni.readthedocs.io/ — accessed
   2026-10-19.
4. *MySQL High Availability at GitHub* — Shlomi Noach, GitHub Blog —
   https://github.blog/2018-06-20-mysql-high-availability-at-github/ — 2018.
5. *Multi-AZ DB instance deployments* — Amazon RDS docs —
   https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Concepts.MultiAZ.html — accessed 2026-10-19.
6. *October 21 post-incident analysis* — GitHub Blog —
   https://github.blog/2018-10-30-oct21-post-incident-analysis/ — 2018.
7. *Amazon Aurora: Design Considerations for High Throughput Cloud-Native Relational Databases* —
   A. Verbitski et al., SIGMOD — https://www.amazon.science/publications/amazon-aurora-design-considerations-for-high-throughput-cloud-native-relational-databases — 2017.
8. *Probabilistically Bounded Staleness for Practical Partial Quorums* — P. Bailis et al., VLDB —
   http://www.bailis.org/papers/pbs-vldb2012.pdf — 2012.

Books:
9. [B1] *Designing Data-Intensive Applications* — ch. 5 "Replication" (leaders and followers,
   problems with replication lag) — [B2] ch. 6.
10. [B4] *Understanding Distributed Systems* — part "Coordination", chapter "Replication".
11. [B11] *High Performance MySQL*, 4th ed. — chapters on replication and high availability.

Repos:
12. [G1] donnemartin/system-design-primer — "Replication: master-slave, master-master" —
    https://github.com/donnemartin/system-design-primer.
13. [G32] jepsen-io/jepsen — analyses showing real replication anomalies — https://github.com/jepsen-io/jepsen.
