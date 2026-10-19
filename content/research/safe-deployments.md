# Safe deployments: canaries, waves, feature flags and rollback — research note

- Level: L6 (builds on `l1-rolling-deploys`)
- Feeds lessons: `l6-safe-deployments`
- Builds on: `health-checks-and-failover`, `slo-burn-rate-alerting`, `incident-response-and-debugging`
- Researched: 2026-10-19

## Key facts (in our words)

1. **Change is the main cause of outages**, so the deployment process is a reliability control, not
   just a delivery tool. [1][2]
2. **Rolling updates** replace instances a few at a time; Kubernetes Deployments bound the process
   with `maxUnavailable` (how many may be down) and `maxSurge` (how many extra may be created), and
   only proceed when new pods pass readiness checks. [3]
3. **Canaries compare, not just watch.** A canary sends a small share of traffic to the new version
   and compares its metrics with the old version (the baseline) running at the same time, so daily
   traffic patterns do not fool the comparison. Netflix's Kayenta automates this statistical
   comparison. [4][5]
4. **Deploy in waves with bake time.** Amazon deploys first to a single box, then to one zone, then
   wider, region by region, waiting ("baking") between waves and rolling back automatically when
   alarms fire; it avoids changing many regions at once so a bad change cannot take out redundancy
   everywhere. [6]
5. **Rollback must be safe too.** If version N+1 writes data that version N cannot read, rolling back
   breaks things. Amazon's guidance is a two-phase deployment: first ship code that can *read* the
   new format, then ship code that *writes* it. [7]
6. **Blue/green**: run the new version as a full second environment and switch traffic at the router;
   switching back is instant, at the cost of double capacity during the switch. [8]
7. **Feature flags decouple deploy from release.** Code ships dark and is turned on for a percentage
   of users, a region or internal staff; a flag flip is faster than a redeploy for mitigation. Flags
   are themselves configuration changes and need cleanup. [9]
8. **Configuration is code.** Several famous outages came from configuration or content pushed
   globally at once — Cloudflare's 2019 WAF rule, and the July 2024 CrowdStrike content update that
   crashed Windows machines worldwide — showing that config/content needs the same staged rollout
   and validation as binaries. [10][11]
9. **Automate the stop.** Tie rollout progress to SLO burn-rate or error alarms so a bad canary halts
   and rolls back without waiting for a human. [6][12]
10. **Deploy small and often.** Small changes are easier to canary, diagnose and roll back than big
    batched releases. [12][13]

## Numbers worth remembering

- Canary share: typically 1–5% of traffic, for long enough to see enough requests to compare.
- Wave pattern (Amazon style): 1 box → 1 zone → 1 region → remaining regions in growing waves,
  with bake times between. [6]
- Kubernetes defaults: `maxSurge` 25%, `maxUnavailable` 25%. [3]

## Engine mapping

- Gap `deployment-model`: versions per instance, a `bad-deploy` fault (new version slower or failing
  a percentage of requests), rollout strategies (all-at-once / rolling / canary with auto-rollback),
  metrics `availability`, `p95`, proposed `badRequestsServed` (users affected before rollback).
- Gap `connection-draining` for graceful replacement.

## Misconceptions

- "Tests passed, so deploy everywhere." Production differs; stage it. [6]
- "We can always roll back." Not if the new version changed data formats. [7]
- "Config changes are safe; they're not code." Many big outages were config. [10][11]
- "A canary is a single instance we glance at." Compare against a baseline with automation. [4][5]

## Analogy ideas

- A restaurant trying a new recipe: one table gets it first, the chef compares their reaction with
  tables eating the old recipe, and the old recipe stays ready.

## Caveats

- Wave structures are Amazon's; smaller teams compress them (one canary, then all).

## Sources

Primary:
1. *Site Reliability Engineering*, ch. 1 "Introduction" (change management) — Google —
   https://sre.google/sre-book/introduction/ — 2016.
2. *The Site Reliability Workbook*, ch. 16 "Canarying Releases" — Google —
   https://sre.google/workbook/canarying-releases/ — 2018.
3. *Deployments — Rolling Update Deployment* — Kubernetes documentation —
   https://kubernetes.io/docs/concepts/workloads/controllers/deployment/ — accessed 2026-10-19.
4. *Automated Canary Analysis at Netflix with Kayenta* — Netflix Technology Blog —
   https://netflixtechblog.com/automated-canary-analysis-at-netflix-with-kayenta-3260bc7acc69 — 2018.
5. *Spinnaker — Canary overview* — Spinnaker docs — https://spinnaker.io/docs/guides/user/canary/ —
   accessed 2026-10-19.
6. *Automating safe, hands-off deployments* — Clare Liguori, Amazon Builders' Library —
   https://aws.amazon.com/builders-library/automating-safe-hands-off-deployments/ — 2020.
7. *Ensuring rollback safety during deployments* — Sandeep Pokkunuri, Amazon Builders' Library —
   https://aws.amazon.com/builders-library/ensuring-rollback-safety-during-deployments/ — 2020.
8. *BlueGreenDeployment* — Martin Fowler — https://martinfowler.com/bliki/BlueGreenDeployment.html — 2010.
9. *Feature Toggles (aka Feature Flags)* — Pete Hodgson, martinfowler.com —
   https://martinfowler.com/articles/feature-toggles.html — 2017.
10. *Details of the Cloudflare outage on July 2, 2019* — Cloudflare Blog —
    https://blog.cloudflare.com/details-of-the-cloudflare-outage-on-july-2-2019/ — 2019.
11. *Channel File 291 Incident: Root Cause Analysis* — CrowdStrike —
    https://www.crowdstrike.com/wp-content/uploads/2024/08/Channel-File-291-Incident-Root-Cause-Analysis-08.06.2024.pdf — 2024.

Books:
12. [B17] *The Site Reliability Workbook* — ch. 16 "Canarying Releases".
13. [B26] *Building Microservices*, 2nd ed. — Newman — ch. 8 "Deployment" (progressive delivery,
    feature toggles, canary, blue/green).
14. [B19] *Release It!*, 2nd ed. — Nygard — ch. 13 "Design for Deployment".

Repos:
15. [G16] danluu/post-mortems — config-change incidents — https://github.com/danluu/post-mortems.
16. [G14] upgundecha/howtheysre — release engineering practices — https://github.com/upgundecha/howtheysre.
