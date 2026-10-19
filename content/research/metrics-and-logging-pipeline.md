# Metrics and logging pipelines — research note

- Level: L5 (design), background for L6 observability
- Feeds lessons: `l5-metrics-pipeline` (background: `l6-observability-at-scale`, `l6-incident-debugging`)
- Builds on: `observability-and-slos`, `queues-and-workers`, `distributed-message-queue`
- Researched: 2026-10-19

## Key facts (in our words)

1. **Metrics are time series identified by a name and labels.** In Prometheus a series is a metric
   name plus a set of key=value labels; every distinct label combination is a new series, so a
   label such as `user_id` can explode the number of series ("cardinality") and the memory needed.
   [1][2]
2. **Pull vs push.** Prometheus scrapes (pulls) targets on an interval, which makes "is the target
   up?" a by-product; push-based systems (agents → collector) suit short-lived jobs and firewalls.
   Either way an agent or SDK aggregates locally before sending. [1][3][11]
3. **Time-series compression is very effective.** Facebook's Gorilla stores timestamps as
   delta-of-deltas and values as XOR against the previous value, averaging about 1.37 bytes per
   data point instead of 16, which let it keep 26 hours of data in memory. [4]
4. **Storage is organised by time blocks.** Prometheus' local TSDB keeps recent samples in memory
   with a write-ahead log and cuts two-hour blocks to disk, later compacted into larger blocks;
   retention deletes whole blocks. [5]
5. **A buffer in the middle absorbs bursts.** Large pipelines put a durable log (Kafka) between
   collectors and storage, so a slow or down database does not drop data; consumers aggregate,
   downsample and write. [6][12]
6. **Downsample old data.** Raw 10 s resolution may be kept for days, 1-minute rollups for weeks,
   1-hour rollups for a year; queries over long ranges read rollups. Uber's M3 used tiered
   namespaces with different resolutions and retentions. [7]
7. **Global query at planet scale.** Google's Monarch keeps recent monitoring data in memory in
   regional zones and answers global queries by fanning out and merging, favouring availability
   over consistency for monitoring data. [8]
8. **Logs are different: big, unstructured, rarely read.** Full-text indexing every log line (the
   Elasticsearch approach) gives fast search but costs storage and CPU; Grafana Loki indexes only a
   small set of labels and stores compressed log chunks in object storage, scanning chunks at query
   time. [9][13]
9. **Alerting reads from the pipeline.** Alert rules evaluate queries periodically; pipeline lag
   delays alerts, so monitoring must itself be monitored (meta-monitoring), ideally from outside. [3][11]
10. **Sampling and aggregation trade detail for cost.** Counters and histograms aggregate at the
    source; traces and debug logs are sampled; high-cardinality detail is better kept in structured
    events or traces than in metric labels. [2][14]
11. **Loss tolerance differs by signal.** Losing a few metric samples is acceptable; losing audit
    logs or billing events is not — they need at-least-once delivery and durable storage. [6][12]

## Numbers worth remembering

- Gorilla: ~1.37 bytes/point; 12× compression. [4]
- Prometheus block: 2 h; default retention 15 days (local). [5]
- 10,000 hosts × 500 series × 1 sample/10 s = 500,000 samples/s (derived planning example).

## Engine mapping

- Planned `queue`/`worker`/`object-storage` and `broker-down` give buffering, lag and loss.
- Gap `event-log-stream`: a partitioned durable log with retention and consumer lag, so
  `broker-down` and slow consumers show lag instead of loss.
- Proposed gap `cardinality-cost`: series count from label choices driving memory and cost of a
  metrics store; useful for `l6-observability-at-scale`.

## Misconceptions

- "Put the user id in a metric label." Cardinality explodes. [2]
- "Write every metric straight into the database." A burst or DB outage drops data; buffer. [6]
- "Keep raw data forever." Downsample and expire. [5][7]
- "Logs and metrics are the same pipeline." Different volume, query patterns and loss tolerance. [9]

## Analogy ideas

- A weather station network: each station records every 10 s; the national archive keeps hourly
  averages for decades.

## Caveats

- Default retention and block sizes are Prometheus defaults and can be changed.

## Sources

Primary:
1. *Prometheus — Data model* — Prometheus docs — https://prometheus.io/docs/concepts/data_model/ —
   accessed 2026-10-19.
2. *Metric and label naming* (cardinality warning) — Prometheus docs —
   https://prometheus.io/docs/practices/naming/ — accessed 2026-10-19.
3. *Site Reliability Engineering*, ch. 10 "Practical Alerting from Time-Series Data" — Google —
   https://sre.google/sre-book/practical-alerting/ — 2016.
4. *Gorilla: A Fast, Scalable, In-Memory Time Series Database* — T. Pelkonen et al., VLDB —
   https://www.vldb.org/pvldb/vol8/p1816-teller.pdf — 2015.
5. *Prometheus — Storage* — Prometheus docs — https://prometheus.io/docs/prometheus/latest/storage/ —
   accessed 2026-10-19.
6. *Kafka: a Distributed Messaging System for Log Processing* — J. Kreps, N. Narkhede, J. Rao,
   NetDB — https://notes.stephenholiday.com/Kafka.pdf — 2011.
7. *M3: Uber's Open Source, Large-scale Metrics Platform for Prometheus* — Uber Engineering —
   https://www.uber.com/blog/m3/ — 2018.
8. *Monarch: Google's Planet-Scale In-Memory Time Series Database* — C. Adams et al., VLDB —
   https://www.vldb.org/pvldb/vol13/p3181-adams.pdf — 2020.
9. *Grafana Loki overview* — Grafana Labs — https://grafana.com/docs/loki/latest/get-started/overview/ —
   accessed 2026-10-19.

Books:
11. [B16] *Site Reliability Engineering* — ch. 6 "Monitoring Distributed Systems" and ch. 10.
12. [B34] *Kafka: The Definitive Guide*, 2nd ed. — Shapira et al. — ch. 1 (use cases: metrics and
    log aggregation) and ch. 7 "Reliable Data Delivery".
13. [B41] *System Design Interview*, vol. 2 — Xu, Lam — "Metrics Monitoring and Alerting System"
    (topic map only).
14. [B21] *Observability Engineering* — Majors, Fong-Jones, Miranda — ch. 2 (metrics vs structured
    events, cardinality) and ch. 17 (sampling).

Repos:
15. [G37] oxnr/awesome-bigdata — time-series databases and log tools — https://github.com/oxnr/awesome-bigdata.
16. [G15] dastergon/awesome-sre — monitoring reading list — https://github.com/dastergon/awesome-sre.
