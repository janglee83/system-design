# What a database is (for beginners) — research note

- Level: L0
- Feeds lessons: `l0-database-basics`; background for every L2 lesson
- Researched: 2026-10-18

## Key facts (in our words)

1. **A database is a server whose job is to keep data safe and findable.** PostgreSQL, for
   example, runs a server process that owns the data files; web servers, tools and scripts
   connect to it as clients, often over the network. [1]
2. **Relational model:** data lives in tables; a table is a set of rows; every row has the same
   named, typed columns. SQL does not promise any row order unless you sort. [2]
3. **Why not keep data in the web server?** Web servers come and go (restarts, scaling, crashes);
   their memory and local disk are not a safe home for shared data. Twelve-factor guidance says
   app processes should be stateless and keep anything persistent in a backing service such as a
   database. [3]
4. **Transactions make multi-step changes all-or-nothing.** A money transfer that debits one
   account and credits another either fully happens or not at all; other users never see the
   half-done state; once committed, the change survives a crash. [4]
5. **The database is shared, so it is often the first bottleneck.** Every web server talks to the
   same database; adding web servers multiplies the queries arriving at it. Dynamic pages
   typically make one or more queries per request. [5][6]
6. **Each connection costs the database something.** PostgreSQL starts a dedicated server
   process per client connection, which is why connection counts matter (pooling is an L2 topic).
   [1]
7. **Real-world shape:** Stack Overflow (2016) served ~209 M HTTP requests/day with ~505 M SQL
   queries/day — more than two queries per request on average. [6]

## How this maps to the engine

- `postgres` node, reached through a `db` edge from a `web-server`. In 1a every request that
  enters a web server with a `db` edge also goes to the database (one query per request).
- Default capacity 5,000 queries/s per instance and 3 ms service time; it accepts writes on the
  primary; `readReplicas` (0–5) add instances (1a aggregates their capacity; spec §6.1 routes
  reads to replicas).
- Postgres has no `cpu` setting in 1a. A "bigger database" is expressed with the per-node
  overrides `rpsPerInstance` and `costPerMonth` (spec §6.7), which is allowed in L0.
- Scratch-model check at 6,000 rps, web 2 vCPU: standard DB → p95 ≈ 564 ms (DB saturated);
  web 4 vCPU → unchanged ≈ 564 ms; DB with `rpsPerInstance: 10000` → p95 ≈ 12 ms.
- Not modelled: data loss when a stateful server dies, query complexity, locks. A structural
  goal such as "writes must reach a durable store" would need custom checks (spec §4.4 mentions
  them; not in 1a) — recorded as an engine gap for later lessons.

## Misconceptions

- "The database is just a big file the web server opens." (It is a separate server with its own
  limits. [1])
- "If the site is slow, buy faster web servers." (If the database is the bottleneck, nothing
  changes. [5])
- "Data is safe as long as the web server is running." (Servers are disposable. [3])
- "Saving data is instant and can't half-fail." (That is what transactions are for. [4])

## Analogy ideas (ours)

- A library with one front desk: many readers (web servers) send requests; the librarian
  (database) fetches books from the stacks. Hiring more doormen does not help if the librarian
  is the one with a line.

## Sources

1. *PostgreSQL 18 Documentation, §1.2 Architectural Fundamentals* — The PostgreSQL Global
   Development Group — https://www.postgresql.org/docs/current/tutorial-arch.html — 2026.
2. *PostgreSQL 18 Documentation, §2.2 Concepts* — The PostgreSQL Global Development Group —
   https://www.postgresql.org/docs/current/tutorial-concepts.html — 2026.
3. *The Twelve-Factor App, VI. Processes* — Adam Wiggins (Heroku) —
   https://12factor.net/processes — 2011 (site maintained since).
4. *PostgreSQL 18 Documentation, §3.4 Transactions* — The PostgreSQL Global Development Group —
   https://www.postgresql.org/docs/current/tutorial-transactions.html — 2026.
5. *Client-Server overview* — MDN Web Docs, Mozilla —
   https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Server-side/First_steps/Client-Server_overview
   — last modified 2026-09-10.
6. *Stack Overflow: The Architecture – 2016 Edition* — Nick Craver —
   https://stackoverflow.blog/2016/02/17/stack-overflow-the-architecture-2016-edition/ —
   2016-02-17.
7. *Designing Data-Intensive Applications*, ch. 2 "Data Models and Query Languages" — Martin
   Kleppmann, O'Reilly — 2017.
