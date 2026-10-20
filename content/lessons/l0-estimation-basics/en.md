---
id: l0-estimation-basics
title: "Quick estimates: from users to servers"
---

## Outcome
From a brief stating daily users, compute normal and peak requests per second and choose a server
size that keeps real headroom at the peak and stays within budget.

## Picture it first
You are catering a 300-guest wedding. You do not count grains of rice; you estimate: about two bowls
per guest, the rush comes when dinner is served, so you need enough tables and staff for that
moment plus a little spare. System design starts with the same kind of rough arithmetic.

## Terms
- **Back-of-the-envelope estimation**: a quick, rounded calculation to choose between designs — not
  to compute an exact bill.
- **DAU** (daily active users).
- **Average rps** = DAU × requests per user per day ÷ 86,400 (seconds in a day).
- **Peak factor**: how many times the average the peak reaches.
- **Target utilization**: how busy you accept being at peak, e.g. 70%, to keep headroom.

## Common misconceptions
- **M1**: "Size for the average load." The peak knocks you over.
- **M2**: "Exactly fitting the peak is fine." Real arrivals come in clumps, so a server that fits
  the peak on paper is pinned at 100% in practice, with nothing left for a slightly bigger rush.
- **M3**: "Multiply by a huge margin to be safe." Costly; use a stated headroom instead.

## Experiment
**Brief:** an app has 20 million daily users, each making about 50 requests a day. The peak is
twice the average. On paper you want the server no more than about 70% busy at the peak. Budget:
$120 a month.

**Step 1: work it out before you run.**
- Average: 20,000,000 × 50 ÷ 86,400 ≈ ? *(About 11,600 rps.)*
- Peak: × 2 ≈ ? *(About 23,000 rps.)*
- One vCPU finishes about 9,000 rps; at 70% that is about 6,300 rps. How many vCPUs? *(23,000 ÷
  6,300 ≈ 3.7, so round up to 4.)*

**Step 2: run it.** The lab sends the average load, with a 3-second peak at twice the rate. Real
arrivals bunch up, so the busiest moment the lab measures is higher than the paper figure: 4 vCPUs
are 64% busy on paper and about 77% in the run.

**Goals:** p95 at most 10 ms, measured peak busy at most 85% (some spare left even in the busiest
instant), and a cost of at most $120 a month.

| Choice | vCPU | p95 | Peak busy (measured) | Cost | What happened |
|---|---|---|---|---|---|
| A | 4 | about 5 ms | about 77% | $105 | every goal met |
| B | 2 | about 460 ms | 100% | $50 | sized for the average; over 7,000 rejected |
| C | 3 | about 5 ms | 100% | $77.5 | fits the peak on paper, no spare in practice |
| D | 16 | about 5 ms | about 19% | $435 | far over budget |

## Feedback
- **B**: 2 vCPUs (about 18,000 rps) handle the 11,600 average but not the 23,000 peak. During those
  3 seconds the queue fills and requests are rejected. Always size for the peak, not the average.
- **C**: 3 vCPUs (about 27,000 rps) cover the 23,000 peak on paper at 86%. In the run, clumps of
  arrivals push the server to 100% for moments. Latency still looks fine today, but there is no
  spare at all: a peak just a little bigger than forecast would start a queue.
- **D**: It meets every speed goal, but costs almost four times the budget and sits idle more than
  80% of the time. Extra margin needs a reason you can state in numbers.

## Takeaways
- Average rps = users × requests per user ÷ 86,400; then apply the peak factor.
- Servers = peak ÷ (one server's capacity × target utilization), rounded up.
- Estimates choose a direction; being off by tens of percent is fine.

## Review questions
1. 1 million users, 100 requests each per day. Average rps? *(≈ 1,160 rps.)*
2. Peak 30,000 rps, 10,000 rps per server, 60% target. How many servers? *(30,000 ÷ 6,000 = 5.)*
3. By Little's Law, 2,000 rps at 50 ms latency means how many concurrent requests? *(≈ 100.)*
