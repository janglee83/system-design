# CAP, PACELC and consistency models — research note

- Level: L4
- Feeds lessons: `l4-cap-theorem`, `l4-pacelc`, `l4-consistency-models`
- Researched: 2026-10-19

## Key facts (in our words)

1. **CAP** (Brewer's conjecture, proved by Gilbert and Lynch): when the network partitions, a
   replicated system must choose between answering every request (availability) and keeping all
   answers consistent with a single up-to-date copy (linearizability). [1][2]
2. **CAP is narrow**: it covers one consistency model and one failure kind. Brewer later stressed that
   partitions are rare and the real design space is how to detect them, operate in a degraded mode
   and recover. [3]
3. **Labelling databases "CP" or "AP" misleads**; most systems offer neither full linearizability
   nor full CAP-availability, and behaviour depends on configuration. [4]
4. **PACELC**: if there is a Partition, choose Availability or Consistency; Else, choose Latency or
   Consistency — the everyday trade-off is latency. [5]
5. **Linearizability**: every operation appears to take effect at one instant between its start and
   end; reads see the latest completed write. [6]
6. **Weaker models**: sequential, causal, read-your-writes, monotonic reads, eventual consistency
   (replicas converge if writes stop). Jepsen maps how they relate. [7][8]
7. **Eventual consistency** was popularised for large services by Amazon's CTO, describing the window
   in which replicas may disagree. [8]
8. **Spanner** uses TrueTime and redundant networks so partitions are rare enough that it is
   "effectively CA" in practice while formally CP. [9]

## Engine mapping

- Needs a partition fault and `staleReads` behaviour → gaps `network-partition-fault`,
  `kv-quorum-config`, `replication-lag-model`. `l4-pacelc`, `l4-consistency-models` are
  reading+check.

## Misconceptions

- "Pick two of three, permanently." [3][4]
- "Eventual consistency means data might be lost." It means replicas converge; loss is a different
  property. [8]
- "Consistency in CAP = the C in ACID." Different meanings. [10]

## Sources

Primary:
1. *Towards Robust Distributed Systems* (PODC keynote) — Eric Brewer —
   https://people.eecs.berkeley.edu/~brewer/cs262b-2004/PODC-keynote.pdf — 2000.
2. *Brewer's Conjecture and the Feasibility of Consistent, Available, Partition-Tolerant Web
   Services* — S. Gilbert, N. Lynch, SIGACT News — https://groups.csail.mit.edu/tds/papers/Gilbert/Brewer2.pdf — 2002.
3. *CAP Twelve Years Later: How the "Rules" Have Changed* — Eric Brewer, InfoQ / IEEE Computer —
   https://www.infoq.com/articles/cap-twelve-years-later-how-the-rules-have-changed/ — 2012.
4. *Please stop calling databases CP or AP* — Martin Kleppmann —
   https://martin.kleppmann.com/2015/05/11/please-stop-calling-databases-cp-or-ap.html — 2015.
5. *Consistency Tradeoffs in Modern Distributed Database System Design* — Daniel Abadi, IEEE
   Computer — https://www.cs.umd.edu/~abadi/papers/abadi-pacelc.pdf — 2012.
6. *Linearizability: A Correctness Condition for Concurrent Objects* — M. Herlihy, J. Wing, TOPLAS —
   https://cs.brown.edu/~mph/HerlihyW90/p463-herlihy.pdf — 1990.
7. *Consistency Models* — Jepsen — https://jepsen.io/consistency — accessed 2026-10-19.
8. *Eventually Consistent – Revisited* — Werner Vogels —
   https://www.allthingsdistributed.com/2008/12/eventually_consistent.html — 2008.
9. *Spanner, TrueTime and the CAP Theorem* — Eric Brewer, Google — https://research.google/pubs/pub45855/ — 2017.

Books:
10. [B1] *Designing Data-Intensive Applications* — ch. 9 "Consistency and Consensus" ([B2] ch. 10).
11. [B5] *Distributed Systems*, 4th ed. — ch. 7 "Consistency and replication".
12. [B8] *Distributed Systems for Fun and Profit* — Takada — ch. 2 "Up and down the level of
    abstraction" (CAP).

Repos:
13. [G25] aphyr/distsys-class — consistency models section — https://github.com/aphyr/distsys-class.
14. [G1] donnemartin/system-design-primer — "CAP theorem", "Consistency patterns" —
    https://github.com/donnemartin/system-design-primer.
