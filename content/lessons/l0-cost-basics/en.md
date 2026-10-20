---
id: l0-cost-basics
title: Cost is a requirement too
---

## Outcome
Pick the cheapest configuration that still meets the speed goal, and explain why both "the biggest"
and "the cheapest" are wrong answers.

## Picture it first
Four friends go to dinner. Rent a 45-seat bus: everyone arrives, but you pay for 41 empty seats. Take
one scooter: cheap, but three friends stay home. A four-seat car is just right.

## Terms
- **Cost per month**: the total rent for all components. In the lab a 1-vCPU web server costs
  $22.5/month and each extra vCPU adds $27.5 (2 vCPUs cost $50, 3 cost $77.5, 8 cost $215). These
  are game-world prices.
- **Right-sizing**: choosing the smallest configuration that meets the requirements with sensible
  headroom.
- **Over-provisioning**: renting more than needed and paying for unused capacity.
- **Unit cost**: cost per thousand requests or per user; lets you compare designs fairly.

## Common misconceptions
- **M1**: "Buy the biggest machine to be safe." You pay four times as much and users notice no
  difference at all.
- **M2**: "The cheapest thing that runs is best." It runs when quiet and falls over when busy; outages
  cost more.
- **M3**: "A little extra 'just in case' is harmless." Without a numeric reason, it is still waste.

## Experiment
**Setup:** 10,000 requests arrive every second. You run one 8-vCPU server ($215 a month). Your
manager asks: "Do we need it that big?" The new budget is $50 a month.

**Predict before you run:** what is the smallest number of vCPUs that keeps p95 at or under 20 ms
with nothing rejected? *(2 vCPUs: about 18,000 rps, plenty for 10,000.)*

**Goals:** p95 at most 20 ms, no rejected requests, and a cost of at most $50 a month.

| Choice | vCPU | p95 | Busiest moment | Cost | What happened |
|---|---|---|---|---|---|
| A | 2 | about 5 ms | about 75% | $50 | every goal met |
| B | 8 | about 5 ms | about 19% | $215 | over budget |
| C | 1 | close to 1 s | 100% | $22.5 | overloaded; about 1,400 requests rejected |
| D | 3 | about 5 ms | about 50% | $77.5 | over budget |

## Feedback
- **B**: p95 is exactly the same as A, because a request cannot finish faster than its own
  processing time. You pay more than four times as much for a machine that is idle more than 80% of
  the time.
- **C**: It is the cheapest, but 10,000 requests a second is more than the roughly 9,000 one vCPU can
  finish. The queue slowly fills and requests are rejected. You saved $27.5 and lost customers.
- **D**: 3 vCPUs are not technically wrong, but you pay $27.5 more every month and users get
  nothing for it: p95 does not change. If you want extra headroom, state the reason in numbers
  (for example "peaks may reach 1.5 times today's traffic").

## Takeaways
- Cost is a goal like latency and availability.
- Choose the smallest configuration that meets the goals with justified headroom.
- Compare designs by unit cost, not just the total bill.

## Review questions
1. Two designs both meet the goals: $50 and $77.5 a month. When should you pick the dearer one? *(When
   there is a numeric reason, e.g. forecast growth or surviving the loss of a machine.)*
2. 10,000 requests/s over a 30-day month is about how many billion requests? At $50/month, what does a
   million requests cost? *(About 26 billion; about $0.002 per million.)*
3. Why is a server that is 15% busy all day a sign of waste? *(Most of the capacity you pay for is
   unused.)*
