# Delivery semantics and idempotency — research note

- Level: L3
- Feeds lessons: `l3-delivery-semantics`, `l3-idempotency` (background for `l5-payment-system`,
  `l5-notification-system`, `l6-outbox-pattern`)
- Researched: 2026-10-19

## Key facts (in our words)

1. **At-most-once** (ack before processing: may lose), **at-least-once** (ack after processing: may
   duplicate), **exactly-once effect** (at-least-once delivery + idempotent or transactional
   processing). [1][2][9]
2. **Duplicates are normal.** SQS standard queues and RabbitMQ redeliver unacked messages; a consumer
   crash after doing the work but before acking reprocesses it. [3][4]
3. **Kafka's exactly-once** combines idempotent producers (sequence numbers per partition) and
   transactions that write outputs and consumer offsets atomically — within Kafka. Side effects
   outside Kafka still need idempotence. [2][10]
4. **Idempotency keys:** the client sends a unique key with a request; the server stores the result
   under that key and returns the saved result on retries. Stripe keeps keys for at least 24 hours.
   [5][6]
5. **Airbnb** made payment calls idempotent with a dedicated library that records request state in a
   database before and after the external call, to avoid double charges. [7]
6. **Idempotent receiver**: record processed message ids (or use natural keys / upserts) and skip
   repeats. [8][11]
7. **HTTP methods help:** PUT and DELETE are defined idempotent; POST needs an explicit key. [12]

## Engine mapping

- Metrics `lostMessages`, `duplicateWrites` and fault `broker-down` are planned; delivery mode and
  dedupe are not → gaps `delivery-semantics`, `idempotency-keys`.

## Misconceptions

- "My queue guarantees exactly-once, so my code can be naive." [2][3]
- "Retries are safe because the request failed." It may have succeeded before the timeout. [5][7]
- "Dedupe forever." Keys need a retention window and storage. [5]

## Sources

Primary:
1. *Reliability Guide* — RabbitMQ docs — https://www.rabbitmq.com/docs/reliability — accessed 2026-10-19.
2. *Exactly-Once Semantics Are Possible: Here's How Kafka Does It* — Neha Narkhede, Confluent —
   https://www.confluent.io/blog/exactly-once-semantics-are-possible-heres-how-apache-kafka-does-it/ — 2017.
3. *Amazon SQS at-least-once delivery* — AWS docs —
   https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/standard-queues-at-least-once-delivery.html — accessed 2026-10-19.
4. *Exactly-once processing in Amazon SQS FIFO* — AWS docs —
   https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/FIFO-queues-exactly-once-processing.html — accessed 2026-10-19.
5. *Idempotent requests* — Stripe API reference — https://docs.stripe.com/api/idempotent_requests —
   accessed 2026-10-19.
6. *Designing robust and predictable APIs with idempotency* — Brandur Leach, Stripe —
   https://stripe.com/blog/idempotency — 2017.
7. *Avoiding Double Payments in a Distributed Payments System* — Jon Chew, Ninad Khisti, Airbnb
   Engineering — https://medium.com/airbnb-engineering/avoiding-double-payments-in-a-distributed-payments-system-2981f6b070bb — 2019.
8. *Idempotent Consumer pattern* — Chris Richardson, microservices.io —
   https://microservices.io/patterns/communication-style/idempotent-consumer.html — accessed 2026-10-19.
12. *RFC 9110 HTTP Semantics, §9.2.2 Idempotent Methods* — IETF — https://www.rfc-editor.org/rfc/rfc9110 — 2022.

Books:
9. [B1] *Designing Data-Intensive Applications* — ch. 11 "Stream Processing" (fault tolerance,
   idempotence) — [B2] ch. 12.
10. [B34] *Kafka: The Definitive Guide*, 2nd ed. — ch. 7 "Reliable Data Delivery", ch. 8
    "Exactly-Once Semantics".
11. [B28] *Enterprise Integration Patterns* — "Idempotent Receiver", "Guaranteed Delivery".

Repos:
13. [G4] ashishps1/awesome-system-design-resources — idempotency articles —
    https://github.com/ashishps1/awesome-system-design-resources.
14. [G12] mehdihadeli/awesome-software-architecture — messaging/idempotency section —
    https://github.com/mehdihadeli/awesome-software-architecture.
