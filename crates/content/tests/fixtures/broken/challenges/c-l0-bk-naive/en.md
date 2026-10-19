---
id: c-l0-bk-naive
title: The fixture shop
---

## Scenario
A shop receives 12,000 requests per second.

## Outcome
Keep p95 under 50 ms within budget.

## Hints
- **h1**: How many requests per second does one vCPU finish?
- **h2**: If one machine is lost, can the rest cope?
