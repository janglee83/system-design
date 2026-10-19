# Async work: queues, workers, pub/sub, prefetch, partitions and DLQs — research note

- Level: L3
- Feeds lessons: `l3-sync-vs-async`, `l3-message-queues`, `l3-scaling-workers`, `l3-pubsub-fanout`,
  `l3-background-jobs`, `l3-consumer-prefetch-and-partitions`, `l3-dead-letter-queues`
- Researched: 2026-10-19

## Key facts (in our words)

1. **A queue decouples the request from the work.** The API accepts the job, puts a message on a
   queue and answers quickly; workers process at their own pace. Bursts become a growing backlog
   instead of failed requests. [1][10][11]
2. **Competing consumers**: several workers read from one queue; each message goes to one worker, so
   adding workers adds throughput. [2]
3. **Publish/subscribe**: a message published to a topic/exchange is copied to every subscriber's
   queue — fan-out. [3][12]
4. **Acknowledgements and visibility timeouts**: a message is removed only after the consumer acks.
   SQS hides an in-flight message for a visibility timeout and makes it visible again if not deleted,
   which is why delivery is at-least-once. [4][5]
5. **Prefetch (QoS)** limits how many unacknowledged messages a RabbitMQ consumer holds. Too high and
   one slow worker hoards work while others idle; too low and round trips cap throughput. [6]
6. **Partitions give order and parallelism together.** Kafka keeps order only within a partition;
   consumers in a group split partitions, so parallelism is capped by partition count and messages
   with the same key stay in order. [7][13]
7. **Dead-letter queues** collect messages that failed too many times (poison messages) so they stop
   blocking the queue and can be inspected. SQS uses a `maxReceiveCount` redrive policy; RabbitMQ
   uses dead-letter exchanges. [8][9]
8. **Scale workers on backlog per worker**, not raw queue length. [14]
9. **Queues hide overload until they don't**: an unbounded backlog becomes hours of latency;
   monitor age of oldest message. [10][15]

## Engine mapping

- `queue`, `worker`, `broker-down`, `jobs` profile, `peakQueueDepth`, `lostMessages`, `fanout`
  behavior and autoscaling are planned (1b) → most lessons need 1b. Prefetch and partition ordering
  are not in the spec → new gap `queue-partitions-and-prefetch`. DLQs → gap `dead-letter-queue`.

## Misconceptions

- "A queue makes the work faster." It makes the caller faster; the work still needs capacity. [10]
- "Messages arrive exactly once and in order." At-least-once, ordered only per partition/FIFO group. [4][7]
- "More partitions/consumers always help." Consumers beyond partitions sit idle. [7]
- "Retry a failing message forever." Poison messages block others → DLQ. [8]

## Sources

Primary:
1. *Asynchronous Request-Reply pattern* — Azure Architecture Center —
   https://learn.microsoft.com/en-us/azure/architecture/patterns/async-request-reply — accessed 2026-10-19.
2. *Competing Consumers pattern* — Azure Architecture Center —
   https://learn.microsoft.com/en-us/azure/architecture/patterns/competing-consumers — accessed 2026-10-19.
3. *RabbitMQ tutorial: Publish/Subscribe* — RabbitMQ — https://www.rabbitmq.com/tutorials/tutorial-three-python
   — accessed 2026-10-19.
4. *Amazon SQS visibility timeout* — AWS docs —
   https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-visibility-timeout.html — accessed 2026-10-19.
5. *Consumer Acknowledgements and Publisher Confirms* — RabbitMQ docs —
   https://www.rabbitmq.com/docs/confirms — accessed 2026-10-19.
6. *Consumer Prefetch* — RabbitMQ docs — https://www.rabbitmq.com/docs/consumer-prefetch — accessed 2026-10-19.
7. *Apache Kafka documentation — Design (consumer position, partitions)* — Apache Kafka —
   https://kafka.apache.org/documentation/#design — accessed 2026-10-19.
8. *Using dead-letter queues in Amazon SQS* — AWS docs —
   https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-dead-letter-queues.html — accessed 2026-10-19.
9. *Dead Letter Exchanges* — RabbitMQ docs — https://www.rabbitmq.com/docs/dlx — accessed 2026-10-19.
13. *Kafka: a Distributed Messaging System for Log Processing* — J. Kreps, N. Narkhede, J. Rao,
    NetDB — https://www.microsoft.com/en-us/research/wp-content/uploads/2017/09/Kafka.pdf — 2011.
14. *Scaling based on Amazon SQS* — AWS docs —
    https://docs.aws.amazon.com/autoscaling/ec2/userguide/as-using-sqs-queue.html — accessed 2026-10-19.

Books:
10. [B38] *Web Scalability for Startup Engineers* — Ejsmont — ch. 7 "Asynchronous Processing".
11. [B28] *Enterprise Integration Patterns* — Hohpe, Woolf — "Messaging Channels", "Competing
    Consumers", "Dead Letter Channel".
12. [B34] *Kafka: The Definitive Guide*, 2nd ed. — ch. 3 "Producers", ch. 4 "Consumers".
15. [B4] *Understanding Distributed Systems* — part "Scalability", chapter "Messaging".

Repos:
16. [G1] donnemartin/system-design-primer — "Asynchronism: message queues, task queues, back
    pressure" — https://github.com/donnemartin/system-design-primer.
17. [G19] MicrosoftDocs/architecture-center — competing consumers and queue-based load levelling
    pattern sources — https://github.com/MicrosoftDocs/architecture-center.
