# SLO-based alerting and burn rates — research note

- Level: L6 (deepens `observability-and-slos`)
- Feeds lessons: `l6-slo-alerting` (background for `l6-safe-deployments`, `l6-incident-debugging`)
- Builds on: `observability-and-slos`, `percentiles-and-tail-latency`, `availability-and-spof`
- Researched: 2026-10-19

## Key facts (in our words)

1. **Alert on what users feel.** Page a human when a user-visible symptom (errors, latency, missing
   data) threatens the service-level objective, not for every cause (high CPU, one dead replica)
   that may or may not hurt users. Causes belong on dashboards. [1][2][11]
2. **Four properties of an alert**: precision (how many alerts were real), recall (how many real
   problems alerted), detection time and reset time (how long it keeps firing after the problem
   ends). Simple threshold alerts trade these off badly. [3]
3. **Error budget** = 1 − SLO over a window: a 99.9% 30-day SLO allows 0.1% bad events, about 43
   minutes of full outage. [3][12]
4. **Burn rate** is how fast the budget is being consumed relative to "exactly on budget". Burn rate
   1 uses the whole budget in the window; burn rate 10 uses it in a tenth of the window. [3][4]
5. **Multiwindow, multi-burn-rate alerts** are the workbook's recommended design: page if 2% of a
   30-day budget burns in 1 hour (burn rate 14.4) or 5% in 6 hours (burn rate 6); open a ticket if
   10% burns in 3 days (burn rate 1). Each long window is paired with a short window (e.g. 5 minutes
   for the 1-hour alert) that must also be over threshold, so the alert stops soon after recovery. [3]
6. **Why long windows**: a fast-burn short spike that will not threaten the SLO should not wake
   anyone; a slow burn over days must still be noticed before the budget is gone. [3][4]
7. **Low-traffic services are hard.** With few requests, one failure is a large percentage; options
   include synthetic traffic, aggregating services, or longer windows. [3]
8. **Error budget policies close the loop.** When the budget is exhausted, the team agrees in advance
   to slow or freeze risky releases and spend effort on reliability; when budget remains, it can be
   spent on velocity. [5][12]
9. **Every page should be actionable and urgent.** If the response is "wait and see" or a
   script could do it, it is not a page. Too many pages cause alert fatigue and real alerts get
   ignored. [1][6]
10. **Cloud monitoring products implement burn-rate alerts directly** (for example Google Cloud's
    SLO monitoring lets you alert on burn rate over a lookback window). [4]
11. **Alerts need runbooks and owners**: a link to what to check first and who escalates shortens
    detection-to-mitigation time. [2][13]

## Numbers worth remembering

- 99.9% / 30 days → ~43 min budget; 99.99% → ~4.3 min. [12]
- Page: 14.4× over 1 h (+5 min short window) or 6× over 6 h (+30 min); ticket: 1× over 3 days
  (+6 h). [3]
- Burn rate 14.4 for 1 h = 2% of a 30-day budget (14.4 × 1 h ÷ 720 h). [3]

## Engine mapping

- Reading lesson. A future experiment could replay a run's per-tick error rate through alert rules
  (static threshold vs burn-rate) and score precision/recall/detection time — proposed gap
  `alert-evaluation` (evaluate alert rules over a run's time series). Metrics needed: per-tick
  availability/latency series, which the engine already produces internally.

## Misconceptions

- "Alert when CPU > 80%." Cause, not symptom; often harmless. [1]
- "Alert when error rate > SLO threshold for 1 minute." Very noisy, poor precision. [3]
- "More alerts = more reliable." Alert fatigue makes it less. [6]
- "SLO 100% is the goal." No budget means no change; users cannot tell beyond a point. [12]

## Analogy ideas

- A monthly mobile data plan: burn rate is how fast you are using your gigabytes; using a fifth of
  the month's data in one evening is worth a text alert, a slightly heavy week is worth a note.

## Caveats

- Thresholds are the workbook's starting points for a 30-day window; adjust for your SLO.

## Sources

Primary:
1. *Site Reliability Engineering*, ch. 6 "Monitoring Distributed Systems" (symptoms vs causes, four
   golden signals) — Google — https://sre.google/sre-book/monitoring-distributed-systems/ — 2016.
2. *My Philosophy on Alerting* — Rob Ewaschuk, Google —
   https://docs.google.com/document/d/199PqyG3UsyXlwieHaqbGiWVa8eMWi8zzAn0YfcApr8Q/preview — 2013.
3. *The Site Reliability Workbook*, ch. 5 "Alerting on SLOs" — Google —
   https://sre.google/workbook/alerting-on-slos/ — 2018.
4. *Alerting on your burn rate* — Google Cloud Observability docs —
   https://cloud.google.com/stackdriver/docs/solutions/slo-monitoring/alerting-on-budget-burn-rate —
   accessed 2026-10-19.
5. *Example Error Budget Policy* — The Site Reliability Workbook, Appendix B —
   https://sre.google/workbook/error-budget-policy/ — 2018.
6. *Alerting rules* — Prometheus docs —
   https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/ — accessed 2026-10-19.
7. *Implementing SLOs* — The Site Reliability Workbook, ch. 2 — https://sre.google/workbook/implementing-slos/ — 2018.
8. *Sloth* (generates multiwindow multi-burn-rate Prometheus rules) — slok/sloth —
   https://github.com/slok/sloth — accessed 2026-10-19.

Books:
11. [B16] *Site Reliability Engineering* — ch. 6 "Monitoring Distributed Systems".
12. [B22] *Implementing Service Level Objectives* — Hidalgo — ch. 4 (error budgets) and ch. 8
    "SLO Monitoring and Reporting" (burn-rate alerting).
13. [B21] *Observability Engineering* — Majors, Fong-Jones, Miranda — ch. 12 "Using Service-Level
    Objectives for Reliability" and ch. 13 "Acting on and Debugging SLO-Based Alerts".
14. [B17] *The Site Reliability Workbook* — ch. 5.

Repos:
15. [G14] upgundecha/howtheysre — company SLO and alerting practices — https://github.com/upgundecha/howtheysre.
16. [G15] dastergon/awesome-sre — monitoring and alerting reading list — https://github.com/dastergon/awesome-sre.
