# Distributed transactions and two-phase commit — research note

- Level: L6
- Feeds lessons: `l6-two-phase-commit`
- Builds on: `transactions-and-isolation`, `partial-failure-and-fallacies`, `consensus-raft`
- Researched: 2026-10-19

## Key facts (in our words)

1. **Atomic commit across machines.** When one transaction touches several databases (or shards),
   either all of them commit or none do. Two-phase commit (2PC) is the classic protocol for this. [1][10]
2. **Phase 1 — prepare.** The coordinator asks every participant to prepare. A participant that
   votes "yes" first writes everything it needs to commit durably to its log and keeps its locks;
   from then on it has given up the right to abort on its own. [1][10][11]
3. **Phase 2 — commit or abort.** If every vote is yes, the coordinator durably records "commit" and
   tells everyone; if any vote is no (or a participant times out before voting), it records "abort".
   The coordinator's log record is the single point of decision. [1][10]
4. **2PC blocks when the coordinator fails at the wrong moment.** A participant that voted yes and
   then hears nothing is "in doubt": it cannot commit or abort alone, so it holds its locks until the
   coordinator recovers — blocking other transactions on those rows. [10][11]
5. **Databases expose the building blocks.** PostgreSQL's `PREPARE TRANSACTION` / `COMMIT PREPARED`
   implement the participant side; prepared transactions survive restarts and keep locks, the
   feature is off by default (`max_prepared_transactions = 0`) and the docs warn it is meant for
   external transaction managers, not applications. MySQL supports XA transactions. [2][3]
6. **Cost**: at least two round trips plus forced (fsync'd) log writes at coordinator and
   participants before the client hears "committed"; locks are held across all of it, so
   throughput on contended rows drops. [10][11]
7. **Making the coordinator fault tolerant removes the worst blocking.** Spanner runs 2PC across
   shards where every participant and the coordinator is itself a Paxos-replicated group, so a
   single machine failure does not leave transactions in doubt. [4]
8. **Percolator-style 2PC** (Google, used by TiDB/TiKV) stores locks and a primary lock in the data
   store itself with timestamps from a timestamp oracle, so any client can resolve an abandoned
   transaction by checking the primary. [5]
9. **Three-phase commit** avoids blocking only under assumptions (bounded delays, no partitions)
   that real networks break, so it is rarely used. [10][11]
10. **Across services and companies, 2PC is usually avoided.** Services own their databases, brokers
    and third-party APIs do not take part in XA, and blocking ties availability of all services
    together; designs use sagas, outbox and idempotent messaging instead ("life beyond distributed
    transactions"). [6][7][12]
11. **Within one database cluster it is fine and common** (distributed SQL databases use it
    internally); the lesson is about where the boundary lies. [4][5][10]

## Numbers worth remembering

- Messages: 4 per participant (prepare, vote, commit, ack); 2 sequential round trips.
- Availability: a 2PC over k independent participants succeeds only if all are up — e.g. 3 services
  at 99.9% → ≈ 99.7% (derived, serial availability).

## Engine mapping

- Gap `distributed-transactions` (2PC part): a coordinator with participants (postgres shards or
  services), coordinator-down fault during phase 2 → in-doubt transactions holding locks
  (`availability` and `p99` drop on those rows), and a comparison with sagas (`lostUpdates`/
  inconsistency metric).
- Proposed fault `coordinator-down` as part of that gap.

## Misconceptions

- "2PC guarantees availability." It guarantees atomicity; it can block. [10]
- "If one participant says yes, it can still change its mind." No — that is the point of prepare. [1]
- "Use 2PC between microservices." Usually the wrong tool; see sagas/outbox. [6][7]
- "2PC is the same as consensus." Consensus needs a majority; 2PC needs everyone (any no aborts). [11]

## Analogy ideas

- A wedding: the officiant (coordinator) asks each partner "do you?" (prepare); once both said yes,
  neither can walk away, and only the officiant's declaration (commit) makes it final. If the
  officiant faints after the two yeses, everybody waits.

## Caveats

- Blocking behaviour depends on implementation (timeouts, heuristic decisions in XA managers can
  break atomicity).

## Sources

Primary:
1. *Notes on Data Base Operating Systems* — Jim Gray, in *Operating Systems: An Advanced Course*,
   Springer — https://link.springer.com/chapter/10.1007/3-540-08755-9_9 — 1978.
2. *PREPARE TRANSACTION* — PostgreSQL 18 Documentation —
   https://www.postgresql.org/docs/current/sql-prepare-transaction.html — accessed 2026-10-19.
3. *XA Transactions* — MySQL 8.4 Reference Manual — https://dev.mysql.com/doc/refman/8.4/en/xa.html —
   accessed 2026-10-19.
4. *Spanner: Google's Globally-Distributed Database* — J. Corbett et al., OSDI —
   https://research.google/pubs/spanner-googles-globally-distributed-database-2/ — 2012.
5. *Large-scale Incremental Processing Using Distributed Transactions and Notifications*
   (Percolator) — D. Peng, F. Dabek, OSDI —
   https://research.google/pubs/large-scale-incremental-processing-using-distributed-transactions-and-notifications/ — 2010.
6. *Life beyond Distributed Transactions: an Apostate's Opinion* — Pat Helland, CIDR —
   https://www.cidrdb.org/cidr2007/papers/cidr07p15.pdf — 2007.
7. *Saga distributed transactions pattern* (why not 2PC across services) — Microsoft Azure
   Architecture Center — https://learn.microsoft.com/en-us/azure/architecture/patterns/saga — accessed 2026-10-19.
8. *Concurrency Control and Recovery in Database Systems* (free PDF; ch. 7 "Distributed Recovery") —
   P. Bernstein, V. Hadzilacos, N. Goodman, Microsoft Research —
   https://www.microsoft.com/en-us/research/people/philbe/book/ — 1987.

Books:
10. [B1] *Designing Data-Intensive Applications* — Kleppmann — ch. 9 "Atomic Commit and Two-Phase
    Commit (2PC)", "Distributed Transactions in Practice" (XA, in-doubt transactions).
11. [B3] *Database Internals* — Petrov — ch. 13 "Distributed Transactions" (2PC, 3PC, Spanner,
    Percolator-style designs).
12. [B30] *Software Architecture: The Hard Parts* — Ford et al. — ch. 9 "Data Ownership and
    Distributed Transactions".

Repos:
13. [G33] tlaplus/Examples — TwoPhase / TCommit specifications — https://github.com/tlaplus/Examples.
14. [G30] pingcap/talent-plan — Percolator-style distributed transaction lab —
    https://github.com/pingcap/talent-plan.
15. [G28] rxin/db-readings — distributed transaction papers — https://github.com/rxin/db-readings.
