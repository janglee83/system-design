# Consensus with Raft — research note

- Level: L6
- Feeds lessons: `l6-consensus-raft`
- Builds on: `failure-detection-and-leader-election`, `replication-strategies-and-quorums`,
  `cap-pacelc-consistency`
- Researched: 2026-10-19

## Key facts (in our words)

1. **Consensus = several machines agreeing on one value, then on a sequence of values.** A
   replicated state machine applies the same log of commands in the same order on every replica, so
   all replicas end in the same state. Consensus decides the log. [1][10]
2. **Majorities make it fault tolerant.** With 2f + 1 servers, Raft keeps working while any f are
   down: 3 servers tolerate 1 failure, 5 tolerate 2. Any two majorities overlap, so a decision
   cannot be forgotten. Even-sized clusters add cost without adding tolerance. [1][3]
3. **Raft splits the problem into leader election, log replication and safety.** It was designed to
   be easier to understand than Paxos while giving the same guarantees. [1][2]
4. **Leader election with randomised timeouts.** Followers expect heartbeats from the leader; if one
   hears nothing for its election timeout it becomes a candidate, increments the term and asks for
   votes. Randomising timeouts (the paper used 150–300 ms) makes split votes rare. A server votes
   at most once per term and only for candidates whose log is at least as up to date as its own. [1]
5. **Terms are logical clocks.** Every message carries a term; a server that sees a higher term
   steps down. Old leaders discover they are stale as soon as they talk to anyone. [1]
6. **Commit = stored on a majority.** The leader appends a client command to its log, replicates it
   with AppendEntries, and once a majority has stored it the entry is committed and can be applied
   and answered. The Log Matching property guarantees identical prefixes. [1]
7. **Unavailable without a majority — by design.** If a partition leaves no side with a majority, no
   new writes commit. Raft chooses consistency over availability (CP in CAP terms). [1][10]
8. **Timing requirement**: broadcast time ≪ election timeout ≪ mean time between failures. etcd
   defaults to a 100 ms heartbeat and a 1,000 ms election timeout and advises tuning them to the
   network's round-trip time. [1][4]
9. **Reads need care to be linearizable.** Reading from a leader that has been partitioned away can
   return stale data; Raft systems confirm leadership with a heartbeat round (ReadIndex) or rely on
   time-based leader leases. [2][5]
10. **Practical extensions**: Pre-Vote stops a rejoining partitioned node from disrupting the
    cluster with a higher term; joint consensus or single-server changes alter membership safely;
    snapshots compact the log. [2][5]
11. **Partial partitions still bite.** Cloudflare described an etcd-backed outage in 2020 where a
    switch failure let some nodes talk to some peers but not others, producing repeated elections
    and an outage of systems depending on the cluster. [6]
12. **FLP**: no deterministic algorithm can guarantee consensus in a fully asynchronous system with
    even one crash; real systems escape by using timeouts (partial synchrony), so they are always
    safe but only live when the network behaves. [7][10]
13. **Where Raft runs**: etcd (Kubernetes' store), Consul, CockroachDB and TiKV ranges, Kafka KRaft
    metadata, RabbitMQ quorum queues. Use it for small, critical state (config, leases, metadata),
    not as a bulk data path. [4][8]

## Numbers worth remembering

- Cluster sizes: 3 (tolerates 1) or 5 (tolerates 2); 7+ rarely worth the write latency. [3][4]
- Commit latency ≥ one round trip leader → majority + disk fsync.
- Failover time ≈ election timeout + one election round (≈ 1–2 s with etcd defaults). [4]

## Engine mapping

- Gap `consensus-replication`: a replicated-state-machine node group of size 3/5 with majority
  commit, leader election time after `instance-down` of the leader, and unavailability when a
  majority is lost or partitioned (`network-partition-fault`). Metrics: `availability`, `p99`
  (commit latency), proposed `leaderElections`.

## Misconceptions

- "Four nodes are safer than three." Majority of 4 is 3; still tolerates only 1 failure. [3]
- "Consensus makes the system always available." It stops writes without a majority. [1]
- "Any node can serve consistent reads." Only with ReadIndex/leases. [2]
- "Put all the data through Raft." It is for small, critical state; bulk data uses partitioned
  replication with Raft per partition. [8]

## Analogy ideas

- A club committee that only acts on a majority vote of its five members, and records every
  decision in a numbered minutes book that all members copy.

## Caveats

- Timeout numbers are paper/etcd examples; production values depend on network RTT and disk.

## Sources

Primary:
1. *In Search of an Understandable Consensus Algorithm (Extended Version)* — D. Ongaro,
   J. Ousterhout, USENIX ATC — https://raft.github.io/raft.pdf — 2014.
2. *Consensus: Bridging Theory and Practice* (PhD thesis: pre-vote, membership, leases) —
   D. Ongaro, Stanford — https://github.com/ongardie/dissertation — 2014.
3. *etcd FAQ* (why an odd number of members, cluster size) — etcd —
   https://etcd.io/docs/v3.5/faq/ — accessed 2026-10-19.
4. *etcd tuning* (heartbeat interval, election timeout) — etcd —
   https://etcd.io/docs/v3.5/tuning/ — accessed 2026-10-19.
5. *The Raft Consensus Algorithm* (site, visualisation, implementations) — raft.github.io —
   https://raft.github.io/ — accessed 2026-10-19.
6. *A Byzantine failure in the real world* — Tom Lianza, Chris Snook, Cloudflare Blog —
   https://blog.cloudflare.com/a-byzantine-failure-in-the-real-world/ — 2020.
7. *Impossibility of Distributed Consensus with One Faulty Process* — M. Fischer, N. Lynch,
   M. Paterson, JACM — https://dl.acm.org/doi/10.1145/3149.214121 — 1985.
8. *MIT 6.5840 Distributed Systems — Lab 3 Raft and lecture notes* — MIT —
   https://pdos.csail.mit.edu/6.824/ — 2026.

Books:
10. [B1] *Designing Data-Intensive Applications* — Kleppmann — ch. 9 "Consistency and Consensus"
    (total order broadcast, fault-tolerant consensus, limits of consensus).
11. [B3] *Database Internals* — Petrov — ch. 14 "Consensus" (Paxos family, Raft).
12. [B6] *Patterns of Distributed Systems* — Joshi — "Replicated Log", "Majority Quorum",
    "Generation Clock", "High-Water Mark".
13. [B47] *Distributed Systems* lecture notes — Kleppmann, Cambridge — lecture 6 "Consensus" (Raft).

Repos:
14. [G34] etcd-io/raft — production Raft library — https://github.com/etcd-io/raft.
15. [G29] dgryski/awesome-consensus — papers, talks and implementations — https://github.com/dgryski/awesome-consensus.
16. [G33] tlaplus/Examples — TLA+ specification of Raft — https://github.com/tlaplus/Examples.
