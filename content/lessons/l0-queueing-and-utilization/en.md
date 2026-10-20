---
id: l0-queueing-and-utilization
title: "Queues: why a server at 98% busy is already in trouble"
---

## Outcome
Pick a configuration whose busiest moment stays under 75% so p95 stays under 8 ms within budget,
and explain why "zero errors" does not mean "healthy".

## Picture it first
A supermarket checkout: when the cashier is busy half the time, you barely wait. When she is busy
95% of the time, a few shoppers arriving close together stretch the line past the vegetables. She
is not "overloaded" and nobody is turned away — but everyone waits a long time.

## Terms
- **Utilization**: the share of time a server is working. In the lab: `peakBusy`.
- **Service time**: time to process one request with no waiting (4 ms for a lab web server).
- **Queueing delay**: time spent waiting for your turn.
- **The single-queue rule:** response time ≈ service time ÷ (1 − utilization). 50% busy → 2×;
  90% → 10×; 95% → 20×.
  This is the textbook rule for one simple queue. The lab web server grows a little more gently,
  but the shape is the same: flat for a long time, then a steep climb near 100%.
- **Little's Law**: requests inside a system = arrival rate × time each one stays. For example
  2,000 requests/s × 0.05 s = 100 requests in flight.
- **Headroom**: capacity deliberately left free for bursts.

## Common misconceptions
- **M1**: "98% busy with no errors is fine." Every request already waits more than its own
  processing time, and the line grows with the smallest bump.
- **M2**: "Latency grows steadily with utilization." It stays flat for a long time, then shoots up
  near 100%.
- **M3**: "The more headroom the better." A server idle two thirds of the time is money left on
  the table.

## Experiment
**Setup:** 8,800 requests per second reach a 1-vCPU server whose capacity is about 9,000. You can
choose 1, 2 or 4 vCPUs. The budget is $50 a month.

**Predict before you run:** with 1 vCPU, are any requests rejected? Is p95 closer to 5 ms, 10 ms
or 50 ms? *(Nothing is rejected, and p95 is about 11 ms, more than twice the 4 ms of real work.)*

**Goals:** p95 at most 8 ms, the busiest moment at most 75% busy, and a cost of at most $50 a
month.

| Choice | vCPU | Busiest moment | p95 | Cost | What happened |
|---|---|---|---|---|---|
| A | 2 | about 67% | about 5 ms | $50 | every goal met |
| B | 1 | 100% | about 11 ms (p99 about 14 ms), zero errors | $22.5 | slow, no headroom |
| C | 4 | about 33% | about 5 ms | $105 | over budget |

The same 1-vCPU server under different loads shows the curve from M2:

| Requests per second | 7,000 | 8,000 | 8,500 | 8,800 | 8,900 |
|---|---|---|---|---|---|
| p95 | about 5 ms | about 5 ms | about 7 ms | about 11 ms | about 15 ms |

Going from 7,000 to 8,000 changes almost nothing; the last few hundred requests per second double
or triple the wait.

## Feedback
- **B**: Nothing was rejected, yet every unlucky request waits more than twice its real processing
  time, because at 98% busy any small clump of arrivals has to queue. "No errors" only means "not
  broken yet": a few percent more traffic and the line keeps growing.
- **C**: p95 is exactly the same as A, about 5 ms, because a request cannot be served faster than
  its own 4 ms of work. You pay more than double for a server that sits idle two thirds of the
  time. Headroom should be enough, not maximal.
- **M2**: Look at the second table: the first 8,000 requests per second cost almost nothing in
  waiting time, and the next 900 cost three times as much. That is why a server that "looks fine"
  at 80% can turn slow very quickly.

## Takeaways
- Latency shoots up as utilization approaches 100%; the danger zone starts around 70%.
- "No errors" is not "healthy"; look at utilization and p95 together.
- Choose a deliberate headroom, then stop.

## Review questions
1. Service time 2 ms, 90% busy. Roughly what is the average response time? *(About 20 ms.)*
2. 1,000 requests/s, each staying 0.2 s. How many are in the system at once? *(About 200.)*
3. Why do autoscalers often target about 50% CPU? *(To leave room for bursts and keep latency low.)*
