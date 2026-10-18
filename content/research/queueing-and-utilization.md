# Queueing and utilization — research note

- Level: L0
- Feeds lessons: `l0-queueing-and-utilization`; background for `l1-autoscaling`,
  `l6-capacity-planning`
- Researched: 2026-10-18

## Key facts (in our words)

1. **Little's Law: L = λ·W.** The average number of items inside a system equals the arrival
   rate times the average time each item spends inside. It holds under very weak assumptions
   and links concurrency, throughput and latency. [1][2]
2. **Response time explodes near 100% busy.** In the classic single-server queue (M/M/1),
   average response time R = S / (1 − U), where S is service time and U utilization. At 50%
   busy R = 2S; at 90% R = 10S; at 95% R = 20S. [3][4]
3. **The "knee" is well below 100%.** Practitioners start seeing frequent queueing delays from
   around 70% utilization; short bursts at 100% hurt even when the average looks fine. [5]
4. **Headroom is a design choice.** Autoscaling targets such as 50% CPU exist precisely to keep
   spare capacity for bursts. [6]
5. **Higher utilization saves money but costs latency.** Google reports that techniques which
   tame the latency tail let them run machines hotter without over-provisioning, which implies
   that, without them, low utilization is the price of good tails. [7]
6. **Queues also hide failure.** A request waiting a long time is often indistinguishable, from
   the user's side, from a failed one; timeouts turn long waits into errors. [8]

## Numbers worth remembering

| Utilization | Response time (× service time), M/M/1 |
|---|---|
| 50% | 2× |
| 70% | 3.3× |
| 90% | 10× |
| 95% | 20× |

## How this maps to the engine

- The 1a engine uses exactly R = serviceMs / (1 − ρ), with ρ capped at
  `maxUtilizationForLatency` (0.95), plus explicit queue wait when arrivals exceed capacity.
- Scratch-model check, 8,500 rps on one server: 1 vCPU (ρ ≈ 0.94) → p95 ≈ 36 ms, nothing
  rejected; 2 vCPU (ρ ≈ 0.47) → p95 ≈ 4.3 ms; 4 vCPU → 3.1 ms. Good for the lesson "no errors
  does not mean healthy".
- `peakBusy` is the metric that shows utilization; `p95` shows the latency effect.

## Misconceptions

- "94% busy and zero errors means we are fine." (Latency is already ~18× service time.)
- "Utilization grows linearly with latency." (It is a hyperbola. [3])
- "Idle capacity is waste." (Some of it is the price of predictable latency. [5][6])

## Analogy ideas (ours)

- A supermarket checkout: when the cashier is busy half the time you rarely wait; when she is
  busy 95% of the time, one extra shopper makes the line snake through the aisles.

## Sources

1. *A Proof for the Queuing Formula: L = λW* — John D. C. Little, Operations Research 9(3),
   383–387 — 1961.
2. *Little's Law as Viewed on Its 50th Anniversary* — John D. C. Little, Operations Research
   59(3) — https://pubsonline.informs.org/doi/10.1287/opre.1110.0940 — 2011.
3. *Lecture 12: Queueing theory*, course IN4390 Quantitative Evaluation of Embedded Systems — Koen Langendoen, TU Delft —
   https://www.st.ewi.tudelft.nl/koen/in4390/lect-12-queueing-theory.pdf — accessed 2026-10-18.
4. *Mathematical Model for the Optimal Utilization Percentile in M/M/1 Systems: A Contribution
   about Knees in Performance Curves* — F. A. Gonzalez-Horta, R. A. Enriquez-Caldera,
   J. M. Ramirez-Cortes, J. Martinez-Carballido, E. Buenfil-Alpuche (arXiv:1106.2380) —
   https://arxiv.org/abs/1106.2380 — June 2011.
5. *The USE Method* — Brendan Gregg — https://www.brendangregg.com/usemethod.html — 2017-08-24.
   Short quote: "Once their utilization is over 70%, queueing delays can become more frequent
   and noticeable."
6. *Target tracking scaling policies for Amazon EC2 Auto Scaling* — AWS documentation —
   https://docs.aws.amazon.com/autoscaling/ec2/userguide/as-scaling-target-tracking.html —
   accessed 2026-10-18.
7. *The Tail at Scale* — Jeffrey Dean, Luiz André Barroso, Communications of the ACM 56(2),
   74–80 — https://research.google/pubs/pub40801/ — February 2013.
8. *Timeouts, retries, and backoff with jitter* — Marc Brooker, Amazon Builders' Library —
   https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/ — 2019.
