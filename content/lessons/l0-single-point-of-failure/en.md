---
id: l0-single-point-of-failure
title: "Single points of failure: when one link breaks"
---

## Outcome
Find every single point of failure in a small system and remove them so it still serves more than
95% of requests while a web server and then the database primary fail.

## Picture it first
A bicycle has two wheels, one of each. A puncture in either stops the ride. Carrying a spare tube for
the front wheel only still leaves you stranded when the back wheel goes. And a fancier bicycle can
still get a puncture.

## Terms
- **Single point of failure (SPOF)**: a component whose failure alone stops the whole system.
- **Redundancy**: more than one copy of a component, so another takes over when one fails.
- **Replica**: an identical copy. For web servers, another machine running the same program. For
  databases, a **read replica** is a database machine that receives a copy of the data from the
  **primary** (the main copy that accepts writes).
- **Failover**: when the primary dies, a replica is **promoted** to primary. It takes a moment (about
  0.6 s here) during which writes fail.
- **spofCount**: how many components in the run have exactly one copy.

## Common misconceptions
- **M1**: "A really powerful machine won't fail." Size does not prevent failure.
- **M2**: "Adding redundancy in one place makes the whole system redundant." Any remaining SPOF still
  takes everything down.
- **M3**: "Having backups means we are highly available." Backups keep data, not the service running
  while you restore.

## Experiment
**Setup:** users → web → PostgreSQL, 2,000 requests/s. At 3 s one web server dies. At 6 s the
database primary dies. Controls: web copies (1, 2), vCPUs per web server (2, 8), database replicas
(0, 1). For now, assume "something" splits requests between two web copies; L1 shows it is a load
balancer.

**Predict before you run:** if you only add a second web copy, roughly what availability will you get? *(About 60%: the database still dies at 6 s with nothing to replace it.)*

**Goals:** `availability ≥ 95%` and `spofCount = 0`.

| Choice | Web copies | vCPU | DB replicas | Availability | spofCount |
|---|---|---|---|---|---|
| A | 2 | 2 | 1 | about 98.8% | 0 |
| B | 1 | 8 | 0 | about 30% | 2 |
| C | 2 | 2 | 0 | about 60% | 1 |
| D | 1 | 2 | 1 | about 30% | 1 |

On choice A, open **Events**: `instance.down` at 3 s, `db.primary-down` at 6 s, `db.promoted` at
6.6 s. The roughly 1.2% of failed requests fit inside the 0.6 s promotion window.

## Feedback
- **B**: 8 vCPUs do not stop a machine from dying. When the only web server goes at 3 s, nobody
  answers; the remaining 70% of the run is lost. And the database still has one copy.
- **C**: The web tier is safe: lose one, the other carries on. But at 6 s the only database dies with
  no replacement (`db.no-replica`). The last single point of failure still brings the system down.
- **D**: This time the database has a replica, but the only web server dies at 3 s, so no request
  reaches the database any more. Every link needs redundancy.
- **M3**: A backup is a saved copy of the data, not a second running machine. Restoring it takes
  minutes or hours, and the service is down the whole time. None of the controls here is a backup,
  because a backup alone would not change the result of this run.

## Takeaways
- A system is only as strong as its weakest link without a spare.
- Redundancy needs two things: a second copy and a way to switch to it.
- Failover is not instant; expect a short window of errors.

## Review questions
1. Define a single point of failure in your own words.
2. Why is choice C about 60% available? *(The database dies at 6 s with no replacement, so the last
   4 seconds are lost.)*
3. While a replica is being promoted, which requests fail? *(Writes.)*
4. A system has one LB, 3 web servers and 1 database with no replica. What is the smallest possible
   spofCount? *(At least 2 if the LB has one copy: the LB and the database.)*
