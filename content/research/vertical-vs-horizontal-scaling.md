# Vertical vs horizontal scaling — research note

- Level: L1
- Feeds lessons: `l1-vertical-scaling`, `l1-vertical-limits`, `l1-horizontal-scaling`
- Researched: 2026-10-18

## Key facts (in our words)

1. **Vertical scaling ("scale up")** = give one machine more CPU, memory or disk. Simple: no code
   change, no new moving parts. [1][2]
2. **It has a ceiling.** Even the biggest cloud machines stop somewhere: AWS's largest
   high-memory instance (u7in-32tb.224xlarge) has 896 vCPUs and 32 TiB of memory. Long before that
   ceiling, price per unit of capacity often rises and the machine is still one failure domain.
   [3][1]
3. **Horizontal scaling ("scale out")** = add more machines and split the work. It needs
   something to split traffic (a load balancer) and servers that do not keep private state
   between requests. [4][5]
4. **Scaling up can carry you surprisingly far.** Stack Overflow in 2016 served ~209 M HTTP
   requests/day from 11 web servers and 4 SQL servers, preferring a small number of powerful
   machines plus careful code. [6]
5. **Scale out buys redundancy as a side effect.** With N copies behind a load balancer, losing
   one leaves N−1 working; with one big box, losing it is an outage. [5][7]
6. **Typical evolution:** one server → bigger server → separate database → several web servers
   behind a load balancer → caches, replicas, CDN. Google's NALSD exercise follows the same
   pattern of iterating from a single machine to a distributed design as numbers demand. [8]

## How this maps to the engine

- Vertical: `web-server.config.cpu` 1–16 (cost scales linearly, $22.5/vCPU by default).
- Horizontal: `replicas` on the web node behind an `lb` node.
- Scratch-model checks (1a formulas): 150,000 rps on one 16-vCPU server (144k rps max) → overloaded,
  p95 ≈ 68 ms with rejections; same load on 2 LB replicas + 10 × 2-vCPU web → still fails because
  2 LB replicas only carry 120k rps (each 60k) — a good "the balancer has a capacity too" moment.
- The 16-vCPU cap is an engine choice (config schema), standing in for the real hardware ceiling.

## Misconceptions

- "Scale out is always better." (More moving parts; small systems often do fine scaled up. [6])
- "Scale up has no limit if you pay." (Hardware ceiling, plus single failure domain. [3])
- "Adding servers is enough." (They need a splitter and stateless design. [4][5])

## Analogy ideas (ours)

- A bakery: buy a bigger oven (vertical) until there is no bigger oven; then open more ovens and
  hire someone to hand out the orders (horizontal + load balancer).

## Sources

1. *Designing Data-Intensive Applications*, ch. 1 ("Approaches for Coping with Load") — Martin
   Kleppmann, O'Reilly — 2017.
2. *Regions and Zones* (Amazon EC2 User Guide) — AWS —
   https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/using-regions-availability-zones.html —
   accessed 2026-10-18.
3. *Amazon EC2 High Memory U7i Instances for large in-memory databases* — AWS News Blog —
   https://aws.amazon.com/blogs/aws/amazon-ec2-high-memory-u7i-instances-for-large-in-memory-databases/
   — 2024 (u7in sizes up to 32 TiB, 896 vCPUs).
4. *The Twelve-Factor App, VI. Processes* — Adam Wiggins — https://12factor.net/processes — 2011.
5. *How Elastic Load Balancing works* — AWS documentation —
   https://docs.aws.amazon.com/elasticloadbalancing/latest/userguide/how-elastic-load-balancing-works.html
   — accessed 2026-10-18.
6. *Stack Overflow: The Architecture – 2016 Edition* — Nick Craver —
   https://stackoverflow.blog/2016/02/17/stack-overflow-the-architecture-2016-edition/ —
   2016-02-17.
7. *Reliability Pillar: Availability* (redundant components) — AWS —
   https://docs.aws.amazon.com/wellarchitected/latest/reliability-pillar/availability.html —
   accessed 2026-10-18.
8. *The Site Reliability Workbook*, ch. 12 "Non-Abstract Large System Design" — S. Virji et al.,
   Google — https://sre.google/workbook/non-abstract-design/ — 2018.
