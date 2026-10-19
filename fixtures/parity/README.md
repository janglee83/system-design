# Parity fixtures

Reference results used to calibrate the engine. Captured once, during development, from runs on
the project owner's own account. Nothing here is fetched at runtime or in CI.

Allowed content: graph structure and numbers, scenario parameters, measured numbers, goal
targets and pass/fail. Not allowed: any text from the reference site (messages, labels,
observations, lesson prose). `tools/parity/convert.mjs` enforces this.

Raw captures live in `fixtures/parity/raw/` and are gitignored.

## Tolerance overrides

None yet. Each override must be listed here with its reason and the owner's approval.
