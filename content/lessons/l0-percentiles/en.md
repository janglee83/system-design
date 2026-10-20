---
id: l0-percentiles
title: "p50, p95, p99: measuring slowness for the unlucky"
---

## Outcome
Read p50, p95 and p99 from a run, show when the "typical" number hides slow users, and choose a
configuration that keeps 99% of requests under 50 ms through a short burst.

## Picture it first
Bus line 8 is "3 minutes late on average". But on rainy Monday mornings the 7:00 bus is 40 minutes
late. Commuters do not remember the average; they remember that Monday. For a site with a million
visits a day, "1% slow" is ten thousand visits.

## Terms
- **Percentile**: sort all requests from fastest to slowest. **p50** (median): half are faster than
  this. **p95**: 95% faster, 5% slower. **p99**: only 1 in 100 is slower.
- **Tail latency**: the latency of the slowest requests (p95, p99 and beyond).
- **Average / mean**: total time divided by number of requests. The fast majority pulls it down,
  so it easily hides the tail.
- **Burst**: a short spike in traffic.
- **SLI / SLO** (service level indicator / objective): the SLI is what you measure (e.g. p99); the
  SLO is the target (p99 ≤ 300 ms).

## Common misconceptions
- **M1**: "If p50 is good, the system is good." p50 only describes the middle user.
- **M2**: "The slowest 1% are a few unlucky people; ignore them." At scale that is many people, and a
  page calling many services hits the tail constantly.
- **M3**: "More memory will absorb the burst." Memory lengthens the line; it does not move it faster.

## Experiment
**Setup:** 6,000 requests/s; at 4 s traffic doubles for 0.4 s. One 1-vCPU, 2 GB server. Controls:
vCPUs (1, 2) and memory (2, 8 GB).

**Predict before you run:** after the burst, which number jumps most: p50, p95 or p99? *(p99.)*

**Goals:** `p50 ≤ 10 ms` and `p99 ≤ 50 ms`.

| Choice | vCPU | Memory | p50 | p95 | p99 | Result |
|---|---|---|---|---|---|---|
| A | 2 | 2 GB | about 5 ms | about 5 ms | about 5 ms | both goals met |
| B | 1 | 2 GB | about 5 ms | about 83 ms | about 129 ms | p50 fine, p99 misses |
| C | 1 | 8 GB | about 5 ms | about 83 ms | about 129 ms | exactly like B |

Scrub choice B to 4–5 s: the queue swells during the burst and needs almost half a second more to
drain. Requests arriving in that window are the tail.

## Feedback
- **B**: p50 looks fine because for over 90% of the run the server is calm. During the burst, one
  vCPU receives 12,000 requests/s but finishes 9,000; the queue grows and a few percent of requests
  wait around 100 ms or more. With a goal on p50 only, you would never see them.
- **C**: Memory was not the bottleneck: the queue never filled. The problem is how fast it drains.
  Only more vCPU makes the line move faster.
- **M2**: One percent sounds tiny, but a site with 10 million requests a day has 100,000 slow ones.
  And one page often needs many calls: if it makes 100 calls and each is slow 1% of the time, about
  63% of page loads include at least one slow call. The tail becomes the normal experience.

## Takeaways
- Set goals on the tail (p95, p99), not on the average or median.
- Short bursts create tails that averages do not show.
- Fixing the tail usually means more processing speed or headroom, not more waiting room.

## Review questions
1. What does p95 = 200 ms mean? *(95% of requests are faster than 200 ms; 5% slower.)*
2. A page calls 100 services in parallel; each is slow 1% of the time. About what share of page
   loads hit at least one slow call? *(1 − 0.99^100 ≈ 63%.)*
3. Why can the average look good while users complain? *(The fast majority pulls the average down and
   hides very slow requests.)*
