# Availability zones and failure domains — research note

- Level: L1
- Feeds lessons: `l1-availability-zones`; background for `l6-multi-region-basics`
- Researched: 2026-10-18

## Key facts (in our words)

1. **Regions and zones.** A cloud region is a separate geographic area; each region has several
   isolated *availability zones* (AZs). Putting instances in more than one AZ protects against
   the failure of a single location. [1]
2. **Failure domain = the set of things that fail together** (a rack, a power feed, a zone, a
   region, a software version). Redundancy only counts across failure domains. [2][3]
3. **Load balancers span zones.** ELB creates a node per enabled AZ; ALB requires at least two AZs.
   With cross-zone balancing on, every LB node can send to targets in every zone; off, each node
   uses only its own zone, which can unbalance load. [4]
4. **Losing a zone removes a fraction of capacity at once.** You must size each zone so the
   others can absorb its share (N+1 at the zone level). AWS recommends checking remaining zone
   capacity before shifting traffic away. [4][5]
5. **Independence assumption.** The "multiply failure probabilities" rule for redundant copies
   assumes independent failures; two copies in the same zone are not independent for zone
   events. [2]
6. **Regions are isolated from each other** and resources are not replicated across them
   automatically; going multi-region is a much bigger step (L6). [1]

## How this maps to the engine

- No zones in the engine. A meaningful experiment needs a `zone` attribute per instance or node
  and a correlated `zone-down` fault → engine gap `zones-and-zone-down-fault`.
- Partial workaround on 1a: two separate web nodes behind one LB, labelled "zone A/B", and
  repeated `instance-down` faults on one node. Clumsy; lesson stays `reading+check` until the gap
  is closed.

## Misconceptions

- "Two servers = redundant." (Not if they share a rack, zone or bug. [2])
- "Multi-AZ = multi-region." (Zones share a region and its control plane. [1])
- "Spreading across zones is free." (Cross-zone traffic and capacity headroom cost money. [4])

## Analogy ideas (ours)

- Keeping a spare house key at your neighbour's: helpful when you lose yours, useless if the
  whole street is flooded.

## Sources

1. *Regions and Zones* (Amazon EC2 User Guide) — AWS —
   https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/using-regions-availability-zones.html —
   accessed 2026-10-18.
2. *Reliability Pillar: Availability* — AWS —
   https://docs.aws.amazon.com/wellarchitected/latest/reliability-pillar/availability.html —
   accessed 2026-10-18.
3. *Availability and Beyond: Understanding and Improving the Resilience of Distributed Systems
   on AWS* — AWS whitepaper —
   https://docs.aws.amazon.com/whitepapers/latest/availability-and-beyond-improving-resilience/availability-and-beyond-improving-resilience.html
   — 2021-11-12.
4. *How Elastic Load Balancing works* (AZs, cross-zone) — AWS documentation —
   https://docs.aws.amazon.com/elasticloadbalancing/latest/userguide/how-elastic-load-balancing-works.html
   — accessed 2026-10-18.
5. *Edit target group attributes for your Application Load Balancer* (cross-zone best
   practices) — AWS documentation —
   https://docs.aws.amazon.com/elasticloadbalancing/latest/application/edit-target-group-attributes.html
   — accessed 2026-10-18.
6. *Site Reliability Engineering*, ch. 3 "Embracing Risk" — Marc Alvidrez, Google —
   https://sre.google/sre-book/embracing-risk/ — 2016.
