---
id: c-l0-size-from-estimate
title: From a brief to a sizing
---

## Scenario
A ticket-booking app expects 26 million daily users who each make about 10 requests a day, and its
peak hour runs at about twice the daily average. Every request makes one query to the PostgreSQL
database. The run in this challenge is that peak hour, about 6,000 requests a second. You start
from one 1-vCPU web server and one database with no replicas.

The team wants headroom: at the busiest moment, no block should be more than 70% busy, so that a
slightly bigger peak than forecast does not hurt.

- **peak**: budget $600 a month.

## Outcome
Turn the brief into requests per second, then choose a web tier and a database with p95 at or
under 50 ms, nothing rejected, every block at most 70% busy, and a cost within $600 a month.

## Hints
- **h1**: 26,000,000 × 10 ÷ 86,400 gives the average; double it for the peak. Compare the result
  with what one vCPU and one database instance can each finish per second.
- **h2**: The busiest block decides peakBusy. A design that only just fits the peak on paper will
  show 85–100% busy in a run, because arrivals come in clumps.
- **h3**: Database read replicas share the reads. How many instances keep the database well under
  70% at 6,000 queries a second?
