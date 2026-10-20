---
id: l0-database-basics
title: "Databases: where data lives on"
---

## Outcome
Explain why data lives in a separate database rather than in the web server, and when a site is
slow, show that the database is the bottleneck and fix the right part.

## Picture it first
A library has several desk clerks greeting readers (web servers) but only one librarian allowed
into the stacks (the database). Every loan goes through the librarian. Hiring more clerks just makes
the line at the stacks longer. And if a clerk writes loans on a personal notepad, the records vanish
when that clerk quits.

## Terms
- **Database**: a server whose job is to keep data safe and find it quickly. We use **PostgreSQL**
  (a popular relational database).
- **Table**, **row**, **column**: data is arranged in tables; each row is a record, each column has a
  name and a type.
- **Query**: a question sent to the database, usually written in **SQL**.
- **Transaction**: groups several changes into "all or nothing". A transfer debits A and credits B
  together, or neither happens.
- **Stateless web server**: a web server can be stopped, restarted or copied at any time, so it is
  not the place to keep data that must last.
- **Bottleneck**: the slowest component, which sets the pace for the whole system.

## Common misconceptions
- **M1**: "Data is safe as long as the web server is running." Web servers are disposable; data needs
  a durable home.
- **M2**: "If the site is slow, buy a faster web server." If the database is the bottleneck, nothing
  changes.
- **M3**: "If we wait a bit longer, the database will catch up." Arrivals still exceed capacity; the
  queue still fills.

## Experiment
**Setup:** users → web server (2 vCPU) → PostgreSQL. 6,000 requests/s, each needing one query. A
"standard" database handles about 5,000 queries/s; "large" about 10,000. To keep this lesson about
the bottleneck, the lab charges the same database price for both sizes ($180/month). Real machines
twice as big usually cost about twice as much; the cost lesson comes back to that.
Controls: web vCPUs (2, 4), database size, client timeout (1 s, 5 s).

**Predict before you run:** which block turns red first, `web` or `pg`? *(`pg`.)*

**Goals:** `p95 ≤ 50 ms` and `requestsRejected = 0`.

| Choice | Web vCPU | DB size | Timeout | What you should see |
|---|---|---|---|---|
| A | 2 | large | 1 s | p95 about 17 ms, nothing rejected, $230/month |
| B | 4 | standard | 1 s | p95 near 600 ms, over 7,000 rejected, `pg` overloaded |
| C | 2 | standard | 5 s | the same as B: p95 near 600 ms, still rejecting |

Click the `pg` block on choice B: 100% busy, queue full. The `web` block is only about 17% busy.

## Feedback
- **B**: The web server was already mostly idle; doubling its CPU changes nothing because every
  request still goes through a database that handles about 5,000 queries a second. Find the busiest
  block before upgrading anything.
- **C**: A longer wait does not make the librarian faster. About 1,000 extra queries arrive every
  second; the queue still fills and still rejects.
- **M1**: A web server can be stopped, restarted or replaced at any moment. Anything that lives only
  in its memory disappears with it, and the other web servers never see it. Data that must last
  belongs in a database. This experiment has no choice for that idea; the single-point-of-failure
  lesson shows what happens when a machine dies.

## Takeaways
- Data that must last lives in a database, not in the web server.
- All web servers share the database, so it is often the first bottleneck.
- Before upgrading, find the busiest block; upgrading anything else wastes money.
- L2 adds more tools: indexes, read replicas, caches, sharding.

## Review questions
1. What does a transaction guarantee in a money transfer? *(The debit and the credit both happen or
   neither does.)*
2. Why not keep a shopping cart in one web server's memory? *(That server may be stopped or
   replaced; the data is lost and other servers cannot see it.)*
3. In a run, `web` is 20% busy and `pg` is 100% busy. What do you upgrade? *(The database, or reduce
   its load.)*
4. In 2016 Stack Overflow ran about 505 million SQL queries for about 209 million HTTP requests a
   day. About how many queries per request? *(About 2.4.)*
