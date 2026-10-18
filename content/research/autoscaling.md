# Autoscaling — research note

- Level: L1
- Feeds lessons: `l1-autoscaling`; background for `l6-capacity-planning`, `l6-cost-tradeoffs`
- Researched: 2026-10-18

## Key facts (in our words)

1. **Autoscaling adds and removes instances automatically to follow load.** A target-tracking
   policy works like a thermostat: pick a metric (CPU, requests per target) and a target value;
   the group grows when above and shrinks when below. [1]
2. **The core rule (Kubernetes HPA):** desired = ceil(current × currentMetric / targetMetric),
   evaluated periodically (default every 15 s), bounded by min and max replicas. [2]
3. **Scale out fast, scale in slowly.** Both AWS and Kubernetes damp scale-in (stabilization
   windows, gradual scale-in) to avoid flapping. [1][2]
4. **New instances are not instantly useful.** Instances need warm-up time; AWS excludes warming
   instances from the metric. A sudden spike can outrun scaling, so you still need headroom or a
   minimum fleet. [1]
5. **Target value is a cost/latency trade.** "As high as possible with a reasonable buffer" — e.g.
   50% CPU leaves room for spikes. [1]
6. **Pick a metric that moves with fleet size.** Per-instance CPU or per-target request count
   works; total request count or latency does not scale proportionally and makes poor targets. [1]
7. **Autoscaling needs stateless servers and a load balancer** that registers new instances
   automatically. [1][3]

## How this maps to the engine

- Planned dynamic feature (spec §6.3): target busy %, min/max instances, cooldown. Not in 1a.
- An L1 experiment needs warm-up delay to show "spike outruns scaling"; the spec lists cooldown
  but not warm-up → engine gap `autoscaling-warmup-delay`.
- Workload `surge` (factor, start, duration) already provides the step change.

## Misconceptions

- "With autoscaling I never need headroom." (Scaling lags the spike. [1])
- "Scale in as fast as you scale out." (Flapping. [2])
- "Scale on total requests." (Not proportional to fleet size. [1])

## Analogy ideas (ours)

- A supermarket that opens more checkouts when lines grow — but a cashier needs five minutes to
  arrive and set up the till.

## Sources

1. *Target tracking scaling policies for Amazon EC2 Auto Scaling* — AWS documentation —
   https://docs.aws.amazon.com/autoscaling/ec2/userguide/as-scaling-target-tracking.html —
   accessed 2026-10-18.
2. *Horizontal Pod Autoscaling* — Kubernetes documentation —
   https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/ —
   accessed 2026-10-18.
3. *Target groups for your Application Load Balancers* (registration with Auto Scaling) — AWS
   documentation —
   https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-target-groups.html
   — accessed 2026-10-18.
4. *The Twelve-Factor App, VI. Processes* — Adam Wiggins —
   https://12factor.net/processes — 2011.
5. *Cost Optimization Pillar* (matching supply and demand) — AWS Well-Architected —
   https://docs.aws.amazon.com/wellarchitected/latest/cost-optimization-pillar/welcome.html —
   2024-06-27.
6. *The USE Method* — Brendan Gregg — https://www.brendangregg.com/usemethod.html — 2017.
