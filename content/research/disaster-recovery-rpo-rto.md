# Disaster recovery: RPO, RTO, backups and standby regions — research note

- Level: L6
- Feeds lessons: `l6-active-passive-dr` (challenge `c-l6-global-checkout-lite`)
- Builds on: `replication-and-failover`, `multi-region-and-geo-routing`, `health-checks-and-failover`
- Researched: 2026-10-19

## Key facts (in our words)

1. **Two numbers define a DR target.** RPO (recovery point objective) is how much recent data you
   can afford to lose, measured as time; RTO (recovery time objective) is how long the service may
   be down before it is back. Both are business decisions that drive cost. [1][2]
2. **Four standard strategies, cheapest to most expensive**: backup and restore (RPO/RTO in hours),
   pilot light (data replicated, core services off), warm standby (scaled-down copy running), and
   multi-site active/active (near-zero RTO). [1]
3. **Asynchronous replication means RPO > 0.** If the primary region dies, writes acknowledged
   there but not yet copied are lost. Managed cross-region databases report typical lags of about a
   second (for example Aurora Global Database), so RPO is "seconds", not zero. [3][12]
4. **Synchronous cross-region replication costs latency on every write.** Waiting for a remote
   region adds at least one inter-region round trip to each commit. [12][13]
5. **Backups only count if restores work.** GitLab's 2017 outage lost about six hours of production
   database data partly because several backup mechanisms had silently not been working; they
   learned it during the incident. [4]
6. **Google's rule of thumb**: nobody really wants backups, they want restores — so test restores
   regularly, and defend against deletion and corruption (which replication faithfully copies) with
   point-in-time backups kept separately. [5]
7. **Point-in-time recovery** replays the write-ahead log on top of a base backup to any moment,
   which recovers from "someone ran DELETE without WHERE at 14:02". PostgreSQL supports continuous
   WAL archiving for this. [6]
8. **Failover must fence the old primary.** If the old region comes back and still accepts writes,
   you get two primaries (split brain). Promotion should block or fence the old writer. [7][12]
9. **Failback is a second migration.** After the disaster, moving back means re-syncing data from the
   new primary to the old region; plan and practise it too. [1][11]
10. **Manual vs automatic regional failover.** Many teams keep region-level failover as a human
    decision (with automation behind a button) because false positives are very expensive, while
    zone-level failover is automatic. [2][8]
11. **DR plans rot without drills.** Game days and region evacuation exercises (Netflix, Google
    DiRT) find missing permissions, stale runbooks and hidden dependencies. [8][9]

## Numbers worth remembering

- Backup & restore: RPO ≈ backup interval (e.g. 24 h, or minutes with WAL archiving); RTO hours.
- Warm standby: RPO seconds (async lag), RTO minutes (scale-up + DNS/anycast switch).
- Active/active: RPO ≈ replication lag for conflicting data, RTO ≈ routing switch time. [1]
- Aurora Global Database: typical cross-region lag under 1 s. [3]

## Engine mapping

- Gaps `regions-and-geo-routing` and `replication-lag-model` (cross-region lag → `lostUpdates` on
  `region-down`). Metrics: `availability` (RTO effect), `lostUpdates` (RPO effect), `costPerMonth`
  (standby cost).
- Proposed fault `region-down` (part of `regions-and-geo-routing`) and a "standby size" setting so
  learners trade standby cost against recovery time.

## Misconceptions

- "Replication is a backup." Deletes and corruption replicate too. [5]
- "Our RPO is zero because we replicate." Only if replication is synchronous. [3][12]
- "We have backups, so we're safe." Untested backups may not restore. [4]
- "Failover is the hard part." Fencing the old primary and failing back are just as hard. [7][11]

## Analogy ideas

- A notebook you photocopy every evening (backup): if the house burns at 17:00 you lose the day's
  notes (RPO = since last copy) and need time to buy a new notebook and copy back (RTO).

## Caveats

- Lags and recovery times depend on write volume and configuration; treat numbers as typical.

## Sources

Primary:
1. *Disaster Recovery of Workloads on AWS: Recovery in the Cloud* (whitepaper; DR options) — AWS —
   https://docs.aws.amazon.com/whitepapers/latest/disaster-recovery-workloads-on-aws/disaster-recovery-options-in-the-cloud.html — 2021.
2. *Reliability pillar — Plan for disaster recovery* — AWS Well-Architected Framework —
   https://docs.aws.amazon.com/wellarchitected/latest/reliability-pillar/plan-for-disaster-recovery-dr.html — accessed 2026-10-19.
3. *Using Amazon Aurora Global Database* — AWS docs —
   https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-global-database.html — accessed 2026-10-19.
4. *Postmortem of database outage of January 31* — GitLab —
   https://about.gitlab.com/blog/postmortem-of-database-outage-of-january-31/ — 2017.
5. *Site Reliability Engineering*, ch. 26 "Data Integrity: What You Read Is What You Wrote" —
   Google — https://sre.google/sre-book/data-integrity/ — 2016.
6. *PostgreSQL 18 Documentation*, §25.3 "Continuous Archiving and Point-in-Time Recovery (PITR)" —
   https://www.postgresql.org/docs/current/continuous-archiving.html — accessed 2026-10-19.
7. *Leader election in distributed systems* — Marc Brooker, Amazon Builders' Library —
   https://aws.amazon.com/builders-library/leader-election-in-distributed-systems/ — 2019.
8. *Weathering the Unexpected* (DiRT disaster recovery testing) — Kripa Krishnan, ACM Queue —
   https://queue.acm.org/detail.cfm?id=2371516 — 2012.
9. *Project Nimble: Region Evacuation Reimagined* — Netflix Technology Blog —
   https://netflixtechblog.com/project-nimble-region-evacuation-reimagined-d0d0568254d4 — 2018.

Books:
11. [B12] *Database Reliability Engineering* — Campbell, Majors — ch. 7 "Backup and Recovery".
12. [B1] *Designing Data-Intensive Applications* — Kleppmann — ch. 5 (synchronous vs asynchronous
    replication, failover problems, split brain).
13. [B18] *Building Secure and Reliable Systems* — Adkins et al. — ch. 9 "Design for Recovery".

Repos:
14. [G16] danluu/post-mortems — database and backup incidents — https://github.com/danluu/post-mortems.
15. [G3] karanpratapsingh/system-design — "Disaster recovery" chapter —
    https://github.com/karanpratapsingh/system-design.
