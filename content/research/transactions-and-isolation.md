# Transactions, isolation levels and lost updates — research note

- Level: L2
- Feeds lessons: `l2-transactions-isolation` (background for `l5-flash-sale`, `l5-hotel-booking`,
  `l6-two-phase-commit`)
- Researched: 2026-10-19

## Key facts (in our words)

1. **ACID**: atomicity (all or nothing), consistency (invariants hold), isolation (concurrent
   transactions do not see each other's partial work), durability (committed data survives crashes).
   [1][8]
2. **Isolation levels are trade-offs.** PostgreSQL offers Read Committed (default), Repeatable Read
   (snapshot) and Serializable (SSI); weaker levels allow anomalies in exchange for less blocking. [1]
3. **Anomalies:** dirty read, non-repeatable read, phantom, *lost update* (two read-modify-write
   cycles overwrite each other), *write skew* (two transactions read the same facts and write
   different rows, breaking an invariant). The ANSI definitions miss several of these. [2][8]
4. **Lost-update fixes:** atomic updates (`UPDATE … SET n = n - 1 WHERE n > 0`), explicit row locks
   (`SELECT … FOR UPDATE`), or optimistic concurrency (version column, compare-and-set). [3][8]
5. **PostgreSQL's Serializable uses Serializable Snapshot Isolation**: transactions run on snapshots
   and the database aborts one if a dangerous pattern is detected, so the app must retry. [4]
6. **Databases differ in practice.** Kleppmann's Hermitage tests show the same level name behaves
   differently across products. [5]
7. **Jepsen's consistency map** relates isolation levels (serializable, snapshot isolation, repeatable
   read, read committed…) as a hierarchy of guarantees. [6]

## Engine mapping

- Metrics `lostUpdates` and `writeConflicts` exist in the spec, but no mechanism for concurrent
  updates or isolation choice → gap `transaction-isolation-model`. Lesson is an experiment once that
  lands; for now the draft can use a paper simulation of two interleaved transactions.

## Misconceptions

- "Inside a transaction, nothing can go wrong concurrently." Depends on the isolation level. [1][2]
- "Serializable means no retries." SSI aborts and expects retries. [4]
- "Read-then-write in app code is safe if it's fast." Lost updates happen at any speed. [8]

## Sources

Primary:
1. *PostgreSQL 18 Documentation, "Transaction Isolation"* — PGDG —
   https://www.postgresql.org/docs/current/transaction-iso.html — 2026.
2. *A Critique of ANSI SQL Isolation Levels* — H. Berenson, P. Bernstein, J. Gray, J. Melton,
   E. O'Neil, P. O'Neil, SIGMOD — https://www.microsoft.com/en-us/research/publication/a-critique-of-ansi-sql-isolation-levels/ — 1995.
3. *PostgreSQL 18 Documentation, "Explicit Locking"* — PGDG —
   https://www.postgresql.org/docs/current/explicit-locking.html — 2026.
4. *Serializable Snapshot Isolation in PostgreSQL* — D. R. K. Ports, K. Grittner, VLDB —
   https://arxiv.org/abs/1208.4179 — 2012.
5. *Hermitage: Testing transaction isolation levels* — Martin Kleppmann —
   https://github.com/ept/hermitage — accessed 2026-10-19.
6. *Consistency Models* — Jepsen — https://jepsen.io/consistency — accessed 2026-10-19.
7. *PostgreSQL 18 Documentation, §3.4 Transactions* — PGDG —
   https://www.postgresql.org/docs/current/tutorial-transactions.html — 2026.

Books:
8. [B1] *Designing Data-Intensive Applications* — ch. 7 "Transactions" ([B2] ch. 8).
9. [B3] *Database Internals* — ch. 5 "Transaction Processing and Recovery".
10. [B9] *Database System Concepts* — chapters on transactions and concurrency control.

Repos:
11. [G27] pingcap/awesome-database-learning — transactions section —
    https://github.com/pingcap/awesome-database-learning.
12. [G26] ept/ddia-references — chapter 7 references — https://github.com/ept/ddia-references.
