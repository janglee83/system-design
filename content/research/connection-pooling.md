# Database connections and connection pools — research note

- Level: L2
- Feeds lessons: `l2-connection-pooling`
- Researched: 2026-10-19

## Key facts (in our words)

1. **PostgreSQL serves each client connection with its own backend process**, so connections cost
   memory and scheduling even when idle. [1][2]
2. **`max_connections` caps concurrent connections** (default 100); beyond it new connections are
   refused. Raising it costs memory per connection. [2]
3. **A connection pool keeps a small set of open connections and lends them to requests**, so the
   database sees a bounded, steady number of sessions. [3][4]
4. **PgBouncer pools in three modes** — session, transaction, statement — trading compatibility (e.g.
   session state, prepared statements) for how many clients can share one server connection. [3]
5. **Bigger pools are not faster.** Pool sizing guidance (HikariCP) argues that a database with a
   handful of cores does best with a pool around a small multiple of its cores; more connections
   just queue inside the database. [5]
6. **Horizontal scaling multiplies connections.** 50 app instances × a pool of 20 = 1,000 database
   connections; this is why proxies such as RDS Proxy and PgBouncer sit between fleets and the
   database. [6][3]
7. **Little's Law sizes the pool**: connections in use ≈ queries per second × query time. 2,000 qps
   × 5 ms ≈ 10 busy connections. [7][8]

## Engine mapping

- 1a reports `peakDbConnections` (≈ served × latency + queue on the DB node) but does not enforce a
  limit. The experiment (too many app instances exhausting connections) needs an enforced limit and a
  pool setting → gap `postgres-max-connections`.

## Misconceptions

- "More connections = more throughput." Past the core count, they add contention. [5]
- "Each server can open as many connections as it likes." The database's limit is shared. [2][6]
- "Idle connections are free." Each is a process with memory. [1]

## Sources

Primary:
1. *PostgreSQL 18 Documentation, §1.2 Architectural Fundamentals* — PGDG —
   https://www.postgresql.org/docs/current/tutorial-arch.html — 2026.
2. *PostgreSQL 18 Documentation, "Connections and Authentication"* — PGDG —
   https://www.postgresql.org/docs/current/runtime-config-connection.html — 2026.
3. *PgBouncer — Features* (pooling modes) — PgBouncer project — https://www.pgbouncer.org/features.html
   — accessed 2026-10-19.
4. *Using Amazon RDS Proxy* — AWS docs —
   https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/rds-proxy.html — accessed 2026-10-19.
5. *About Pool Sizing* — Brett Wooldridge, HikariCP wiki —
   https://github.com/brettwooldridge/HikariCP/wiki/About-Pool-Sizing — accessed 2026-10-19.
6. *Stack Overflow: The Architecture – 2016 Edition* (few powerful DB servers serving many web
   servers) — Nick Craver — https://stackoverflow.blog/2016/02/17/stack-overflow-the-architecture-2016-edition/ — 2016.
7. *Little's Law as Viewed on Its 50th Anniversary* — J. D. C. Little —
   https://pubsonline.informs.org/doi/10.1287/opre.1110.0940 — 2011.

Books:
8. [B12] *Database Reliability Engineering* — Campbell, Majors — chapter on infrastructure for
   datastores / connection management.
9. [B11] *High Performance MySQL*, 4th ed. — Botros, Tinley — chapter on server configuration and
   scaling.
10. [B10] *PostgreSQL Documentation* — "Server Configuration → Connections".

Repos:
11. [G1] donnemartin/system-design-primer — "SQL tuning" section —
    https://github.com/donnemartin/system-design-primer.
