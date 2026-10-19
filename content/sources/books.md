# Books — bibliography and chapter map

Compiled 2026-10-19. Chapter mappings come from tables of contents (publisher listings, author
sites, the `ept/ddia-references` repo for DDIA 1st ed., the chapter files of the CC BY 4.0
`Vonng/ddia` translation for DDIA 2nd ed.), author talks and reviews. Where we were not able to
confirm chapter numbers, we cite the chapter or section **title** instead of a number. We never
reproduce book text; research notes cite books by chapter for facts, and learner text is ours.

Level: B = beginner, I = intermediate, A = advanced. "Free" = a legal free edition from the author
or publisher (open access, author site, free company-sponsored edition).

## Core distributed systems and data

| # | Book | Author(s), year, edition | Level | Free? | Chapters → our topics |
|---|---|---|---|---|---|
| B1 | *Designing Data-Intensive Applications* | Martin Kleppmann, O'Reilly, 1st ed. 2017 | I–A | No | Ch1 reliability/scalability (L0 percentiles, estimation); Ch2 data models (`l2-sql-vs-nosql`, `l2-data-modeling`); Ch3 storage & retrieval (`l2-indexes`, `l5-kv-store-design`); Ch4 encoding; Ch5 replication (`l2-read-replicas`, `l2-replication-lag`, `l4-replication-strategies`, `l4-quorums`, `l4-conflict-resolution`); Ch6 partitioning (`l2-sharding-basics`, `l2-shard-keys`, `l4-consistent-hashing`); Ch7 transactions (`l2-transactions-isolation`); Ch8 trouble with distributed systems (`l4-why-distributed-is-hard`, `l4-clocks-and-ordering`, `l4-leader-election`); Ch9 consistency & consensus (`l4-consistency-models`, `l4-cap-theorem`, `l6-consensus-raft`, `l6-two-phase-commit`); Ch10 batch; Ch11 streams (`l6-change-data-capture`, `l6-event-sourcing-cqrs`); Ch12 future of data systems (`l6-outbox-pattern`) |
| B2 | *Designing Data-Intensive Applications*, 2nd ed. | Martin Kleppmann, Chris Riccomini, O'Reilly, 2026 | I–A | No | Ch1 trade-offs (cloud vs self-hosting, distributed vs single node); Ch2 nonfunctional requirements (timelines case study → `l5-news-feed`; percentiles; reliability; scalability); Ch3 data models; Ch4 storage & retrieval; Ch5 encoding & evolution; Ch6 replication; Ch7 sharding; Ch8 transactions; Ch9 trouble with distributed systems; Ch10 consistency & consensus; Ch11 batch; Ch12 stream processing; Ch13 philosophy of streaming systems; Ch14 doing the right thing |
| B3 | *Database Internals* | Alex Petrov, O'Reilly, 2019 | A | No | Part I: Ch2 B-tree basics, Ch4 implementing B-trees, Ch7 log-structured storage (`l2-indexes`, `l5-kv-store-design`), Ch5 transaction processing & recovery (`l2-transactions-isolation`); Part II: Ch9 failure detection (`l4-failure-detection`), Ch10 leader election (`l4-leader-election`), Ch11 replication & consistency (`l4-consistency-models`, `l4-quorums`), Ch12 anti-entropy & dissemination (`l4-anti-entropy`, `l4-gossip`), Ch13 distributed transactions (`l6-two-phase-commit`), Ch14 consensus (`l6-consensus-raft`, `l6-paxos-and-friends`) |
| B4 | *Understanding Distributed Systems*, 2nd ed. | Roberto Vitillo, self-published, 2022 | B–I | No | Part "Communication" (reliable links, discovery/DNS, APIs → L0–L1); "Coordination" (system models, failure detection, time, leader election, replication, coordination avoidance/CRDTs, transactions, asynchronous transactions/outbox/sagas → L4, L6); "Scalability" (HTTP caching, CDN, partitioning, file storage, network load balancing, data storage, caching, microservices, messaging → L1–L3); "Resiliency" (failure causes, redundancy, fault isolation, downstream resiliency: timeouts/retries/circuit breakers, upstream resiliency: load shedding/rate limiting/bulkheads → L3); "Maintainability" (testing, continuous delivery, monitoring, observability → `l3-observability-basics`, `l6-safe-deployments`) |
| B5 | *Distributed Systems*, 4th ed. | Maarten van Steen, Andrew S. Tanenbaum, 2023 (v4.03, 2025) | I–A | **Yes** — free personalised digital copy at distributed-systems.net | Ch2 architectures; Ch4 communication (RPC, messaging → `l3-message-queues`); Ch5 coordination (clocks, logical clocks, mutual exclusion, election, gossip → `l4-clocks-and-ordering`, `l4-logical-clocks`, `l4-leader-election`, `l4-gossip`); Ch6 naming (DNS → `l0-dns-and-network-path`); Ch7 consistency & replication (`l4-consistency-models`, `l2-cache-invalidation`); Ch8 fault tolerance (failure models, consensus, 2PC → `l6-consensus-raft`, `l6-two-phase-commit`) |
| B6 | *Patterns of Distributed Systems* | Unmesh Joshi, Addison-Wesley, 2023 | I–A | Partly — pattern catalogue free on martinfowler.com | Write-ahead log, segmented log, leader & followers, heartbeat (`l4-failure-detection`), majority quorum (`l4-quorums`), generation clock, high-water mark, Paxos, replicated log (`l6-consensus-raft`), Lamport clock, hybrid clock, version vector (`l4-logical-clocks`, `l4-conflict-resolution`), fixed/key-range partitions (`l2-sharding-basics`, `l4-virtual-nodes`), two-phase commit (`l6-two-phase-commit`), lease (`l4-leader-election`), gossip dissemination (`l4-gossip`), consistent core, follower reads (`l2-read-replicas`) |
| B7 | *Introduction to Reliable and Secure Distributed Programming*, 2nd ed. | Christian Cachin, Rachid Guerraoui, Luís Rodrigues, Springer, 2011 | A | No | Failure detectors, broadcast, shared memory registers, consensus (`l6-consensus-raft`, `l4-failure-detection`) |
| B8 | *Distributed Systems for Fun and Profit* | Mikito Takada, 2013 | B–I | **Yes** — book.mixu.net/distsys | Ch1 basics, Ch2 abstractions (CAP), Ch3 time and order, Ch4 replication (single-copy), Ch5 weak consistency (CRDTs) → L4 |
| B9 | *Database System Concepts*, 7th ed. | Silberschatz, Korth, Sudarshan, McGraw-Hill, 2019 | I | No | Indexing, transactions, concurrency control, recovery, distributed databases (`l2-indexes`, `l2-transactions-isolation`, `l6-two-phase-commit`) |
| B10 | *PostgreSQL Documentation* (v18) | The PostgreSQL Global Development Group, 2026 | B–A | **Yes** — postgresql.org/docs | Tutorial ch1–3 (L0 databases); "Indexes" (`l2-indexes`); "Concurrency Control" (`l2-transactions-isolation`); "High Availability, Load Balancing, and Replication" (`l2-read-replicas`, `l2-db-failover`, `l2-replication-lag`); "Logical Replication" / logical decoding (`l6-change-data-capture`); "Server Configuration → Connections" (`l2-connection-pooling`) |
| B11 | *High Performance MySQL*, 4th ed. | Silvia Botros, Jeremy Tinley, O'Reilly, 2021 | I | No | Indexing, replication, scaling MySQL (sharding), high availability (`l2-indexes`, `l2-read-replicas`, `l2-sharding-basics`, `l2-db-failover`) |
| B12 | *Database Reliability Engineering* | Laine Campbell, Charity Majors, O'Reilly, 2017 | I | No | Service-level management, risk, backup/recovery, data replication, infrastructure for datastores (`l2-db-failover`, `l6-active-passive-dr`, `l6-zero-downtime-migrations`) |
| B13 | *Cassandra: The Definitive Guide*, 3rd ed. | Jeff Carpenter, Eben Hewitt, O'Reilly, 2020 | I | No | Architecture (gossip, ring, vnodes, hinted handoff, read repair, consistency levels) → `l4-quorums`, `l4-consistent-hashing`, `l4-anti-entropy`, `l5-kv-store-design` |
| B14 | *Redis in Action* | Josiah L. Carlson, Manning, 2013 | B–I | No | Caching, counting, sorted-set leaderboards, rate limiting with Redis (`l2-cache-aside`, `l5-leaderboard`, `l5-rate-limiter-design`, `l5-chat-presence`) |
| B15 | *Elasticsearch: The Definitive Guide* | Clinton Gormley, Zachary Tong, O'Reilly, 2015 (Elasticsearch 1.x) | I | Yes — older online edition on elastic.co (outdated version) | Inverted index, analysis, relevance, distributed search (`l2-search-indexing`, `l5-search-autocomplete`) |

## Reliability, operations and performance

| # | Book | Author(s), year, edition | Level | Free? | Chapters → our topics |
|---|---|---|---|---|---|
| B16 | *Site Reliability Engineering* | Beyer, Jones, Petoff, Murphy (eds.), Google / O'Reilly, 2016 | I | **Yes** — sre.google/books | Ch3 embracing risk (`l0-availability-nines`); Ch4 SLOs (`l0-percentiles`, `l3-slos-error-budgets`); Ch6 monitoring (`l3-observability-basics`); Ch13–15 emergency response, incidents, postmortems (`l6-incident-debugging`); Ch19–20 load balancing (L1); Ch21 handling overload (`l3-load-shedding`); Ch22 cascading failures (`l3-retry-storms-jitter`, `l6-backpressure`); Ch23 distributed consensus (`l6-consensus-raft`); Ch24 distributed cron (`l5-job-scheduler`); Ch26 data integrity (`l6-active-passive-dr`) |
| B17 | *The Site Reliability Workbook* | Beyer, Murphy, Rensin, Kawahara, Thorne (eds.), Google / O'Reilly, 2018 | I | **Yes** — sre.google/books | Ch2 implementing SLOs; Ch5 alerting on SLOs (`l6-slo-alerting`); Ch9 incident response; Ch11 managing load (`l1-autoscaling`); Ch12 non-abstract large system design (`l0-estimation-basics`, `l6-capacity-planning`); Ch16 canarying releases (`l6-safe-deployments`) |
| B18 | *Building Secure and Reliable Systems* | Adkins, Beyer, Blankinship, Lewandowski, Oprea, Stubblefield, Google / O'Reilly, 2020 | I | **Yes** — sre.google/books | Design for resilience, recovery, crisis management (`l6-chaos-engineering`, `l6-incident-debugging`) |
| B19 | *Release It!*, 2nd ed. | Michael T. Nygard, Pragmatic Bookshelf, 2018 | I | No | Part I "Create Stability": stability antipatterns (cascading failures, blocked threads, unbounded result sets, self-denial) and stability patterns (timeouts, circuit breaker, bulkheads, steady state, fail fast, shed load, create back pressure, governor) → `l3-timeouts`, `l3-circuit-breakers`, `l3-bulkheads`, `l3-load-shedding`, `l6-backpressure`; Part IV deployments (`l1-rolling-deploys`, `l6-safe-deployments`) |
| B20 | *Systems Performance*, 2nd ed. | Brendan Gregg, Addison-Wesley, 2020 | I–A | No | Ch2 methodologies (USE, latency analysis, queueing theory → `l0-queueing-and-utilization`); Ch6 CPUs; Ch10 network; capacity planning sections (`l6-capacity-planning`) |
| B21 | *Observability Engineering* | Charity Majors, Liz Fong-Jones, George Miranda, O'Reilly, 2022 | I | No (free sample chapters via Honeycomb) | Structured events, distributed tracing, SLO-based alerting, debugging from first principles (`l3-observability-basics`, `l6-incident-debugging`, `l6-slo-alerting`) |
| B22 | *Implementing Service Level Objectives* | Alex Hidalgo, O'Reilly, 2020 | I | No | SLIs, SLOs, error budgets, burn-rate alerting (`l3-slos-error-budgets`, `l6-slo-alerting`) |
| B23 | *Chaos Engineering: System Resiliency in Practice* | Casey Rosenthal, Nora Jones, O'Reilly, 2020 | I | No | Principles, steady-state hypothesis, blast radius, game days (`l6-chaos-engineering`) |
| B24 | *Seeking SRE* | David N. Blank-Edelman (ed.), O'Reilly, 2018 | I | No | Essays on SRE practice incl. data, incidents, scale (`l6-incident-debugging`) |
| B25 | *The Datacenter as a Computer*, 3rd ed. | Luiz André Barroso, Urs Hölzle, Parthasarathy Ranganathan, Morgan & Claypool / Springer, 2018 | I–A | **Yes** — open access (Springer, OAPEN) | Workloads and software infrastructure, failures and repairs, cost (`l6-capacity-planning`, `l6-cost-tradeoffs`, `l0-availability-nines`) |

## Architecture, messaging and streaming

| # | Book | Author(s), year, edition | Level | Free? | Chapters → our topics |
|---|---|---|---|---|---|
| B26 | *Building Microservices*, 2nd ed. | Sam Newman, O'Reilly, 2021 | I | No | Microservice communication styles (`l3-sync-vs-async`); workflow / sagas (`l6-sagas`); resiliency (`l3-circuit-breakers`); scaling (L1–L2); deployment (`l6-safe-deployments`) |
| B27 | *Microservices Patterns* | Chris Richardson, Manning, 2018 | I | No (pattern catalogue free at microservices.io) | Interprocess communication & transactional outbox (`l6-outbox-pattern`); sagas (`l6-sagas`); event sourcing (`l6-event-sourcing-cqrs`); CQRS; API gateway (`l1-reverse-proxy-and-gateway`) |
| B28 | *Enterprise Integration Patterns* | Gregor Hohpe, Bobby Woolf, Addison-Wesley, 2003 | I | Partly — pattern summaries at enterpriseintegrationpatterns.com | Messaging channels, publish–subscribe, competing consumers, dead letter channel, guaranteed delivery, idempotent receiver (`l3-message-queues`, `l3-pubsub-fanout`, `l3-dead-letter-queues`, `l3-idempotency`) |
| B29 | *Fundamentals of Software Architecture* | Mark Richards, Neal Ford, O'Reilly, 2020 | B–I | No | Architecture characteristics (scalability, availability, elasticity), styles (layered, event-driven, microservices, space-based) → `l5-interview-framework`, `l3-sync-vs-async` |
| B30 | *Software Architecture: The Hard Parts* | Ford, Richards, Sadalage, Dehghani, O'Reilly, 2021 | I–A | No | Pulling apart operational data, distributed workflows (orchestration vs choreography), transactional sagas, contracts (`l6-sagas`, `l6-two-phase-commit`) |
| B31 | *Designing Distributed Systems*, 2nd ed. | Brendan Burns, O'Reilly, 2024 | I | No (1st ed. 2018 was distributed free by Microsoft) | Single-node patterns (sidecar, ambassador, adapter); replicated load-balanced services (L1); sharded services (`l2-sharding-basics`); scatter/gather (`l6-tail-latency-hedging`); work queues and event-driven batch (`l3-message-queues`, `l3-background-jobs`) |
| B32 | *Building Event-Driven Microservices* | Adam Bellemare, O'Reilly, 2020 | I | No | Event brokers, schemas, stateful streaming, CDC and the outbox (`l6-change-data-capture`, `l6-outbox-pattern`, `l6-event-sourcing-cqrs`) |
| B33 | *Streaming Systems* | Tyler Akidau, Slava Chernyak, Reuven Lax, O'Reilly, 2018 | A | No | Streaming 101; what/where/when/how; watermarks; exactly-once and side effects; streams and tables (`l3-delivery-semantics`, `l5-metrics-pipeline`, `l6-event-sourcing-cqrs`) |
| B34 | *Kafka: The Definitive Guide*, 2nd ed. | Gwen Shapira, Todd Palino, Rajini Sivaram, Krit Petty, O'Reilly, 2021 | I | Yes — free edition offered by Confluent | Producers, consumers & consumer groups, reliable data delivery, exactly-once semantics, replication (`l3-message-queues`, `l3-delivery-semantics`, `l5-metrics-pipeline`) |
| B35 | *Designing Event-Driven Systems* | Ben Stopford, O'Reilly / Confluent, 2018 | I | **Yes** — free from Confluent | Events as shared state, event sourcing & CQRS, streaming as a database (`l6-event-sourcing-cqrs`, `l6-change-data-capture`) |
| B36 | *Making Sense of Stream Processing* | Martin Kleppmann, O'Reilly / Confluent, 2016 | I | **Yes** — free from Confluent | Using logs to build applications, integrating databases and Kafka with CDC (`l6-change-data-capture`, `l6-outbox-pattern`) |
| B37 | *I Heart Logs* | Jay Kreps, O'Reilly, 2014 | I | No (based on the free essay "The Log: What every software engineer should know…") | The log as unifying abstraction (`l6-event-sourcing-cqrs`, `l5-metrics-pipeline`) |

## Scalability and system-design interview books

| # | Book | Author(s), year, edition | Level | Free? | Chapters → our topics |
|---|---|---|---|---|---|
| B38 | *Web Scalability for Startup Engineers* | Artur Ejsmont, McGraw-Hill, 2015 | B | No | Ch2 principles; Ch3 front-end layer (LB, CDN, stateless); Ch4 web services; Ch5 data layer (replication, sharding); Ch6 caching; Ch7 asynchronous processing; Ch8 searching for data → L1–L3 |
| B39 | *The Art of Scalability*, 2nd ed. | Martin L. Abbott, Michael T. Fisher, Addison-Wesley, 2015 | I | No | AKF scale cube (clone / split by function / split by customer) → `l1-horizontal-scaling`, `l2-sharding-basics`; capacity planning, risk, fault isolation ("swim lanes" → `l3-bulkheads`) |
| B40 | *System Design Interview – An Insider's Guide*, Vol. 1 | Alex Xu, 2020 | B–I | No | Ch1 scale from zero to millions (L1–L2), Ch2 estimation (`l0-estimation-basics`), Ch3 framework (`l5-interview-framework`), Ch4 rate limiter, Ch5 consistent hashing, Ch6 key-value store, Ch7 unique IDs, Ch8 URL shortener, Ch9 web crawler, Ch10 notifications, Ch11 news feed, Ch12 chat, Ch13 autocomplete, Ch14 video, Ch15 file storage → matching `l5-*` lessons. **Topic map only** |
| B41 | *System Design Interview – An Insider's Guide*, Vol. 2 | Alex Xu, Sahn Lam, 2022 | I–A | No | Proximity service, nearby friends, maps, distributed message queue, metrics monitoring, ad click aggregation, hotel reservation, email, object storage, gaming leaderboard, payment system, digital wallet, stock exchange → `l5-proximity-service`, `l5-metrics-pipeline`, `l5-leaderboard`, `l5-payment-system`, new `l5-hotel-booking`, `l5-ad-click-aggregation`. **Topic map only** |
| B42 | *Hacking the System Design Interview* | Stanley Chiang, 2022 | B–I | No | Building blocks then worked problems; topic map for L5 |
| B43 | *Acing the System Design Interview* | Zhiyong Tan, Manning, 2024 | I | No | Non-functional requirements, distributed transactions, common services (rate limiting, notifications, autocomplete…) → L5, `l6-sagas` |
| B44 | *Grokking the System Design Interview* (course) | DesignGurus / Educative, online, ongoing | B–I | No | Classic problems list + "glossary" of building blocks; **topic map only** |

## Networking and the web

| # | Book | Author(s), year, edition | Level | Free? | Chapters → our topics |
|---|---|---|---|---|---|
| B45 | *Computer Networking: A Top-Down Approach*, 8th ed. | James Kurose, Keith Ross, Pearson, 2021 | B–I | No (authors publish free lecture slides/videos) | Ch1 delay, loss, throughput (`l0-latency-and-distance`); Ch2 application layer: HTTP, DNS, CDNs/video streaming (`l0-http-basics`, `l0-dns-and-network-path`, `l1-cdn-static-content`, `l5-video-streaming`); Ch3 transport, TCP, congestion control |
| B46 | *High Performance Browser Networking* | Ilya Grigorik, O'Reilly, 2013 | B–I | **Yes** — hpbn.co | Ch1 latency & bandwidth; Ch2 TCP; Ch4 TLS; Ch9–12 HTTP/1.x/2; Ch17 WebSocket (`l5-chat-system`) |

## Lecture notes used like books

| # | Material | Author(s), year | Level | Free? | Topics |
|---|---|---|---|---|---|
| B47 | *Distributed Systems* lecture notes (Cambridge Part IB) | Martin Kleppmann, 2020– | I | **Yes** — cl.cam.ac.uk/teaching (PDF + videos) | Models, time and clocks, broadcast, replication, quorums, consensus/Raft, CRDTs → L4, L6 |
| B48 | MIT 6.5840 (6.824) Distributed Systems | Robert Morris et al., MIT, Spring 2026 | I–A | **Yes** — pdos.csail.mit.edu/6.824 | Paper-driven: MapReduce, GFS, Raft, ZooKeeper, Spanner, Chain Replication, Memcache at Facebook → L4, L6 |
| B49 | CMU 15-445/645 Database Systems | Andy Pavlo et al., CMU | I | **Yes** — lecture videos and notes | Storage, indexes, concurrency control, recovery, distributed databases → L2 |

## Counts

- 46 books (B1–B46) plus 3 lecture-note series used like books (B47–B49).
- Free legal editions: B5, B6 (catalogue), B8, B10, B15 (old), B16, B17, B18, B25, B27/B28 (pattern
  catalogues), B34, B35, B36, B46, B47–B49.
- Interview books (B40–B44) are used **only** as topic maps and for coverage checks.
