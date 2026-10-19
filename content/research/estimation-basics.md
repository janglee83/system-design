# Back-of-the-envelope estimation (intro) — research note

- Level: L0 (intro), L5 (deep dive)
- Feeds lessons: `l0-estimation-basics`; background for `l5-estimation-deep-dive`,
  `l6-capacity-planning`
- Researched: 2026-10-18

## Key facts (in our words)

1. **Estimation turns a sketch into resource numbers.** Google's "non-abstract large system
   design" practice asks engineers to convert a whiteboard design into concrete counts of
   machines, disks and bandwidth, then iterate. [1]
2. **Know a few reference numbers by heart:** memory ~100 ns, SSD read ~16 µs, data-centre round
   trip ~0.5 ms, intercontinental round trip ~150 ms, disk seek ~10 ms. Order of magnitude is
   what matters. [2][3]
3. **From users to requests per second.** Average rps = daily active users × requests per user
   per day ÷ 86,400 s. Then apply a peak factor (traffic is not flat across the day). [1][4]
4. **From rps to machines.** Machines ≈ peak rps ÷ (rps one machine handles at the target
   utilization). Targeting well under 100% leaves headroom for bursts. [5][6]
5. **Little's Law sizes concurrency.** In-flight requests ≈ rps × latency; e.g. 2,000 rps at
   50 ms ≈ 100 concurrent requests. [7]
6. **Round and sanity-check.** Use powers of ten, round generously, and compare with a known
   system; estimates are for choosing between designs, not for billing. [1][2]

## Worked numbers used in our lesson (our own example)

- 20 M daily users × 50 requests each = 1 billion requests/day → ÷ 86,400 ≈ 11,600 rps average.
- Peak factor 2 → ≈ 23,000 rps.
- One engine vCPU ≈ 9,000 rps; at a 70% target ≈ 6,300 rps → 23,000 / 6,300 ≈ 3.7 → 4 vCPU.
- Scratch-model check (base 11,600, ×2 surge for 3 s): 2 vCPU → p95 ≈ 263 ms, rejections;
  3 vCPU → p95 ≈ 15 ms, busy 0.86; 4 vCPU → p95 ≈ 6 ms, busy 0.64, $90; 16 vCPU → $360.

## How this maps to the engine

- `workload.baseRps` + `surge` encode average and peak. `peakBusy` checks the headroom target;
  `costPerMonth` punishes wild over-sizing. Runnable on 1a.

## Misconceptions

- "Size for the daily average." (Peaks break you. [1])
- "Estimates must be precise." (Order of magnitude decides the design. [2])
- "Add a huge margin to be safe." (Costs money; use a stated headroom instead. [5])

## Sources

1. *The Site Reliability Workbook*, ch. 12 "Non-Abstract Large System Design" — Salim Virji et
   al., Google / O'Reilly — https://sre.google/workbook/non-abstract-design/ — 2018.
2. *Designs, Lessons and Advice from Building Large Distributed Systems* (LADIS keynote, "numbers
   everyone should know" and back-of-the-envelope slides) — Jeff Dean, Google —
   https://www.cs.cornell.edu/projects/ladis2009/talks/dean-keynote-ladis2009.pdf — 2009.
3. *Latency Numbers Every Programmer Should Know* (interactive) — Colin Scott —
   https://colin-scott.github.io/personal_website/research/interactive_latency.html — 2020
   values.
4. *Designing Data-Intensive Applications*, ch. 1 (section "Describing Load") — Martin
   Kleppmann, O'Reilly — 2017.
5. *Target tracking scaling policies for Amazon EC2 Auto Scaling* — AWS documentation —
   https://docs.aws.amazon.com/autoscaling/ec2/userguide/as-scaling-target-tracking.html —
   accessed 2026-10-18.
6. *The USE Method* — Brendan Gregg — https://www.brendangregg.com/usemethod.html — 2017.
7. *Little's Law as Viewed on Its 50th Anniversary* — John D. C. Little, Operations Research
   59(3) — https://pubsonline.informs.org/doi/10.1287/opre.1110.0940 — 2011.
