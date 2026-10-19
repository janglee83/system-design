# Availability, nines and single points of failure — research note

- Level: L0
- Feeds lessons: `l0-single-point-of-failure`, `l0-availability-nines`; background for
  `l1-lb-redundancy`, `l1-n-plus-one`, `l2-db-failover`
- Researched: 2026-10-18

## Key facts (in our words)

1. **Availability = share of time (or of requests) the service does its job.** Time-based:
   available time / total time. Request-based: successful requests / valid requests, often
   computed per minute and averaged. [1][2]
2. **"Nines" shorthand.** 99% ≈ 3 days 15 h down per year; 99.9% ≈ 8 h 45 min; 99.95% ≈ 4 h
   22 min; 99.99% ≈ 52 min; 99.999% ≈ 5 min. [1]
3. **Serial (hard) dependencies multiply.** If a service needs two others, each at 99.99%, the
   best it can do is 99.99% × 99.99% × 99.99% ≈ 99.97%. Every extra hard dependency lowers the
   ceiling. [1]
4. **Independent redundant copies multiply failure chances.** Two independent components at
   99.9% each, either of which is enough: 1 − (0.001 × 0.001) = 99.9999%. Independence is the
   key assumption (same rack, same zone, same bug = not independent). [1][5]
5. **MTBF and MTTR.** Availability ≈ MTBF / (MTBF + MTTR). Recovering faster raises
   availability as much as failing less often. [1]
6. **Single point of failure (SPOF):** a component whose failure alone takes the service down.
   Removing SPOFs means having a second copy *and* a way to switch to it (a load balancer, a
   failover). [3][5]
7. **Failover takes time.** A database replica must be promoted before it accepts writes; during
   that window writes fail. [6]
8. **More nines cost more.** Each extra nine costs disproportionately more engineering and money;
   Google SRE argues 100% is the wrong target and uses error budgets instead. [2][1]

## Numbers worth remembering

| Target | Max downtime / year [1] |
|---|---|
| 99% | 3 d 15 h |
| 99.9% | 8 h 45 min |
| 99.99% | 52 min |
| 99.999% | 5 min |

## How this maps to the engine

- `availability` metric = requests OK / total requests in the run (request-based).
- `spofCount` = reachable non-client nodes with only one instance (plan 1a `finish()`).
- Faults available in 1a: `instance-down` (a web instance), `lb-node-down`, `db-primary-down`.
  `db-primary-down` with `readReplicas: 0` → writes and reads fail for the rest of the run
  (`db.no-replica`); with a replica → promotion after `pgFailoverMs` (600 ms) (`db.promoted`).
- Scratch-model check, 2,000 rps, web (2 vCPU) → postgres, faults instance-down at 3 s and
  db-primary-down at 6 s: 1 web + 0 replicas → availability 0.30; 2 web + 0 replicas → 0.60;
  1 web + 1 replica → 0.30; 2 web + 1 replica → 0.988 and `spofCount` 0. A single big 8-vCPU
  web server → 0.30.

## Misconceptions

- "A powerful server will not fail." (Size does not prevent failure. [3])
- "Adding copies somewhere makes the whole system redundant." (Any remaining SPOF still takes
  you down. [1])
- "99% sounds almost perfect." (That is more than 3.5 days of downtime a year. [1])
- "Backups make us highly available." (Backups protect data; they do not keep the service up
  while you restore.)

## Analogy ideas (ours)

- A car with a spare tyre but no jack: you have redundancy but no way to switch to it.

## Sources

1. *AWS Well-Architected Framework — Reliability Pillar: Availability* — Amazon Web Services —
   https://docs.aws.amazon.com/wellarchitected/latest/reliability-pillar/availability.html —
   accessed 2026-10-18.
2. *Site Reliability Engineering*, ch. 3 "Embracing Risk" — Marc Alvidrez, ed. Beyer et al.,
   Google / O'Reilly — https://sre.google/sre-book/embracing-risk/ — 2016.
3. *Regions and Zones* (Amazon EC2 User Guide) — Amazon Web Services —
   https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/using-regions-availability-zones.html —
   accessed 2026-10-18.
4. *Availability and Beyond: Understanding and Improving the Resilience of Distributed Systems
   on AWS* — Amazon Web Services whitepaper —
   https://docs.aws.amazon.com/whitepapers/latest/availability-and-beyond-improving-resilience/availability-and-beyond-improving-resilience.html
   — 2021-11-12.
5. *How Elastic Load Balancing works* — Amazon Web Services documentation —
   https://docs.aws.amazon.com/elasticloadbalancing/latest/userguide/how-elastic-load-balancing-works.html
   — accessed 2026-10-18.
6. *Sub-project 1: sim engine — Design*, §6.3 "Database failover" — System Design Lab (internal)
   — `docs/superpowers/specs/2026-10-18-sim-engine-design.md` — 2026-10-18.
