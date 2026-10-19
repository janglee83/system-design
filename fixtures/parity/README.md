# Parity fixtures

Reference results used to calibrate the engine. Captured once, during development, from runs on
the project owner's own account. Nothing here is fetched at runtime or in CI.

Allowed content: graph structure and numbers, scenario parameters, measured numbers, goal
targets and pass/fail. Not allowed: any text from the reference site (messages, labels,
observations, lesson prose). `tools/parity/convert.mjs` enforces this.

Raw captures live in `fixtures/parity/raw/` and are gitignored.

## Captures

All runs use the surge scenario of the web-tier exercise at 8,000 rps base load with a 3x surge,
seed 1, reference engine 2.2.4.

| Fixture | Run id (prefix) | Design | Captured |
|---|---|---|---|
| `scale-web-tier-surge-pass` | 807734e1 | LB x2 -> web x5, 1 vCPU / 2 GB | 2026-10-18 |
| `scale-web-tier-surge-direct` | attempt 1 | client -> web x1, 1 vCPU / 2 GB | 2026-10-18 |
| `scale-web-tier-surge-lb5-1cpu-2gb` | 72b21962 | LB x5 -> web x1, 1 vCPU / 2 GB, 3 retries | 2026-10-18 |
| `scale-web-tier-surge-direct-1cpu-4gb` | 6772a1ab | client -> web x1, 1 vCPU / 4 GB | 2026-10-19 |
| `scale-web-tier-surge-direct-1cpu-2gb-noretry` | 65305fa5 | client -> web x1, 1 vCPU / 2 GB, no retries | 2026-10-19 |
| `scale-web-tier-surge-direct-2cpu-2gb` | f9cf3ec7 | client -> web x1, 2 vCPU / 2 GB | 2026-10-19 |

## Model derived from the captures

- Workload: 8,000 rps for 10 s, then 1 s with no new arrivals (11 s run). Traffic triples from
  4.0 s for 2.0 s, giving 112,000 requests in total. Arrivals are deterministic
  (`"arrivals": "uniform"`, `"trafficEndMs": 10000`).
- Web server: 9,000 rps per vCPU, i.e. 36 workers per vCPU at 4 ms of service. Each GB of memory
  holds 4,096 requests in the server. The waiting room is that capacity minus the workers:
  8,156 for 1 vCPU / 2 GB, 8,120 for 2 vCPU / 2 GB and 16,348 for 1 vCPU / 4 GB. Arrivals that
  do not fit are rejected.
- Latency is 4 ms of service plus the queue wait (queue / capacity). A load-balancer hop adds 3 ms.
  Requests whose wait passes the 1 s client timeout count as timed out, and their real latency
  still counts toward p95. After the surge the backlog drains at only 1,000 rps, so timeouts
  continue long after it.
- Retries and the number of balancer replicas did not change any outcome in these runs.
- Price: $22.5/month for a 1-vCPU instance, $50/month for 2 vCPUs, $25 per LB replica.

## Tolerance overrides

Each override must be listed here with its reason and the owner's approval.

None. The temporary availability override on `scale-web-tier-surge-direct` (approved
2026-10-19) was removed after recalibrating with the captures above.
