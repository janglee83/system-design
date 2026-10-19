# Load shedding, backpressure and adaptive concurrency — research note

- Level: L3 (load shedding), L6 (backpressure, adaptive limits)
- Feeds lessons: `l3-load-shedding`, `l6-backpressure`, `l6-adaptive-concurrency`
- Researched: 2026-10-19

## Key facts (in our words)

1. **Overloaded servers do less useful work, not more.** As queues grow, requests time out after the
   server has spent effort on them, so goodput collapses. Shedding early keeps goodput up. [1][2]
2. **Load shedding** rejects some requests cheaply (fast 503/429) when the server is beyond a limit,
   ideally choosing low-priority work first. Netflix sheds by request priority at the edge. [1][3]
3. **Bound every queue.** Unbounded queues turn overload into minutes of latency; bounded queues
   reject at the door. [2][8]
4. **Backpressure** is a signal from a slow consumer to its producer to slow down (TCP flow control,
   Reactive Streams' demand requests, bounded channels). Without it, queues fill or memory runs
   out. [4][8]
5. **Adaptive concurrency limits** estimate the right number of in-flight requests from observed
   latency (TCP-congestion-style algorithms such as AIMD or gradient), instead of a fixed number. [5]
6. **Little's Law links the limit**: in-flight = throughput × latency, so a limit is a latency
   budget in disguise. [6]
7. **Client cooperation**: throttling hints (`Retry-After`) and client-side adaptive throttling
   (Google's SRE book) stop clients from hammering an overloaded backend. [2][7]

## Engine mapping

- Queues have `peakQueueDepth` (planned); client timeouts exist. Shedding by priority/adaptive
  limits → gap `load-shedding`; producer slowdown → gap `backpressure-producer-feedback`.

## Misconceptions

- "Accept everything; the queue will absorb it." [2][8]
- "Rejecting requests lowers availability, so never do it." Shedding keeps most users served. [1]
- "A fixed concurrency limit is enough." It is wrong as soon as latency changes. [5]

## Sources

Primary:
1. *Using load shedding to avoid overload* — David Yanacek, Amazon Builders' Library —
   https://aws.amazon.com/builders-library/using-load-shedding-to-avoid-overload/ — 2019.
2. *Site Reliability Engineering*, ch. 21 "Handling Overload" — Alejandro Forero Cuervo, Google —
   https://sre.google/sre-book/handling-overload/ — 2016.
3. *Keeping Netflix Reliable Using Prioritized Load Shedding* — Netflix Tech Blog —
   https://netflixtechblog.com/keeping-netflix-reliable-using-prioritized-load-shedding-6cc827b02f94 — 2020.
4. *Reactive Streams specification* — reactive-streams.org — https://www.reactive-streams.org/ —
   accessed 2026-10-19.
5. *concurrency-limits* (README: adaptive limit algorithms) — Netflix, GitHub —
   https://github.com/Netflix/concurrency-limits — accessed 2026-10-19.
6. *Little's Law as Viewed on Its 50th Anniversary* — J. D. C. Little —
   https://pubsonline.informs.org/doi/10.1287/opre.1110.0940 — 2011.
7. *Site Reliability Engineering*, ch. 22 "Addressing Cascading Failures" — Google —
   https://sre.google/sre-book/addressing-cascading-failures/ — 2016.

Books:
8. [B19] *Release It!*, 2nd ed. — Nygard — ch. 5 "Shed Load", "Create Back Pressure", "Governor".
9. [B4] *Understanding Distributed Systems* — part "Resiliency", chapter "Upstream resiliency".
10. [B16] *Site Reliability Engineering* — ch. 21 (client-side throttling, criticality).

Repos:
11. [G1] donnemartin/system-design-primer — "Back pressure" —
    https://github.com/donnemartin/system-design-primer.
12. [G16] danluu/post-mortems — overload incidents — https://github.com/danluu/post-mortems.
