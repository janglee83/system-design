# Sagas: long-running transactions with compensation — research note

- Level: L6
- Feeds lessons: `l6-sagas` (challenges `c-l6-payment-saga`, `c-l6-capstone`)
- Builds on: `two-phase-commit`, `delivery-semantics-and-idempotency`, `transactional-outbox`,
  `payment-system`
- Researched: 2026-10-19

## Key facts (in our words)

1. **A saga is a sequence of local transactions, each with a compensating action.** If step k
   fails, the saga runs the compensations for steps k−1 … 1 in reverse order. The idea comes from a
   1987 database paper on long-lived transactions that should not hold locks for their whole
   duration. [1][11]
2. **Compensation is semantic, not a rollback.** "Cancel the hotel booking" or "refund the charge"
   is a new business action; the intermediate states were real and may have been seen. [1][2]
3. **Orchestration vs choreography.** An orchestrator (a central workflow) tells each service what
   to do next and tracks state; in choreography each service reacts to the previous service's
   events. Orchestration is easier to follow and change for long flows; choreography has fewer
   moving parts for two or three steps but its logic is spread out. [2][3][12]
4. **Sagas give up isolation (the I in ACID).** Other requests can see half-finished work — a
   seat held but not paid. Countermeasures: semantic locks (a PENDING status other operations
   respect), commutative updates, re-reading values before acting, and ordering steps so that
   risky ones come first. [2][11]
5. **Pivot step**: the step after which the saga can only go forward (for example capturing a
   payment). Steps before it are compensatable, steps after it must be retryable until they succeed.
   [2][11]
6. **Every step and compensation must be idempotent and retryable**, because messages are delivered
   at least once and orchestrators retry after crashes. [2][4]
7. **Some actions cannot be undone** (an email sent, a parcel shipped); place them after the pivot,
   or compensate with another action (an apology email, a return label). [2][13]
8. **Durable workflow engines** implement orchestrated sagas: state is persisted after each step so
   the workflow resumes after a crash. AWS Step Functions, Temporal (descended from Uber's Cadence)
   and similar engines are common choices. [5][6][7]
9. **Message-driven sagas need reliable events**: each step's local transaction must publish its
   event atomically — typically with the transactional outbox. [4][8]
10. **Observability is part of the design.** A saga stuck between steps is a business incident
    (money taken, no ticket); track saga state, age and failures, and alert on sagas stuck past a
    deadline. [3][12]

## Numbers worth remembering

- A saga with n steps has up to n − 1 compensations to design and test (failure at each step).
- Each step adds at least one message hop; end-to-end time is seconds to days, unlike a database
  transaction's milliseconds.

## Engine mapping

- Gap `distributed-transactions` (saga part): workflow of steps over services/queues with
  compensation, `third-party-down` on one step, and an inconsistency metric (orders charged but not
  booked, etc. — currently approximated by `lostUpdates`). `idempotency-keys` for duplicate
  deliveries (`duplicateWrites`). `third-party-node` for the provider step.
- Choices for the lesson: no compensation (inconsistent), 2PC across services (blocks when provider
  is down), orchestrated saga with idempotent steps (correct).

## Misconceptions

- "A saga is a distributed transaction with rollback." It is eventually consistent and not
  isolated. [1][2]
- "Compensation always restores the old state." It applies a new, semantic undo. [2]
- "Choreography is always more decoupled and therefore better." Long choreographies become hard to
  trace and change. [3][12]
- "Retries are enough." Without idempotency they double-apply steps. [4]

## Analogy ideas

- Planning a trip: book flight, then hotel, then car. If no car is available, you cancel the hotel
  and the flight yourself — and the cancellations may carry fees (semantic, not a time machine).

## Caveats

- Engine names are examples of the category; we do not endorse one.

## Sources

Primary:
1. *Sagas* — H. Garcia-Molina, K. Salem, SIGMOD —
   https://www.cs.cornell.edu/andru/cs711/2002fa/reading/sagas.pdf — 1987.
2. *Pattern: Saga* — Chris Richardson, microservices.io —
   https://microservices.io/patterns/data/saga.html — accessed 2026-10-19.
3. *Saga distributed transactions pattern* — Microsoft Azure Architecture Center —
   https://learn.microsoft.com/en-us/azure/architecture/patterns/saga — accessed 2026-10-19.
4. *Making retries safe with idempotent APIs* — Malcolm Featonby, Amazon Builders' Library —
   https://aws.amazon.com/builders-library/making-retries-safe-with-idempotent-APIs/ — 2020.
5. *Saga patterns* (orchestration with Step Functions, choreography with EventBridge) — AWS
   Prescriptive Guidance — https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/saga.html —
   accessed 2026-10-19.
6. *Temporal documentation — What is a Temporal Workflow?* — Temporal Technologies —
   https://docs.temporal.io/workflows — accessed 2026-10-19.
7. *Announcing Cadence 1.0: The Only Workflow Platform You'll Ever Need* — Uber Engineering —
   https://www.uber.com/blog/announcing-cadence/ — 2020.
8. *Pattern: Transactional outbox* — Chris Richardson, microservices.io —
   https://microservices.io/patterns/data/transactional-outbox.html — accessed 2026-10-19.
9. *Applying the Saga Pattern* (talk) — Caitie McCaffrey, GOTO Chicago —
   https://www.youtube.com/watch?v=xDuwrtwYHu8 — 2015.

Books:
11. [B27] *Microservices Patterns* — Richardson — ch. 4 "Managing transactions with sagas"
    (coordination, lack of isolation, countermeasures, pivot transactions).
12. [B30] *Software Architecture: The Hard Parts* — Ford et al. — ch. 11 "Managing Distributed
    Workflows" (orchestration vs choreography) and ch. 12 "Transactional Sagas".
13. [B26] *Building Microservices*, 2nd ed. — Newman — ch. 6 "Workflow" (sagas, failure modes).

Repos:
14. [G12] mehdihadeli/awesome-software-architecture — saga resources —
    https://github.com/mehdihadeli/awesome-software-architecture.
15. [G19] MicrosoftDocs/architecture-center — saga pattern source —
    https://github.com/MicrosoftDocs/architecture-center.
