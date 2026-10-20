---
id: l0-latency-and-distance
title: "Latency: why far away means slow"
---

## Outcome
Choose where to place a server so that 95% of users get a response within 100 ms, and show with
numbers that a faster machine cannot make up for distance.

## Picture it first
Order something from a shop in your district and it arrives this afternoon. Order the same thing
from abroad and it takes a week. If the foreign shop packs ten times faster, the plane still flies
at the same speed. The Internet is the same: signals in fibre only travel so fast.

## Terms
- **Latency**: the waiting time between sending something and getting the answer, in milliseconds
  (ms; 1 ms is a thousandth of a second).
- **Round-trip time (RTT)**: time for a signal to reach the destination and come back.
- **Propagation delay**: the part of latency caused by distance. Light in fibre travels about
  200,000 km/s — roughly 5 ms per 1,000 km one way.
- **Bandwidth**: how much data can pass per second. A wider pipe does not make the first drop
  arrive sooner.
- **p95**: 95% of requests are faster than this number (covered in `l0-percentiles`).

Some real figures (fibre, best case): New York ↔ London about 56 ms round trip; New York ↔ Sydney
about 160 ms. People start to feel "slow" beyond roughly 100 ms.

## Common misconceptions
- **M1**: "A more powerful server makes far-away users faster." CPU shortens processing, not cable.
- **M2**: "The Internet is basically instant; server location does not matter." Physics disagrees.
- **M3**: "More bandwidth means lower latency." Two different quantities.

## Experiment
**Setup:** Your customers are in South-East Asia, 2,000 requests per second. The server sits on
"the other side of the world". Two controls: **server location** (same city / same continent /
other side of the world) and **vCPUs** (1 or 8).

**Predict before you run:** keeping the server far away but moving to 8 vCPUs, how far does p95 drop
from about 165 ms? *(Not at all: it stays at about 165 ms.)*

**Goal:** `p95 ≤ 100 ms`.

| Choice | Location | vCPU | Expected p95 | Cost/month |
|---|---|---|---|---|
| A | same continent | 1 | about 44 ms | $22.5 |
| B | other side | 8 | about 165 ms | $215 |
| C | other side | 1 | about 165 ms | $22.5 |

A server in the same city passes too (about 6 ms). Same continent is enough for this goal, and in
real life it is often the region you can actually rent.

Open **Follow request** on choice B: most of the time is spent on the network edge, not in the
server.

## Feedback
- **B**: You pay almost ten times as much and p95 does not move at all. The server only needs about
  4 ms to process each request; the other 160 ms is the signal crossing half the planet. To be fast,
  move the server (or the content) closer to users.
- **C**: The server is less than half busy (about 42%), yet p95 is above 160 ms. Distance alone blows the
  100 ms budget.
- **M3**: Bandwidth is how much data fits through per second; latency is how long the first piece
  takes to arrive. A wider pipe is like a wider road: more cars fit, but each car still needs the
  same time to drive the distance. The lab does not model bandwidth, so there is no choice for it.

## Takeaways
- Latency has a floor set by distance that no hardware removes.
- Find where the time goes (network or server) before spending money.
- Moving servers or content closer to users is the strongest latency fix (CDNs in L1).

## Review questions
1. Roughly how many ms does 1,000 km of fibre add one way? *(About 5 ms.)*
2. Why did 8 vCPUs barely change p95? *(Processing was only about 4 ms; the wire dominated.)*
3. How do bandwidth and latency differ? *(Bandwidth: how much per second; latency: how long you
   wait.)*
4. From about how many ms do users start to notice delay? *(Around 100 ms.)*
