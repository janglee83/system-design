---
id: c-l0-exit-coffee-shop
title: "L0 exit check: the online coffee shop"
---

## Scenario
An online coffee shop takes orders for pickup. Normally about 4,000 requests a second arrive, and
every request reads or writes the shop's PostgreSQL database. At 1.5 s the morning rush starts:
traffic doubles for 2 seconds. Then things break: at 5 s one web server dies, and at 7 s the
database primary dies. You start from one web server and one database with no copies.

This is the exit check for level 0. It brings together capacity, queueing, percentiles, the
database bottleneck, single points of failure and cost.

- **standard**: budget $500 a month.
- **tight-budget**: the same run, with only $420 a month.

## Outcome
In both modes, keep p95 at or under 50 ms and p99 at or under 100 ms, answer at least 98% of
requests, leave no single point of failure, and stay within the monthly budget.

## Hints
- **h1**: Estimate the peak first: how many requests a second arrive during the rush, and how many
  database queries does that mean? Which block reaches its limit first?
- **h2**: List every block and ask what happens if it dies. Two copies of something only help if the
  remaining copy can carry the load on its own.
- **h3**: A bigger single machine is still a single point of failure. Before buying more, check
  whether the cheapest redundant design already meets the speed goals.
