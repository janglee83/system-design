# Circuit breakers, bulkheads and graceful degradation — research note

- Level: L3
- Feeds lessons: `l3-circuit-breakers`, `l3-bulkheads`, `l3-graceful-degradation`
- Researched: 2026-10-19

## Key facts (in our words)

1. **Circuit breaker**: wrap calls to a dependency; when failures cross a threshold the breaker
   *opens* and calls fail fast without touching the dependency; after a wait it goes *half-open* and
   lets a few trial calls through; success closes it. [1][2][3]
2. **Why fail fast helps**: callers stop waiting on a dead dependency, threads are freed, and the
   dependency gets room to recover. [1][9]
3. **Thresholds are usually rates over a sliding window** (e.g. failure rate and slow-call rate in
   Resilience4j) with a minimum number of calls before tripping. [3]
4. **Bulkhead**: partition resources (thread pools, connection pools, instances) per dependency or
   per client, so one slow or noisy consumer cannot exhaust everything. Named after ship compartments.
   [4][9]
5. **Netflix Hystrix** combined per-dependency thread pools (bulkheads), timeouts, circuit breakers
   and fallbacks; it is now in maintenance, with Resilience4j as a common successor. [5][3]
6. **Fallbacks / graceful degradation**: serve a cached or default answer, hide a non-essential
   feature, or queue the work — the page works with less. Netflix shows generic rows when
   personalisation is down. [5][6]
7. **Static stability**: design so that the system keeps working without its control plane or a
   dependency, rather than reacting during the outage (AWS). [7]

## Engine mapping

- Circuit breaker (failure-rate threshold + recovery window) is planned (1b); third-party faults are
  planned but need a node to target → gap `third-party-node`; bulkheads → gap `bulkheads`; fallbacks →
  gap `fallbacks`.

## Misconceptions

- "Circuit breakers fix the dependency." They protect the caller. [1]
- "One shared thread pool is more efficient." Until one dependency soaks it up. [4][9]
- "Degraded = failed." A partial page is often better than an error. [6]

## Sources

Primary:
1. *CircuitBreaker* — Martin Fowler — https://martinfowler.com/bliki/CircuitBreaker.html — 2014.
2. *Circuit Breaker pattern* — Azure Architecture Center —
   https://learn.microsoft.com/en-us/azure/architecture/patterns/circuit-breaker — accessed 2026-10-19.
3. *CircuitBreaker* — Resilience4j documentation — https://resilience4j.readme.io/docs/circuitbreaker —
   accessed 2026-10-19.
4. *Bulkhead pattern* — Azure Architecture Center —
   https://learn.microsoft.com/en-us/azure/architecture/patterns/bulkhead — accessed 2026-10-19.
5. *How it Works* — Netflix Hystrix wiki — https://github.com/Netflix/Hystrix/wiki/How-it-Works —
   accessed 2026-10-19.
6. *Making the Netflix API More Resilient* — Ben Christensen, Netflix Tech Blog —
   https://netflixtechblog.com/making-the-netflix-api-more-resilient-a8ec62159c2d — 2011.
7. *Static stability using Availability Zones* — Becky Weiss, Mike Furr, Amazon Builders' Library —
   https://aws.amazon.com/builders-library/static-stability-using-availability-zones/ — 2020.

Books:
8. [B26] *Building Microservices*, 2nd ed. — Newman — ch. 12 "Resiliency".
9. [B19] *Release It!*, 2nd ed. — Nygard — ch. 5 "Stability Patterns" (circuit breaker, bulkheads,
   fail fast).
10. [B4] *Understanding Distributed Systems* — part "Resiliency", chapters "Fault isolation",
    "Downstream resiliency".

Repos:
11. [G13] mfornos/awesome-microservices — resilience section — https://github.com/mfornos/awesome-microservices.
12. [G19] MicrosoftDocs/architecture-center — circuit breaker and bulkhead pattern sources —
    https://github.com/MicrosoftDocs/architecture-center.
