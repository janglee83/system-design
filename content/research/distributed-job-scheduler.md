# Distributed job schedulers — research note

- Level: L5
- Feeds lessons: `l5-job-scheduler`
- Builds on: `queues-and-workers`, `failure-detection-and-leader-election`,
  `delivery-semantics-and-idempotency`
- Researched: 2026-10-19

## Key facts (in our words)

1. **Two jobs in one: deciding *when* and doing the *work*.** A scheduler stores job definitions
   (cron expression or run-at time), decides which are due, and hands them to workers through a
   queue. Separating the two lets workers scale independently. [5][10]
2. **"Exactly once" execution is not available; plan for at-least-once.** Kubernetes says plainly
   that a CronJob may create two Jobs for one schedule, or none, in some failure cases, so job
   code should be idempotent. [1]
3. **Overlap and missed runs are policy decisions.** Kubernetes CronJob offers
   `concurrencyPolicy` (Allow, Forbid, Replace) for when the previous run is still going, and
   `startingDeadlineSeconds` for how late a missed run may still start. [1]
4. **The database can be the queue.** `SELECT … FOR UPDATE SKIP LOCKED` lets many workers each claim
   different due rows without blocking each other — a well-known way to build a job queue on
   PostgreSQL. [2]
5. **Claims need leases.** A worker that claims a job may crash; the claim should expire (visibility
   timeout in SQS, lease timestamp in a table) so another worker can pick it up. The timeout must
   exceed the normal job duration or the job runs twice. [3]
6. **A single active scheduler needs leader election.** If several scheduler replicas each fire the
   same cron entry, jobs run N times; one replica holds a lease (via etcd, ZooKeeper or a database
   row) and the others stand by. [4][11]
7. **Leases are not enough without fencing.** A paused process can believe it still holds the lease
   after it expired; a fencing token (monotonically increasing number checked by the resource)
   stops the stale holder from writing. [6][11]
8. **Dropbox's ATF** (async task framework) runs scheduled and delayed tasks with at-least-once
   execution, per-task retries and isolation between task types, and asks task owners to make tasks
   idempotent. [5]
9. **Slack put Kafka in front of Redis** for its job queue so enqueue survives Redis trouble; a
   relay moves jobs from Kafka into Redis at a rate the workers can absorb. [7]
10. **Spreading load avoids the top-of-the-hour spike.** Many cron jobs fire at :00; schedulers add
    jitter or let owners pick random minutes. [8][12]
11. **Cluster schedulers are a different problem.** Borg/Kubernetes place *processes* on machines
    (bin-packing, priorities, quotas); job schedulers trigger *tasks* at times. Large systems use
    both. [9]

## Numbers worth remembering

- Visibility timeout / lease ≥ p99 job duration + margin; heartbeat-extend for long jobs. [3]
- SQS default visibility timeout 30 s, max 12 h. [3]
- 1 M jobs due at midnight with 1,000 workers × 10 jobs/s = 100 s to drain (derived).

## Engine mapping

- Planned `queue`, `worker`, `postgres`; `duplicateWrites` and `peakQueueDepth` exist as metrics.
- Gap `leader-election-leases`: scheduler replicas with or without a lease, fencing tokens, and a
  `duplicateRuns` (≈ `duplicateWrites`) count under `instance-down` or a pause.
- Proposed small addition: a "cron spike" workload shape (all jobs due at the same second) vs
  jittered schedules.

## Misconceptions

- "Run the scheduler on two machines for availability." Both fire every job. [4]
- "A lock guarantees one run." Not after a pause past the lease; use fencing and idempotent jobs. [6]
- "Cron at :00 is fine." Everyone else picked :00 too. [8]

## Analogy ideas

- An office with one person allowed to ring the lunch bell: the one holding the bell rope (lease);
  if they faint, someone else takes the rope after a while — and the bell should not ring twice
  just because two people grabbed it.

## Caveats

- ATF and Slack descriptions are high level; we use them for patterns, not numbers.

## Sources

Primary:
1. *CronJob* — Kubernetes documentation — https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/ —
   accessed 2026-10-19.
2. *PostgreSQL 18 Documentation* — `SELECT`, "The Locking Clause" (`SKIP LOCKED`) —
   https://www.postgresql.org/docs/current/sql-select.html — accessed 2026-10-19.
3. *Amazon SQS visibility timeout* — AWS docs —
   https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-visibility-timeout.html —
   accessed 2026-10-19.
4. *Leases: An Efficient Fault-Tolerant Mechanism for Distributed File Cache Consistency* —
   C. Gray, D. Cheriton, SOSP — https://dl.acm.org/doi/10.1145/74850.74870 — 1989.
5. *Asynchronous task scheduling at Dropbox* — Dropbox Tech —
   https://dropbox.tech/infrastructure/asynchronous-task-scheduling-at-dropbox — 2020.
6. *How to do distributed locking* — Martin Kleppmann —
   https://martin.kleppmann.com/2016/02/08/how-to-do-distributed-locking.html — 2016.
7. *Scaling Slack's Job Queue* — Slack Engineering — https://slack.engineering/scaling-slacks-job-queue/ — 2020.
8. *Timeouts, retries, and backoff with jitter* — Marc Brooker, Amazon Builders' Library —
   https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/ — 2019.
9. *Large-scale cluster management at Google with Borg* — A. Verma et al., EuroSys —
   https://research.google/pubs/large-scale-cluster-management-at-google-with-borg/ — 2015.

Books:
10. [B31] *Designing Distributed Systems*, 2nd ed. — Burns — "Work Queue Systems" and
    "Event-Driven Batch Processing" chapters.
11. [B1] *Designing Data-Intensive Applications* — Kleppmann — ch. 8 "The Trouble with Distributed
    Systems" (process pauses, "the leader and the lock", fencing tokens).
12. [B6] *Patterns of Distributed Systems* — Joshi — "Lease", "Leader and Followers", "Heartbeat".

Repos:
13. [G34] etcd-io/raft — basis for etcd leases used for leader election —
    https://github.com/etcd-io/raft.
14. [G1] donnemartin/system-design-primer — asynchronism, task queues —
    https://github.com/donnemartin/system-design-primer.
