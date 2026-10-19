# Backpressure and flow control — research note

- Level: L6 (deepens the L3 `load-shedding-and-backpressure` note)
- Feeds lessons: `l6-backpressure` (challenge `c-l6-capstone`)
- Builds on: `load-shedding-and-backpressure`, `queueing-and-utilization`, `queues-and-workers`,
  `distributed-message-queue`
- Researched: 2026-10-19

## Key facts (in our words)

1. **When a producer is faster than a consumer, only three things can happen**: the gap is buffered,
   work is dropped, or the producer is slowed down. Backpressure is the third: a signal travelling
   upstream that says "send less". [1][11]
2. **Queues do not fix overload; they delay it.** A queue absorbs a short burst, but if arrivals
   exceed service rate for long, an unbounded queue grows until memory runs out or every item
   waits longer than anyone cares; a bounded queue turns the same situation into an explicit signal
   (block or reject). [2][12]
3. **TCP is the textbook example.** The receiver advertises a receive window — how many bytes it
   can still buffer — and the sender may not have more than that in flight; a full window stops
   the sender without losing data. Congestion control separately slows senders when the network
   (not the receiver) is the bottleneck. [3][4]
4. **HTTP/2 and gRPC have per-stream and per-connection flow-control windows**, so one slow stream
   cannot make a sender buffer unboundedly. [5]
5. **Reactive Streams makes demand explicit.** A subscriber requests n items; the publisher may send
   at most n until more are requested. Libraries add overflow strategies (buffer with a bound, drop
   newest, drop oldest, keep latest, error) for sources that cannot be slowed. [6][7]
6. **Pull-based consumers get backpressure for free.** Kafka consumers fetch at their own pace and
   the broker keeps data on disk, so a slow consumer only grows lag (bounded by retention) instead of
   overwhelming itself. [8][13]
7. **Producers must decide what to do when blocked.** The Kafka producer buffers records in memory
   up to `buffer.memory`; when the buffer is full, `send()` blocks for up to `max.block.ms` and then
   fails — a bounded wait that pushes the problem back to the caller. [8]
8. **Backpressure must end somewhere.** Inside a system it can block; at the edge, where users
   arrive, you cannot slow down the internet — so the outermost layer turns backpressure into load
   shedding (HTTP 429/503 with `Retry-After`) or into a waiting room. [2][9][12]
9. **Blocking chains can deadlock or spread latency.** If every stage blocks on the next, one slow
   stage stalls the whole pipeline, and cyclic pipelines can deadlock; timeouts and bounded waits
   keep blocking from becoming a hang. [11][12]
10. **Size buffers from latency budgets.** By Little's Law, a queue of length L in front of a service
    of throughput λ adds about L/λ of waiting; a 10,000-item queue in front of 1,000 items/s adds
    ~10 s — usually far beyond any timeout, so most of that work would be wasted. [10]

## Numbers worth remembering

- Queue wait ≈ queue length ÷ service rate (Little's Law). [10]
- Kafka producer defaults: `buffer.memory` 32 MiB, `max.block.ms` 60 s (check current docs). [8]
- A buffer is useful only for bursts shorter than (buffer size ÷ (arrival − service rate)).

## Engine mapping

- Gap `backpressure-producer-feedback`: queue `maxDepth` with policies (unbounded / reject / block
  producer), producer behaviour when blocked (wait with timeout, shed at edge), metrics
  `peakQueueDepth`, `p99`, `availability`, plus a proposed `wastedWork` (items processed after their
  client timed out).
- Planned `queue`, `worker`, `traffic-surge-3x`, client timeouts already show unbounded growth.

## Misconceptions

- "A bigger queue means more capacity." It means more waiting. [2]
- "Backpressure and load shedding are opposites." Backpressure inside, shedding at the edge — they
  work together. [9][12]
- "Blocking the producer is always safe." Unbounded blocking spreads stalls and can deadlock. [11]

## Analogy ideas

- A kitchen pass with room for five plates: when it is full, the cooks stop plating (backpressure);
  the host at the door stops seating new guests (shedding) instead of letting the queue grow into
  the street.

## Caveats

- Defaults change between versions; numbers are illustrative.

## Sources

Primary:
1. *The Reactive Manifesto — Glossary: Back-Pressure* — J. Bonér, D. Farley, R. Kuhn, M. Thompson —
   https://www.reactivemanifesto.org/glossary — 2014.
2. *Queues Don't Fix Overload* — Fred Hébert — https://ferd.ca/queues-don-t-fix-overload.html — 2014.
3. *RFC 9293: Transmission Control Protocol (TCP)*, §3.8.6 "Managing the Window" — IETF —
   https://www.rfc-editor.org/rfc/rfc9293 — 2022.
4. *RFC 5681: TCP Congestion Control* — IETF — https://www.rfc-editor.org/rfc/rfc5681 — 2009.
5. *RFC 9113: HTTP/2*, §5.2 "Flow Control" — IETF — https://www.rfc-editor.org/rfc/rfc9113 — 2022.
6. *Reactive Streams specification for the JVM* — reactive-streams.org —
   https://github.com/reactive-streams/reactive-streams-jvm/blob/master/README.md — accessed 2026-10-19.
7. *Project Reactor reference — handling backpressure / onBackpressure operators* — VMware/Broadcom —
   https://projectreactor.io/docs/core/release/reference/ — accessed 2026-10-19.
8. *Kafka producer configs* (`buffer.memory`, `max.block.ms`) and *Design — the consumer (pull)* —
   Apache Kafka docs — https://kafka.apache.org/documentation/#producerconfigs — accessed 2026-10-19.
9. *Using load shedding to avoid overload* — David Yanacek, Amazon Builders' Library —
   https://aws.amazon.com/builders-library/using-load-shedding-to-avoid-overload/ — 2019.
10. *A Proof for the Queuing Formula: L = λW* — J. D. C. Little, Operations Research —
    https://pubsonline.informs.org/doi/10.1287/opre.9.3.383 — 1961.

Books:
11. [B1] *Designing Data-Intensive Applications* — Kleppmann — ch. 11 "Messaging Systems" (what
    happens if producers are faster than consumers: drop, buffer, backpressure).
12. [B19] *Release It!*, 2nd ed. — Nygard — ch. 5 "Create Back Pressure", "Shed Load".
13. [B34] *Kafka: The Definitive Guide*, 2nd ed. — Shapira et al. — ch. 3 (producer buffering) and
    ch. 4 (consumer pull and lag).

Repos:
14. [G1] donnemartin/system-design-primer — "Back pressure" section —
    https://github.com/donnemartin/system-design-primer.
15. [G13] mfornos/awesome-microservices — resilience and flow-control libraries —
    https://github.com/mfornos/awesome-microservices.
