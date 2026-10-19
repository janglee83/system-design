# Multiple regions and geo-routing — research note

- Level: L6
- Feeds lessons: `l6-multi-region-basics`, `l6-geo-routing` (challenge `c-l6-global-checkout-lite`)
- Builds on: `availability-zones-and-redundancy`, `global-entry-dns-anycast`, `latency-and-distance`,
  `cap-pacelc-consistency`
- Researched: 2026-10-19

## Key facts (in our words)

1. **Zone vs region.** An availability zone is one or more data centres with independent power and
   networking; a region is a separate geographic area containing several zones (AWS: at least
   three). Zones protect against a building failing; regions protect against a whole area failing
   and bring servers closer to distant users. [1][2]
2. **Three reasons to go multi-region**: latency for far-away users, surviving a regional outage, and
   data-residency rules that require some data to stay in a jurisdiction. Each adds cost and
   complexity, so many systems stay single-region with multiple zones. [2][3][12]
3. **Distance sets a floor on latency.** Light in fibre covers about 200 km per millisecond, so a
   transatlantic round trip is tens of milliseconds before any processing; a request that makes
   several cross-ocean round trips is slow however fast the servers are. [4][13]
4. **DNS-based routing chooses a region per user.** Amazon Route 53 offers latency-based routing
   (answer with the region that had the lowest measured latency for the resolver), geolocation and
   geoproximity routing, and failover routing that consults health checks. [5]
5. **DNS failover is limited by caching.** Resolvers and clients cache answers for the TTL (and some
   ignore short TTLs), so moving users away from a failed region takes at least that long. [5][14]
6. **Anycast gives one address everywhere.** Google Cloud's global external Application Load
   Balancer and AWS Global Accelerator announce the same IP from many edge locations; users enter
   the provider network at the nearest point and are routed to the closest healthy backend, with
   failover that does not wait for DNS caches. [6][7]
7. **Static stability: be ready before the failure.** AWS recommends designs that keep working
   during an impairment without needing to make changes (for example, already running enough
   capacity in the surviving zones or regions), because control planes are often the first thing
   to struggle during big events. [8]
8. **Region evacuation must be practised.** Netflix runs active-active in several AWS regions and
   built tooling to shift all traffic out of a region quickly; Project Nimble cut a full region
   evacuation from roughly 45 minutes to about 7 minutes, largely by keeping enough capacity
   already running in the other regions instead of scaling up during the event. [9][10]
9. **Stateless tiers are easy; data is the hard part.** Web servers can run in every region; the
   question is where the data lives and how writes reach it — single home region, active-passive
   replica, or multi-region writes (see `multi-region-writes`). [3][12]
10. **Cross-region traffic costs money.** Cloud providers charge for data transferred between
    regions, so chatty cross-region calls and full replication of everything have a running bill.
    [11]

## Numbers worth remembering

- Fibre: ~200 km/ms one way → ~1 ms RTT per 100 km of path. New York–London ≈ 5,600 km → ≥ 56 ms
  RTT; real paths ~70–80 ms. [4]
- DNS TTLs for failover records: typically 30–60 s; assume some clients take minutes. [5]
- Netflix region evacuation: ~45 min → ~7 min after Project Nimble. [10]

## Engine mapping

- Gap `regions-and-geo-routing`: region attribute per node, inter-region edge delay matrix, client
  population per region, routing policy (nearest / latency / failover / single region), DNS TTL
  delay before rerouting, and a `region-down` fault. Metrics: `p95` per region and `availability`.
- Proposed extension: `crossRegionBytes` cost so `costPerMonth` reflects inter-region transfer.

## Misconceptions

- "Two zones = disaster recovery." A regional event takes out all zones. [1][2]
- "Multi-region makes everything faster." Writes that must reach one home region get slower for
  far users. [3]
- "DNS failover is instant." TTL caching delays it. [5]
- "We can add regions later easily." Data placement decisions are hard to change. [12]

## Analogy ideas

- A bakery chain: shops in each city (regions) bake bread locally (stateless), but the secret recipe
  book (data) lives in one office unless you deliberately copy it.

## Caveats

- Provider products evolve; we cite them for the mechanism (latency routing, anycast), not for
  current limits or prices.

## Sources

Primary:
1. *Regions and Availability Zones* — AWS — https://aws.amazon.com/about-aws/global-infrastructure/regions_az/ —
   accessed 2026-10-19.
2. *AWS Fault Isolation Boundaries* (whitepaper) — AWS —
   https://docs.aws.amazon.com/whitepapers/latest/aws-fault-isolation-boundaries/abstract-and-introduction.html — 2022.
3. *Multi-Region fundamentals* (AWS Prescriptive Guidance) — AWS —
   https://docs.aws.amazon.com/prescriptive-guidance/latest/aws-multi-region-fundamentals/introduction.html — 2024.
4. *High Performance Browser Networking*, ch. 1 "Primer on Latency and Bandwidth" (speed of light in
   fibre, example round trips) — Ilya Grigorik, O'Reilly — https://hpbn.co/primer-on-latency-and-bandwidth/ — 2013.
5. *Choosing a routing policy* — Amazon Route 53 Developer Guide —
   https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/routing-policy.html — accessed 2026-10-19.
6. *External Application Load Balancer overview* — Google Cloud —
   https://cloud.google.com/load-balancing/docs/https — accessed 2026-10-19.
7. *What is AWS Global Accelerator?* — AWS —
   https://docs.aws.amazon.com/global-accelerator/latest/dg/what-is-global-accelerator.html — accessed 2026-10-19.
8. *Static stability using Availability Zones* — Becky Weiss, Mike Furr, Amazon Builders' Library —
   https://aws.amazon.com/builders-library/static-stability-using-availability-zones/ — 2020.
9. *Active-Active for Multi-Regional Resiliency* — Netflix Technology Blog —
   https://netflixtechblog.com/active-active-for-multi-regional-resiliency-c47719f6685b — 2013.
10. *Project Nimble: Region Evacuation Reimagined* — Netflix Technology Blog —
    https://netflixtechblog.com/project-nimble-region-evacuation-reimagined-d0d0568254d4 — 2018.
11. *Amazon EC2 On-Demand pricing — data transfer* — AWS — https://aws.amazon.com/ec2/pricing/on-demand/ —
    accessed 2026-10-19.

Books:
12. [B1] *Designing Data-Intensive Applications* — Kleppmann — ch. 5 "Replication", section
    "Multi-datacenter operation".
13. [B4] *Understanding Distributed Systems*, 2nd ed. — Vitillo — part "Communication" (DNS,
    latency) and "Scalability" (network load balancing, CDN).
14. [B16] *Site Reliability Engineering* — ch. 19 "Load Balancing at the Frontend" (DNS load
    balancing and its caching limits, anycast/VIPs).

Repos:
15. [G1] donnemartin/system-design-primer — "Availability patterns", "DNS" —
    https://github.com/donnemartin/system-design-primer.
16. [G3] karanpratapsingh/system-design — "Geohashing/DNS/Disaster recovery" chapters —
    https://github.com/karanpratapsingh/system-design.
