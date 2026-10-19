# Cost as a design constraint — research note

- Level: L0 (intro), L6 (deep)
- Feeds lessons: `l0-cost-basics`; background for `l6-cost-tradeoffs`, every challenge budget
- Researched: 2026-10-18

## Key facts (in our words)

1. **Cost is a first-class requirement.** AWS's cost pillar defines a cost-optimized workload as
   one that meets its requirements at the lowest price point, fully using what it pays for. [1]
2. **Right-size; do not buy for a fantasy peak.** Match capacity to demand, measure efficiency,
   and pay only for what you need; elasticity (scaling in and out) is the cloud lever. [1][2]
3. **Headroom is not waste — idle overkill is.** A sensible target (e.g. ~50% CPU) leaves room for
   spikes; running at 15% around the clock pays for capacity you never use. [2]
4. **Reliability has a price curve.** Every extra nine costs more than the previous one; pick the
   availability users actually need. [3][4]
5. **Software and tuning can beat hardware.** Stack Overflow handled 61 M more requests/day in
   2016 than in 2013 while spending fewer CPU hours in the web tier, thanks to hardware refresh
   and code optimisation. [5]
6. **Unit cost thinking.** Useful numbers: cost per month, cost per 1,000 requests, cost per
   user. They let you compare designs fairly. [1]

## How this maps to the engine

- `costPerMonth` metric = sum of node costs. Defaults (game-world prices, plan 1a): web
  $22.5 per vCPU per instance, LB $25 per replica, PostgreSQL $180 per instance (each replica
  counts). Overridable via `webCostPerVcpu`, `lbCostPerReplica`, `pgCostPerInstance` and per
  node `costPerMonth` (spec §6.7) — useful for "other cloud prices" presets.
- Scratch-model check, 12,000 rps, one web server: 1 vCPU ($22.5) overloaded (p95 ≈ 485 ms);
  2 vCPU ($45) p95 ≈ 6.5 ms; 3 vCPU ($67.5) p95 ≈ 4.1 ms; 8 vCPU ($180) p95 ≈ 2.9 ms.

## Misconceptions

- "Bigger is always safer, so buy the biggest." (Pays 4× for ~3 ms nobody notices.)
- "Cheapest that runs is best." (Fails at peak; outages cost more.)
- "Cost is the finance team's problem." (Architecture choices fix most of the bill. [1])

## Analogy ideas (ours)

- Renting a bus to drive four friends to dinner: everyone arrives, but you paid for 46 empty
  seats. Renting a scooter: cheap, until three friends cannot come.

## Sources

1. *Cost Optimization Pillar — AWS Well-Architected Framework* — Amazon Web Services —
   https://docs.aws.amazon.com/wellarchitected/latest/cost-optimization-pillar/welcome.html —
   2024-06-27.
2. *Target tracking scaling policies for Amazon EC2 Auto Scaling* — AWS documentation —
   https://docs.aws.amazon.com/autoscaling/ec2/userguide/as-scaling-target-tracking.html —
   accessed 2026-10-18.
3. *Site Reliability Engineering*, ch. 3 "Embracing Risk" — Marc Alvidrez, Google / O'Reilly —
   https://sre.google/sre-book/embracing-risk/ — 2016.
4. *Reliability Pillar: Availability* (section "Costs for availability") — Amazon Web Services
   — https://docs.aws.amazon.com/wellarchitected/latest/reliability-pillar/availability.html —
   accessed 2026-10-18.
5. *Stack Overflow: The Architecture – 2016 Edition* — Nick Craver —
   https://stackoverflow.blog/2016/02/17/stack-overflow-the-architecture-2016-edition/ —
   2016-02-17.
6. *The Tail at Scale* (running hotter without over-provisioning) — J. Dean, L. A. Barroso,
   CACM 56(2) — https://research.google/pubs/pub40801/ — 2013.
