# Indexes and storage engines — research note

- Level: L2
- Feeds lessons: `l2-indexes` (background for `l5-kv-store-design`)
- Researched: 2026-10-19

## Key facts (in our words)

1. **An index is a separate structure that lets the database find rows without scanning the whole
   table**, at the price of extra space and slower writes (every insert/update also updates each
   index). [1][2]
2. **B-trees are the default index in relational databases.** They keep keys sorted in pages, stay
   balanced, and answer equality and range lookups in a few page reads. [1][7][8]
3. **PostgreSQL offers several index types** (B-tree, hash, GiST, SP-GiST, GIN, BRIN); B-tree is the
   default and covers `=`, `<`, `>`, `BETWEEN` and sorting. [1]
4. **Multi-column indexes follow a left-to-right rule**: an index on (a, b) helps queries on `a` or
   on `a` and `b`, much less on `b` alone. [1][3]
5. **`EXPLAIN` shows the plan** (sequential scan vs index scan) and estimated vs actual costs; it is
   the tool to confirm an index is used. [2]
6. **InnoDB clusters rows by primary key**; secondary indexes point to the primary key, so a
   secondary lookup can cost two index walks. [4]
7. **Log-structured merge trees (LSM)** buffer writes in memory and flush sorted runs (SSTables) that
   are merged in the background; they favour write throughput, B-trees favour read predictability.
   Bigtable and Cassandra use this design. [5][6][8]
8. **Write amplification**: each logical write can cause several physical writes (index pages, WAL,
   compaction). [7][8]

## Engine mapping

- 1a: `postgres` per-node override `serviceMs` models "indexed" (≈3 ms) vs "full scan" (e.g. 40 ms):
  the experiment in `l2-indexes` is runnable on 1a. Write cost of extra indexes can be modelled by a
  higher `serviceMs` on write-heavy workloads; there is no separate read/write service time → small
  gap noted in REPORT (not blocking).

## Misconceptions

- "Index every column." Each index slows writes and uses memory. [1][7]
- "An index always helps." Low-selectivity filters may still scan; the planner decides. [2][3]
- "Order of columns in a composite index does not matter." [1][3]

## Sources

Primary:
1. *PostgreSQL 18 Documentation, ch. "Indexes"* — PGDG — https://www.postgresql.org/docs/current/indexes.html — 2026.
2. *PostgreSQL 18 Documentation, "Using EXPLAIN"* — PGDG — https://www.postgresql.org/docs/current/using-explain.html — 2026.
3. *Use The Index, Luke!* — Markus Winand — https://use-the-index-luke.com/ — accessed 2026-10-19.
4. *MySQL 8.4 Reference Manual, "Clustered and Secondary Indexes"* — Oracle —
   https://dev.mysql.com/doc/refman/8.4/en/innodb-index-types.html — accessed 2026-10-19.
5. *The Log-Structured Merge-Tree (LSM-Tree)* — P. O'Neil, E. Cheng, D. Gawlick, E. O'Neil, Acta
   Informatica — https://www.cs.umb.edu/~poneil/lsmtree.pdf — 1996.
6. *Bigtable: A Distributed Storage System for Structured Data* — F. Chang et al., OSDI —
   https://research.google/pubs/pub27898/ — 2006.

Books:
7. [B3] *Database Internals* — Petrov — ch. 2 "B-Tree Basics", ch. 4 "Implementing B-Trees", ch. 7
   "Log-Structured Storage".
8. [B1] *Designing Data-Intensive Applications* — ch. 3 "Storage and Retrieval" ([B2] ch. 4).
9. [B9] *Database System Concepts* — Silberschatz et al. — chapter "Indexing".

Repos:
10. [G27] pingcap/awesome-database-learning — storage engine section —
    https://github.com/pingcap/awesome-database-learning.
11. [G28] rxin/db-readings — https://github.com/rxin/db-readings.
