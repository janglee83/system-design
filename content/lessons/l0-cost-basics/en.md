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
- **Cost per month**: the total rent for all components. In the lab one web vCPU costs $22.5/month
  (a game-world price).
- **Right-sizing**: choosing the smallest configuration that meets the requirements with sensible
  headroom.
- **Over-provisioning**: renting more than needed and paying for unused capacity.
- **Unit cost**: cost per thousand requests or per user; lets you compare designs fairly.

## Common misconceptions
- **M1**: "Buy the biggest machine to be safe." Paying four times as much for milliseconds nobody
  notices.
- **M2**: "The cheapest thing that runs is best." It runs when quiet and falls over when busy; outages
  cost more.
- **M3**: "A little extra 'just in case' is harmless." Without a numeric reason, it is still waste.

## Experiment
**Setup:** 12,000 requests/s. You run one 8-vCPU server ($180/month). Your manager asks: "Do we need
it that big?" New budget: $50/month.

**Predict:** What is the smallest vCPU count that keeps `p95 ≤ 20 ms`?

**Goals:** `p95 ≤ 20 ms`, `requestsRejected = 0`, `cost ≤ $50/month`.

| Choice | vCPU | Expected p95 | Cost | Result |
|---|---|---|---|---|
| A (correct) | 2 | about 6.5 ms | $45 | pass, about 67% busy |
| B | 8 | about 2.9 ms | $180 | ✗ over budget |
| C | 1 | about 485 ms, rejecting | $22.5 | ✗ overloaded |
| D | 3 | about 4.1 ms | $67.5 | ✗ over budget |

## Feedback
- **B**: About 3.6 ms faster than A — no user can tell — at four times the price. The machine is idle
  over 80% of the time.
- **C**: Cheapest, but 12,000 requests/s exceeds the roughly 9,000 one vCPU can handle. The queue fills
  and requests are rejected. You saved $22.5 and lost customers.
- **D**: Not technically wrong, but you pay $22.5 more a month for about 2 ms. If you want extra
  headroom, state the reason in numbers (for example "peaks may reach 1.5×").

## Takeaways
- Cost is a goal like latency and availability.
- Choose the smallest configuration that meets the goals with justified headroom.
- Compare designs by unit cost, not just the total bill.

## Review questions
1. Two designs both meet the goals: $45 and $67.5 a month. When should you pick the dearer one? *(When
   there is a numeric reason, e.g. forecast growth or surviving the loss of a machine.)*
2. 12,000 requests/s over a 30-day month is about how many billion requests? At $45/month, what does a
   million requests cost? *(About 31 billion; about $0.0014 per million.)*
3. Why is a server that is 15% busy all day a sign of waste? *(Most of the capacity you pay for is
   unused.)*
