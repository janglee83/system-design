# Percentiles and tail latency — research note

- Level: L0
- Feeds lessons: `l0-percentiles`; background for `l3-timeouts`, `l6-tail-latency-hedging`
- Researched: 2026-10-18

## Key facts (in our words)

1. **A percentile answers "how slow is it for the unlucky ones?"** p50 (median): half of
   requests are faster. p95: 95% are faster, 5% are slower. p99: 1 in 100 is slower. [1][2]
2. **Averages hide the tail.** A mean can look healthy while a few percent of users wait many
   times longer; SRE practice is to set objectives on percentiles. [1]
3. **The tail is where many users live.** A page that makes many backend calls is as slow as its
   slowest call; so the tail of each call becomes the typical experience of the page. Dean and
   Barroso show that if one server is slow 1% of the time and a request touches 100 servers,
   most requests are slowed. [3]
4. **Tails come from bursts, queues, garbage collection, background jobs, noisy neighbours,
   retries.** Short overloads that the average smooths over create the tail. [3][4]
5. **Measure correctly.** Load generators that wait for each answer before sending the next
   ("coordinated omission") under-report the tail dramatically. Use histograms, not averages or
   standard deviations. [4]
6. **SLI/SLO/SLA vocabulary.** SLI = the measurement (for example p99 latency); SLO = the target
   (p99 ≤ 300 ms); SLA = a contract with consequences if the SLO is missed. [1]

## Numbers worth remembering

- If each of N parallel calls is slow with probability p, the chance a request is slow is
  1 − (1 − p)^N. For p = 1%, N = 100: 1 − 0.99^100 ≈ 63%. [3]

## How this maps to the engine

- The engine reports `p50`, `p95`, `p99` from per-class histograms with fixed log buckets.
- In steady state the 1a model gives every request the same latency, so p50 = p95 = p99. A tail
  needs time-varying load. Scratch-model check: base 6,000 rps, ×2 surge for 400 ms at 4 s, one
  server: 1 vCPU → p50 ≈ 6.5 ms, p95 ≈ 104 ms, p99 ≈ 157 ms; 2 vCPU → p50 3.5, p99 6.5 ms.
  Good contrast for "p50 says fine, p99 says no".
- The engine has no `mean` metric; the lesson explains averages in words only.
- Per-request variance (one slow instance among many) needs `instance-slow` (planned in 1b).

## Misconceptions

- "The average tells me how users feel."
- "p99 is just a few unlucky users; ignore them." (At scale it is many users, and pages that
  fan out hit it constantly. [3])
- "If p50 is good, p99 is probably close." (Bursts break that. [3][4])

## Analogy ideas (ours)

- A bus line: the timetable average says 10 minutes, but on rainy days the 8:15 bus is 40
  minutes late. Commuters remember the rainy days.

## Sources

1. *Site Reliability Engineering*, ch. 4 "Service Level Objectives" — Chris Jones, John Wilkes,
   Niall Murphy, Cody Smith; ed. Betsy Beyer et al., Google / O'Reilly —
   https://sre.google/sre-book/service-level-objectives/ — 2016.
2. *Designing Data-Intensive Applications*, ch. 1 (section "Describing Performance") — Martin
   Kleppmann, O'Reilly — 2017.
3. *The Tail at Scale* — Jeffrey Dean, Luiz André Barroso, Communications of the ACM 56(2),
   74–80 — https://research.google/pubs/pub40801/ — February 2013.
4. *How NOT to Measure Latency* (talk slides) — Gil Tene, Azul Systems, QCon San Francisco —
   https://qconsf.com/sf2012/dl/qcon-sanfran-2012/slides/GilTene_HowNotToMeasureLatency.pdf —
   2012.
5. *Measure performance with the RAIL model* — web.dev, Google Chrome team —
   https://web.dev/articles/rail — accessed 2026-10-18.
6. *Timeouts, retries, and backoff with jitter* (choosing timeouts from a latency percentile)
   — Marc Brooker, Amazon Builders' Library —
   https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/ — 2019.
