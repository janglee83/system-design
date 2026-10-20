---
id: l0-throughput-and-capacity
title: Throughput and the capacity of one server
---

## Outcome
Given a request rate and a server's capacity, pick a configuration with no rejected requests and
p95 under 50 ms, and explain why more memory or a longer wait does not fix overload.

## Picture it first
A noodle shop has one cook who makes 90 bowls a minute. At lunch, 120 customers arrive every
minute. Putting out more stools for waiting (memory) only lets the line grow longer. Telling
customers "just wait a bit longer" (a long timeout) does the same. Only a second cook, or a faster
one, gets more bowls out of the kitchen each minute.

## Terms
- **Throughput**: work finished per second, measured in **rps** (requests per second).
- **Capacity**: the highest throughput a component can keep up over time.
- **vCPU**: a rented unit of processing power in the cloud. In this lab, 1 vCPU finishes about
  9,000 simple requests per second. That is a game-world number, not a benchmark.
- **Queue**: where requests wait while the server is busy. In the lab, memory decides how many
  requests can wait: about 4,000 per GB.
- **Rejected**: a request dropped because the queue was already full.
- **Timeout**: how long the client waits before it gives up on a request.
- **p95**: 95% of requests finished at least this fast. You will meet it properly in the
  percentiles lesson.
- **peakBusy**: at its busiest moment, the share of capacity the server used (0 to 1).

## Common misconceptions
- **M1**: "More RAM lets a server handle more requests per second." Memory only makes the waiting
  line longer.
- **M2**: "If requests are slow, raise the client timeout." Waiting longer adds no processing
  power.
- **M3**: "Going a little over capacity is fine." The excess piles up every second until the
  queue is full.

## Experiment
**Setup:** 12,000 requests per second arrive at one server with 1 vCPU and 2 GB of memory. Its
capacity is about 9,000 rps. You can change the vCPUs (1, 2 or 4), the memory (2 or 8 GB) and the
client timeout (1 s or 5 s).

**Predict before you run:** with 1 vCPU, how many extra requests arrive each second, and how long
does a waiting room of about 8,000 places take to fill? *(About 3,000 extra per second, so it is
full in under 3 seconds.)*

**Goals:** p95 at most 50 ms, and no rejected requests.

| Choice | vCPU | Memory | Timeout | What the lab shows |
|---|---|---|---|---|
| A | 2 | 2 GB | 1 s | p95 about 5 ms, nothing rejected, busy about 88% at the peak |
| B | 1 | 8 GB | 1 s | nothing rejected, but p95 above 3 s and most requests time out |
| C | 1 | 2 GB | 5 s | p95 near 1 s and more than 20,000 rejected |
| D | 1 | 2 GB | 1 s | the same as C, with a `node.overloaded` event |

On choice D, watch the timeline: the queue climbs, sits at its ceiling, and rejections start a
few seconds in.

## Feedback
- **B**: Four times the memory gives a waiting line four times as long. The server still finishes
  only about 9,000 requests a second, so the people at the back wait more than a second and the
  client gives up on them. Nothing is "rejected", yet most users still fail: you swapped a quick
  "no" for a long wait and then a failure.
- **C**: A longer wait does not make the kitchen faster. The queue still fills, the server still
  turns requests away, and the longer timeout only keeps users hanging before they fail. The
  numbers are the same as in D.
- **D**: 3,000 extra requests a second sounds small next to 12,000, but nothing ever drains them.
  They pile up until the queue is full, and from then on the server rejects the overflow. Overload
  is not "slightly slow"; it builds up.

## Takeaways
- Capacity comes from what does the work (CPU here), not from the waiting room (memory).
- When arrivals stay above capacity, the queue grows until it is full; then come rejections or
  timeouts.
- A longer timeout hides overload; it does not fix it.

## Review questions
1. How do throughput and latency differ? *(How much work is finished per second, versus how long
   one request takes.)*
2. About how many rps can a 2-vCPU lab server finish? *(About 18,000.)*
3. Why did extra memory make p95 worse in choice B? *(A longer line means a longer wait at the
   back of it.)*
4. Arrivals exceed capacity by 3,000 rps and the queue holds 6,000 requests. How long until it is
   full? *(About 2 seconds.)*
