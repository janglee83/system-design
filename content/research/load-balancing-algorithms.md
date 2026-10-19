# Load-balancing algorithms — research note

- Level: L1
- Feeds lessons: `l1-lb-algorithms`; background for `l4-consistent-hashing`
- Researched: 2026-10-18

## Key facts (in our words)

1. **Round robin**: hand requests to backends in turn. Default in NGINX, HAProxy and AWS ALB.
   Good when requests cost about the same and servers are alike. [1][2][3]
2. **Weighted round robin**: give stronger servers a bigger share. [1][2]
3. **Least connections / least outstanding requests**: send to the backend with the fewest
   requests in progress. Better when request cost varies or servers differ in speed. [1][3]
4. **Hashing (IP hash, URI hash, generic hash)**: the same key always lands on the same backend
   — useful for caches and affinity; plain modulo hashing reshuffles almost everything when the
   server count changes, which consistent hashing avoids. [1][2][5]
5. **Power of two random choices**: pick two backends at random and use the less loaded. In
   queueing theory this gives an exponential improvement over one random choice, and three
   choices add only a constant factor more. HAProxy and NGINX offer it. [4][1][2]
6. **Why round robin fails at scale**: at Google some queries cost 1,000× more CPU than others and
   machines differ, so equal counts produce unequal load; they moved to weighted schemes driven
   by backend-reported utilization. [6]
7. **The fast-failing backend trap**: least-loaded algorithms can pour traffic into a broken
   server that answers errors quickly ("sinkholing"); health checks and error-aware weights
   counter it. [6]

## How this maps to the engine

- `lb.config.algorithm` ∈ `round-robin | least-conn` exists in 1a, but 1a forwards equally to all
  children with an instance up, and instances of one node are identical. The algorithm therefore
  makes no visible difference yet.
- A meaningful experiment needs (a) per-instance heterogeneity, e.g. `instance-slow` (planned 1b),
  and (b) the LB algorithm actually reacting to per-instance queue length. (b) is not described in
  the spec → engine gap `lb-algorithm-effect`.

## Misconceptions

- "Round robin = perfectly even load." (Even counts, uneven work. [6])
- "Least connections is always best." (Sinkholing by fast failures. [6])
- "Hash on anything and add servers freely." (Modulo hashing remaps most keys. [5])

## Analogy ideas (ours)

- Supermarket lanes: walking to lanes in order (round robin) vs joining the shortest line (least
  connections) vs glancing at two lanes and picking the shorter (two choices).

## Sources

1. *HTTP Load Balancing* — NGINX documentation —
   https://docs.nginx.com/nginx/admin-guide/load-balancer/http-load-balancer/ — accessed
   2026-10-18.
2. *HAProxy Configuration Manual* (`balance` keyword) — HAProxy Technologies —
   https://www.haproxy.com/documentation/haproxy-configuration-manual/latest/ — accessed
   2026-10-18.
3. *Edit target group attributes for your Application Load Balancer* (routing algorithm) — AWS
   documentation —
   https://docs.aws.amazon.com/elasticloadbalancing/latest/application/edit-target-group-attributes.html
   — accessed 2026-10-18.
4. *The Power of Two Choices in Randomized Load Balancing* — Michael Mitzenmacher, IEEE
   Transactions on Parallel and Distributed Systems 12(10) —
   https://www.eecs.harvard.edu/~michaelm/postscripts/tpds2001.pdf — 2001.
5. *Site Reliability Engineering*, ch. 19 "Load Balancing at the Frontend" — Piotr Lewandowski,
   Google — https://sre.google/sre-book/load-balancing-frontend/ — 2016.
6. *Site Reliability Engineering*, ch. 20 "Load Balancing in the Datacenter" — Alejandro Forero
   Cuervo, Google — https://sre.google/sre-book/load-balancing-datacenter/ — 2016.
7. *Maglev: A Fast and Reliable Software Network Load Balancer* (consistent hashing for
   connection tracking) — D. E. Eisenbud et al., NSDI '16 —
   https://www.usenix.org/conference/nsdi16/technical-sessions/presentation/eisenbud — 2016.
