# Failure detection, gossip, leader election and leases — research note

- Level: L4
- Feeds lessons: `l4-failure-detection`, `l4-gossip`, `l4-leader-election` (background for
  `l5-chat-presence`, `l5-job-scheduler`)
- Researched: 2026-10-19

## Key facts (in our words)

1. **Heartbeats + timeout = suspicion, not proof.** A short timeout detects failures fast but flags
   slow-but-alive nodes (false positives); a long one leaves dead nodes "alive" (stale state). [8][9]
2. **Phi-accrual detectors** output a suspicion level from the observed heartbeat distribution
   instead of a yes/no; Cassandra uses one. [1]
3. **SWIM** detects failures with randomised probes and indirect probes through other members, and
   piggybacks membership updates on those messages so load per node stays constant. [2]
4. **Gossip** spreads state by repeatedly telling a few random peers; information reaches all N nodes
   in O(log N) rounds. HashiCorp's memberlist and Cassandra use gossip for membership. [3][1]
5. **Leader election** picks one node to coordinate. Raft elects by majority vote with randomised
   timeouts; ZooKeeper offers an election recipe using sequential ephemeral nodes. [4][5]
6. **Leases** give a leader authority for a bounded time; Chubby's locks are leases. [6]
7. **Split brain and fencing**: a paused old leader may wake up still believing it holds the lock.
   Fencing tokens (monotonically increasing numbers checked by the storage) stop its writes. [7][9]
8. **Presence systems** are failure detectors for users: heartbeat interval and offline-after timeout
   trade flapping against stale "online" dots. [10]

## Engine mapping

- `presence` behavior (heartbeat interval, offline-after timeout, connection drops; metrics
  `statusFlaps`, `staleOnline`) is planned → `l4-failure-detection` needs 1b only. Gossip → gap
  `gossip-membership`; elections/leases/split brain → gaps `leader-election-leases`,
  `network-partition-fault`.

## Misconceptions

- "Shorter timeout = better detection." [8]
- "Only one node can think it is leader." Not without fencing. [7][9]
- "Gossip is slow." Logarithmic rounds reach thousands of nodes quickly. [2][3]

## Sources

Primary:
1. *Dynamo (architecture): gossip and failure detection* — Apache Cassandra docs —
   https://cassandra.apache.org/doc/latest/cassandra/architecture/dynamo.html — accessed 2026-10-19.
2. *SWIM: Scalable Weakly-consistent Infection-style Process Group Membership Protocol* —
   A. Das, I. Gupta, A. Motivala, DSN — https://www.cs.cornell.edu/projects/Quicksilver/public_pdfs/SWIM.pdf — 2002.
3. *memberlist* (README) — HashiCorp, GitHub — https://github.com/hashicorp/memberlist — accessed 2026-10-19.
4. *In Search of an Understandable Consensus Algorithm (Extended Version)* — D. Ongaro,
   J. Ousterhout — https://raft.github.io/raft.pdf — 2014.
5. *ZooKeeper Recipes and Solutions: Leader Election* — Apache ZooKeeper —
   https://zookeeper.apache.org/doc/current/recipes.html — accessed 2026-10-19.
6. *The Chubby lock service for loosely-coupled distributed systems* — Mike Burrows, OSDI —
   https://research.google/pubs/pub27897/ — 2006.
7. *How to do distributed locking* — Martin Kleppmann —
   https://martin.kleppmann.com/2016/02/08/how-to-do-distributed-locking.html — 2016.
10. *Now You See Me, Now You Don't: LinkedIn's Real-Time Presence Platform* — Akhilesh Gupta,
    LinkedIn Engineering — https://engineering.linkedin.com/blog/2018/01/now-you-see-me--now-you-dont--linkedins-real-time-presence-platf — 2018.

Books:
8. [B3] *Database Internals* — ch. 9 "Failure Detection", ch. 10 "Leader Election", ch. 12 (gossip).
9. [B1] *Designing Data-Intensive Applications* — ch. 8 ("The leader and the lock", fencing tokens)
   ([B2] ch. 9).
11. [B6] *Patterns of Distributed Systems* — "HeartBeat", "Lease", "Gossip Dissemination",
    "Generation Clock".

Repos:
12. [G34] etcd-io/raft — leader election implementation notes — https://github.com/etcd-io/raft.
13. [G25] aphyr/distsys-class — https://github.com/aphyr/distsys-class.
