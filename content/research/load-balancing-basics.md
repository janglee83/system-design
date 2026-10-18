# Load balancing basics — research note

- Level: L1
- Feeds lessons: `l1-load-balancer-intro`, `l1-public-entry-point`, `l1-lb-redundancy`
- Researched: 2026-10-18

## Key facts (in our words)

1. **A load balancer (LB) is a single front door that spreads requests over many servers.** It
   accepts client traffic, picks a healthy backend for each request or connection, and forwards
   it. [1][2]
2. **It only sends to healthy targets.** The LB checks backend health and stops routing to a
   target that fails; it resumes when the target recovers. [1]
3. **Layer 4 vs layer 7.** Network (L4) balancers route TCP/UDP connections, often by hashing the
   connection 5-tuple, keeping one connection on one backend. Application (L7) balancers read HTTP
   and can route each request by path, header or cookie. [1][3]
4. **The LB itself must not be a single point of failure.** Managed LBs run nodes in several
   availability zones; clients get several node addresses via DNS. Software LBs such as Google's
   Maglev run as a fleet of ordinary servers, sharing traffic via ECMP routing and using
   consistent hashing so connections survive LB changes. [1][4]
5. **The LB is the public entry point; backends stay private.** Internet-facing LBs have public
   addresses; targets only need private ones. Multi-tier apps put an internal LB in front of
   application servers that only web servers reach. [1]
6. **An LB has a capacity too.** It is a server; enough traffic saturates it, which is why
   managed LBs scale their nodes and update DNS (60 s TTL). [1]
7. **DNS is the outermost balancer.** Before reaching any LB, DNS can already split users across
   addresses or regions, coarse-grained because of caching. [5]

## How this maps to the engine

- `lb` node, `replicas` = LB nodes (default capacity 60,000 rps each, 0.2 ms, $25/month). 
  `algorithm`: `round-robin | least-conn` (config exists in 1a; see algorithms note).
- A balancer skips children with zero instances up; with no children every request is
  `unreachable`.
- `exposedBackends` counts client edges that go to something other than an entry point
  (`lb`, `api-gateway`, `cdn`) — the metric for "backends stay private".
- `lb-node-down` removes one LB replica. Scratch-model check, 8,000 rps, LB ×1 → availability
  0.30 after the fault at 3 s; LB ×2 → 1.0.

## Misconceptions

- "The LB makes servers faster." (It adds a hop; it adds capacity only by letting you add servers.)
- "One LB in front removes all single points of failure." (Now the LB is one. [1][4])
- "Clients should be able to call any server directly too." (Exposes backends, bypasses health
  checks. [1])

## Analogy ideas (ours)

- The host at a busy restaurant: one person at the door who seats each group at a free table and
  skips tables whose waiter went home. If the host faints, nobody gets seated — so big
  restaurants have two hosts.

## Sources

1. *How Elastic Load Balancing works* — AWS documentation —
   https://docs.aws.amazon.com/elasticloadbalancing/latest/userguide/how-elastic-load-balancing-works.html
   — accessed 2026-10-18.
2. *HTTP Load Balancing* — NGINX documentation —
   https://docs.nginx.com/nginx/admin-guide/load-balancer/http-load-balancer/ — accessed
   2026-10-18.
3. *Site Reliability Engineering*, ch. 19 "Load Balancing at the Frontend" — Piotr Lewandowski,
   Google / O'Reilly — https://sre.google/sre-book/load-balancing-frontend/ — 2016.
4. *Maglev: A Fast and Reliable Software Network Load Balancer* — D. E. Eisenbud et al., USENIX
   NSDI '16 — https://www.usenix.org/conference/nsdi16/technical-sessions/presentation/eisenbud
   — March 2016.
5. *DNS server types* — Cloudflare Learning Center —
   https://www.cloudflare.com/learning/dns/dns-server-types/ — accessed 2026-10-18.
6. *HAProxy Configuration Manual* (`balance`, `check`) — HAProxy Technologies —
   https://www.haproxy.com/documentation/haproxy-configuration-manual/latest/ — accessed
   2026-10-18.
