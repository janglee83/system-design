# Change data capture (CDC) — research note

- Level: L6
- Feeds lessons: `l6-change-data-capture` (background for `l6-zero-downtime-migrations`,
  `l6-event-sourcing-cqrs`)
- Builds on: `transactional-outbox`, `search-indexing`, `replication-and-failover`,
  `distributed-message-queue`
- Researched: 2026-10-19

## Key facts (in our words)

1. **CDC turns a database's changes into a stream.** Every insert, update and delete committed in a
   source database is captured and published, in commit order, so other systems (search index,
   cache, warehouse, other services) can keep derived copies up to date. [1][11]
2. **Log-based vs query-based.** Log-based CDC reads the database's own replication log (PostgreSQL
   WAL via logical decoding, MySQL binlog in row format) — it sees every change including deletes,
   adds little load and preserves order. Query-based CDC polls `WHERE updated_at > last` — simpler,
   but misses deletes and intermediate updates, and loads the database. [1][2][3]
3. **PostgreSQL logical decoding uses replication slots.** A slot remembers how far a consumer has
   read and makes the server keep WAL until then; an abandoned or slow slot makes WAL pile up until
   the disk fills, so slot lag must be monitored (and `max_slot_wal_keep_size` can cap it). [2]
4. **Snapshot plus stream.** A new consumer first needs the existing rows, then the changes after
   that point. Debezium takes an initial snapshot and then streams; Netflix's DBLog interleaves
   chunked table reads with log events using watermarks, so full dumps run without locks and
   without pausing the stream. [1][4]
5. **CDC at scale exists in production.** LinkedIn built Databus to stream changes from its source
   databases to caches, search indexes and other consumers; Shopify captures changes from its
   sharded MySQL monolith with Debezium and Kafka Connect for downstream systems. [5][6]
6. **Ordering and keys.** Change events are keyed by primary key so all changes to a row go to one
   partition in order; consumers apply them idempotently (upsert by key, ignore older versions). [1][11]
7. **Schema changes travel too.** Adding or renaming a column changes the event shape; CDC pipelines
   use schema registries or versioned formats and need a plan for breaking changes. [1][12]
8. **CDC exposes internals.** Raw table-level events couple consumers to the source's schema; many
   teams publish a curated outbox or transform CDC events into domain events. [7][12]
9. **Derived stores lag.** The search index or cache fed by CDC is eventually consistent; lag is a
   metric to watch and to show users ("results may take a few seconds"). [8][11]
10. **CDC enables migrations.** Streaming changes from an old store to a new one while backfilling is
    the core of zero-downtime migrations (see `zero-downtime-migrations`). [4][9]
11. **"Turning the database inside out"**: treating the change log as the primary integration point
    lets each system build its own view, the idea behind log-centric architectures. [10][13]

## Numbers worth remembering

- End-to-end CDC lag in healthy pipelines: sub-second to a few seconds; hours if a slot or
  connector is stuck (and WAL grows by the write rate × time). [2]
- WAL growth example: 50 MB/s of WAL × 1 h stalled consumer ≈ 180 GB retained (derived).

## Engine mapping

- Gap `outbox-cdc` (CDC part) plus `search-index-component`: a CDC connector node reading postgres
  changes into a queue/log, consumer lag → `staleReads` in the derived store, connector-down →
  growing lag and WAL retention (proposed `walRetained` metric).
- Comparison choice: application dual-write to search (inconsistent on failure) vs CDC (lagging but
  complete).

## Misconceptions

- "Poll the table by updated_at; it's the same." Deletes and intermediate states are lost. [1]
- "CDC is free for the database." Slots retain WAL; a dead consumer can fill the disk. [2]
- "Derived stores are up to date." They lag; design for it. [11]

## Analogy ideas

- A court stenographer: instead of photographing the courtroom every hour (polling), they write
  down every word as it is said (the log), and anyone can read the transcript from any page.

## Caveats

- Connector specifics (Debezium, DBLog) differ; we teach the mechanism.

## Sources

Primary:
1. *Debezium Features* and *Debezium connector for PostgreSQL* (snapshots, streaming, event keys) —
   Debezium documentation — https://debezium.io/documentation/reference/stable/features.html —
   accessed 2026-10-19.
2. *Logical Decoding Concepts* (replication slots, WAL retention) — PostgreSQL 18 Documentation —
   https://www.postgresql.org/docs/current/logicaldecoding-explanation.html — accessed 2026-10-19.
3. *Replication Formats* (row-based binlog) — MySQL 8.4 Reference Manual —
   https://dev.mysql.com/doc/refman/8.4/en/replication-formats.html — accessed 2026-10-19.
4. *DBLog: A Watermark Based Change-Data-Capture Framework* — A. Andreakis, I. Papapanagiotou,
   Netflix — https://arxiv.org/abs/2010.12597 — 2020.
5. *All Aboard the Databus! LinkedIn's Scalable Consistent Change Data Capture Platform* — S. Das
   et al., SoCC — https://dl.acm.org/doi/10.1145/2391229.2391247 — 2012.
6. *Capturing Every Change From Shopify's Sharded Monolith* — Shopify Engineering —
   https://shopify.engineering/capturing-every-change-shopify-sharded-monolith — 2021.
7. *Pattern: Transaction log tailing* — microservices.io —
   https://microservices.io/patterns/data/transaction-log-tailing.html — accessed 2026-10-19.
8. *Change data capture* (Azure SQL / CDC concepts) — Microsoft Learn —
   https://learn.microsoft.com/en-us/sql/relational-databases/track-changes/about-change-data-capture-sql-server — accessed 2026-10-19.
9. *Online migrations at scale* — Jacqueline Xu, Stripe Blog — https://stripe.com/blog/online-migrations — 2017.
10. *Turning the database inside-out with Apache Samza* — Martin Kleppmann, Confluent Blog —
    https://www.confluent.io/blog/turning-the-database-inside-out-with-apache-samza/ — 2015.

Books:
11. [B1] *Designing Data-Intensive Applications* — Kleppmann — ch. 11 "Change Data Capture" and
    "Keeping Systems in Sync".
12. [B32] *Building Event-Driven Microservices* — Bellemare — ch. 4 (CDC, data liberation patterns).
13. [B36] *Making Sense of Stream Processing* — Kleppmann — ch. 3 "Integrating Databases and Kafka
    with Change Data Capture".

Repos:
14. [G37] oxnr/awesome-bigdata — CDC and streaming tools — https://github.com/oxnr/awesome-bigdata.
15. [G26] ept/ddia-references — ch. 11 references (Databus, Bottled Water, etc.) —
    https://github.com/ept/ddia-references.
