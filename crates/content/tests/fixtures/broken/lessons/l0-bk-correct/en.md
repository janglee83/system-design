---
id: l0-bk-correct
title: The capacity of one server (fixture)
---

## Outcome
Pick the number of vCPUs so that no request is rejected.

## Picture it first
One counter with one person serving.

## Terms
- **Capacity**: the most requests per second a server can finish.

## Common misconceptions
- **M1**: Waiting longer cures overload.
- **M2**: Going a little over capacity is fine.

## Experiment
Try each choice and compare p95.

## Feedback
- **B**: Waiting longer does not make the server faster.
- **C**: The excess adds up until the queue is full.

## Takeaways
- Capacity comes from CPU.
