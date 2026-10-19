# Observability at scale: tracing, sampling, cardinality and cost — research note

- Level: L6 (deepens `observability-and-slos`)
- Feeds lessons: `l6-observability-at-scale` (background for `l6-incident-debugging`)
- Builds on: `observability-and-slos`, `metrics-and-logging-pipeline`
- Researched: 2026-10-19

## Key facts (in our words)

1. **Context propagation makes traces possible.** Each request carries a trace id and parent span
   id across process boundaries; the W3C Trace Context standard defines the `traceparent` HTTP
   header so different vendors and libraries interoperate. [1][2]
2. **Dapper showed tracing can run always-on in production** by being built into shared RPC
   libraries (no app changes) and sampling: Google traced a small fraction of requests (for example
   1 in 1,024) and still found latency problems, with negligible overhead. [3]
3. **Head vs tail sampling.** Head-based sampling decides at the start of a trace (cheap, but
   misses rare slow or failed requests); tail-based sampling buffers spans and decides after the
   trace completes, keeping all errors and slow traces — at the cost of buffering in a collector. [4]
4. **OpenTelemetry is the common instrumentation layer** for traces, metrics and logs, with SDKs,
   a wire protocol (OTLP) and a collector that can sample, batch and route data to any backend. [2][4]
5. **Cardinality is the cost driver for metrics.** Each unique label combination is a time series;
   adding a label with many values multiplies series. Metrics stay cheap by keeping labels bounded,
   while high-cardinality questions ("which customer?") go to traces or structured events. [5][11]
6. **Wide structured events** — one rich record per request with many fields (user, version, region,
   feature flags, timings) — let you slice by any dimension after the fact, which pre-aggregated
   metrics cannot. [11][12]
7. **Exemplars link metrics to traces.** OpenMetrics/Prometheus can attach a trace id to a histogram
   bucket sample, so a spike on a latency graph leads directly to an example slow trace. [6]
8. **Production tracing at Meta and Uber.** Meta's Canopy processes traces end to end (client,
   server, infrastructure) with flexible sampling and derived performance datasets; Uber built and
   open-sourced Jaeger. [7][8]
9. **Telemetry has a budget.** Logs, metrics and traces can cost a noticeable share of
   infrastructure spend; teams set retention per signal, sample debug logs, drop unused metrics and
   aggregate at the edge. [9][12]
10. **Observability must survive the incident.** If telemetry shares fate with the system (same
    network, same region), it goes dark exactly when needed; AWS's 2021 us-east-1 event and others
    show monitoring impaired by the same failure. [10][13]

## Numbers worth remembering

- Dapper sampling example: 1/1,024 requests. [3]
- Series count = product of label value counts per metric (e.g. 50 endpoints × 5 status codes ×
  200 hosts = 50,000 series for one metric).

## Engine mapping

- Reading lesson. Proposed gap `per-node-timeseries-and-traces` (shared with incident debugging) and
  `cardinality-cost` (shared with metrics pipeline) would allow experiments on sampling (which slow
  requests are kept) and label choices (cost).

## Misconceptions

- "Trace everything." Overhead and cost; sample smartly. [3][4]
- "Head sampling catches the problems." Rare errors are dropped; tail sampling keeps them. [4]
- "Put user id in metrics for debugging." Use traces/events for high-cardinality detail. [5][11]
- "Monitoring is always available." It can share fate with the outage. [10]

## Analogy ideas

- Parcel tracking numbers: every hand-off scans the same number (trace id); you do not photograph
  every parcel (sampling), but you keep every parcel that arrived late or damaged (tail sampling).

## Caveats

- Sampling rates and costs vary widely by organisation.

## Sources

Primary:
1. *Trace Context* (W3C Recommendation) — W3C — https://www.w3.org/TR/trace-context/ — 2021.
2. *OpenTelemetry — What is OpenTelemetry? / Concepts* — OpenTelemetry —
   https://opentelemetry.io/docs/concepts/ — accessed 2026-10-19.
3. *Dapper, a Large-Scale Distributed Systems Tracing Infrastructure* — B. Sigelman et al., Google —
   https://research.google/pubs/dapper-a-large-scale-distributed-systems-tracing-infrastructure/ — 2010.
4. *Sampling* (head and tail sampling) — OpenTelemetry docs —
   https://opentelemetry.io/docs/concepts/sampling/ — accessed 2026-10-19.
5. *Metric and label naming* (cardinality) — Prometheus docs —
   https://prometheus.io/docs/practices/naming/ — accessed 2026-10-19.
6. *Exemplars* — OpenMetrics / Prometheus feature flags docs —
   https://prometheus.io/docs/prometheus/latest/feature_flags/ — accessed 2026-10-19.
7. *Canopy: An End-to-End Performance Tracing and Analysis System* — J. Kaldor et al., SOSP —
   https://dl.acm.org/doi/10.1145/3132747.3132749 — 2017.
8. *Evolving Distributed Tracing at Uber Engineering* — Yuri Shkuro, Uber Engineering —
   https://www.uber.com/blog/distributed-tracing/ — 2017.
9. *Observability cost optimization / reduce data volume* — OpenTelemetry Collector processors docs —
   https://opentelemetry.io/docs/collector/ — accessed 2026-10-19.
10. *Summary of the AWS Service Event in the Northern Virginia (US-EAST-1) Region* — AWS —
    https://aws.amazon.com/message/12721/ — 2021.

Books:
11. [B21] *Observability Engineering* — Majors, Fong-Jones, Miranda — ch. 5 "Structured Events Are
    the Building Blocks of Observability", ch. 6 "Stitching Events into Traces", ch. 17 "Cheap and
    Accurate Enough: Sampling".
12. [B16] *Site Reliability Engineering* — ch. 6 "Monitoring Distributed Systems".
13. [B18] *Building Secure and Reliable Systems* — Adkins et al. — ch. 15 "Investigating Systems"
    (logging and debugging infrastructure).

Repos:
14. [G15] dastergon/awesome-sre — observability reading list — https://github.com/dastergon/awesome-sre.
15. [G14] upgundecha/howtheysre — tracing and monitoring at companies — https://github.com/upgundecha/howtheysre.
