# Health checks, draining and N+1 — research note

- Level: L1
- Feeds lessons: `l1-health-checks`, `l1-n-plus-one`, `l1-rolling-deploys`
- Researched: 2026-10-18

## Key facts (in our words)

1. **Health checks tell the balancer whom to trust.** The LB probes each target; unhealthy targets
   get no new traffic until they pass again. [1][2]
2. **Three depths of check:** *liveness* (is the process answering at all?), *local* (can it use
   its own disk, critical daemons?), *dependency* (can it reach the database?). Dependency checks
   catch more but risk taking the whole fleet out when a shared dependency blips. [3]
3. **Fail open.** If every target fails checks at once, a well-designed LB keeps sending to all of
   them rather than to none, because a correlated failure of the checks is more likely than every
   server being truly dead. ALB does this by default. [3][4]
4. **Readiness vs liveness.** Kubernetes separates "take me out of rotation" (readiness probe
   failing removes the pod from endpoints) from "restart me" (liveness probe failing restarts the
   container). [5]
5. **Draining.** When a server is removed on purpose (deploy, scale-in), the LB stops new requests
   but lets in-flight ones finish; ALB's default deregistration delay is 300 s. Slow start can ramp
   a new server's share up gradually. [4][6]
6. **N+1 sizing.** Redundancy only helps if the survivors can carry the load. With N servers each
   at utilization U, losing one pushes the rest to U·N/(N−1). Size so that this stays under your
   limit. [7][8]
7. **Passive checks** (NGINX `max_fails`/`fail_timeout`) mark a server down after real request
   failures, without separate probes. [2]

## How this maps to the engine

- 1a: an LB skips a child node only when *all* its instances are down; inside a node,
  `instance-down` removes one instance and capacity shrinks accordingly (implicit perfect health
  checking, zero detection delay).
- Scratch-model check, 14,000 rps behind LB ×2: 2 × 1-vCPU web, lose one at 3 s → survivor
  overloaded (p95 ≈ 486 ms, rejections); 3 × 1-vCPU web → p95 ≈ 10 ms, busy 0.78. Good N+1
  experiment on 1a.
- Not modelled: detection delay, flapping checks, fail-open, draining → engine gaps
  `health-check-detection-delay`, `fail-open`, `connection-draining` (L1 reading parts cover them).

## Misconceptions

- "Two servers = safe." (Only if one can carry everything. [7])
- "Health checks should test everything, including the database." (Shared-dependency blips can
  eject the whole fleet. [3])
- "Remove a server and in-flight requests just move over." (They fail unless you drain. [6])

## Analogy ideas (ours)

- A relay team with a substitute on the bench: useful only if the substitute can actually run
  the whole leg.

## Sources

1. *How Elastic Load Balancing works* — AWS documentation —
   https://docs.aws.amazon.com/elasticloadbalancing/latest/userguide/how-elastic-load-balancing-works.html
   — accessed 2026-10-18.
2. *HTTP Load Balancing* (passive health checks) — NGINX documentation —
   https://docs.nginx.com/nginx/admin-guide/load-balancer/http-load-balancer/ — accessed
   2026-10-18.
3. *Implementing health checks* — David Yanacek, Amazon Builders' Library —
   https://aws.amazon.com/builders-library/implementing-health-checks/ — 2019.
4. *Target groups for your Application Load Balancers* (target group health, fail open) — AWS
   documentation —
   https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-target-groups.html
   — accessed 2026-10-18.
5. *Liveness, Readiness, and Startup Probes* — Kubernetes documentation —
   https://kubernetes.io/docs/concepts/configuration/liveness-readiness-startup-probes/ —
   accessed 2026-10-18.
6. *Edit target group attributes for your Application Load Balancer* (deregistration delay, slow
   start) — AWS documentation —
   https://docs.aws.amazon.com/elasticloadbalancing/latest/application/edit-target-group-attributes.html
   — accessed 2026-10-18.
7. *Reliability Pillar: Availability* — AWS —
   https://docs.aws.amazon.com/wellarchitected/latest/reliability-pillar/availability.html —
   accessed 2026-10-18.
8. *Site Reliability Engineering*, ch. 20 "Load Balancing in the Datacenter" (lame duck state)
   — Alejandro Forero Cuervo, Google — https://sre.google/sre-book/load-balancing-datacenter/ —
   2016.
