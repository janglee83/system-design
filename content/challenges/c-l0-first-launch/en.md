---
id: c-l0-first-launch
title: Opening a small online shop
---

## Scenario
A family bakery is opening its online shop. At lunchtime about 3,000 requests a second arrive:
people browse the cakes and some place orders. Orders must be kept, so the shop needs a web server
that answers and a PostgreSQL database that stores the orders. You start with only the users on
the canvas; build the rest from web servers and databases.

The challenge has three modes:

- **standard**: an ordinary lunchtime, budget $300 a month.
- **tight-budget**: the same lunchtime, but the owners can only spend $210 a month.
- **chaos**: budget $500 a month, and during the run one web server dies at 3 s and the database
  primary dies at 6 s.

## Outcome
In every mode, keep p95 at or under 50 ms, reject no requests, answer at least 98% of requests,
and stay within the mode's monthly budget.

## Hints
- **h1**: Work out what one web server and one database can each handle per second, and compare it
  with 3,000. Is anything close to its limit?
- **h2**: The cheapest design that meets the speed goals is usually the right one for the first two
  modes. What does each extra vCPU add to the bill?
- **h3**: In chaos mode, ask of every block: "if this one dies, is there another copy to carry on?"
  Remember that a database needs a replica that can be promoted.
