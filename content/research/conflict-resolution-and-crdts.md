# Conflict resolution: last-write-wins, version vectors and CRDTs — research note

- Level: L4
- Feeds lessons: `l4-conflict-resolution` (background for `l6-multi-region-writes`)
- Researched: 2026-10-19

## Key facts (in our words)

1. **Conflicts appear whenever two replicas accept writes to the same item concurrently** —
   multi-leader, leaderless, offline clients. [8][9]
2. **Last-write-wins (LWW)** keeps the write with the highest timestamp and discards the others;
   simple but loses data silently, and clock skew decides the "winner". Cassandra and DynamoDB global
   tables resolve this way. [1][2]
3. **Version vectors / vector clocks** detect concurrent versions and keep both as siblings for the
   application (or user) to merge — Dynamo's shopping cart merged by union. [3]
4. **CRDTs** (conflict-free replicated data types) are data types whose merge is commutative,
   associative and idempotent, so replicas converge without coordination: counters, sets, maps,
   sequences. [4]
5. **Local-first software and Automerge** use CRDTs so documents can be edited offline and merged
   later. [5][6]
6. **Figma's multiplayer** uses a server-authoritative design with per-property last-writer-wins,
   which they found simpler than full CRDTs for their case. [7]
7. **Avoiding conflicts** (route all writes for an item to one "home" leader) is often the best
   strategy. [8]

## Engine mapping

- Metric `lostUpdates` exists in the spec; no multi-writer replication or resolution policy → gap
  `conflict-resolution`.

## Misconceptions

- "LWW is safe because clocks are synced." [1][9]
- "CRDTs solve every conflict." They fix convergence, not business rules. [4]
- "Conflicts are rare so ignore them." [8]

## Sources

Primary:
1. *Dynamo (architecture): conflict resolution / timestamps* — Apache Cassandra docs —
   https://cassandra.apache.org/doc/latest/cassandra/architecture/dynamo.html — accessed 2026-10-19.
2. *Global tables — how it works (conflict resolution)* — DynamoDB docs —
   https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/V2globaltables_HowItWorks.html —
   accessed 2026-10-19.
3. *Dynamo: Amazon's Highly Available Key-value Store* — G. DeCandia et al., SOSP —
   https://www.allthingsdistributed.com/files/amazon-dynamo-sosp2007.pdf — 2007.
4. *Conflict-free Replicated Data Types* — M. Shapiro, N. Preguiça, C. Baquero, M. Zawirski, SSS —
   https://inria.hal.science/inria-00609399 — 2011.
5. *Local-first software* — M. Kleppmann, A. Wiggins, P. van Hardenberg, M. McGranaghan, Ink & Switch —
   https://www.inkandswitch.com/local-first/ — 2019.
6. *Automerge* — Automerge project — https://automerge.org/ — accessed 2026-10-19.
7. *How Figma's multiplayer technology works* — Evan Wallace, Figma —
   https://www.figma.com/blog/how-figmas-multiplayer-technology-works/ — 2019.

Books:
8. [B1] *Designing Data-Intensive Applications* — ch. 5 "Handling Write Conflicts", "Detecting
   Concurrent Writes" ([B2] ch. 6).
9. [B4] *Understanding Distributed Systems* — part "Coordination", chapter "Coordination avoidance"
   (CRDTs, causal consistency).
10. [B8] *Distributed Systems for Fun and Profit* — ch. 5 "Replication: weak consistency model
    protocols" (CRDTs).

Repos:
11. [G35] heathermiller/dist-prog-book — CRDT chapters — https://github.com/heathermiller/dist-prog-book.
12. [G31] jepsen-io/maelstrom — "g-counter / pn-counter" workloads — https://github.com/jepsen-io/maelstrom.
