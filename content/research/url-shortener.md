# URL shortener — research note

- Level: L5
- Feeds lessons: `l5-url-shortener` (challenge `c-l5-url-shortener`)
- Researched: 2026-10-19

## Key facts (in our words)

1. **The workload is read-dominated**: a link is created once and followed many times, so the read
   path (lookup + redirect) must be cached and fast. [8][9]
2. **Redirect status matters**: 301 (moved permanently) lets browsers and caches remember the target
   and skip your servers; 302/307 send every click through you, which allows analytics and changes
   later. [1]
3. **Short codes**: encode a unique number in base 62 (a–z, A–Z, 0–9). Seven base-62 characters give
   62⁷ ≈ 3.5 × 10¹² codes. Hashing the URL and truncating risks collisions that must be checked. [8][9]
4. **Unique numbers** come from an ID service (ticket servers, Snowflake, ranges handed out to each
   app server) so codes never collide. [2][3]
5. **Storage is a simple key-value mapping** (code → URL, owner, created, expiry) that partitions well
   by code. [4][10]
6. **Caching the hottest codes** (Zipf-like popularity) removes most reads from the store. [5][6]
7. **Abuse and safety**: link shorteners are used for phishing; real services check targets and rate
   limit creation. [7]

## Engine mapping

- `kv-store`, `redis`, `id_generator`, `cache-down`, `kv-node-down` are planned (1b) → lesson and
  challenge need 1b only.

## Misconceptions

- "Hash the URL and take 7 characters; collisions are impossible." [8]
- "Always use 301." You lose control and analytics. [1]
- "The database is the bottleneck." With caching, often the cache and network are. [5]

## Sources

Primary:
1. *RFC 9110 HTTP Semantics, §15.4 Redirection 3xx* — IETF — https://www.rfc-editor.org/rfc/rfc9110 — 2022.
2. *Ticket Servers: Distributed Unique Primary Keys on the Cheap* — Code.Flickr —
   https://code.flickr.net/2010/02/08/ticket-servers-distributed-unique-primary-keys-on-the-cheap/ — 2010.
3. *Announcing Snowflake* — Twitter Engineering —
   https://blog.x.com/engineering/en_us/a/2010/announcing-snowflake — 2010.
4. *Best practices for designing and using partition keys effectively* — DynamoDB docs —
   https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-partition-key-design.html — accessed 2026-10-19.
5. *Web Caching and Zipf-like Distributions* — L. Breslau et al., INFOCOM —
   https://pages.cs.wisc.edu/~cao/papers/zipf-implications.html — 1999.
6. *Caching challenges and strategies* — Amazon Builders' Library —
   https://aws.amazon.com/builders-library/caching-challenges-and-strategies/ — 2019.
7. *Safe Browsing* — Google Developers — https://developers.google.com/safe-browsing — accessed 2026-10-19.

Books:
8. [B40] *System Design Interview*, vol. 1 — Xu — ch. 8 "Design a URL Shortener" (topic map only).
9. [B42] *Hacking the System Design Interview* — Chiang — URL shortener problem (topic map only).
10. [B1] *Designing Data-Intensive Applications* — ch. 3 (key-value storage), ch. 6 (partitioning).

Repos:
11. [G1] donnemartin/system-design-primer — "Design Pastebin.com (or Bit.ly)" —
    https://github.com/donnemartin/system-design-primer.
12. [G3] karanpratapsingh/system-design — "URL Shortener" chapter — https://github.com/karanpratapsingh/system-design.
