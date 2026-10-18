# GitHub repositories — curated source list

Checked 2026-10-19 with the GitHub API (`gh api repos/<owner>/<repo>`): stars, date of last push and
the licence GitHub detects. "NOASSERTION" was resolved by reading the repo's licence file. "none"
means no licence file: the content is all rights reserved by default, so we only **link** to it and
use it to find primary sources; we never copy from it.

**How we use repos.** Repos are maps and reading lists. We follow them to papers, docs and posts,
cite those primary sources in research notes, and cite the repo itself when it adds an overview
worth crediting. Licences such as CC BY-NC-ND (no derivatives) and GPL-3.0 do not change our rule:
our learner-facing text is written from scratch whatever the licence.

Lesson ids refer to `content/curriculum.json`. "Primer" = system-design-primer.

## A. System design overviews and interview prep

| # | Repo | Stars | Last push | Licence | Good for | Supports |
|---|---|---|---|---|---|---|
| G1 | [donnemartin/system-design-primer](https://github.com/donnemartin/system-design-primer) | 374.6k | 2026-09-15 | CC BY 4.0 | The broadest free overview: scalability, CAP, consistency/availability patterns, DNS, CDN, LB, reverse proxy, app layer, databases (replication, federation, sharding, denormalisation, SQL tuning, NoSQL), caching strategies, async/back pressure, communication (TCP/UDP/RPC/REST), security, numbers to know, worked designs with links to sources | L1 all; `l2-sql-vs-nosql`, `l2-read-replicas`, `l2-sharding-basics`, `l2-denormalization`, `l2-cache-aside`, `l2-write-patterns`; `l3-message-queues`, `l6-backpressure`; `l4-cap-theorem`; `l5-interview-framework`, `l5-url-shortener`, `l5-web-crawler` |
| G2 | [ByteByteGoHq/system-design-101](https://github.com/ByteByteGoHq/system-design-101) | 90.5k | 2025-04-04 | CC BY-NC-ND 4.0 | Short visual explainers: protocols, API styles, caching, databases, real-world architectures | `l0-http-basics`, `l1-reverse-proxy-and-gateway`, `l2-cache-aside`, `l3-message-queues`, `l5-*` overviews |
| G3 | [karanpratapsingh/system-design](https://github.com/karanpratapsingh/system-design) | 46.6k | 2026-07-08 | CC BY-NC-ND 4.0 | A course-shaped walk from IP/DNS to consensus, message brokers, rate limiting, service discovery, SLA/SLO, disaster recovery, plus worked designs (URL shortener, chat, Twitter, Netflix, Uber) | L0–L5 broadly; `l3-rate-limiting`, `l6-active-passive-dr`, `l5-chat-system`, `l5-news-feed`, `l5-video-streaming` |
| G4 | [ashishps1/awesome-system-design-resources](https://github.com/ashishps1/awesome-system-design-resources) | 42.5k | 2026-02-16 | GPL-3.0 | Free articles by concept (consistent hashing, idempotency, sharding, rate limiting…), interview problems and engineering-blog links | L2–L5 topic lookups |
| G5 | [InterviewReady/system-design-resources](https://github.com/InterviewReady/system-design-resources) | 18.5k | 2025-07-16 | GPL-3.0 | Hand-picked engineering-blog posts and papers per topic (caching, messaging, consensus, real company case studies) | L2–L6 case studies |
| G6 | [checkcheckzz/system-design-interview](https://github.com/checkcheckzz/system-design-interview) | 23.9k | 2023-04-03 | none | Older but large list of company-architecture write-ups and classic papers | `l5-*` case studies (historic) |
| G7 | [shashank88/system_design](https://github.com/shashank88/system_design) | 9.3k | 2024-05-10 | none | Short list of interview links and company architecture posts | `l5-interview-framework` |
| G8 | [madd86/awesome-system-design](https://github.com/madd86/awesome-system-design) | 12.6k | 2026-02-27 | CC0-1.0 | Distributed-systems oriented list: algorithms, papers, books, courses | L4, L6 |
| G9 | [yangshun/tech-interview-handbook](https://github.com/yangshun/tech-interview-handbook) | 143.1k | 2026-08-07 | MIT | Interview process and behaviour; small system-design section | `l5-interview-framework` |
| G10 | [kdn251/interviews](https://github.com/kdn251/interviews) | 65.3k | 2025-05-12 | MIT | Data structures and algorithms refresher (hashing, tries, heaps) | `l4-consistent-hashing`, `l5-search-autocomplete`, `l5-leaderboard` |

## B. Scalability, architecture and real-world systems

| # | Repo | Stars | Last push | Licence | Good for | Supports |
|---|---|---|---|---|---|---|
| G11 | [binhnguyennus/awesome-scalability](https://github.com/binhnguyennus/awesome-scalability) | 74.8k | 2026-01-04 | MIT | Hundreds of engineering-blog posts sorted by principle (scalability, availability, stability, performance) and by company; our best index into primary blog posts | L1–L6 (blog sources for every note) |
| G12 | [mehdihadeli/awesome-software-architecture](https://github.com/mehdihadeli/awesome-software-architecture) | 11.7k | 2026-10-15 | CC0-1.0 | Patterns: CQRS, event sourcing, outbox, saga, microservices, DDD | `l6-outbox-pattern`, `l6-sagas`, `l6-event-sourcing-cqrs`, `l3-sync-vs-async` |
| G13 | [mfornos/awesome-microservices](https://github.com/mfornos/awesome-microservices) | 14.5k | 2026-08-20 | CC0-1.0 | Gateways, service mesh, resilience libraries, messaging tools | `l1-reverse-proxy-and-gateway`, `l3-circuit-breakers`, `l3-bulkheads` |
| G14 | [upgundecha/howtheysre](https://github.com/upgundecha/howtheysre) | 9.8k | 2026-09-30 | CC0-1.0 | How companies run SRE: on-call, incident response, SLOs, postmortems | `l3-slos-error-budgets`, `l6-slo-alerting`, `l6-incident-debugging` |
| G15 | [dastergon/awesome-sre](https://github.com/dastergon/awesome-sre) | 13.7k | 2025-08-28 | CC0-1.0 | SRE reading list: monitoring, capacity planning, on-call, postmortems | `l3-observability-basics`, `l6-capacity-planning` |
| G16 | [danluu/post-mortems](https://github.com/danluu/post-mortems) | 12.6k | 2026-08-31 | none | Hundreds of public incident write-ups grouped by cause (config, hardware, time, database…) | `l6-incident-debugging`, `l6-chaos-engineering`, `l6-safe-deployments`, `l3-retry-storms-jitter` |
| G17 | [dastergon/awesome-chaos-engineering](https://github.com/dastergon/awesome-chaos-engineering) | 6.7k | 2023-12-28 | CC0-1.0 | Chaos engineering papers, tools and talks | `l6-chaos-engineering` |
| G18 | [Netflix/chaosmonkey](https://github.com/Netflix/chaosmonkey) | 17.2k | 2025-01-06 | Apache-2.0 | The original instance-killing tool; docs explain the idea | `l6-chaos-engineering`, `l1-n-plus-one` |
| G19 | [MicrosoftDocs/architecture-center](https://github.com/MicrosoftDocs/architecture-center) | 2.0k | 2026-10-16 | CC BY 4.0 | Source of the Azure Architecture Center: cloud design patterns (retry, circuit breaker, bulkhead, CQRS, saga, sharding, cache-aside, competing consumers, throttling…) | L2–L6 pattern lessons |
| G20 | [upgundecha/howtheyaws](https://github.com/upgundecha/howtheyaws) | 0.7k | 2023-10-10 | CC0-1.0 | Company talks about architectures on AWS | `l5-*` case studies |
| G21 | [jhuangtw/xg2xg](https://github.com/jhuangtw/xg2xg) | 15.7k | 2026-01-12 | none | Maps Google-internal systems (Bigtable, Spanner, Chubby, Borg…) to open-source equivalents with paper links | L4, L6 background |
| G22 | [charlax/professional-programming](https://github.com/charlax/professional-programming) | 51.6k | 2026-09-29 | MIT | Large curated reading list incl. system design, databases, reliability, incident response | Cross-level |

## C. Distributed systems, databases and papers

| # | Repo | Stars | Last push | Licence | Good for | Supports |
|---|---|---|---|---|---|---|
| G23 | [papers-we-love/papers-we-love](https://github.com/papers-we-love/papers-we-love) | 110.7k | 2026-09-29 | none (papers under their own licences) | Index of classic papers by area (distributed systems, databases, datastores) | L4, L6, `l5-kv-store-design` |
| G24 | [theanalyst/awesome-distributed-systems](https://github.com/theanalyst/awesome-distributed-systems) | 12.4k | 2025-01-10 | none | Reading list: books, papers, courses, blog series on consensus, clocks, replication | L4, L6 |
| G25 | [aphyr/distsys-class](https://github.com/aphyr/distsys-class) | 10.2k | 2025-03-18 | none | Kyle Kingsbury's lecture outline: latency numbers, failure modes, clocks, consistency models, consensus, production concerns | `l4-why-distributed-is-hard`, `l4-consistency-models`, `l4-clocks-and-ordering`, `l6-consensus-raft` |
| G26 | [ept/ddia-references](https://github.com/ept/ddia-references) | 7.3k | 2026-02-07 | none | Every reference cited in *Designing Data-Intensive Applications*, chapter by chapter, with links | L2, L4, L6 (finds primary sources) |
| G27 | [pingcap/awesome-database-learning](https://github.com/pingcap/awesome-database-learning) | 11.2k | 2024-08-29 | none | Database internals: storage engines, LSM/B-trees, transactions, distributed databases | `l2-indexes`, `l2-transactions-isolation`, `l5-kv-store-design` |
| G28 | [rxin/db-readings](https://github.com/rxin/db-readings) | 8.2k | 2024-09-09 | none | Curated database papers (Red Book style) | `l2-*`, `l6-two-phase-commit` |
| G29 | [dgryski/awesome-consensus](https://github.com/dgryski/awesome-consensus) | 2.2k | 2024-05-29 | none | Paxos/Raft/ZAB papers, talks and implementations | `l6-consensus-raft`, `l6-paxos-and-friends` |
| G30 | [pingcap/talent-plan](https://github.com/pingcap/talent-plan) | 11.0k | 2023-09-18 | none | Hands-on courses: build a KV store, Raft, a distributed transaction layer | `l5-kv-store-design`, `l6-consensus-raft`, `l6-two-phase-commit` |
| G31 | [jepsen-io/maelstrom](https://github.com/jepsen-io/maelstrom) | 3.7k | 2026-07-10 | EPL-1.0 | Toy distributed-systems workbench (echo, unique IDs, broadcast, counters, Kafka-style log, transactions) with partition injection; great model for our experiment style | `l4-unique-ids`, `l4-cap-theorem`, `l4-gossip`, `l6-multi-region-writes` |
| G32 | [jepsen-io/jepsen](https://github.com/jepsen-io/jepsen) | 7.5k | 2026-10-16 | none (EPL in project files) | Fault-injection testing of real databases; analyses show real consistency bugs | `l4-consistency-models`, `l2-replication-lag`, `l6-chaos-engineering` |
| G33 | [tlaplus/Examples](https://github.com/tlaplus/Examples) | 1.6k | 2026-10-17 | MIT | Formal specs of Paxos, Raft, 2PC and more | `l6-consensus-raft`, `l6-two-phase-commit` (advanced) |
| G34 | [etcd-io/raft](https://github.com/etcd-io/raft) | 1.1k | 2026-10-14 | Apache-2.0 | Production Raft library; README explains the state machine and features (pre-vote, leases) | `l6-consensus-raft`, `l4-leader-election` |
| G35 | [heathermiller/dist-prog-book](https://github.com/heathermiller/dist-prog-book) | 3.4k | 2021-02-09 | unclear | Student-written book on programming models for distributed computing (CRDTs, RPC, streaming) | `l4-conflict-resolution` |
| G36 | [Developer-Y/cs-video-courses](https://github.com/Developer-Y/cs-video-courses) | 83.7k | 2026-10-18 | none | Index of free university lecture videos, incl. distributed systems and databases (MIT 6.824, CMU 15-445) | L2, L4, L6 |
| G37 | [oxnr/awesome-bigdata](https://github.com/oxnr/awesome-bigdata) | 14.7k | 2026-07-31 | MIT | Stream processing, logs, storage engines | `l5-metrics-pipeline`, `l6-change-data-capture` |

## Notes

- Highest value for us: G1 (breadth, CC BY), G11 (engineering-blog index), G23/G26 (paper lookup),
  G25 (distributed-systems teaching order), G31 (experiment ideas), G16 (incident material).
- Several popular repos (G2, G3) are CC BY-NC-ND: reading is fine, adapting is not; we never copy
  anyway.
- Repos without a licence (G6, G23, G24, G25…) are link-only.
- Missing from GitHub on 2026-10-19 (checked, 404): `dzharii/awesome-system-design`,
  `joelparkerhenderson/system-design-checklist`, `lk-geimfari/awesome-chaos-engineering`.
