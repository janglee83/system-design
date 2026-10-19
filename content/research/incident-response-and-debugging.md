# Incident response and debugging distributed systems — research note

- Level: L6
- Feeds lessons: `l6-incident-debugging` (challenge `c-l6-incident-room`, capstone diagnosis)
- Builds on: `observability-and-slos`, `slo-burn-rate-alerting`, `circuit-breakers-bulkheads-fallbacks`,
  `timeouts-retries-backoff`
- Researched: 2026-10-19

## Key facts (in our words)

1. **Mitigate first, explain later.** During an incident the priority is to stop user harm —
   roll back, drain a bad zone, disable a feature, shed load — even before the root cause is known;
   the full explanation comes in the postmortem. [1][2]
2. **Clear roles reduce chaos.** Google's incident management separates an incident commander
   (coordinates, delegates), operations lead (changes the system), communications lead (status
   updates) and planning; PagerDuty's public response guide describes the same structure. [1][3]
3. **Look at what changed.** Google's SRE book estimates that about 70% of outages are caused by
   changes to a live system (deploys, config pushes, data changes); the first question is "what
   changed just before?". [4]
4. **Start from symptoms and work down.** Use the golden signals (latency, traffic, errors,
   saturation) at the edge to see what users feel, then follow the request path; the RED method
   (rate, errors, duration) for services and the USE method (utilisation, saturation, errors) for
   resources make the search systematic. [5][6][7]
5. **Form hypotheses and test them.** Troubleshooting is the scientific method under pressure:
   observe, hypothesise, test (by looking at data or by a safe experiment), and avoid fixating on the
   first plausible cause; correlation with a timeline is not causation. [8][12]
6. **Traces localise latency.** A distributed trace shows where time went on one request's path;
   comparing slow and fast traces (or high-cardinality breakdowns by host, version, customer) finds
   what slow requests have in common. [9][13]
7. **Cascades and retries hide the trigger.** A small trigger (a slow dependency) can cause retries,
   queue growth and timeouts that keep the system overloaded after the trigger is gone — a
   "metastable failure"; recovery then needs load reduction (shedding, disabling retries), not just
   fixing the trigger. [10][14]
8. **Real examples**: a WAF rule with a regular expression that backtracked catastrophically
   exhausted CPU across Cloudflare's edge in 2019; a configuration change withdrew Facebook's BGP
   routes in 2021, taking DNS and internal tools offline at the same time; an automated scaling
   activity in AWS us-east-1 in 2021 triggered congestion on the internal network that also blinded
   monitoring. [15][16][17]
9. **Communicate on a schedule.** Regular, honest status updates (internal and external) reduce
   duplicate investigation and customer confusion. [1][3]
10. **Blameless postmortems produce learning.** Write the timeline, impact, contributing factors and
    action items without blaming individuals, because people hide information when they fear
    punishment. [11][18]

## Numbers worth remembering

- ~70% of outages come from changes (Google estimate). [4]
- Metrics during triage: MTTD (detect), MTTM (mitigate), MTTR (recover) — measure each separately.

## Engine mapping

- `needs-1b`: planned faults `db-stalled`, `cache-down`, `instance-slow`, `db-overloaded` give
  incidents to diagnose; `p95`, `availability` and per-node `peakBusy` are the evidence.
- Proposed gap `per-node-timeseries-and-traces`: expose per-node time series and sampled request
  traces to the learner (the run result today is mostly aggregate), so "where did it break?" can be
  answered from evidence rather than from the fault list.
- Proposed gap `metastable-retry-loop`: retries that keep the system overloaded after the fault
  clears (partly covered by `retry-jitter`).

## Misconceptions

- "Find the root cause before touching anything." Mitigate first. [1][2]
- "The component with the most errors is the culprit." It may be the victim of a slow dependency. [10]
- "Fixing the trigger ends the incident." Not in a metastable state. [10]
- "A postmortem names who made the mistake." Blameless, systemic. [11][18]

## Analogy ideas

- An emergency room: triage and stabilise the patient (mitigate), then run tests to diagnose,
  then review the case afterwards to improve procedures.

## Caveats

- Incident summaries are drawn from the companies' public reports and simplified.

## Sources

Primary:
1. *Site Reliability Engineering*, ch. 14 "Managing Incidents" — Google —
   https://sre.google/sre-book/managing-incidents/ — 2016.
2. *The Site Reliability Workbook*, ch. 9 "Incident Response" — Google —
   https://sre.google/workbook/incident-response/ — 2018.
3. *PagerDuty Incident Response Documentation* — PagerDuty — https://response.pagerduty.com/ —
   accessed 2026-10-19.
4. *Site Reliability Engineering*, ch. 1 "Introduction" (change management, ~70% of outages) —
   https://sre.google/sre-book/introduction/ — 2016.
5. *Site Reliability Engineering*, ch. 6 "Monitoring Distributed Systems" (four golden signals) —
   https://sre.google/sre-book/monitoring-distributed-systems/ — 2016.
6. *The RED Method: How to Instrument Your Services* — Tom Wilkie, Grafana Labs —
   https://grafana.com/blog/2018/08/02/the-red-method-how-to-instrument-your-services/ — 2018.
7. *The USE Method* — Brendan Gregg — https://www.brendangregg.com/usemethod.html — accessed 2026-10-19.
8. *Site Reliability Engineering*, ch. 12 "Effective Troubleshooting" —
   https://sre.google/sre-book/effective-troubleshooting/ — 2016.
9. *Dapper, a Large-Scale Distributed Systems Tracing Infrastructure* — B. Sigelman et al., Google
   Technical Report — https://research.google/pubs/dapper-a-large-scale-distributed-systems-tracing-infrastructure/ — 2010.
10. *Metastable Failures in Distributed Systems* — N. Bronson, A. Aghayev, A. Charapko, T. Zhu,
    HotOS — https://sigops.org/s/conferences/hotos/2021/papers/hotos21-s11-bronson.pdf — 2021.
11. *Blameless PostMortems and a Just Culture* — John Allspaw, Etsy Code as Craft —
    https://www.etsy.com/codeascraft/blameless-postmortems — 2012.
15. *Details of the Cloudflare outage on July 2, 2019* — John Graham-Cumming, Cloudflare Blog —
    https://blog.cloudflare.com/details-of-the-cloudflare-outage-on-july-2-2019/ — 2019.
16. *More details about the October 4 outage* — Santosh Janardhan, Engineering at Meta —
    https://engineering.fb.com/2021/10/05/networking-traffic/outage-details/ — 2021.
17. *Summary of the AWS Service Event in the Northern Virginia (US-EAST-1) Region* — AWS —
    https://aws.amazon.com/message/12721/ — 2021.

Books:
12. [B20] *Systems Performance*, 2nd ed. — Gregg — ch. 2 "Methodologies" (anti-methods, scientific
    method, USE, drill-down analysis).
13. [B21] *Observability Engineering* — Majors, Fong-Jones, Miranda — ch. 8 "Analyzing Events to
    Achieve Observability" (debugging from first principles, core analysis loop).
14. [B16] *Site Reliability Engineering* — ch. 22 "Addressing Cascading Failures".
18. [B16] *Site Reliability Engineering* — ch. 15 "Postmortem Culture: Learning from Failure".

Repos:
19. [G16] danluu/post-mortems — public incident reports by category — https://github.com/danluu/post-mortems.
20. [G14] upgundecha/howtheysre — incident response practices — https://github.com/upgundecha/howtheysre.
