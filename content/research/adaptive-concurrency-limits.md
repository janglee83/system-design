# Adaptive concurrency limits — research note

- Level: L6
- Feeds lessons: `l6-adaptive-concurrency`
- Builds on: `load-shedding-and-backpressure`, `backpressure-and-flow-control`,
  `queueing-and-utilization`
- Researched: 2026-10-19

## Key facts (in our words)

1. **Concurrency, not rate, is what overloads a server.** By Little's Law the number of requests in
   flight equals throughput × latency. A server has a sweet spot of in-flight work; beyond it, extra
   requests only wait in queues and raise latency. Limiting in-flight requests caps that queueing. [1][10]
2. **A fixed limit goes stale.** The right limit changes when latency changes (a slow dependency,
   a GC pause, a new release), so hand-tuned numbers are either too low (wasted capacity) or too
   high (queues). Adaptive limits measure and adjust continuously. [2][3]
3. **Borrowed from TCP congestion control.** AIMD (additive increase, multiplicative decrease) grows
   the limit slowly while things are fine and cuts it sharply on signs of overload; delay-based
   algorithms (like TCP Vegas) compare current latency with the best (no-queue) latency and shrink the
   limit when latency rises, before errors appear. [4][5]
4. **Netflix's concurrency-limits library** implements such algorithms (Vegas-like and gradient-based)
   for servers and clients: the gradient compares a long-term minimum RTT with the recent RTT, and
   the limit is adjusted by the ratio plus a small queue allowance. [2][3]
5. **Envoy's adaptive concurrency filter** periodically measures a minimum RTT by temporarily
   lowering concurrency, then uses a gradient against sampled latencies to set the limit; excess
   requests get a fast 503. [6]
6. **Uber's Cinnamon** load shedder combines a priority-aware rejector with an auto-tuner based on
   TCP Vegas that raises or lowers the in-flight limit as observed latency moves relative to a
   reference latency — with no per-service configuration. [7]
7. **Facebook's server queues use CoDel-style control.** In "Fail at Scale", Facebook described
   applying the Controlled Delay idea (watch the minimum queueing time over an interval; if it never
   drops low, the queue is standing, so shorten timeouts) and adaptive LIFO (serve newest first under
   load, since old requests have likely timed out). [8][9]
8. **Clients can adapt too.** Google's SRE book describes client-side adaptive throttling: each client
   tracks requests vs accepts and starts rejecting locally with probability
   max(0, (requests − K × accepts) / (requests + 1)), with K = 2 typical, so an overloaded backend is
   not hammered by rejected traffic. [10]
9. **Priorities matter when shedding.** Adaptive limits decide *how much* to admit; priorities
   decide *which* requests: user-facing before batch, retries last. [7][10]
10. **Limits protect goodput.** The goal is useful completed work per second; an adaptive limit lets
    throughput stay near its peak while latency stays near its unloaded value under heavy overload,
    rather than collapsing. [2][9]

## Numbers worth remembering

- In-flight = throughput × latency: 2,000 req/s × 50 ms = 100 concurrent requests. [1]
- Client throttling constant K = 2 (accepts ×2 before throttling). [10]
- Gradient limit ≈ current limit × (minRTT ÷ sampleRTT) + queue allowance (shape of the algorithm,
  not exact code). [2][3]

## Engine mapping

- Gap `load-shedding` extended: a per-service `concurrencyLimit` mode (none / fixed / adaptive) with
  fast rejection above the limit; `instance-slow` changes latency so a fixed limit becomes wrong.
  Metrics: `p99`, `throughputRps`, `requestsRejected`, proposed `goodput`.

## Misconceptions

- "Set max concurrency once from a load test." It drifts with latency. [2]
- "Rate limits and concurrency limits are the same." Rate ignores how long each request holds
  resources. [1][3]
- "Wait for errors before reducing load." Delay-based limits react to rising latency first. [4][5]
- "Serve requests strictly in arrival order under overload." The oldest may already be useless. [8]

## Analogy ideas

- A restaurant that seats as many tables as the kitchen can serve in good time; when dishes start
  coming out slower, the host seats fewer tables, rather than filling every chair.

## Caveats

- Formulas are simplified descriptions of the published algorithms.

## Sources

Primary:
1. *Little's Law as Viewed on Its 50th Anniversary* — J. D. C. Little, Operations Research —
   https://pubsonline.informs.org/doi/10.1287/opre.1110.0940 — 2011.
2. *Performance Under Load* — Eran Landau, William Thurston, Tim Bozarth, Netflix Technology Blog —
   https://netflixtechblog.medium.com/performance-under-load-3e6fa9a60581 — 2018.
3. *concurrency-limits* (README and limit algorithms) — Netflix — https://github.com/Netflix/concurrency-limits —
   accessed 2026-10-19.
4. *Analysis of the Increase and Decrease Algorithms for Congestion Avoidance in Computer Networks*
   — D.-M. Chiu, R. Jain — https://www.cse.wustl.edu/~jain/papers/ftp/cong_av.pdf — 1989.
5. *TCP Vegas: End to End Congestion Avoidance on a Global Internet* — L. Brakmo, L. Peterson, IEEE
   JSAC — https://ieeexplore.ieee.org/document/464716 — 1995.
6. *Adaptive Concurrency* HTTP filter — Envoy documentation —
   https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/adaptive_concurrency_filter —
   accessed 2026-10-19.
7. *Cinnamon Auto-Tuner: Adaptive Concurrency in the Wild* and *Cinnamon: Using Century Old Tech to
   Build a Mean Load Shedder* — Uber Engineering —
   https://www.uber.com/blog/cinnamon-auto-tuner-adaptive-concurrency-in-the-wild/ — 2023.
8. *Fail at Scale* — Ben Maurer, ACM Queue — https://queue.acm.org/detail.cfm?id=2839461 — 2015.
9. *Controlling Queue Delay* — K. Nichols, V. Jacobson, ACM Queue —
   https://queue.acm.org/detail.cfm?id=2209336 — 2012.
10. *Site Reliability Engineering*, ch. 21 "Handling Overload" (client-side throttling, criticality)
    — Google — https://sre.google/sre-book/handling-overload/ — 2016.

Books:
11. [B20] *Systems Performance*, 2nd ed. — Gregg — ch. 2 "Methodologies" (queueing theory,
    saturation, USE method).
12. [B19] *Release It!*, 2nd ed. — Nygard — ch. 5 "Governor", "Shed Load".
13. [B16] *Site Reliability Engineering* — ch. 21–22 (overload and cascading failures).

Repos:
14. [G13] mfornos/awesome-microservices — resilience libraries incl. concurrency limiters —
    https://github.com/mfornos/awesome-microservices.
15. [G11] binhnguyennus/awesome-scalability — overload/stability posts —
    https://github.com/binhnguyennus/awesome-scalability.
