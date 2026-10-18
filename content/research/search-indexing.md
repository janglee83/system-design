# Full-text search and inverted indexes — research note

- Level: L2
- Feeds lessons: `l2-search-indexing` (background for `l5-search-autocomplete`,
  `l6-change-data-capture`)
- Researched: 2026-10-19

## Key facts (in our words)

1. **An inverted index maps each term to the list of documents (postings) that contain it**, so a
   query for words intersects short lists instead of scanning every document. [1][8]
2. **Analysis turns text into terms**: tokenising, lower-casing, removing stop words, stemming;
   queries go through the same analysis so they match. [1][2]
3. **Ranking** scores matches (e.g. TF-IDF, BM25) so the best results come first. [1][2]
4. **Search engines are usually derived stores**: the database stays the source of truth, and an
   indexing pipeline (often CDC or a queue) feeds a search cluster. Results lag writes. [6][9]
5. **Elasticsearch is near real-time**: new documents become searchable after a refresh (default
   about one second). [3]
6. **PostgreSQL has built-in full-text search** (`tsvector`, `tsquery`, GIN indexes), often enough
   before adding a separate engine. [4]
7. **Search clusters shard the index** and scatter a query to all shards, then gather and merge the
   top results; tail latency of the slowest shard sets the response time. [5][10]

## Engine mapping

- No search component in the spec → gap `search-index-component` (indexing lag, scatter/gather).
  Lesson is `reading+check`.

## Misconceptions

- "`LIKE '%word%'` is a search engine." It scans and cannot rank. [4]
- "The search index is always in sync." It lags. [3][9]
- "Search replaces the database." It is a derived copy. [9]

## Sources

Primary:
1. *Introduction to Information Retrieval* — C. D. Manning, P. Raghavan, H. Schütze, Cambridge UP
   (free online) — https://nlp.stanford.edu/IR-book/ — 2008.
2. *Text analysis overview* — Elasticsearch Reference —
   https://www.elastic.co/guide/en/elasticsearch/reference/current/analysis-overview.html — accessed
   2026-10-19.
3. *Near real-time search* — Elasticsearch Reference —
   https://www.elastic.co/guide/en/elasticsearch/reference/current/near-real-time.html — accessed
   2026-10-19.
4. *PostgreSQL 18 Documentation, "Full Text Search"* — PGDG —
   https://www.postgresql.org/docs/current/textsearch.html — 2026.
5. *The Tail at Scale* — J. Dean, L. A. Barroso, CACM — https://research.google/pubs/pub40801/ — 2013.
6. *Stack Overflow: The Architecture – 2016 Edition* (Elasticsearch beside SQL Server) — Nick
   Craver — https://stackoverflow.blog/2016/02/17/stack-overflow-the-architecture-2016-edition/ — 2016.

Books:
7. [B15] *Elasticsearch: The Definitive Guide* — Gormley, Tong — "Search in Depth", "Inside a shard".
8. [B38] *Web Scalability for Startup Engineers* — Ejsmont — ch. 8 "Searching for Data".
9. [B1] *Designing Data-Intensive Applications* — ch. 3 (full-text indexes) and ch. 11/12 (derived
   data).
10. [B31] *Designing Distributed Systems* — Burns — "Scatter/Gather".

Repos:
11. [G1] donnemartin/system-design-primer — query-cache and search sections in "Design examples" —
    https://github.com/donnemartin/system-design-primer.
