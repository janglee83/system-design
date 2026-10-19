# Chaos engineering — research note

- Level: L6
- Feeds lessons: `l6-chaos-engineering` (challenge modes named `chaos` across levels)
- Builds on: `incident-response-and-debugging`, `availability-and-spof`, `health-checks-and-failover`
- Researched: 2026-10-19

## Key facts (in our words)

1. **Chaos engineering is experimentation, not random breakage.** The Principles of Chaos
   Engineering describe it as running experiments on a system to build confidence that it can
   withstand turbulent conditions in production. [1]
2. **The experiment loop**: define steady state as a measurable output (orders per minute, stream
   starts per second); hypothesise that it will hold in both a control and an experimental group;
   inject a real-world event (instance loss, latency, dependency failure); look for a difference
   between groups. A difference disproves the hypothesis and reveals a weakness. [1][2]
3. **Minimise blast radius.** Start small (one instance, a tiny share of traffic), with automatic
   stop conditions, and expand only as confidence grows. [1][3][4]
4. **Netflix's path**: Chaos Monkey (2011) randomly terminated production instances during business
   hours so engineers built services that survive instance loss; later the Chaos Automation
   Platform (ChAP) ran fine-grained experiments that injected failures into requests for a small,
   matched pair of control and experiment user groups and stopped automatically if key metrics
   diverged. [5][6][2]
5. **Managed tools exist.** AWS Fault Injection Service runs experiment templates (stop instances,
   add latency, throttle APIs) with stop conditions tied to CloudWatch alarms. [4]
6. **Game days and disaster tests** rehearse large failures with people in the loop: Google's DiRT
   exercises tested both systems and processes (who gets paged, whether runbooks work); AWS
   recommends regular game days in its Well-Architected reliability guidance. [7][3]
7. **Test what you depend on.** Many weaknesses are in timeouts, retries and fallbacks between
   services rather than in a single box; latency injection often finds more than kill tests. [2][11]
8. **Jepsen is chaos for correctness.** It injects partitions, clock skew and crashes into
   distributed databases and checks the history of operations against the claimed consistency
   model, finding real bugs in many systems. [8]
9. **Prerequisites**: good observability (you must see the steady state), a way to stop quickly,
   and organisational agreement; doing chaos without them only causes outages. [1][12]
10. **Run it continuously.** Systems change every day; an experiment that passed last quarter can
    fail after a new dependency appears, so automate experiments in pipelines. [1][2]

## Numbers worth remembering

- ChAP style: experiment and control groups each a small fraction of traffic (well under 1% in
  Netflix's description). [2]
- Stop conditions: automatic abort when a key metric deviates beyond a threshold.

## Engine mapping

- `needs-1b`: the engine's fault schedule is chaos injection; `chaos` modes exist in many
  challenges. The lesson asks learners to state a steady-state hypothesis (goal metrics), inject
  faults, and compare against a control run.
- Proposed gap `control-vs-experiment-runs`: run the same seed with and without faults and report
  the difference (the engine is deterministic, which makes this cheap).

## Misconceptions

- "Chaos engineering means breaking production randomly." It is controlled experiments with a
  hypothesis. [1]
- "Only Netflix-scale companies need it." Small blast radius experiments help anyone with
  redundancy to verify. [3][12]
- "If the test passed once, we're done." Systems drift. [1]
- "Killing instances is enough." Latency and partial failures find more. [2]

## Analogy ideas

- A fire drill: announced, small, with marshals ready to stop it; you learn whether the exits and
  the alarm actually work.

## Caveats

- Netflix percentages and tooling are from their public posts; tools change.

## Sources

Primary:
1. *Principles of Chaos Engineering* — principlesofchaos.org — https://principlesofchaos.org/ —
   2019 revision, accessed 2026-10-19.
2. *ChAP: Chaos Automation Platform* — Netflix Technology Blog —
   https://netflixtechblog.com/chap-chaos-automation-platform-53e6d528371f — 2017.
3. *Reliability pillar — Test reliability (game days, fault injection)* — AWS Well-Architected —
   https://docs.aws.amazon.com/wellarchitected/latest/reliability-pillar/test-reliability.html —
   accessed 2026-10-19.
4. *What is AWS Fault Injection Service?* — AWS docs —
   https://docs.aws.amazon.com/fis/latest/userguide/what-is.html — accessed 2026-10-19.
5. *The Netflix Simian Army* — Netflix Technology Blog —
   https://netflixtechblog.com/the-netflix-simian-army-16e57fbab116 — 2011.
6. *Chaos Engineering* — A. Basiri et al., IEEE Software — https://arxiv.org/abs/1702.05843 — 2016.
7. *Weathering the Unexpected* (Google DiRT) — Kripa Krishnan, ACM Queue —
   https://queue.acm.org/detail.cfm?id=2371516 — 2012.
8. *Jepsen analyses* — Kyle Kingsbury — https://jepsen.io/analyses — accessed 2026-10-19.

Books:
11. [B23] *Chaos Engineering: System Resiliency in Practice* — Rosenthal, Jones — part I
    "Setting the Stage" (principles, steady state, blast radius) and Netflix/Google case chapters.
12. [B18] *Building Secure and Reliable Systems* — Adkins et al. — ch. 16 "Disaster Planning"
    (testing, DiRT-style exercises).
13. [B19] *Release It!*, 2nd ed. — Nygard — ch. 17 "Chaos Engineering".

Repos:
14. [G18] Netflix/chaosmonkey — https://github.com/Netflix/chaosmonkey.
15. [G17] dastergon/awesome-chaos-engineering — https://github.com/dastergon/awesome-chaos-engineering.
16. [G32] jepsen-io/jepsen — https://github.com/jepsen-io/jepsen.
