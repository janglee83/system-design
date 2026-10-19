# Data models, SQL vs NoSQL, denormalization and schema evolution — research note

- Level: L2
- Feeds lessons: `l2-sql-vs-nosql`, `l2-data-modeling`, `l2-denormalization`, `l2-schema-evolution`
- Researched: 2026-10-19

## Key facts (in our words)

1. **The relational model** stores data as relations (tables) and lets queries combine them by
   values, independent of physical layout; it was proposed to separate how data is used from how it
   is stored. [1]
2. **Document, key-value and wide-column stores trade join power for locality and flexible schema.**
   A document keeps one entity and its one-to-many children together, which suits reads of a whole
   entity; many-to-many relationships push work back into the application. [9][10]
3. **Design from access patterns.** NoSQL stores such as DynamoDB and Cassandra ask you to list the
   queries first and shape keys and tables around them; the same data may be stored in several
   query-specific tables. [2][3]
4. **Denormalization duplicates data to make reads cheap**, at the cost of extra writes and the risk
   of copies drifting apart. Twitter-style home timelines are the classic case: precompute each
   user's feed instead of joining at read time. [9][10]
5. **Document databases still need a model.** MongoDB's guidance distinguishes embedding (read
   together) from referencing (large or independently changing data). [4]
6. **Schema-on-read vs schema-on-write.** Flexible-schema stores do not remove the schema; they move
   checking into the code that reads the data. [9]
7. **Encodings must evolve without breaking old readers/writers.** Protocol Buffers allows adding
   fields with new numbers and forbids reusing numbers; Avro resolves writer and reader schemas;
   schema registries enforce backward/forward compatibility modes. [5][6][7]
8. **Rolling upgrades mean old and new code run at once**, so both directions of compatibility matter
   during a deploy. [9][11]
9. **Real systems mix models.** Stack Overflow ran on SQL Server plus Redis and Elasticsearch; Discord
   moved messages from MongoDB to Cassandra and later ScyllaDB as access patterns grew. [8][12]

## Engine mapping

- Engine has `postgres` (relational) and plans `kv-store`. Data shape is not modelled, so
  `l2-sql-vs-nosql`, `l2-data-modeling`, `l2-denormalization` and `l2-schema-evolution` are
  reading+check lessons. Denormalization can be shown indirectly: precomputed reads = fewer DB
  queries (lower `serviceMs` via per-node override) vs fan-out writes (`fanout` behavior, planned).

## Misconceptions

- "NoSQL means no schema." The schema moves into application code. [9]
- "SQL does not scale." Many large sites run sharded relational databases. [8][12]
- "Pick the database first, model later." Access patterns decide the model. [2][3]
- "Adding a field is always safe." Not if old readers fail on unknown data or field ids are reused. [5]

## Teaching ideas (ours)

- One dataset (a shop: users, orders, items) sketched three ways; learners count queries per page.
- Deploy timeline: v1 and v2 servers both reading the same messages during a rolling upgrade.

## Sources

Primary:
1. *A Relational Model of Data for Large Shared Data Banks* — E. F. Codd, CACM 13(6) —
   https://www.seas.upenn.edu/~zives/03f/cis550/codd.pdf — 1970.
2. *Best practices for designing and architecting with DynamoDB* (NoSQL design) — AWS docs —
   https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-general-nosql-design.html —
   accessed 2026-10-19.
3. *Data modeling* — Apache Cassandra documentation —
   https://cassandra.apache.org/doc/latest/cassandra/developing/data-modeling/index.html — accessed
   2026-10-19.
4. *Data Modeling* — MongoDB Manual — https://www.mongodb.com/docs/manual/data-modeling/ — accessed
   2026-10-19.
5. *Language Guide (proto 3): Updating a message type* — Protocol Buffers docs, Google —
   https://protobuf.dev/programming-guides/proto3/ — accessed 2026-10-19.
6. *Apache Avro Specification: Schema Resolution* — Apache Avro —
   https://avro.apache.org/docs/1.11.1/specification/ — accessed 2026-10-19.
7. *Schema Evolution and Compatibility* — Confluent documentation —
   https://docs.confluent.io/platform/current/schema-registry/fundamentals/schema-evolution.html —
   accessed 2026-10-19.
8. *Stack Overflow: The Architecture – 2016 Edition* — Nick Craver —
   https://stackoverflow.blog/2016/02/17/stack-overflow-the-architecture-2016-edition/ — 2016.
12. *How Discord Stores Trillions of Messages* — Bo Ingram, Discord —
    https://discord.com/blog/how-discord-stores-trillions-of-messages — 2023.

Books (see `content/sources/books.md`):
9. [B1] *Designing Data-Intensive Applications* — Kleppmann — ch. 2 "Data Models and Query
   Languages", ch. 4 "Encoding and Evolution"; [B2] 2nd ed. ch. 3 and ch. 5.
10. [B38] *Web Scalability for Startup Engineers* — Ejsmont — ch. 5 "Data Layer".
11. [B4] *Understanding Distributed Systems* — Vitillo — part "Maintainability" (continuous delivery).

Repos (see `content/sources/github.md`):
13. [G1] donnemartin/system-design-primer — sections "Database" (RDBMS, NoSQL, SQL or NoSQL,
    denormalization) — https://github.com/donnemartin/system-design-primer.
14. [G26] ept/ddia-references — chapter 2 and 4 reference lists — https://github.com/ept/ddia-references.
