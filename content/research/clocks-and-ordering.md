# Physical clocks, logical clocks and event order — research note

- Level: L4
- Feeds lessons: `l4-clocks-and-ordering`, `l4-logical-clocks`
- Researched: 2026-10-19

## Key facts (in our words)

1. **Machine clocks drift and get corrected.** NTP synchronises clocks over the network to within
   milliseconds on a good LAN, worse over the Internet; corrections can make a clock jump. [1][9]
2. **Time-of-day clocks can go backwards; monotonic clocks cannot**, so measure durations with a
   monotonic clock and never order events across machines by wall-clock time alone. [9]
3. **Leap seconds broke real systems**: Cloudflare's DNS hit a negative duration in 2017 because code
   assumed time never goes backwards. [2]
4. **"There is no now"**: in a distributed system each node has its own view of the present. [3]
5. **Lamport clocks** give each event a counter so that if A happened-before B, A's counter is
   smaller; they order events but cannot detect concurrency. [4]
6. **Vector clocks** keep one counter per node and can tell "before", "after" and "concurrent" —
   Dynamo used them to detect conflicting versions. [5][10]
7. **Hybrid logical clocks** combine physical time with a logical counter so timestamps stay close to
   real time yet respect causality (used by CockroachDB). [6]
8. **Bounded uncertainty**: Spanner's TrueTime exposes an interval [earliest, latest] and waits out
   the uncertainty before commit; AWS ClockBound offers a similar interval. [7][8]
9. **Last-write-wins with timestamps silently drops writes** when clocks disagree. [9]

## Engine mapping

- `id_generator` behaviour gives `outOfOrderIds` (planned). Per-node skew → gap `clock-skew`;
  LWW losses → gap `conflict-resolution`. `l4-logical-clocks` is reading+check.

## Misconceptions

- "Servers' clocks agree." [1][9]
- "Later timestamp = later event." [3][4]
- "Lamport clocks detect concurrent writes." Vector clocks do. [4][5]

## Sources

Primary:
1. *RFC 5905: Network Time Protocol Version 4* — D. Mills et al., IETF —
   https://www.rfc-editor.org/rfc/rfc5905 — 2010.
2. *How and why the leap second affected Cloudflare DNS* — John Graham-Cumming, Cloudflare —
   https://blog.cloudflare.com/how-and-why-the-leap-second-affected-cloudflare-dns/ — 2017.
3. *There is No Now* — Justin Sheehy, ACM Queue — https://queue.acm.org/detail.cfm?id=2745385 — 2015.
4. *Time, Clocks, and the Ordering of Events in a Distributed System* — Leslie Lamport, CACM —
   https://lamport.azurewebsites.net/pubs/time-clocks.pdf — 1978.
5. *Dynamo: Amazon's Highly Available Key-value Store* — G. DeCandia et al., SOSP —
   https://www.allthingsdistributed.com/files/amazon-dynamo-sosp2007.pdf — 2007.
6. *Logical Physical Clocks and Consistent Snapshots in Globally Distributed Databases* —
   S. Kulkarni et al. — https://cse.buffalo.edu/tech-reports/2014-04.pdf — 2014.
7. *Spanner: Google's Globally-Distributed Database* — J. Corbett et al., OSDI —
   https://research.google/pubs/pub39966/ — 2012.
8. *ClockBound* — AWS, GitHub — https://github.com/aws/clock-bound — accessed 2026-10-19.

Books:
9. [B1] *Designing Data-Intensive Applications* — ch. 8, section "Unreliable Clocks" ([B2] ch. 9).
10. [B5] *Distributed Systems*, 4th ed. — ch. 5 "Coordination" (clock synchronisation, logical
    clocks, vector clocks).
11. [B47] *Distributed Systems* lecture notes — Kleppmann — lectures on time, clocks and ordering.
12. [B6] *Patterns of Distributed Systems* — "Lamport Clock", "Hybrid Clock", "Version Vector".

Repos:
13. [G25] aphyr/distsys-class — clocks section — https://github.com/aphyr/distsys-class.
14. [G24] theanalyst/awesome-distributed-systems — time and clocks papers —
    https://github.com/theanalyst/awesome-distributed-systems.
