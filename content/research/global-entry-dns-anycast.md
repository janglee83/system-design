# Getting users to the right front door: DNS balancing and anycast — research note

- Level: L1
- Feeds lessons: `l1-dns-and-global-entry`; background for `l6-geo-routing`
- Researched: 2026-10-18

## Key facts (in our words)

1. **DNS load balancing**: a name returns several addresses, or different addresses for different
   users. It is cheap and global, but clients and resolvers cache answers, so control is coarse and
   changes are slow. [1]
2. **Resolvers hide the user.** The authoritative server sees the recursive resolver, not the user,
   so "nearest" is a guess. Low TTLs help propagate changes but cannot force caches. [1][2]
3. **Virtual IPs and network LBs.** Behind one public address (VIP), a fleet of network load
   balancers spreads packets; Google's Maglev runs on commodity servers, receives traffic via ECMP
   and uses consistent hashing so connections stay put when the fleet changes. [1][3]
4. **Anycast**: the same IP is announced from many locations and Internet routing (BGP) delivers
   each user to a topologically close one. It gives low latency, automatic failover when a site
   withdraws its route, and spreads DDoS traffic. [4]
5. **Managed LBs combine both:** DNS returns LB node addresses with a 60 s TTL, and the nodes then
   choose healthy targets. [5]

## How this maps to the engine

- No DNS or multi-site entry in the engine; `reading+check`. Multi-region and geo-routing
  experiments in L6 need regions → engine gap `regions-and-geo-routing` (also listed for L6).

## Misconceptions

- "Lowering TTL to 1 s makes DNS failover instant." (Caches and clients may not honour it. [1])
- "Anycast means one server." (One address, many sites. [4])

## Sources

1. *Site Reliability Engineering*, ch. 19 "Load Balancing at the Frontend" — Piotr Lewandowski,
   Google — https://sre.google/sre-book/load-balancing-frontend/ — 2016.
2. *RFC 1034: Domain Names — Concepts and Facilities* — P. Mockapetris, IETF —
   https://www.rfc-editor.org/rfc/rfc1034 — 1987.
3. *Maglev: A Fast and Reliable Software Network Load Balancer* — D. E. Eisenbud et al., USENIX
   NSDI '16 — https://www.usenix.org/conference/nsdi16/technical-sessions/presentation/eisenbud
   — 2016.
4. *What is Anycast?* — Cloudflare Learning Center —
   https://www.cloudflare.com/learning/cdn/what-is-anycast/ — accessed 2026-10-18; and *A Brief
   Primer on Anycast* — Matthew Prince, Cloudflare Blog — https://blog.cloudflare.com/a-brief-anycast-primer/ —
   2011-10-21.
5. *How Elastic Load Balancing works* (request routing, TTL 60 s) — AWS documentation —
   https://docs.aws.amazon.com/elasticloadbalancing/latest/userguide/how-elastic-load-balancing-works.html
   — accessed 2026-10-18.
6. *DNS server types* — Cloudflare Learning Center —
   https://www.cloudflare.com/learning/dns/dns-server-types/ — accessed 2026-10-18.
