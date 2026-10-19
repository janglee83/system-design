# Web crawler — research note

- Level: L5
- Feeds lessons: `l5-web-crawler` (challenge `c-l5-crawler`)
- Researched: 2026-10-19

## Key facts (in our words)

1. **Loop**: take a URL from the frontier, resolve DNS, fetch, parse, extract links, normalise and
   de-duplicate them, add new ones to the frontier, store the content. Mercator described this
   modular pipeline. [1]
2. **The URL frontier does two jobs**: prioritise (which pages matter or change often) and be
   polite (one host gets at most a few concurrent fetches, with delays). Mercator used per-host
   back queues. [1][9]
3. **Politeness rules**: obey `robots.txt` (now RFC 9309) and crawl-rate limits; Google documents
   how Googlebot adapts crawl rate to server responses. [2][3]
4. **DNS is a hidden bottleneck**; crawlers run their own caching resolvers. [1][9]
5. **Seen-URL tests at scale** use hashing, disk-backed sets or Bloom filters; IRLbot showed how to
   keep crawling efficient at billions of pages. [4][5]
6. **Near-duplicate content** (mirrors, session ids) is detected with fingerprints such as SimHash;
   Google reported using it for web-scale crawling. [6]
7. **Crawler traps** (infinite calendars, generated URLs) need depth limits and URL normalisation. [9][10]
8. **Common Crawl** publishes open crawl data, a useful sense of scale. [7]

## Engine mapping

- Queues/workers/object storage are planned; frontier politeness, DNS caching and dedupe are not →
  gap `crawler-behaviors`.

## Misconceptions

- "Crawling is just downloading in parallel." Politeness and dedupe dominate the design. [1][2]
- "More threads = faster crawl." Per-host limits cap it; spread across hosts instead. [1]

## Sources

Primary:
1. *Mercator: A Scalable, Extensible Web Crawler* — A. Heydon, M. Najork, World Wide Web journal —
   https://www.cs.cornell.edu/courses/cs685/2002fa/mercator.pdf — 1999.
2. *RFC 9309: Robots Exclusion Protocol* — M. Koster et al., IETF — https://www.rfc-editor.org/rfc/rfc9309 — 2022.
3. *Googlebot* / crawling overview — Google Search Central —
   https://developers.google.com/search/docs/crawling-indexing/googlebot — accessed 2026-10-19.
4. *IRLbot: Scaling to 6 Billion Pages and Beyond* — H.-T. Lee, D. Leonard, X. Wang, D. Loguinov,
   WWW — https://irl.cs.tamu.edu/people/hsin-tsang/papers/www2008.pdf — 2008.
5. *Space/Time Trade-offs in Hash Coding with Allowable Errors* — B. Bloom, CACM —
   https://dl.acm.org/doi/10.1145/362686.362692 — 1970.
6. *Detecting Near-Duplicates for Web Crawling* — G. S. Manku, A. Jain, A. Das Sarma, WWW —
   https://research.google/pubs/pub33026/ — 2007.
7. *Common Crawl* — Common Crawl Foundation — https://commoncrawl.org/ — accessed 2026-10-19.

Books:
8. [B1] *Designing Data-Intensive Applications* — ch. 10 "Batch Processing" (processing crawl
   output).
9. [B40] *System Design Interview*, vol. 1 — Xu — ch. 9 "Design a Web Crawler" (topic map only).
10. *Introduction to Information Retrieval* — Manning, Raghavan, Schütze — ch. 20 "Web crawling and
    indexes" — https://nlp.stanford.edu/IR-book/ (free).
11. [B45] *Computer Networking: A Top-Down Approach*, 8th ed. — ch. 2 (HTTP, DNS).

Repos:
12. [G1] donnemartin/system-design-primer — "Design a web crawler" —
    https://github.com/donnemartin/system-design-primer.
13. [G23] papers-we-love/papers-we-love — https://github.com/papers-we-love/papers-we-love.
