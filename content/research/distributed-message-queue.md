# Designing a distributed message queue / log (Kafka-style) — research note

- Level: L5 (design), background for L6 (`l6-change-data-capture`, `l6-event-sourcing-cqrs`)
- Feeds lessons: `l5-distributed-message-queue`, background for `l5-metrics-pipeline`
- Builds on: `queues-and-workers`, `delivery-semantics-and-idempotency`,
  `replication-strategies-and-quorums`
- Researched: 2026-10-19

## Key facts (in our words)

1. **A log is not a queue.** A classic queue deletes a message once a consumer acknowledges it; a
   log keeps messages for a retention period and each consumer group tracks its own position
   (offset). Many independent readers and replays come for free. [1][2][10]
2. **Partitions are the unit of scale and of order.** A topic is split into partitions; each is an
   append-only sequence on disk. Order is guaranteed only within a partition, and a consumer group
   can use at most one consumer per partition, so the partition count caps parallelism. [2][11]
3. **The key chooses the partition.** Messages with the same key (for example an order id) go to the
   same partition, keeping per-key order; a skewed key creates a hot partition. [2][11]
4. **Sequential I/O and zero-copy make it fast.** Kafka appends to files and relies on the OS page
   cache and `sendfile` to move bytes from disk to network without copying through the
   application, which is why commodity disks sustain high throughput. [1][2]
5. **Replication with an in-sync replica set.** Each partition has a leader and followers; with
   `acks=all`, a write is acknowledged once all in-sync replicas have it, and
   `min.insync.replicas` sets how many must be in sync for writes to be accepted. With replication
   factor 3 and min ISR 2, one broker can fail without losing acknowledged data or availability. [2][11]
6. **Idempotent producers and transactions.** Kafka producers can attach sequence numbers so broker
   retries do not duplicate messages, and transactions let a consume-transform-produce step commit
   output and offsets together ("exactly-once" within Kafka). [2][3]
7. **Retention and compaction.** Partitions roll into segments that are deleted by age or size; a
   compacted topic keeps at least the latest value per key, turning the log into a durable
   changelog/table. [2][12]
8. **Metadata moved from ZooKeeper to Raft.** Kafka's KRaft mode stores cluster metadata in an
   internal Raft-replicated log; Apache Kafka 4.0 (2025) removed ZooKeeper mode entirely. [4][5]
9. **Consumer lag is the health metric.** The difference between the latest offset and a group's
   committed offset says how far behind consumers are; growing lag means consumers are too slow or
   stuck. [2][11]
10. **Other designs separate storage and serving.** Apache Pulsar keeps brokers stateless and stores
    segments in Apache BookKeeper, so partitions can move between brokers without copying data. [6]
11. **Queues still have their place.** RabbitMQ's quorum queues (Raft-replicated) give per-message
    acknowledgements, routing and priorities — better for task distribution; logs are better for
    event streams, replay and many consumers. [7][10]
12. **"The log" as an architecture idea.** Jay Kreps argued that an ordered, replayable log is the
    natural way to connect data systems: every system subscribes and builds its own view. [8][13]

## Numbers worth remembering

- RF = 3, `min.insync.replicas` = 2, `acks=all`: survives 1 broker loss without data loss. [2]
- Parallelism per consumer group ≤ partition count.
- Throughput planning: partitions ≈ max(target producer MB/s ÷ per-partition producer MB/s,
  target consumer MB/s ÷ per-partition consumer MB/s) (Confluent guidance, measure per-partition
  rates yourself). [9]

## Engine mapping

- Gap `event-log-stream` covers it: partitions, retention, consumer groups, consumer lag metric,
  key skew → hot partition. `broker-down` (planned) with RF/min ISR settings would show loss vs
  unavailability — a natural extension of the gap.
- Planned `queue` already teaches the work-queue side.

## Misconceptions

- "Kafka guarantees global order." Only per partition. [2]
- "More consumers always means faster." Not beyond the partition count. [11]
- "Once consumed, the message is gone." In a log it stays until retention. [1]
- "acks=1 is safe." The leader can die before followers copy the message. [2]

## Analogy ideas

- A ship's logbook: entries are only appended; each officer keeps a bookmark of the last entry they
  read; nobody tears pages out when they finish reading.

## Caveats

- Configuration names are Kafka-specific; concepts apply to Kinesis, Pulsar, Redpanda.

## Sources

Primary:
1. *Kafka: a Distributed Messaging System for Log Processing* — J. Kreps, N. Narkhede, J. Rao,
   NetDB — https://notes.stephenholiday.com/Kafka.pdf — 2011.
2. *Apache Kafka documentation — Design* (persistence, efficiency, replication, log compaction) —
   Apache Software Foundation — https://kafka.apache.org/documentation/#design — accessed 2026-10-19.
3. *Exactly-once Semantics are Possible: Here's How Kafka Does it* — Neha Narkhede, Confluent Blog —
   https://www.confluent.io/blog/exactly-once-semantics-are-possible-heres-how-apache-kafka-does-it/ — 2017.
4. *KIP-500: Replace ZooKeeper with a Self-Managed Metadata Quorum* — Apache Kafka wiki —
   https://cwiki.apache.org/confluence/display/KAFKA/KIP-500%3A+Replace+ZooKeeper+with+a+Self-Managed+Metadata+Quorum — 2019.
5. *Apache Kafka 4.0.0 release announcement* — Apache Kafka blog —
   https://kafka.apache.org/blog — 2025.
6. *Pulsar architecture overview* — Apache Pulsar docs —
   https://pulsar.apache.org/docs/next/concepts-architecture-overview/ — accessed 2026-10-19.
7. *Quorum queues* — RabbitMQ docs — https://www.rabbitmq.com/docs/quorum-queues — accessed 2026-10-19.
8. *The Log: What every software engineer should know about real-time data's unifying abstraction*
   — Jay Kreps, LinkedIn Engineering —
   https://engineering.linkedin.com/distributed-systems/log-what-every-software-engineer-should-know-about-real-time-datas-unifying — 2013.
9. *How to choose the number of topics/partitions in a Kafka cluster?* — Jun Rao, Confluent Blog —
   https://www.confluent.io/blog/how-choose-number-topics-partitions-kafka-cluster/ — 2015.

Books:
10. [B1] *Designing Data-Intensive Applications* — Kleppmann — ch. 11 "Stream Processing"
    (message brokers vs partitioned logs, consumer offsets).
11. [B34] *Kafka: The Definitive Guide*, 2nd ed. — Shapira et al. — ch. 3 producers, ch. 4
    consumers, ch. 6 "Kafka Internals" (replication), ch. 7 "Reliable Data Delivery".
12. [B41] *System Design Interview*, vol. 2 — Xu, Lam — "Distributed Message Queue" (topic map only).
13. [B37] *I Heart Logs* — Kreps — ch. 1–2.

Repos:
14. [G31] jepsen-io/maelstrom — Kafka-style log workload with fault injection —
    https://github.com/jepsen-io/maelstrom.
15. [G37] oxnr/awesome-bigdata — messaging and streaming systems — https://github.com/oxnr/awesome-bigdata.
