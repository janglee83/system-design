# Designing a distributed key-value store — research note

- Level: L5
- Feeds lessons: `l5-kv-store-design` (challenge `c-l5-kv-store`)
- Researched: 2026-10-19

## Key facts (in our words)

1. **The Dynamo recipe**: consistent hashing with virtual nodes for partitioning; N replicas per key;
   quorum reads/writes (R, W); sloppy quorums and hinted handoff for temporary failures; vector clocks
   for versioning; Merkle-tree anti-entropy; gossip for membership. [1][9]
2. **Cassandra** combined Dynamo's distribution with Bigtable's data model and storage: per-node
   commit log, memtable, immutable SSTables merged by compaction, Bloom filters to skip files. [2][3]
3. **Write path**: append to commit log (durability), update memtable, acknowledge; flush to SSTable
   later. **Read path**: memtable, then SSTables newest-first, using Bloom filters and indexes. [3][10]
4. **Bloom filters** answer "definitely not here" cheaply, avoiding disk reads for absent keys. [4]
5. **Compaction strategies** trade write amplification vs read amplification vs space. [3][10]
6. **DynamoDB (2022 paper)** moved away from the original Dynamo: Multi-Paxos per partition,
   strongly consistent reads available, admission control and adaptive capacity for hot partitions. [5]
7. **Discord's move to ScyllaDB** illustrates hot partitions and compaction pain in practice. [6]
8. **Riak, Voldemort and Cassandra** are open Dynamo descendants. [7]

## Engine mapping

- `kv-store`, `kv-node-down`, `staleReads` planned; N/R/W and partitioning not → gaps
  `kv-quorum-config`, `partitioning-scheme`.

## Misconceptions

- "Dynamo = DynamoDB." The service diverged substantially. [5]
- "LSM reads are slow." Bloom filters and caching keep most reads cheap. [3][4]
- "Quorums give transactions." They give per-key overlap only. [9]

## Sources

Primary:
1. *Dynamo: Amazon's Highly Available Key-value Store* — G. DeCandia et al., SOSP —
   https://www.allthingsdistributed.com/files/amazon-dynamo-sosp2007.pdf — 2007.
2. *Cassandra — A Decentralized Structured Storage System* — A. Lakshman, P. Malik, LADIS —
   https://www.cs.cornell.edu/projects/ladis2009/papers/lakshman-ladis2009.pdf — 2009.
3. *Storage engine* — Apache Cassandra docs —
   https://cassandra.apache.org/doc/latest/cassandra/architecture/storage-engine.html — accessed 2026-10-19.
4. *Space/Time Trade-offs in Hash Coding with Allowable Errors* — Burton H. Bloom, CACM —
   https://dl.acm.org/doi/10.1145/362686.362692 — 1970.
5. *Amazon DynamoDB: A Scalable, Predictably Performant, and Fully Managed NoSQL Database Service* —
   M. Elhemali et al., USENIX ATC — https://www.usenix.org/conference/atc22/presentation/elhemali — 2022.
6. *How Discord Stores Trillions of Messages* — Discord —
   https://discord.com/blog/how-discord-stores-trillions-of-messages — 2023.
7. *Bigtable: A Distributed Storage System for Structured Data* — F. Chang et al., OSDI —
   https://research.google/pubs/pub27898/ — 2006.

Books:
9. [B1] *Designing Data-Intensive Applications* — ch. 3 (SSTables, LSM-trees), ch. 5 (leaderless
   replication), ch. 6 (partitioning).
10. [B3] *Database Internals* — ch. 7 "Log-Structured Storage", ch. 11–12.
11. [B13] *Cassandra: The Definitive Guide*, 3rd ed. — architecture and storage chapters.
12. [B40] *System Design Interview*, vol. 1 — ch. 6 "Design a Key-Value Store" (topic map only).

Repos:
13. [G30] pingcap/talent-plan — "build a KV store" course — https://github.com/pingcap/talent-plan.
14. [G23] papers-we-love/papers-we-love — datastores — https://github.com/papers-we-love/papers-we-love.
