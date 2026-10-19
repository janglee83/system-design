# Zero-downtime schema and data migrations — research note

- Level: L6
- Feeds lessons: `l6-zero-downtime-migrations`
- Builds on: `change-data-capture`, `safe-deployments`, `sharding`, `data-models-and-schema`
- Researched: 2026-10-19

## Key facts (in our words)

1. **Expand, migrate, contract.** Instead of changing a schema in place, add the new shape alongside
   the old (expand), move code and data over step by step, then remove the old shape (contract).
   Every intermediate state must work with both the old and new versions of the code that may be
   running during a rolling deploy. [1][2]
2. **Stripe's four-step recipe** for moving data between models or stores: dual-write to old and new,
   switch reads to the new, switch writes to only the new, remove the old — with a backfill of
   historical data and verification between steps. [3]
3. **Backfills must be throttled.** Copying billions of rows competes with production traffic; do it
   in small batches, ordered by key, with pauses and progress checkpoints so it can resume. [3][4]
4. **Verify before switching.** Compare results from old and new paths in production without
   affecting users ("shadow reads"); GitHub's Scientist library runs both code paths and records
   mismatches. [5][3]
5. **Some DDL locks the table.** In PostgreSQL, `CREATE INDEX` blocks writes for its duration while
   `CREATE INDEX CONCURRENTLY` does not (but is slower and can fail, leaving an invalid index to
   drop). Since PostgreSQL 11, adding a column with a constant default no longer rewrites the table,
   while changing a column type usually does. Lock waits also queue behind long transactions. [6][7]
6. **Online schema change tools for MySQL.** GitHub's gh-ost builds a ghost copy of the table, copies
   rows in chunks and applies ongoing changes by reading the binary log (no triggers), then swaps
   tables in a brief cut-over; it can be throttled or paused. [8]
7. **Data model compatibility rules.** Readers must tolerate fields they do not know (forward
   compatibility) and writers must not break old readers (backward compatibility); adding optional
   fields is safe, renaming or changing meaning is not. [11]
8. **Moving whole databases uses CDC.** Large migrations (new store, new shard layout) snapshot the
   source, stream changes with CDC to keep the target current, verify, then cut traffic over and
   keep a path back. Figma described horizontally sharding its PostgreSQL tables with a proxy layer,
   logical replication and staged cut-overs; Discord migrated trillions of messages to ScyllaDB with
   a purpose-built migrator. [9][10][12]
9. **Plan the rollback.** Keep the old path writable (or dual-written) until the new path has proven
   itself; a migration without a way back is a one-way door. [3][12]
10. **Coordinate with deploys.** Schema changes and code deploys are separate steps; order them so
    every deployed version works with every schema version it may meet. [1][13]

## Numbers worth remembering

- Backfill at 1,000 rows per batch, 50 ms per batch, ~20 batches/s → 20,000 rows/s → 1 billion rows
  in ~14 hours (derived planning example).
- Cut-over windows in tools like gh-ost: seconds, with a brief lock. [8]

## Engine mapping

- Reading lesson. A future experiment (backfill throttle vs p95 of live traffic; dual-write vs CDC
  correctness) needs gaps `outbox-cdc` and a proposed `background-batch-load` (a throttled batch
  job sharing database capacity with live traffic).

## Misconceptions

- "Run ALTER TABLE in the deploy script." Some DDL locks or rewrites big tables. [6][7]
- "Migrate data and switch in one step." Use expand–contract with verification. [1][3]
- "Copying is the hard part." Keeping the copy current while it runs (CDC/dual-write) and verifying
  it are harder. [3][9]
- "Once switched, delete the old system immediately." Keep a way back until confident. [3]

## Analogy ideas

- Replacing a bridge while traffic flows: build the new bridge beside the old, open one lane on the
  new bridge, then move all lanes, and only then demolish the old one.

## Caveats

- Lock behaviour depends on database version and the exact statement; check docs for each change.

## Sources

Primary:
1. *ParallelChange* (expand and contract) — Danilo Sato, martinfowler.com —
   https://martinfowler.com/bliki/ParallelChange.html — 2014.
2. *Evolutionary Database Design* — Pramod Sadalage, Martin Fowler —
   https://martinfowler.com/articles/evodb.html — 2016.
3. *Online migrations at scale* — Jacqueline Xu, Stripe Blog — https://stripe.com/blog/online-migrations — 2017.
4. *Ensuring rollback safety during deployments* — Amazon Builders' Library —
   https://aws.amazon.com/builders-library/ensuring-rollback-safety-during-deployments/ — 2020.
5. *Scientist: Measure Twice, Cut Over Once* — GitHub Blog —
   https://github.blog/developer-skills/application-development/scientist/ — 2016.
6. *CREATE INDEX — Building Indexes Concurrently* — PostgreSQL 18 Documentation —
   https://www.postgresql.org/docs/current/sql-createindex.html — accessed 2026-10-19.
7. *ALTER TABLE — Notes* (table rewrites, locks) — PostgreSQL 18 Documentation —
   https://www.postgresql.org/docs/current/sql-altertable.html — accessed 2026-10-19.
8. *gh-ost: GitHub's online schema migration tool for MySQL* — GitHub —
   https://github.com/github/gh-ost — accessed 2026-10-19.
9. *How Figma's databases team lived to tell the scale* — Sammy Steele, Figma Blog —
   https://www.figma.com/blog/how-figmas-databases-team-lived-to-tell-the-scale/ — 2024.
10. *How Discord Stores Trillions of Messages* — Bo Ingram, Discord —
    https://discord.com/blog/how-discord-stores-trillions-of-messages — 2023.

Books:
11. [B1] *Designing Data-Intensive Applications* — Kleppmann — ch. 4 "Encoding and Evolution"
    (backward/forward compatibility, schema evolution).
12. [B12] *Database Reliability Engineering* — Campbell, Majors — ch. 8 "Release Management"
    (migrations, testing schema changes).
13. [B26] *Building Microservices*, 2nd ed. — Newman — ch. 8 "Deployment" (separating deploy from
    release, expand/contract for interfaces).

Repos:
14. [G27] pingcap/awesome-database-learning — online DDL and migration papers —
    https://github.com/pingcap/awesome-database-learning.
15. [G22] charlax/professional-programming — database migration reading list —
    https://github.com/charlax/professional-programming.
