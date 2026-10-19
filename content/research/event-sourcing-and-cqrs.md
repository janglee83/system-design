# Event sourcing and CQRS — research note

- Level: L6
- Feeds lessons: `l6-event-sourcing-cqrs`
- Builds on: `change-data-capture`, `distributed-message-queue`, `payment-system` (ledgers)
- Researched: 2026-10-19

## Key facts (in our words)

1. **Event sourcing stores what happened, not just the current state.** Each change is appended as an
   immutable event ("ItemAdded", "OrderShipped"); the current state is computed by replaying (folding)
   the events for an entity. [1][3][11]
2. **Snapshots keep replay cheap.** For entities with long histories, a periodic snapshot of state
   plus the events after it avoids replaying from the beginning. [3][11]
3. **Benefits**: a complete audit trail, the ability to rebuild state or build new views from
   history, temporal queries ("what did the cart look like yesterday?") and easier debugging of how
   a state was reached. Accounting ledgers have worked this way for centuries. [1][3][12]
4. **Costs**: events are a public schema forever — changing their shape needs versioning or
   "upcasting"; deleting personal data from an immutable log needs techniques such as encrypting
   per-user data and discarding the key; queries over current state need separate read models. [3][4][12]
5. **CQRS separates the write model from read models.** Commands go to a model optimised for
   validating and recording changes; queries go to one or more read models (projections) optimised
   for each screen or API. The two can use different stores. [2][4]
6. **Projections are derived and eventually consistent.** A projector consumes events and updates
   read models; readers may briefly see old data, and a projection can be rebuilt from the event
   log if it is wrong. [4][11]
7. **CQRS does not require event sourcing, and vice versa**, though they are often combined.
   Martin Fowler warns that CQRS adds significant complexity and suits only some parts of some
   systems. [2]
8. **Concurrency on the write side** uses optimistic checks on the entity's event version: append
   event n+1 only if the stream is still at version n, otherwise reload and retry. [3][5]
9. **Kafka can store event streams** with compacted topics keeping the latest per key, and stream
   processors maintain state stores backed by changelog topics; Ben Stopford's book argues for
   events as a shared source of truth between services. [6][13]
10. **Event sourcing ≠ event notification.** Publishing "something happened" messages for other
    services (event-driven integration) does not mean your own state is event-sourced; mixing the
    two terms causes confused designs. [7]

## Numbers worth remembering

- Replay cost ∝ events per entity since last snapshot; snapshot every N events (e.g. 100–1,000)
  keeps load time bounded (rule of thumb, tune per domain).

## Engine mapping

- Reading lesson. A future experiment (rebuild a projection after a bug; projection lag under load)
  needs gap `event-log-stream` (append-only log with consumer lag) and would show `staleReads` in
  the read model.

## Misconceptions

- "Event sourcing is just logging." Events are the source of truth, not a side record. [1]
- "CQRS everywhere." Most CRUD parts do not need it. [2]
- "Read models are always current." They lag the write side. [4]
- "Events can be edited when wrong." Corrections are new events. [3]

## Analogy ideas

- A bank statement: the balance is the result of all listed transactions; if the balance looks
  wrong you can recompute it from the lines. Different reports (monthly summary, tax report) are
  read models built from the same lines.

## Caveats

- Terminology varies (event store, stream, aggregate); we keep to the simplest words in lessons.

## Sources

Primary:
1. *Event Sourcing* — Martin Fowler — https://martinfowler.com/eaaDev/EventSourcing.html — 2005.
2. *CQRS* — Martin Fowler — https://martinfowler.com/bliki/CQRS.html — 2011.
3. *Event Sourcing pattern* — Microsoft Azure Architecture Center —
   https://learn.microsoft.com/en-us/azure/architecture/patterns/event-sourcing — accessed 2026-10-19.
4. *CQRS pattern* — Microsoft Azure Architecture Center —
   https://learn.microsoft.com/en-us/azure/architecture/patterns/cqrs — accessed 2026-10-19.
5. *Pattern: Event sourcing* — Chris Richardson, microservices.io —
   https://microservices.io/patterns/data/event-sourcing.html — accessed 2026-10-19.
6. *Log compaction* — Apache Kafka documentation — https://kafka.apache.org/documentation/#compaction —
   accessed 2026-10-19.
7. *What do you mean by "Event-Driven"?* — Martin Fowler —
   https://martinfowler.com/articles/201701-event-driven.html — 2017.
8. *CQRS Documents* — Greg Young — https://cqrs.files.wordpress.com/2010/11/cqrs_documents.pdf — 2010.

Books:
11. [B1] *Designing Data-Intensive Applications* — Kleppmann — ch. 11 "Event Sourcing", "State,
    Streams, and Immutability".
12. [B27] *Microservices Patterns* — Richardson — ch. 6 "Developing business logic with event
    sourcing" and ch. 7 "Implementing queries in a microservice architecture" (CQRS).
13. [B35] *Designing Event-Driven Systems* — Stopford — ch. 7 "Event Sourcing, CQRS, and Other
    Stateful Patterns".

Repos:
14. [G12] mehdihadeli/awesome-software-architecture — event sourcing and CQRS resources —
    https://github.com/mehdihadeli/awesome-software-architecture.
15. [G19] MicrosoftDocs/architecture-center — event sourcing and CQRS pattern sources —
    https://github.com/MicrosoftDocs/architecture-center.
