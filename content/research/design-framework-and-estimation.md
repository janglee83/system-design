# Running a design session and estimating at depth — research note

- Level: L5
- Feeds lessons: `l5-interview-framework`, `l5-estimation-deep-dive`
- Researched: 2026-10-19

## Key facts (in our words)

1. **A design session has a shape**: clarify requirements (functional and non-functional), estimate
   load and data, sketch a high-level design, deep-dive into the riskiest parts, and close with
   bottlenecks, failure modes and next steps. Interview books and Google's NALSD exercises follow this
   arc. [1][9][10]
2. **Non-functional requirements drive the design**: latency targets, availability, durability,
   consistency needs, cost. DDIA's 2nd edition opens its second chapter on exactly these. [8]
3. **Iterate**: start with a design that works for one machine, then ask "is it feasible, is it
   resilient, can we do better?" with numbers at each step. [1]
4. **Estimate four things**: requests per second (average and peak), storage growth per day/year,
   bandwidth in and out, and memory needed for caches/working set. [1][2][9]
5. **Reference numbers** (memory ~100 ns, SSD read ~16 µs, DC round trip ~0.5 ms, cross-continent
   ~150 ms) let you check feasibility quickly. [2][3]
6. **Real scale anchors** keep estimates honest: e.g. Twitter's 2013 record of about 143,000 tweets per
   second during a TV broadcast (a peak far above its ~5,700/s average then). [4]
7. **Write assumptions down and round**: powers of ten, 1 day ≈ 10⁵ s, and state which number would
   change the design if it were 10× different. [1][9]
8. **The AWS Well-Architected pillars** (operational excellence, security, reliability, performance
   efficiency, cost, sustainability) are a checklist for the wrap-up. [5]

## Engine mapping

- Reading+check. Estimates feed experiments by setting `baseRps`, `surge`, and calibration overrides
  (e.g. a slower `webRpsPerVcpu`) — runnable on 1a.

## Misconceptions

- "Jump straight to boxes." Requirements and numbers first. [1][9]
- "Estimation must be precise." Order of magnitude. [1][3]
- "There is one right design." There are trade-offs to defend. [8][10]

## Sources

Primary:
1. *The Site Reliability Workbook*, ch. 12 "Non-Abstract Large System Design" — S. Virji et al.,
   Google — https://sre.google/workbook/non-abstract-design/ — 2018.
2. *Designs, Lessons and Advice from Building Large Distributed Systems* — Jeff Dean, LADIS —
   https://www.cs.cornell.edu/projects/ladis2009/talks/dean-keynote-ladis2009.pdf — 2009.
3. *Latency Numbers Every Programmer Should Know* — Colin Scott —
   https://colin-scott.github.io/personal_website/research/interactive_latency.html — 2020 values.
4. *New Tweets per second record, and how!* — Raffi Krikorian, Twitter Engineering —
   https://blog.x.com/engineering/en_us/a/2013/new-tweets-per-second-record-and-how — 2013.
5. *AWS Well-Architected Framework* — AWS — https://docs.aws.amazon.com/wellarchitected/latest/framework/welcome.html
   — accessed 2026-10-19.
6. *Site Reliability Engineering*, ch. 4 "Service Level Objectives" — Google —
   https://sre.google/sre-book/service-level-objectives/ — 2016.

Books:
8. [B2] *Designing Data-Intensive Applications*, 2nd ed. — ch. 1 "Trade-offs in Data Systems
   Architecture", ch. 2 "Defining Nonfunctional Requirements".
9. [B40] *System Design Interview*, vol. 1 — Xu — ch. 2 estimation, ch. 3 framework (topic map only).
10. [B29] *Fundamentals of Software Architecture* — Richards, Ford — chapters on architecture
    characteristics and trade-offs.
11. [B43] *Acing the System Design Interview* — Tan — chapter on non-functional requirements (topic
    map only).

Repos:
12. [G1] donnemartin/system-design-primer — "How to approach a system design interview question",
    "Back-of-the-envelope calculations" — https://github.com/donnemartin/system-design-primer.
13. [G9] yangshun/tech-interview-handbook — system design section — https://github.com/yangshun/tech-interview-handbook.
