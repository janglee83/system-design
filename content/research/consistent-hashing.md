# Consistent hashing and virtual nodes — research note

- Level: L4
- Feeds lessons: `l4-consistent-hashing`, `l4-virtual-nodes` (challenge `c-l4-cache-ring`)
- Researched: 2026-10-19

## Key facts (in our words)

1. **Modulo hashing (`hash(key) % N`) remaps almost every key when N changes**, so adding or losing
   one cache server empties most of the cache. [1][8]
2. **Consistent hashing** places servers and keys on a ring; a key belongs to the next server
   clockwise. Adding or removing a server only moves the keys in its arc — about 1/N of them. Karger
   et al. introduced it for web caching. [1]
3. **Virtual nodes**: each physical server owns many points on the ring, smoothing load and spreading
   a failed server's keys over many others instead of one neighbour. Dynamo and Cassandra use them. [2][3]
4. **Jump consistent hash** maps keys to numbered buckets with no ring and minimal memory, but only
   supports adding/removing buckets at the end. [4]
5. **Bounded loads**: Google's consistent hashing with bounded loads caps each server's share;
   Vimeo used it to stop hot spots in its caching layer. [5][6]
6. **Maglev hashing** builds a lookup table for even spread and minimal disruption in network load
   balancers. [7]
7. **Used widely**: Memcached client libraries (ketama), Dynamo/Cassandra partitioning, load
   balancers. [2][3][7]

## Engine mapping

- `kv-store` and `kv-node-down` planned; the partitioning scheme and a "keys moved" metric are not →
  gap `partitioning-scheme`.

## Misconceptions

- "Consistent hashing balances load perfectly." Without virtual nodes, arcs differ a lot. [2][5]
- "It removes hot keys." A hot key still lives on one node. [5][8]

## Sources

Primary:
1. *Consistent Hashing and Random Trees* — D. Karger et al., STOC —
   https://www.cs.princeton.edu/courses/archive/fall09/cos518/papers/chash.pdf — 1997.
2. *Dynamo: Amazon's Highly Available Key-value Store* — G. DeCandia et al., SOSP —
   https://www.allthingsdistributed.com/files/amazon-dynamo-sosp2007.pdf — 2007.
3. *Dynamo (architecture): consistent hashing using a token ring* — Apache Cassandra docs —
   https://cassandra.apache.org/doc/latest/cassandra/architecture/dynamo.html — accessed 2026-10-19.
4. *A Fast, Minimal Memory, Consistent Hash Algorithm* — J. Lamping, E. Veach —
   https://arxiv.org/abs/1406.2294 — 2014.
5. *Consistent Hashing with Bounded Loads* — V. Mirrokni, M. Thorup, M. Zadimoghaddam —
   https://arxiv.org/abs/1608.01350 — 2016.
6. *Improving load balancing with a new consistent-hashing algorithm* — Andrew Rodland, Vimeo
   Engineering — https://medium.com/vimeo-engineering-blog/improving-load-balancing-with-a-new-consistent-hashing-algorithm-9f1bd75709ed — 2016.
7. *Maglev: A Fast and Reliable Software Network Load Balancer* — D. E. Eisenbud et al., NSDI —
   https://www.usenix.org/conference/nsdi16/technical-sessions/presentation/eisenbud — 2016.

Books:
8. [B1] *Designing Data-Intensive Applications* — ch. 6 "Partitioning" (partitioning by hash, why
   not mod N, rebalancing) — [B2] ch. 7.
9. [B6] *Patterns of Distributed Systems* — "Fixed Partitions", "Key-Range Partitions".
10. [B13] *Cassandra: The Definitive Guide*, 3rd ed. — rings, tokens and vnodes.

Repos:
11. [G4] ashishps1/awesome-system-design-resources — consistent hashing articles —
    https://github.com/ashishps1/awesome-system-design-resources.
12. [G1] donnemartin/system-design-primer — links under "Consistent hashing" —
    https://github.com/donnemartin/system-design-primer.
