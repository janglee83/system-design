# Observability, SLOs, error budgets and burn-rate alerting — research note

- Level: L3 (basics, SLOs), L6 (alerting)
- Feeds lessons: `l3-observability-basics`, `l3-slos-error-budgets`, `l6-slo-alerting`
- Researched: 2026-10-19

## Key facts (in our words)

1. **Three signal types**: metrics (cheap numeric time series), logs (discrete events with detail),
   traces (one request's path across services, with timing per hop). [1][2]
2. **Distributed tracing** propagates a trace id through calls; Google's Dapper sampled requests to
   keep overhead low — the basis of today's OpenTelemetry. [3][2]
3. **What to watch**: Google's four golden signals (latency, traffic, errors, saturation); the USE
   method for resources (utilization, saturation, errors); the RED method for services (rate, errors,
   duration). [4][5][6]
4. **Use histograms, not averages, for latency**, and aggregate them correctly (Prometheus histograms
   vs summaries). [7]
5. **SLI → SLO → error budget.** An SLO of 99.9% leaves a 0.1% budget; teams spend it on releases and
   experiments and slow down when it is gone. [8][4]
6. **Alert on symptoms users feel, not every cause.** The SRE workbook recommends multi-window,
   multi-burn-rate alerts: page when the budget burns fast (e.g. 2% in an hour), ticket when it burns
   slowly. [9]
7. **High-cardinality events** (many dimensions per request) let you ask new questions during an
   incident; this is the core argument of "observability" vs fixed dashboards. [10]

## Engine mapping

- 1a gives metrics, timeline frames, ~300 sampled traces and events → `l3-observability-basics` runs
  on 1a (diagnose the slow hop with **Follow request**). SLO/burn-rate lessons are reading+check;
  burn-rate needs long time windows the 10 s engine does not model.

## Misconceptions

- "More dashboards = more observability." [10]
- "Alert on CPU > 80%." Alert on user-facing symptoms. [4][9]
- "Average latency is a fine SLI." [7][8]

## Sources

Primary:
1. *Observability primer* — OpenTelemetry docs — https://opentelemetry.io/docs/concepts/observability-primer/
   — accessed 2026-10-19.
2. *Traces* — OpenTelemetry docs — https://opentelemetry.io/docs/concepts/signals/traces/ — accessed 2026-10-19.
3. *Dapper, a Large-Scale Distributed Systems Tracing Infrastructure* — B. Sigelman et al., Google
   Technical Report — https://research.google/pubs/pub36356/ — 2010.
4. *Site Reliability Engineering*, ch. 6 "Monitoring Distributed Systems" — Rob Ewaschuk, Google —
   https://sre.google/sre-book/monitoring-distributed-systems/ — 2016.
5. *The USE Method* — Brendan Gregg — https://www.brendangregg.com/usemethod.html — 2017.
6. *The RED Method: How to Instrument Your Services* — Tom Wilkie, Grafana Labs —
   https://grafana.com/blog/2018/08/02/the-red-method-how-to-instrument-your-services/ — 2018.
7. *Histograms and summaries* — Prometheus docs — https://prometheus.io/docs/practices/histograms/ —
   accessed 2026-10-19.
8. *Site Reliability Engineering*, ch. 4 "Service Level Objectives" — Google —
   https://sre.google/sre-book/service-level-objectives/ — 2016.
9. *The Site Reliability Workbook*, ch. 5 "Alerting on SLOs" — Steven Thurgood et al., Google —
   https://sre.google/workbook/alerting-on-slos/ — 2018.

Books:
10. [B21] *Observability Engineering* — Majors, Fong-Jones, Miranda — part I (what observability is),
    part on SLO-based alerting.
11. [B22] *Implementing Service Level Objectives* — Hidalgo — SLIs, error budgets, burn rates.
12. [B17] *The Site Reliability Workbook* — ch. 2 "Implementing SLOs", ch. 5.

Repos:
13. [G14] upgundecha/howtheysre — company SLO and monitoring practices —
    https://github.com/upgundecha/howtheysre.
14. [G15] dastergon/awesome-sre — monitoring and SLO section — https://github.com/dastergon/awesome-sre.
