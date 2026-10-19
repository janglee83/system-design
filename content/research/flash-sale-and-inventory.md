# Flash sales, limited inventory and bookings — research note

- Level: L5
- Feeds lessons: `l5-flash-sale`, `l5-hotel-booking` (challenge `c-l5-flash-sale`, part of `c-l5-exit-marketplace`)
- Builds on: `transactions-and-isolation`, `rate-limiting`, `queues-and-workers`, `delivery-semantics-and-idempotency`
- Researched: 2026-10-19

## Key facts (in our words)

1. **Overselling is a lost-update race.** The naive flow "read stock, check > 0, write stock − 1"
   lets two buyers read the same value and both succeed. It is the classic read-modify-write anomaly
   that weak isolation does not prevent. [1][2][11]
2. **An atomic conditional update closes the race cheaply.** `UPDATE item SET stock = stock - 1
   WHERE id = $1 AND stock > 0` and checking "rows affected = 1" lets the database serialise the
   decrements. In PostgreSQL's default Read Committed level a concurrent `UPDATE` waits for the
   first writer to finish and then re-checks its `WHERE` clause against the new row version, so the
   last unit cannot be sold twice. [1]
3. **Alternatives with different costs**: a pessimistic row lock (`SELECT … FOR UPDATE`, then
   update) holds the lock across the application's round trip; optimistic concurrency (a version
   column, retry on conflict) wastes work when contention is high; the `SERIALIZABLE` level detects
   the anomaly but aborts with a serialization failure the application must retry. [1][2][3]
4. **One hot row caps throughput.** Every buyer of the same product competes for one row lock, so
   decrements are serial: if a transaction holds the lock for about 2 ms, that row can absorb only
   about 500 successful decrements per second whatever the hardware (derived: 1 / lock-hold time).
   Splitting stock into several sub-counters ("buckets") or pre-allocating units spreads the
   contention. [2][11]
5. **An in-memory counter can gate the database.** Redis runs commands one at a time, so `DECR` is
   atomic and a Lua script executed with `EVAL` runs as one atomic step (check-and-decrement in a
   single call). A common pattern: decrement a Redis counter first, reject immediately when it goes
   below zero, and only send winners to the durable order path. The durable database remains the
   source of truth; the counter must be reconciled if Redis restarts. [4][5]
6. **Admission control beats raw capacity.** For a few minutes, demand can be 10–100× normal while
   the sellable units are fixed. Instead of scaling everything, sales put buyers in a waiting room
   or queue and admit them at a rate the checkout path can handle. Cloudflare's Waiting Room admits
   users based on configured "total active users" and "new users per minute" limits. [6][7]
7. **Shopify throttles checkout at the load balancer.** Shopify's edge tier (NGINX + OpenResty Lua)
   ran a leaky-bucket throttle in front of checkout: per short period it let through only as many
   buyers as the application could process, sent the rest to a cached "you are in the queue" page
   that polled again, and gave admitted buyers a signed cookie so they were not throttled twice.
   Random polling made waits unfair (some buyers waited very long), which led Shopify to a fairer
   queue design in a follow-up. [7]
8. **Reservations with expiry**: many systems "hold" a unit for a short time (for example 10
   minutes) while the buyer pays, then release it if payment does not complete. The hold is a row
   with an expiry time; a sweeper or a conditional check releases stale holds. [11][12]
9. **Bookings are inventory over ranges.** A hotel room or seat is inventory per (room type, date)
   or per (seat, show). PostgreSQL can enforce "no two bookings of the same room overlap" with an
   exclusion constraint over a range column (`EXCLUDE USING gist (room_id WITH =, stay WITH &&)`),
   which turns the race into a constraint violation instead of a double booking. [8]
10. **Write skew is the booking-specific anomaly.** Two transactions each check "is the room free?"
    and each insert a different booking row; no single row is updated twice, so row locks on
    existing rows do not help. Fixes: a constraint, materialising the conflict (lock a per-day
    inventory row), or `SERIALIZABLE`. [2][1]
11. **Double clicks and retries create duplicate orders.** An idempotency key per checkout attempt
    makes the "place order" call safe to retry. [9][13]
12. **Bots and fairness**: per-user and per-IP limits, purchase caps per account and challenge pages
    stop scripts from taking the whole stock; these are product rules as much as technical ones.
    [6][14]

## Numbers worth remembering

- Hot-row ceiling ≈ 1 / lock-hold time: 2 ms → ~500 decrements/s; 10 ms (lock held across an app
  round trip) → ~100/s. (Derived arithmetic, not a benchmark.)
- Redis executes commands on a single thread per instance; a single-key counter is bounded by one
  core but at very high rates (typically tens of thousands of ops/s or more). [4][5]
- A sale of 1,000 units with 100,000 buyers in the first minute: 99% of requests must end in a
  fast, friendly "sold out" — the rejection path is the main path.

## Engine mapping

- Needs gap `inventory-concurrency-control`: a fixed `inventory` parameter, concurrent decrements,
  an `oversold` metric (today approximated by `writeConflicts`/`lostUpdates`), and strategy choices
  (naive read-then-write, conditional update, row lock, Redis pre-decrement, admission queue).
- Planned features already help: `rate-limiting`, `api-gateway`, `queue`/`worker`, `redis`,
  `traffic-surge-3x`. A waiting room is "rate-limiting + queue" in engine terms.
- `l5-hotel-booking` also needs a range-overlap check: proposed extension of the same gap
  (`doubleBookings` metric).

## Misconceptions

- "A transaction prevents overselling." Not at Read Committed with read-then-write in the app. [1][2]
- "Just scale the database." One hot row is serial; more replicas do not add write capacity. [2]
- "Put the counter in Redis and we are done." Without reconciliation, a restart or failover can
  lose decrements and oversell or undersell. [4]
- "Rejecting most buyers is a failure." With fixed stock it is the expected outcome; the goal is
  fast, fair rejection.

## Analogy ideas

- A bakery with 50 croissants: either one cashier crosses off a tally (row lock), or everyone grabs
  a numbered ticket at the door and only tickets 1–50 get in (admission queue).
- Double booking: two receptionists each look at the paper calendar, see the room free, and each
  write a guest in on different lines (write skew).

## Caveats

- The Shopify and Cloudflare descriptions are of their own products/infrastructure; we use them for
  the idea (admission control), not for numbers.
- Redis atomicity applies to one instance; Redis Cluster scripts must touch keys in one hash slot.

## Sources

Primary:
1. *PostgreSQL 18 Documentation*, §13.2 "Transaction Isolation" (Read Committed update behaviour,
   Serializable) and §13.3 "Explicit Locking" — PostgreSQL Global Development Group —
   https://www.postgresql.org/docs/current/transaction-iso.html and
   https://www.postgresql.org/docs/current/explicit-locking.html — accessed 2026-10-19.
2. *A Critique of ANSI SQL Isolation Levels* — H. Berenson, P. Bernstein, J. Gray, J. Melton,
   E. O'Neil, P. O'Neil, SIGMOD — https://arxiv.org/abs/cs/0701157 — 1995 (arXiv copy 2007).
3. *Serializable Snapshot Isolation in PostgreSQL* — D. R. K. Ports, K. Grittner, VLDB —
   https://arxiv.org/abs/1208.4179 — 2012.
4. *DECR* command reference — Redis — https://redis.io/docs/latest/commands/decr/ — accessed 2026-10-19.
5. *Scripting with Lua* (atomic execution of scripts) — Redis —
   https://redis.io/docs/latest/develop/interact/programmability/eval-intro/ — accessed 2026-10-19.
6. *Waiting Room — How it works / settings* — Cloudflare Docs —
   https://developers.cloudflare.com/waiting-room/ — accessed 2026-10-19.
7. *Surviving Flashes of High-Write Traffic Using Scriptable Load Balancers (Part I)* — Shopify
   Engineering (Emil Stolarsky) — https://shopify.engineering/surviving-flashes-of-high-write-traffic-using-scriptable-load-balancers-part-i — 2017-02-03.
8. *PostgreSQL 18 Documentation*, §8.17.10 "Constraints on Ranges" (exclusion constraints) —
   https://www.postgresql.org/docs/current/rangetypes.html — accessed 2026-10-19.
9. *Idempotent requests* — Stripe API reference — https://docs.stripe.com/api/idempotent_requests —
   accessed 2026-10-19.

Books:
11. [B1] *Designing Data-Intensive Applications* — Kleppmann — ch. 7 "Transactions" (lost updates,
    atomic write operations, explicit locking, write skew and phantoms, materialising conflicts).
12. [B41] *System Design Interview*, vol. 2 — Xu, Lam — "Hotel Reservation System" chapter (topic
    map only).
13. [B43] *Acing the System Design Interview* — Tan — distributed transactions chapter (topic map only).
14. [B14] *Redis in Action* — Carlson — ch. 6 "Application components in Redis" (counters, locks)
    and ch. 11 "Scripting Redis with Lua".

Repos:
15. [G1] donnemartin/system-design-primer — consistency patterns, "Design Amazon's sales ranking"
    exercise — https://github.com/donnemartin/system-design-primer.
16. [G11] binhnguyennus/awesome-scalability — flash-sale and e-commerce posts —
    https://github.com/binhnguyennus/awesome-scalability.
