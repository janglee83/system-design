# Parity fixtures

Reference results used to calibrate the engine. Captured once, during development, from runs on
the project owner's own account. Nothing here is fetched at runtime or in CI.

Allowed content: graph structure and numbers, scenario parameters, measured numbers, goal
targets and pass/fail. Not allowed: any text from the reference site (messages, labels,
observations, lesson prose). `tools/parity/convert.mjs` enforces this.

Raw captures live in `fixtures/parity/raw/` and are gitignored.

## Tolerance overrides

Each override must be listed here with its reason and the owner's approval.

| Fixture | Metric | Override | Default rule |
|---|---|---|---|
| `scale-web-tier-surge-direct` | `availability` | `{"abs": 0.08}` | ±0.005 absolute |

- **Reason:** the engine's single-queue model cannot match both the reference's ~21.8K
  rejected requests and its ~8K requests left waiting past the timeout. Matching the rejections
  needs a short queue, and matching the waiting needs a long one. We measure 0.8718 against the
  reference's 0.805, and up to 0.8760 when any fitted calibration default moves by ±2%
  (`crates/sim-core/tests/parity_robustness.rs`). 0.08 is the smallest value rounded to 0.01 that
  covers this. How throughput behaves under overload is still being investigated.
- **Approval:** approved by the owner on 2026-10-19.
- **Temporary:** remove after recalibration with additional reference runs.
