# Notification system — research note

- Level: L5
- Feeds lessons: `l5-notification-system` (challenge `c-l5-notifications`)
- Researched: 2026-10-19

## Key facts (in our words)

1. **Channels are third parties**: mobile push goes through Apple APNs and Firebase Cloud Messaging,
   SMS through carriers/aggregators, email through mail providers. Your system prepares and hands
   off; delivery depends on them. [1][2][3]
2. **Pipeline**: event → notification service (templates, user preferences, opt-outs) → per-channel
   queues → channel workers → provider. Queues isolate a slow channel from the others. [4][9]
3. **Retries with backoff** for transient provider errors; **dead-letter** after N attempts;
   **idempotency/dedupe** so a retried send does not notify twice. [5][6][10]
4. **Device tokens expire**; providers report invalid tokens, which must be pruned. [1][2]
5. **Rate and frequency capping** protect users from spam and protect providers' quotas; LinkedIn's
   notification platform decides when and how often to notify each member. [7]
6. **Fan-out events** (one event → millions of users) are expanded asynchronously in batches. [4][8]
7. **Delivery tracking** (sent, delivered, opened) needs its own event pipeline. [3][9]

## Engine mapping

- Queues, workers, retries, circuit breakers and `third-party-down/slow` faults are planned; a node
  for the external provider is not → gap `third-party-node`; dedupe → gap `idempotency-keys`.

## Misconceptions

- "Sending = delivering." Providers queue, throttle and drop. [1][2]
- "Retry until it works." Without dedupe, users get duplicates; without limits, you DDoS the
  provider. [5][6]

## Sources

Primary:
1. *Sending notification requests to APNs* — Apple Developer Documentation —
   https://developer.apple.com/documentation/usernotifications/sending-notification-requests-to-apns —
   accessed 2026-10-19.
2. *Firebase Cloud Messaging* — Google Firebase docs — https://firebase.google.com/docs/cloud-messaging —
   accessed 2026-10-19.
3. *What is Amazon SNS?* — AWS docs — https://docs.aws.amazon.com/sns/latest/dg/welcome.html — accessed 2026-10-19.
4. *Competing Consumers pattern* — Azure Architecture Center —
   https://learn.microsoft.com/en-us/azure/architecture/patterns/competing-consumers — accessed 2026-10-19.
5. *Timeouts, retries, and backoff with jitter* — Amazon Builders' Library —
   https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/ — 2019.
6. *Idempotent requests* — Stripe API reference — https://docs.stripe.com/api/idempotent_requests — accessed 2026-10-19.
7. *Concourse: Generating Personalized Content Notifications in Near-Real-Time* — LinkedIn
   Engineering — https://engineering.linkedin.com/blog/2018/05/concourse--generating-personalized-content-notifications-in-near — 2018.
8. *Scaling Memcache at Facebook* (batching fan-out reads) — NSDI '13 —
   https://pdos.csail.mit.edu/6.824/papers/memcache-fb.pdf — 2013.

Books:
9. [B40] *System Design Interview*, vol. 1 — Xu — ch. 10 "Design a Notification System" (topic map
   only).
10. [B28] *Enterprise Integration Patterns* — Hohpe, Woolf — "Guaranteed Delivery", "Dead Letter
    Channel", "Idempotent Receiver".
11. [B19] *Release It!*, 2nd ed. — Nygard — integration points, circuit breakers.

Repos:
12. [G5] InterviewReady/system-design-resources — notification and messaging case studies —
    https://github.com/InterviewReady/system-design-resources.
13. [G11] binhnguyennus/awesome-scalability — https://github.com/binhnguyennus/awesome-scalability.
