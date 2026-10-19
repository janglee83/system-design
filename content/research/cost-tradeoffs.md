# Cost trade-offs in system design — research note

- Level: L6 (builds on L0 `cost-basics`)
- Feeds lessons: `l6-cost-tradeoffs` (challenge `c-l6-cost-cut`, capstone budget goals)
- Builds on: `cost-basics`, `capacity-planning`, `availability-and-spof`
- Researched: 2026-10-19

## Key facts (in our words)

1. **Cost is a design requirement with a unit.** Total bills matter less than unit cost — cost per
   request, per active user, per order, per GB stored — because unit cost shows whether growth makes
   the business healthier or sicker. The FinOps practice centres on such unit economics and on
   making engineers see the cost of their choices. [1][2]
2. **Purchase model is a lever as large as architecture.** On AWS, Savings Plans/Reserved Instances
   trade a 1- or 3-year commitment for discounts of up to about 72%; Spot capacity costs up to about
   90% less but can be reclaimed with a two-minute warning, so it suits stateless, interruptible
   work. [3][4]
3. **Right-size before you buy discounts.** Over-provisioned instances, idle environments and
   forgotten resources are the usual first savings; commit only to the steady baseline you are sure
   of, and leave peaks to on-demand or autoscaling. [2][5]
4. **Data transfer is a hidden line item.** Egress to the internet and traffic between zones or
   regions are billed per GB; architectures that copy data across regions or chat across zones pay
   for it continuously. CDNs cut origin egress. [6][11]
5. **Storage has tiers.** Object stores offer classes from frequently-accessed to archive with lower
   storage price but retrieval fees and delays; lifecycle rules move old data down automatically. [7]
6. **Each extra nine costs more than the last.** Going from 99.9% to 99.99% usually needs more
   redundancy, more regions and more engineering; the SRE approach is to pick the availability users
   need and spend the remaining error budget on velocity. [8][12]
7. **Managed vs self-run.** Managed services trade a higher unit price for less operations work;
   at large, stable scale some companies find owning hardware cheaper. 37signals estimated saving
   about $7 million over five years by moving steady workloads from the cloud to their own
   servers — while acknowledging the cloud's value for variable or early-stage workloads. [9]
8. **Architecture style changes cost shape.** Amazon Prime Video's monitoring team reported cutting
   infrastructure cost by about 90% by moving one high-throughput workflow from many serverless
   functions and orchestration steps to a single process — fine-grained services add per-call and
   data-passing costs at high volume. [10]
9. **Total cost of ownership includes people.** Warehouse-scale computing analyses split cost into
   capital (servers, buildings) and operating (power, people) expenses; cheaper hardware that needs
   more engineers can be more expensive overall. [13]
10. **Make cost visible per team and per feature.** Tagging resources, showback/chargeback and cost
    dashboards next to latency dashboards lead to better trade-offs than quarterly surprises. [1][5]
11. **Trade-off moves to know**: cache vs database spend, CDN vs origin egress, fewer larger
    instances vs many small ones (bin-packing and failure blast radius), async batch vs real time,
    retention periods for logs and metrics, sampling of traces. [5][11][14]

## Numbers worth remembering

- Savings Plans: up to ~72% off on-demand; Spot: up to ~90% off, 2-minute interruption notice. [3][4]
- Cost of a nine: each step roughly multiplies redundancy and operational effort (no fixed ratio).
- Lab assumption: prices in the engine are game-world numbers (`webCostPerVcpu`, etc.), not real
  cloud prices.

## Engine mapping

- `ready-1a`: `costPerMonth` with calibration overrides (`webCostPerVcpu`, `pgCostPerInstance`,
  `lbCostPerReplica`) lets the lesson compare right-sizing and redundancy choices against `p95` and
  `availability` (`c-l6-cost-cut`).
- Proposed gaps: `pricing-models` (on-demand / committed / spot with interruption fault) and
  `bandwidth-egress-model` (shared with the video note) to teach the purchase-model and egress
  levers in experiments.

## Misconceptions

- "Cheapest instance wins." Unit cost at the SLO matters, plus failure headroom. [2][13]
- "Commit to reserved capacity for everything." Commit to the baseline only. [3][5]
- "Serverless/microservices are always cheaper." Depends on volume and call patterns. [10]
- "Cost is finance's problem." Engineers make the decisions that set the bill. [1]

## Analogy ideas

- Renting vs leasing vs owning a car: daily rental for occasional trips (on-demand), a lease for the
  daily commute (commitment), a cheap standby car that the owner can reclaim (spot).

## Caveats

- Provider discounts and prices change; quote percentages as "up to" and date them. Company
  savings claims (37signals, Prime Video) are self-reported.

## Sources

Primary:
1. *FinOps Framework* (principles, unit economics) — FinOps Foundation —
   https://www.finops.org/framework/ — accessed 2026-10-19.
2. *Cost Optimization Pillar — AWS Well-Architected Framework* — AWS —
   https://docs.aws.amazon.com/wellarchitected/latest/cost-optimization-pillar/welcome.html — accessed 2026-10-19.
3. *Compute Savings Plans / Savings Plans overview* — AWS — https://aws.amazon.com/savingsplans/ —
   accessed 2026-10-19.
4. *Amazon EC2 Spot Instances* — AWS — https://aws.amazon.com/ec2/spot/ — accessed 2026-10-19.
5. *Cost optimization design principles* — Microsoft Azure Well-Architected Framework —
   https://learn.microsoft.com/en-us/azure/well-architected/cost-optimization/principles — accessed 2026-10-19.
6. *Amazon EC2 On-Demand pricing — data transfer* — AWS — https://aws.amazon.com/ec2/pricing/on-demand/ —
   accessed 2026-10-19.
7. *Amazon S3 storage classes* — AWS — https://aws.amazon.com/s3/storage-classes/ — accessed 2026-10-19.
8. *Site Reliability Engineering*, ch. 3 "Embracing Risk" — Google —
   https://sre.google/sre-book/embracing-risk/ — 2016.
9. *We stand to save $7m over five years from our cloud exit* — David Heinemeier Hansson, HEY World —
   https://world.hey.com/dhh/we-stand-to-save-7m-over-five-years-from-our-cloud-exit-53996caa — 2023.
10. *Scaling up the Prime Video audio/video monitoring service and reducing costs by 90%* — Marcin
    Kolny, Prime Video Tech (as reported by) —
    https://www.primevideotech.com/video-streaming/scaling-up-the-prime-video-audio-video-monitoring-service-and-reducing-costs-by-90 — 2023.

Books:
11. [B38] *Web Scalability for Startup Engineers* — Ejsmont — ch. 3 "Building the Front-End Layer"
    (CDN offload) and ch. 6 "Caching".
12. [B16] *Site Reliability Engineering* — ch. 3 "Embracing Risk" (cost of availability).
13. [B25] *The Datacenter as a Computer*, 3rd ed. — Barroso, Hölzle, Ranganathan — ch. 6 "Modeling
    Costs" (capex, opex, TCO).
14. [B17] *The Site Reliability Workbook* — ch. 12 NALSD (estimating the cost of a design).

Repos:
15. [G20] upgundecha/howtheyaws — company talks on running and paying for AWS —
    https://github.com/upgundecha/howtheyaws.
16. [G11] binhnguyennus/awesome-scalability — cost and efficiency posts —
    https://github.com/binhnguyennus/awesome-scalability.
