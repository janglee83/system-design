---
id: l0-queueing-and-utilization
title: "Queues: why a server at 94% busy is already in trouble"
---

## Outcome
Pick a configuration that keeps utilization under 70% so p95 stays under 10 ms within budget, and
explain why "zero errors" does not mean "healthy".

## Picture it first
A supermarket checkout: when the cashier is busy half the time, you barely wait. When she is busy
95% of the time, a few shoppers arriving close together stretch the line past the vegetables. She
is not "overloaded" and nobody is turned away — but everyone waits a long time.

## Terms
- **Utilization**: the share of time a server is working. In the lab: `peakBusy`.
- **Service time**: time to process one request with no waiting (2 ms here).
- **Queueing delay**: time spent waiting for your turn.
- **The single-queue rule:** response time ≈ service time ÷ (1 − utilization). 50% busy → 2×;
  90% → 10×; 95% → 20×.
- **Little's Law**: requests inside a system = arrival rate × time each one stays. For example
  2,000 requests/s × 0.05 s = 100 requests in flight.
- **Headroom**: capacity deliberately left free for bursts.

## Common misconceptions
- **M1**: "94% busy with no errors is fine." Latency is already nearly 20× the service time.
- **M2**: "Latency grows steadily with utilization." It shoots up near 100% (shown on a chart; no
  separate choice).
- **M3**: "The more headroom the better." A server idle 76% of the time is money left on the table.

## Experiment
**Setup:** 8,500 requests/s on a 1-vCPU server (capacity about 9,000). Choose 1, 2 or 4 vCPUs.
Budget $50/month.

**Predict:** With 1 vCPU, are any requests rejected? Will p95 be about 3 ms, 10 ms or 35 ms?

**Goals:** `p95 ≤ 10 ms`, `peakBusy ≤ 0.7`, `cost ≤ $50/month`.

| Choice | vCPU | Utilization | Expected p95 | Cost | Result |
|---|---|---|---|---|---|
| A (correct) | 2 | about 47% | about 4.3 ms | $45 | pass |
| B | 1 | about 94% | about 36 ms, 0 errors | $22.5 | ✗ slow, no headroom |
| C | 4 | about 24% | about 3.1 ms | $90 | ✗ over budget |

After running, open the lesson's "latency vs utilization" chart: A, B and C sit on the same curve.

## Feedback
- **B**: Nothing was rejected, but each request waits nearly 20 times its real processing time. At
  94% busy, a small bump starts the queue growing. "No errors" only means "not broken yet".
- **C**: p95 is about 1 ms better than A, but you pay double for a server idle three quarters of the
  time. Headroom should be enough, not maximal.

## Takeaways
- Latency shoots up as utilization approaches 100%; the danger zone starts around 70%.
- "No errors" is not "healthy"; look at utilization and p95 together.
- Choose a deliberate headroom, then stop.

## Review questions
1. Service time 2 ms, 90% busy. Roughly what is the average response time? *(About 20 ms.)*
2. 1,000 requests/s, each staying 0.2 s. How many are in the system at once? *(About 200.)*
3. Why do autoscalers often target about 50% CPU? *(To leave room for bursts and keep latency low.)*
