# Timeouts, retries, backoff and retry storms — research note

- Level: L3
- Feeds lessons: `l3-timeouts`, `l3-retries-backoff`, `l3-retry-storms-jitter`
- Researched: 2026-10-19

## Key facts (in our words)

1. **Every remote call needs a timeout**; without one, a slow dependency holds threads, connections
   and memory until the caller itself fails. [1][8]
2. **Pick timeouts from data**: Amazon chooses an acceptable false-timeout rate (e.g. 0.1%) and sets
   the timeout near that percentile of the dependency's latency. [1]
3. **Retries turn transient failures into successes but multiply load.** With three retries at each of
   five layers, a database can see up to 3⁵ = 243× the original requests. [1][2]
4. **Exponential backoff** spaces retries out (base × 2ⁿ, capped). **Jitter** randomises the wait so
   clients do not retry in lockstep; AWS's analysis found "full jitter" cut total work and completion
   time compared with no jitter. [3]
5. **Retry budgets / token buckets** limit retries to a fraction of normal traffic (gRPC and SRE
   practice), so retries cannot dominate during an outage. [2][4]
6. **Retry only what is safe**: idempotent operations, retryable errors (timeouts, 503), never 4xx
   validation errors. [1][5]
7. **Deadline propagation**: pass the remaining time budget downstream so inner calls do not keep
   working on requests the user has already abandoned. [2][4]
8. **Cascading failures** usually start as overload in one tier that spreads through retries and
   timeouts. [2][9]

## Engine mapping

- Client timeout `clientTimeoutMs` (1a); retries with fixed/exponential backoff planned (1b);
  `instance-slow`, `third-party-slow`, `db-overloaded` planned. Per-hop timeouts → gap
  `per-hop-timeouts`; jitter → gap `retry-jitter`; external dependency node → gap `third-party-node`.

## Misconceptions

- "Longer timeouts are safer." They tie up resources and hide failures. [1]
- "Retries are free." They amplify load exactly when the system is weakest. [1][2]
- "Exponential backoff alone prevents storms." Without jitter, clients stay synchronised. [3]

## Sources

Primary:
1. *Timeouts, retries, and backoff with jitter* — Marc Brooker, Amazon Builders' Library —
   https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/ — 2019.
2. *Site Reliability Engineering*, ch. 22 "Addressing Cascading Failures" — Mike Ulrich, Google —
   https://sre.google/sre-book/addressing-cascading-failures/ — 2016.
3. *Exponential Backoff And Jitter* — Marc Brooker, AWS Architecture Blog —
   https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/ — 2015.
4. *gRPC Retry design / Retry guide* — gRPC — https://grpc.io/docs/guides/retry/ — accessed 2026-10-19.
5. *Retry pattern* — Azure Architecture Center —
   https://learn.microsoft.com/en-us/azure/architecture/patterns/retry — accessed 2026-10-19.
6. *Site Reliability Engineering*, ch. 21 "Handling Overload" — Alejandro Forero Cuervo, Google —
   https://sre.google/sre-book/handling-overload/ — 2016.
7. *Making retries safe with idempotent APIs* — Malcolm Featonby, Amazon Builders' Library —
   https://aws.amazon.com/builders-library/making-retries-safe-with-idempotent-APIs/ — 2020.

Books:
8. [B19] *Release It!*, 2nd ed. — Nygard — ch. 4 antipatterns (integration points, blocked threads),
   ch. 5 patterns ("Timeouts").
9. [B4] *Understanding Distributed Systems* — part "Resiliency", chapter "Downstream resiliency"
   (timeouts, retries, circuit breakers).
10. [B16] *Site Reliability Engineering* — ch. 21–22.

Repos:
11. [G16] danluu/post-mortems — retry-storm and timeout incidents —
    https://github.com/danluu/post-mortems.
12. [G13] mfornos/awesome-microservices — resilience libraries —
    https://github.com/mfornos/awesome-microservices.
