# Unique IDs in distributed systems — research note

- Level: L4 (L5 service design)
- Feeds lessons: `l4-unique-ids`, `l5-unique-id-service`
- Researched: 2026-10-19

## Key facts (in our words)

1. **Auto-increment from one database is simple but central**: one point of failure and a write
   bottleneck; it also leaks business volume. [1][9]
2. **Flickr's ticket servers** used two MySQL instances handing out odd and even numbers
   (`auto_increment_increment` / offset) for redundancy without coordination. [1]
3. **UUIDs**: 128-bit identifiers generated anywhere without coordination. Version 4 is random (not
   ordered, poor index locality); version 7 (RFC 9562) puts a Unix-millisecond timestamp first so IDs
   sort roughly by time. [2]
4. **Snowflake** (Twitter, 2010): 64-bit IDs = timestamp + worker/machine id + per-millisecond
   sequence; k-sortable, unique without coordination as long as worker ids are unique and clocks do
   not run backwards. Discord uses the same layout. [3][4]
5. **Instagram** generated 64-bit IDs inside PostgreSQL: 41 bits of time, 13 bits of logical shard
   id, 10 bits of sequence. [5]
6. **ULID** and MongoDB **ObjectId** are other time-prefixed formats. [6][7]
7. **Clock problems**: if a machine's clock goes backwards, a Snowflake-style generator must wait or
   refuse, or it risks duplicates/out-of-order IDs. [3][10]

## Engine mapping

- `id_generator` behavior (`uuid | snowflake | db-sequence`) with `duplicateIds` and `outOfOrderIds`
  is planned (1b) → `l4-unique-ids` and `l5-unique-id-service` need 1b only. Clock skew → gap
  `clock-skew` (used by `l4-clocks-and-ordering`).

## Misconceptions

- "UUIDs are ordered." v4 is random. [2]
- "Timestamps are unique." Many events share a millisecond. [3]
- "A central counter is fine at any scale." [1][9]

## Sources

Primary:
1. *Ticket Servers: Distributed Unique Primary Keys on the Cheap* — Kay Kremerskothen, Code.Flickr —
   https://code.flickr.net/2010/02/08/ticket-servers-distributed-unique-primary-keys-on-the-cheap/ — 2010.
2. *RFC 9562: Universally Unique IDentifiers (UUIDs)* — K. Davis, B. Peabody, P. Leach, IETF —
   https://www.rfc-editor.org/rfc/rfc9562 — 2024.
3. *Announcing Snowflake* — Ryan King, Twitter Engineering —
   https://blog.x.com/engineering/en_us/a/2010/announcing-snowflake — 2010.
4. *API Reference: Snowflakes* — Discord Developer Docs — https://discord.com/developers/docs/reference#snowflakes
   — accessed 2026-10-19.
5. *Sharding & IDs at Instagram* — Instagram Engineering —
   https://medium.com/instagram-engineering/sharding-ids-at-instagram-1cf5a71e5a5c — 2012.
6. *ULID specification* — ulid/spec, GitHub — https://github.com/ulid/spec — accessed 2026-10-19.
7. *ObjectId* — MongoDB Manual — https://www.mongodb.com/docs/manual/reference/method/ObjectId/ —
   accessed 2026-10-19.

Books:
8. [B40] *System Design Interview*, vol. 1 — Xu — ch. 7 "Design a Unique ID Generator" (topic map only).
9. [B1] *Designing Data-Intensive Applications* — ch. 9, section on ordering and sequence number
   generation ([B2] ch. 10).
10. [B6] *Patterns of Distributed Systems* — Joshi — "Hybrid Clock", "Generation Clock".

Repos:
11. [G31] jepsen-io/maelstrom — "unique-ids" workload — https://github.com/jepsen-io/maelstrom.
12. [G4] ashishps1/awesome-system-design-resources — https://github.com/ashishps1/awesome-system-design-resources.
