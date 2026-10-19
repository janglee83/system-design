# The dual-write problem and the transactional outbox — research note

- Level: L6
- Feeds lessons: `l6-outbox-pattern` (challenge `c-l6-payment-saga`)
- Builds on: `delivery-semantics-and-idempotency`, `transactions-and-isolation`, `queues-and-workers`
- Researched: 2026-10-19

## Key facts (in our words)

1. **The dual-write problem.** A service that updates its database and then publishes an event to a
   broker performs two writes that are not atomic together. If it crashes between them, or the
   broker is down, the database says "order placed" but nobody hears about it — or the event goes out
   for an order that was rolled back. [1][2][11]
2. **Reordering the writes does not help.** Publishing first and writing second just flips which
   inconsistency you get; retrying in application code does not survive a crash. [2][11]
3. **The outbox: one local transaction, two rows.** The service inserts the business change and an
   event row into an `outbox` table in the same database transaction. Either both exist or
   neither does. [1][3]
4. **A relay publishes the outbox.** Either a poller reads unsent rows in order, publishes them and
   marks them sent (simple, adds polling load and latency), or a change-data-capture connector tails
   the database log and publishes inserts into the outbox table (lower latency, no polling). [1][4][5]
5. **Delivery is at-least-once.** The relay can publish and crash before marking the row sent, so
   the event is published again; consumers must deduplicate by event id (an "inbox" table or an
   idempotent update). [1][3][12]
6. **Ordering per entity.** Publishing outbox rows in insertion order, keyed by the aggregate (order
   id) so they land in one partition, keeps per-entity order for consumers. [4][5]
7. **Debezium ships an outbox router** that reads outbox inserts from the log and routes each event
   to a topic based on the aggregate type, using the aggregate id as the message key. [4]
8. **Housekeeping**: outbox rows must be deleted or partitioned away after publication, or the table
   grows forever; with log-based relays the row can even be deleted in the same transaction because
   the insert is already in the log. [4][5]
9. **Log-only variant**: PostgreSQL can write a message straight into the WAL with
   `pg_logical_emit_message`, transactional with the business change, without a table; logical
   decoding consumers (including Debezium) can read it. [6]
10. **The outbox is the reliable "publish" step of sagas and event-driven services**, and the inbox
    is its mirror on the consumer side. [3][12][13]

## Numbers worth remembering

- Polling relay latency ≈ poll interval (e.g. 100 ms–1 s) + publish time; log-tailing relay
  latency ≈ replication-slot lag (often tens of ms).
- Duplicates appear only on relay crash/retry; the rate is small but never zero.

## Engine mapping

- Gap `outbox-cdc`: a "publish strategy" setting for a service (dual write / outbox + poller /
  outbox + CDC), `broker-down` and `instance-down` during publishing, a dual-write inconsistency
  metric (proposed `missingEvents`, today `lostMessages`) and `duplicateWrites` at consumers.

## Misconceptions

- "Write to the DB, then publish; if publish fails, retry." A crash in between loses the event. [2]
- "Kafka transactions solve it." They cover Kafka-to-Kafka, not your database plus Kafka. [11]
- "The outbox gives exactly-once." It gives at-least-once; consumers dedupe. [1]

## Analogy ideas

- Writing the letter and putting it in your own "to post" tray in the same motion; a postman who
  empties the tray may occasionally post a letter twice, so the recipient checks letter numbers.

## Caveats

- CDC relays need replication slots/binlog access and operational care (see `change-data-capture`).

## Sources

Primary:
1. *Pattern: Transactional outbox* — Chris Richardson, microservices.io —
   https://microservices.io/patterns/data/transactional-outbox.html — accessed 2026-10-19.
2. *Transactional outbox pattern* — AWS Prescriptive Guidance —
   https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/transactional-outbox.html —
   accessed 2026-10-19.
3. *Reliable Microservices Data Exchange With the Outbox Pattern* — Gunnar Morling, Debezium Blog —
   https://debezium.io/blog/2019/02/19/reliable-microservices-data-exchange-with-the-outbox-pattern/ — 2019.
4. *Outbox Event Router* — Debezium documentation —
   https://debezium.io/documentation/reference/stable/transformations/outbox-event-router.html —
   accessed 2026-10-19.
5. *Pattern: Transaction log tailing* and *Polling publisher* — Chris Richardson, microservices.io —
   https://microservices.io/patterns/data/transaction-log-tailing.html — accessed 2026-10-19.
6. *System Administration Functions — pg_logical_emit_message* — PostgreSQL 18 Documentation —
   https://www.postgresql.org/docs/current/functions-admin.html — accessed 2026-10-19.
7. *Transactional outbox pattern with Azure Cosmos DB* — Microsoft Azure Architecture Center —
   https://learn.microsoft.com/en-us/azure/architecture/databases/guide/transactional-outbox-cosmos — accessed 2026-10-19.
8. *Online Event Processing* — M. Kleppmann, A. Beresford, B. Svingen, ACM Queue / CACM —
   https://queue.acm.org/detail.cfm?id=3321612 — 2019.

Books:
11. [B1] *Designing Data-Intensive Applications* — Kleppmann — ch. 11 "Keeping Systems in Sync"
    (dual writes and their race conditions) and ch. 12 (deriving data via logs).
12. [B27] *Microservices Patterns* — Richardson — ch. 3 "Transactional messaging" (outbox, polling
    publisher, transaction log tailing, duplicate handling).
13. [B32] *Building Event-Driven Microservices* — Bellemare — ch. 4 "Integrating Event-Driven
    Architectures with Existing Systems" (outbox tables, CDC).
14. [B4] *Understanding Distributed Systems*, 2nd ed. — Vitillo — "Asynchronous transactions"
    chapter (outbox, sagas).

Repos:
15. [G12] mehdihadeli/awesome-software-architecture — outbox/inbox resources —
    https://github.com/mehdihadeli/awesome-software-architecture.
16. [G1] donnemartin/system-design-primer — asynchronism — https://github.com/donnemartin/system-design-primer.
