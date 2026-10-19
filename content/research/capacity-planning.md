# Capacity planning — research note

- Level: L6 (builds on L0 estimation and L1 autoscaling)
- Feeds lessons: `l6-capacity-planning` (challenge `c-l6-cost-cut`, capstone)
- Builds on: `estimation-basics`, `queueing-and-utilization`, `autoscaling`, `throughput-and-capacity`
- Researched: 2026-10-19

## Key facts (in our words)

1. **Capacity planning = forecast demand, measure supply, provision the difference with headroom,
   in time.** The output is a plan: how many of which resources, where, by when, and the risk if
   the forecast is wrong. [1][2][11]
2. **Demand has organic and inorganic parts.** Organic growth follows adoption trends and seasons;
   inorganic growth comes from launches, marketing events, a new big customer or a feature that
   changes usage — these must come from talking to product and business teams, not only from
   graphs. [1][11]
3. **Measure capacity by load testing, not by spec sheets.** Push a service (or a share of real
   traffic) until a latency or error SLO breaks, record the throughput at that point, and plan to
   run below it. Facebook's Kraken shifted live traffic toward chosen servers and regions to find
   their real limits and bottlenecks safely. [3]
4. **Plan for failure capacity, not just peak.** The fleet must carry peak load after losing a
   failure domain (an instance, a zone, sometimes a region) and while some capacity is out for
   planned maintenance — hence rules like N+1 or N+2 (one planned outage plus one unplanned). [4][11][13]
5. **Keep utilisation targets below the knee.** Queueing delay rises steeply as utilisation
   approaches 100%; targets such as 60–70% at peak leave room for bursts and failover. Different
   resources (CPU, memory, connections, disk IOPS, bandwidth) saturate differently — check each
   (USE method: utilisation, saturation, errors). [5][12]
6. **Scaling is rarely linear.** Contention (serialised parts) and coherency costs (keeping copies in
   sync) make throughput flatten or even fall as nodes are added; Gunther's Universal Scalability
   Law models both, so measure at several sizes before extrapolating. [6]
7. **Lead time drives how early you decide.** Buying hardware or reserving cloud capacity can take
   weeks to months; even in the cloud, regional instance shortages, quotas and service limits need
   requests in advance. Autoscaling handles hours, not quarters. [7][8]
8. **Big events get a dedicated plan.** Retail peaks (Black Friday/Cyber Monday) and launches use
   explicit readiness work: load tests at a multiple of forecast peak, pre-scaling, freezes on risky
   changes, and runbooks. [7][9]
9. **Write the plan down as intent.** Google's Auxon let teams state requirements ("serve N queries
   at this latency in these regions with N+2") and solved for allocations, instead of hand-editing
   machine counts — capacity as a solvable model. [10]
10. **Revisit continuously.** Compare forecast with actual each month; growth, code efficiency and
    traffic mix change the per-request cost of serving. [1][11]

## Numbers worth remembering

- Required instances ≈ peak RPS ÷ (per-instance RPS at SLO × target utilisation), then add failure
  domain spare: e.g. 30,000 ÷ (1,000 × 0.7) = 43 → spread over 3 zones so losing one leaves ≥ 43 →
  65 total (derived example).
- Utilisation knee: an M/M/1-like server at 80% has 5× its service time in total response time;
  at 90%, 10×. [5][12]

## Engine mapping

- Runs on 1a (`ready-1a`): learners size web and postgres for a forecast surge, with `peakBusy`,
  `p95`, `costPerMonth`, and `instance-down` to check failure headroom; calibration overrides
  (`webRpsPerVcpu`, `pgQpsPerInstance`) represent "measured" capacity.
- `zones-and-zone-down-fault` gap would let N+1 per zone be tested properly.

## Misconceptions

- "Average load is what to plan for." Plan for peak plus failure. [4][11]
- "Cloud means capacity planning is over." Quotas, warm-up, regional shortages and cost still need
  plans. [7][8]
- "Double the servers, double the throughput." Contention and coherency say otherwise. [6]
- "Run hot to save money." Near 100% utilisation latency explodes. [5]

## Analogy ideas

- Planning a wedding venue: guest list forecast (organic), the cousin who brings friends
  (inorganic), chairs for everyone even if one room floods (N+1), and booking months ahead (lead
  time).

## Caveats

- Utilisation targets depend on workload variance and failover design; 60–70% is a common starting
  point, not a law.

## Sources

Primary:
1. *Site Reliability Engineering*, ch. 1 "Introduction" (demand forecasting and capacity planning)
   — Google — https://sre.google/sre-book/introduction/ — 2016.
2. *SRE Best Practices for Capacity Management* — L. Quesada Torres, D. Colish, USENIX ;login: —
   https://research.google/pubs/pub50108/ — 2020.
3. *Kraken: Leveraging Live Traffic Tests to Identify and Resolve Resource Utilization Bottlenecks
   in Large Scale Web Services* — K. Veeraraghavan et al., OSDI —
   https://www.usenix.org/conference/osdi16/technical-sessions/presentation/veeraraghavan — 2016.
4. *Static stability using Availability Zones* — Amazon Builders' Library —
   https://aws.amazon.com/builders-library/static-stability-using-availability-zones/ — 2020.
5. *The USE Method* — Brendan Gregg — https://www.brendangregg.com/usemethod.html — accessed 2026-10-19.
6. *Universal Scalability Law* — Neil Gunther, Performance Dynamics —
   http://www.perfdynamics.com/Manifesto/USLscalability.html — accessed 2026-10-19.
7. *Reliability pillar — Manage service quotas and constraints* — AWS Well-Architected —
   https://docs.aws.amazon.com/wellarchitected/latest/reliability-pillar/manage-service-quotas-and-constraints.html —
   accessed 2026-10-19.
8. *On-Demand Capacity Reservations* — Amazon EC2 docs —
   https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-capacity-reservations.html — accessed 2026-10-19.
9. *AWS Infrastructure Event Management* (planning for launches and peak events) — AWS —
   https://aws.amazon.com/premiumsupport/programs/iem/ — accessed 2026-10-19.
10. *Site Reliability Engineering*, ch. 18 "Software Engineering in SRE" (Auxon, intent-based
    capacity planning) — Google — https://sre.google/sre-book/software-engineering-in-sre/ — 2016.

Books:
11. [B17] *The Site Reliability Workbook* — ch. 11 "Managing Load" and ch. 12 "Introducing
    Non-Abstract Large System Design" (provisioning with redundancy and per-zone sizing).
12. [B20] *Systems Performance*, 2nd ed. — Gregg — ch. 2 "Methodologies" (capacity planning,
    queueing theory, scalability).
13. [B39] *The Art of Scalability*, 2nd ed. — Abbott, Fisher — chapters on headroom and capacity
    planning.

Repos:
14. [G15] dastergon/awesome-sre — capacity planning section — https://github.com/dastergon/awesome-sre.
15. [G14] upgundecha/howtheysre — company capacity/load-testing practices — https://github.com/upgundecha/howtheysre.
