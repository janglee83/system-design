# Throughput and capacity — research note

- Level: L0
- Feeds lessons: `l0-throughput-and-capacity`, `l0-cost-basics`; background for
  `l1-vertical-scaling`
- Researched: 2026-10-18

## Key facts (in our words)

1. **Throughput** is how much work finishes per unit of time (requests per second, rps).
   **Capacity** is the most throughput a component can sustain. Latency and throughput are
   different axes: a system can be fast for one user and still collapse under many. [1][2]
2. **Capacity has a resource behind it.** For a CPU-bound web server, more vCPUs means more
   requests per second; memory decides how much waiting work fits, not how fast it is done.
   [3][4]
3. **Over capacity, work piles up.** When arrivals exceed what a server finishes, the excess
   queues; latency grows with the queue, and once the queue (bounded by memory) is full, new work
   is rejected or times out. [3][5]
4. **The slowest stage sets the pace.** In a chain (web → database) total throughput cannot
   exceed the weakest link; upgrading other links does nothing. [6][7]
5. **Peak matters more than average.** Load is bursty (daily cycles, launches). Size for the
   peak you expect plus headroom, not for the daily average. [6][8]
6. **Measure saturation, not just utilization.** Utilization is "how busy"; saturation is
   "how much is waiting". A resource at 100% with a growing queue is saturated. [3]
7. **Retrying or waiting longer does not add capacity.** A longer client timeout only lets more
   requests sit in the queue; it does not make the server finish more per second. [5]

## Numbers worth remembering

- Engine default: one web vCPU ≈ 9,000 rps of simple requests, 2 ms service time; one
  PostgreSQL instance ≈ 5,000 queries/s, 3 ms (`calibration.rs` defaults in plan 1a). These are
  game-world numbers, not real benchmarks; lessons must say so.
- Stack Overflow (2016) served ~209 million HTTP requests/day (~2,400 rps average) on 11 web
  servers — real systems often run far below their raw CPU ceiling. [8]

## How this maps to the engine

- `web-server.config.cpu` (1–16) multiplies rps capacity; `memoryGb` multiplies queue length
  (2,000 queued requests per GB). `workload.baseRps` sets arrivals. `peakBusy`, `p95`,
  `requestsRejected`, `requestsTimedOut` show the effect.
- Scratch-model check (1a formulas), 12,000 rps on one server: 1 vCPU → p95 ≈ 485 ms with
  rejections; 2 vCPU → p95 ≈ 6.5 ms, busy 0.67; 1 vCPU + 8 GB → p95 hits the 1 s timeout
  (bigger queue = longer wait). Caveat: the 1a availability formula counts only queue-overflow
  rejections per tick, so an overloaded server can still show availability > 0.99. Goals for
  overload lessons should use `p95` and `requestsRejected`, not availability alone.

## Misconceptions

- "More RAM makes the server handle more requests per second." (It lengthens the queue.)
- "If requests are slow, raise the timeout." (Hides the problem; capacity unchanged. [5])
- "Average load is what I size for." (Peaks break you. [6])
- "Upgrading any part speeds up the whole." (Only the bottleneck matters. [7])

## Analogy ideas (ours)

- A noodle shop with one cook: more stools (memory) let more customers wait; only another cook
  or a faster cook (CPU) serves more bowls per hour.

## Sources

1. *Designing Data-Intensive Applications*, ch. 1 "Reliable, Scalable, and Maintainable
   Applications" — Martin Kleppmann, O'Reilly, ISBN 978-1449373320 — 2017.
2. *High Performance Browser Networking*, ch. 1 — Ilya Grigorik, O'Reilly —
   https://hpbn.co/primer-on-latency-and-bandwidth/ — 2013.
3. *The USE Method* — Brendan Gregg — https://www.brendangregg.com/usemethod.html — page dated
   2017-08-24.
4. *Target tracking scaling policies for Amazon EC2 Auto Scaling* — AWS documentation —
   https://docs.aws.amazon.com/autoscaling/ec2/userguide/as-scaling-target-tracking.html —
   accessed 2026-10-18.
5. *Timeouts, retries, and backoff with jitter* — Marc Brooker, Amazon Builders' Library —
   https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/ — 2019.
6. *The Site Reliability Workbook*, ch. 12 "Non-Abstract Large System Design" — S. Virji et
   al., Google / O'Reilly — https://sre.google/workbook/non-abstract-design/ — 2018.
7. *A Proof for the Queuing Formula: L = λW* — John D. C. Little, Operations Research 9(3),
   383–387 — 1961; see also *Little's Law as Viewed on Its 50th Anniversary*, Operations
   Research 59(3) — https://pubsonline.informs.org/doi/10.1287/opre.1110.0940 — 2011.
8. *Stack Overflow: The Architecture – 2016 Edition* — Nick Craver —
   https://stackoverflow.blog/2016/02/17/stack-overflow-the-architecture-2016-edition/ —
   2016-02-17.
