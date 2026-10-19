# Cell-based architecture and shuffle sharding — research note

- Level: L6
- Feeds lessons: `l6-cells-and-blast-radius` (challenge `c-l6-noisy-neighbor`)
- Builds on: `circuit-breakers-bulkheads-fallbacks`, `sharding`, `multi-region-and-geo-routing`,
  `safe-deployments`
- Researched: 2026-10-19

## Key facts (in our words)

1. **Blast radius is the share of users a single failure can hurt.** Redundancy protects against a
   box failing; it does not protect against a bad deploy, a poison request or a noisy customer that
   hits every box. Isolation designs limit how far one problem can spread. [1][2]
2. **A cell is a complete, independent copy of the service** (its own compute, data and
   dependencies) serving a subset of customers; a thin routing layer maps each customer to a cell.
   A failure or bad change inside one cell affects only that cell's customers. [2][3]
3. **Cells cap size and make scaling predictable.** Each cell has a maximum size that has been load
   tested; growth means adding cells, not growing one system without limit. [2][11]
4. **Deploy cell by cell.** Rolling changes through cells in waves (with bake time) means a bad
   change is caught while it affects a few percent of customers. [2][4]
5. **The router must be simple and very reliable**, because it is shared by all cells; it should
   hold minimal logic and state (a mapping), and keep working if the mapping service is down
   (static stability). [2][5]
6. **Slack moved to a cellular architecture** after incidents in which problems in one
   availability zone degraded the whole service; it reorganised services so traffic could be
   drained away from an impaired zone ("cell") quickly. [6]
7. **Shuffle sharding gives each customer a random small subset of workers.** With 8 workers and
   shards of 2, there are 28 possible pairs; a poison customer that kills its two workers only fully
   affects customers with exactly the same pair. AWS Route 53 assigns each hosted zone four of 2,048
   virtual name servers, giving about 730 billion combinations, so one customer under attack shares
   its full set with almost nobody. [1]
8. **Shuffle sharding needs fault-tolerant clients.** It only helps if clients retry on another
   worker in their shard when one fails, so partial overlap means degraded, not down. [1]
9. **Azure calls the same idea "deployment stamps"**: repeatable units of infrastructure each serving
   a set of tenants, used for scale, isolation and data residency. [7]
10. **Cost of cells**: duplicated fixed overhead per cell, cross-cell features (search across all
    customers, a customer moving cells) become harder, and very large customers may not fit a cell.
    [2][3]
11. **Bulkheads are the small-scale version**: separate thread pools or connection pools per
    dependency inside one service; cells apply the same principle at the level of whole stacks. [12]

## Numbers worth remembering

- Shuffle shards: C(n, k) combinations; n = 8, k = 2 → 28; n = 2,048, k = 4 → ~7.3 × 10¹¹. [1]
- Blast radius with c equal cells ≈ 1/c of customers per cell failure (e.g. 20 cells → 5%).

## Engine mapping

- Proposed gap `cells-and-shuffle-sharding`: multiple identical stacks (cells) with a router mapping
  client groups to cells or to shuffle shards, a `poison-tenant` / noisy-neighbour fault that
  overloads or crashes the instances serving one tenant, and metrics for share of clients affected
  (proposed `clientsAffectedShare`) alongside `availability`.

## Misconceptions

- "More replicas means a smaller blast radius." Not when the failure is in the shared code or
  config. [1][2]
- "Cells are just shards." Shards split data; cells split the entire stack including compute and
  dependencies. [2]
- "The router is a detail." It is the one shared component; keep it trivial. [2][5]

## Analogy ideas

- A ship divided into watertight compartments: one breach floods one compartment, not the ship.
- Shuffle sharding is like giving each family a different random pair of doctors: if two doctors
  fall sick, very few families lose both.

## Caveats

- Route 53 numbers come from AWS's description of its own system.

## Sources

Primary:
1. *Workload isolation using shuffle-sharding* — Colm MacCárthaigh, Amazon Builders' Library —
   https://aws.amazon.com/builders-library/workload-isolation-using-shuffle-sharding/ — 2019.
2. *Reducing the Scope of Impact with Cell-Based Architecture* (whitepaper) — AWS Well-Architected —
   https://docs.aws.amazon.com/wellarchitected/latest/reducing-scope-of-impact-with-cell-based-architecture/reducing-scope-of-impact-with-cell-based-architecture.html — 2023.
3. *Guidance for Cell-Based Architecture on AWS* — AWS Solutions —
   https://aws.amazon.com/solutions/guidance/cell-based-architecture-on-aws/ — accessed 2026-10-19.
4. *Automating safe, hands-off deployments* — Clare Liguori, Amazon Builders' Library —
   https://aws.amazon.com/builders-library/automating-safe-hands-off-deployments/ — 2020.
5. *Static stability using Availability Zones* — Amazon Builders' Library —
   https://aws.amazon.com/builders-library/static-stability-using-availability-zones/ — 2020.
6. *Slack's Migration to a Cellular Architecture* — Cooper Bethea, Slack Engineering —
   https://slack.engineering/slacks-migration-to-a-cellular-architecture/ — 2023.
7. *Deployment Stamps pattern* — Microsoft Azure Architecture Center —
   https://learn.microsoft.com/en-us/azure/architecture/patterns/deployment-stamp — accessed 2026-10-19.
8. *Physalia: Millions of Tiny Databases* — M. Brooker, T. Chen, F. Ping, NSDI —
   https://www.usenix.org/conference/nsdi20/presentation/brooker — 2020.

Books:
11. [B39] *The Art of Scalability*, 2nd ed. — Abbott, Fisher — AKF scale cube (Z-axis splits by
    customer) and "fault isolation / swim lanes" chapters.
12. [B19] *Release It!*, 2nd ed. — Nygard — ch. 5 "Bulkheads".
13. [B4] *Understanding Distributed Systems*, 2nd ed. — Vitillo — part "Resiliency" (bulkhead,
    cellular architecture, shuffle sharding).

Repos:
14. [G19] MicrosoftDocs/architecture-center — deployment stamps and bulkhead pattern sources —
    https://github.com/MicrosoftDocs/architecture-center.
15. [G11] binhnguyennus/awesome-scalability — availability/isolation posts —
    https://github.com/binhnguyennus/awesome-scalability.
