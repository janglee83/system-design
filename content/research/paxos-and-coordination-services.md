# Paxos, ZooKeeper, Chubby and coordination services — research note

- Level: L6
- Feeds lessons: `l6-paxos-and-friends`
- Builds on: `consensus-raft`, `failure-detection-and-leader-election`, `distributed-job-scheduler`
- Researched: 2026-10-19

## Key facts (in our words)

1. **Basic Paxos decides one value in two phases.** Proposers pick a unique, increasing proposal
   number; in phase 1 (prepare/promise) a majority of acceptors promise to ignore lower numbers and
   report any value they already accepted; in phase 2 (accept) the proposer asks them to accept a
   value — the highest-numbered one already reported, or its own if none. A value accepted by a
   majority is chosen. [1][10]
2. **Multi-Paxos** runs Paxos for each log slot but keeps a stable leader so phase 1 is done once and
   each command needs only phase 2 — very close to Raft in practice. [1][3][11]
3. **The protocol is short; the system is not.** Google's "Paxos Made Live" reports that turning
   Paxos into Chubby's replicated database needed many extensions (master leases, snapshots,
   membership changes, disk corruption handling) and heavy testing. [2]
4. **Flexible Paxos**: phase-1 and phase-2 quorums only need to intersect each other, not be
   majorities each, opening trade-offs between leader-election cost and commit cost. [4]
5. **Chubby is a lock service built on Paxos.** A cell of typically five replicas elects a master;
   clients hold sessions kept alive by KeepAlive messages and take coarse-grained locks, mainly to
   elect leaders (GFS, Bigtable) and store small configuration files. [5]
6. **ZooKeeper offers primitives, not locks.** It exposes a tree of small data nodes (znodes) with
   ephemeral nodes (deleted when the client's session ends), sequential nodes (a counter appended to
   the name) and watches (one-time change notifications). Writes go through the leader and the Zab
   atomic broadcast protocol; reads are served locally by any server and may be stale. [6][7]
7. **Recipes are built on top.** Leader election: each candidate creates an ephemeral sequential
   node; the lowest number leads, and each other node watches only its predecessor, avoiding a herd
   effect when the leader leaves. Locks and barriers follow the same pattern. [8]
8. **etcd and Consul offer the same role with Raft**: small key-value store, leases with TTLs,
   watch streams and compare-and-swap transactions; Kubernetes keeps all cluster state in etcd. [9]
9. **Locks from a coordination service still need fencing.** A client may pause after its session
   expires and act on a lock it no longer holds; ZooKeeper's zxid or etcd's revision can serve as a
   fencing token that the protected resource checks. [12][13]
10. **Use a coordination service for small, critical, rarely-changing state**: who is leader, cluster
    membership, configuration, partition ownership. It is not a general database: data sizes are
    small (ZooKeeper's default per-znode limit is about 1 MB) and every write is a consensus round.
    [6][7]

## Numbers worth remembering

- Chubby cell: 5 replicas, tolerates 2 failures. [5]
- ZooKeeper: designed for read-dominated workloads (reads served locally); znode data limit ~1 MB
  by default. [6][7]
- Ensemble sizes 3/5 as with Raft.

## Engine mapping

- Mostly a reading lesson. Its future experiment (leader election via a coordination service vs a
  homemade "first to write a row" scheme) reuses gaps `leader-election-leases` and
  `consensus-replication`; metric `writeConflicts`/proposed `splitBrain`.

## Misconceptions

- "Paxos and Raft solve different problems." Same problem and guarantees; Raft fixes more of the
  engineering choices. [1][11]
- "ZooKeeper reads are always up to date." Followers can lag; use `sync` first if needed. [7]
- "Holding a distributed lock makes my writes safe." Not without fencing. [12]
- "Use ZooKeeper as the app database." It is for coordination metadata. [6]

## Analogy ideas

- Paxos phase 1 is "promise you won't listen to anyone with an older ticket number"; phase 2 is
  "then agree to this".
- ZooKeeper's ephemeral node is a name badge that disappears when you leave the building.

## Caveats

- Our Paxos summary omits liveness issues (duelling proposers), which the lesson should mention
  only as "a stable leader avoids them".

## Sources

Primary:
1. *Paxos Made Simple* — Leslie Lamport — https://lamport.azurewebsites.net/pubs/paxos-simple.pdf — 2001.
2. *Paxos Made Live — An Engineering Perspective* — T. Chandra, R. Griesemer, J. Redstone, PODC —
   https://research.google/pubs/pub33002/ — 2007.
3. *Paxos Made Moderately Complex* — R. van Renesse, D. Altinbuken, ACM Computing Surveys —
   https://www.cs.cornell.edu/home/rvr/Paxos/paxos.pdf — 2015.
4. *Flexible Paxos: Quorum intersection revisited* — H. Howard, D. Malkhi, A. Spiegelman —
   https://arxiv.org/abs/1608.06696 — 2016.
5. *The Chubby lock service for loosely-coupled distributed systems* — M. Burrows, OSDI —
   https://research.google/pubs/the-chubby-lock-service-for-loosely-coupled-distributed-systems/ — 2006.
6. *ZooKeeper: Wait-free coordination for Internet-scale systems* — P. Hunt, M. Konar,
   F. Junqueira, B. Reed, USENIX ATC — https://www.usenix.org/legacy/event/atc10/tech/full_papers/Hunt.pdf — 2010.
7. *ZooKeeper Programmer's Guide* (znodes, ephemeral/sequential nodes, watches, consistency
   guarantees) — Apache ZooKeeper — https://zookeeper.apache.org/doc/current/zookeeperProgrammers.html —
   accessed 2026-10-19.
8. *ZooKeeper Recipes and Solutions* — Apache ZooKeeper —
   https://zookeeper.apache.org/doc/current/recipes.html — accessed 2026-10-19.
9. *etcd API guarantees and concurrency (leases, watches, transactions)* — etcd —
   https://etcd.io/docs/v3.5/learning/api/ — accessed 2026-10-19.

Books:
10. [B5] *Distributed Systems*, 4th ed. — van Steen, Tanenbaum — ch. 8 "Fault tolerance" (Paxos,
    consensus in faulty systems).
11. [B3] *Database Internals* — Petrov — ch. 14 "Consensus" (Paxos, Multi-Paxos, Fast/Flexible
    Paxos, Raft comparison).
12. [B1] *Designing Data-Intensive Applications* — Kleppmann — ch. 8 (fencing tokens) and ch. 9
    "Membership and coordination services".
13. [B6] *Patterns of Distributed Systems* — Joshi — "Paxos", "Lease", "Consistent Core".

Repos:
14. [G29] dgryski/awesome-consensus — https://github.com/dgryski/awesome-consensus.
15. [G33] tlaplus/Examples — Paxos specifications — https://github.com/tlaplus/Examples.
16. [G21] jhuangtw/xg2xg — Chubby → ZooKeeper/etcd mapping — https://github.com/jhuangtw/xg2xg.
