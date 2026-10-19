# Why distributed systems are hard: partial failure and the network fallacies — research note

- Level: L4
- Feeds lessons: `l4-why-distributed-is-hard`
- Researched: 2026-10-19

## Key facts (in our words)

1. **Partial failure is the defining problem**: some parts work while others fail, and a caller often
   cannot tell whether a request was lost, delayed, or processed with the reply lost. [1][7][8]
2. **The eight fallacies of distributed computing** (attributed to Peter Deutsch and colleagues at
   Sun): the network is reliable; latency is zero; bandwidth is infinite; the network is secure;
   topology doesn't change; there is one administrator; transport cost is zero; the network is
   homogeneous. [2]
3. **Real networks partition.** Bailis and Kingsbury collected evidence of partitions in data centres
   and clouds, including those that caused split brain and data loss. [3]
4. **Unbounded delays**: in an asynchronous network there is no upper bound on message delay, so a
   timeout can only suspect failure, never prove it. [7][9]
5. **Amazon's builders' library lists eight failure modes for a single request/reply** (send fails,
   server never gets it, server crashes mid-work, reply lost, …) and argues that handling all of them
   is why distributed code is harder. [1]
6. **Gray failures and process pauses** (GC, VM migration) make a node look dead and then come back,
   which breaks naive leader/lock schemes. [7][10]

## Engine mapping

- Faults exist for crashes (`instance-down`) and slowness (`instance-slow`, planned), but not for
  partitions where both sides keep running → gap `network-partition-fault` (also for CAP, leader
  election). Lesson is reading+check.

## Misconceptions

- "A timeout means the request failed." [1][7]
- "Partitions are rare enough to ignore." [3]
- "If a node stopped responding, it is dead." [7][10]

## Sources

Primary:
1. *Challenges with distributed systems* — Jacob Gabrielson, Amazon Builders' Library —
   https://aws.amazon.com/builders-library/challenges-with-distributed-systems/ — 2019.
2. *Fallacies of Distributed Computing Explained* — Arnon Rotem-Gal-Oz —
   https://pages.cs.wisc.edu/~zuyu/files/fallacies.pdf — 2006.
3. *The Network is Reliable* — Peter Bailis, Kyle Kingsbury, ACM Queue 12(7) —
   https://queue.acm.org/detail.cfm?id=2655736 — 2014.
4. *Impossibility of Distributed Consensus with One Faulty Process* — M. Fischer, N. Lynch,
   M. Paterson, JACM — https://groups.csail.mit.edu/tds/papers/Lynch/jacm85.pdf — 1985.
5. *Gray Failure: The Achilles' Heel of Cloud-Scale Systems* — P. Huang et al., HotOS —
   https://www.microsoft.com/en-us/research/publication/gray-failure-achilles-heel-cloud-scale-systems/ — 2017.
6. *Distributed systems class notes* — Kyle Kingsbury — https://github.com/aphyr/distsys-class —
   accessed 2026-10-19.

Books:
7. [B1] *Designing Data-Intensive Applications* — ch. 8 "The Trouble with Distributed Systems"
   ([B2] ch. 9).
8. [B4] *Understanding Distributed Systems* — ch. 1 "Introduction" and part "Coordination" (system
   models).
9. [B5] *Distributed Systems*, 4th ed. — ch. 1 (pitfalls) and ch. 8 "Fault tolerance".
10. [B3] *Database Internals* — ch. 8 "Introduction and Overview" (fallacies, failure models).

Repos:
11. [G25] aphyr/distsys-class — failure modes section — https://github.com/aphyr/distsys-class.
12. [G24] theanalyst/awesome-distributed-systems — https://github.com/theanalyst/awesome-distributed-systems.
