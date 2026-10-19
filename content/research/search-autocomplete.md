# Search autocomplete (typeahead) — research note

- Level: L5
- Feeds lessons: `l5-search-autocomplete` (challenge `c-l5-autocomplete`)
- Researched: 2026-10-19

## Key facts (in our words)

1. **Every keystroke is a query**, so the budget is tight (well under 100 ms end to end); answers must
   come from memory, near the user, and be cacheable by prefix. [1][2]
2. **Tries/prefix trees** map prefixes to candidates; storing the precomputed top-k at each node turns
   lookup into one walk of the prefix. [3][9]
3. **Separate the read path from the data-gathering path**: query logs are aggregated offline (hourly
   or daily) into new top-k tables, then swapped in; the serving tier never computes rankings
   live. [5][9]
4. **Approximate counting** (Count-Min sketch) estimates frequent queries with small memory. [5]
5. **Real systems**: LinkedIn open-sourced Cleo, its library for partial, out-of-order, real-time
   typeahead; Elasticsearch's completion suggester uses in-memory FSTs. [4][6]
6. **Browser/CDN caching of short prefixes** and client debouncing cut request volume. [2][7]
7. **Filtering and personalisation** (remove unsafe terms, boost the user's history) happen at
   aggregation or merge time. [9]

## Engine mapping

- `redis`, `worker`, `queue` planned; precomputed top-k index with freshness metric → gap
  `autocomplete-topk`. Metric `p99` and `cacheOps` cover the serving side.

## Misconceptions

- "Query the database with LIKE 'prefix%' on each keystroke." [3][9]
- "Rankings must be real-time." Offline aggregation is usually enough. [4][9]

## Sources

Primary:
1. *Measure performance with the RAIL model* — web.dev — https://web.dev/articles/rail — accessed 2026-10-19.
2. *HTTP caching* — MDN Web Docs — https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Caching — 2026.
3. *Introduction to Information Retrieval*, ch. 3 "Dictionaries and tolerant retrieval" — Manning,
   Raghavan, Schütze — https://nlp.stanford.edu/IR-book/ — 2008.
4. *LinkedIn open sources search engine* (Cleo typeahead library, Apache 2.0) — PCWorld report on
   LinkedIn's announcement (the original LinkedIn Engineering post at
   engineering.linkedin.com/open-source/cleo-… now returns 404 and is not archived) —
   https://www.pcworld.com/article/246872/linkedin_open_sources_search_engine.html — 2012.
5. *An Improved Data Stream Summary: The Count-Min Sketch and its Applications* — G. Cormode,
   S. Muthukrishnan, J. Algorithms — https://www.cs.tufts.edu/~nr/cs257/archive/graham-cormode/count-min.pdf — 2005.
6. *Suggesters (completion)* — Elasticsearch Reference —
   https://www.elastic.co/guide/en/elasticsearch/reference/current/search-suggesters.html — accessed 2026-10-19.
7. *What is Amazon CloudFront?* — AWS docs —
   https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/Introduction.html — accessed 2026-10-19.

Books:
9. [B40] *System Design Interview*, vol. 1 — ch. 13 "Design a Search Autocomplete System" (topic map
   only).
10. [B15] *Elasticsearch: The Definitive Guide* — "Partial matching" (prefix, edge n-grams).
11. [B14] *Redis in Action* — Carlson — autocomplete with sorted sets.

Repos:
12. [G10] kdn251/interviews — tries — https://github.com/kdn251/interviews.
13. [G4] ashishps1/awesome-system-design-resources — https://github.com/ashishps1/awesome-system-design-resources.
