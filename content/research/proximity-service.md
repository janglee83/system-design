# Proximity services: geohash, quadtrees, S2 and H3 — research note

- Level: L5
- Feeds lessons: `l5-proximity-service`
- Builds on: `indexes-and-storage-engines`, `sharding`, `caching-patterns`
- Researched: 2026-10-19

## Key facts (in our words)

1. **Two-dimensional search breaks one-dimensional indexes.** An index on latitude finds a band
   around the planet; combining it with an index on longitude still scans far too much. Spatial
   indexes map 2-D space to cells or nested rectangles. [9][4]
2. **Geohash turns a point into a string.** It interleaves the bits of longitude and latitude and
   encodes them in base 32; points that share a longer prefix are usually close, so a prefix is a
   rectangular cell. Each extra character makes cells smaller (length 6 ≈ 1.2 km × 0.6 km at the
   equator). [1][2]
3. **Edges need neighbours.** Two places a few metres apart can sit in different cells with
   different prefixes, so a radius search queries the target cell plus its eight neighbours and
   then filters by exact distance. [1][10]
4. **Redis stores geo points in sorted sets.** `GEOADD` encodes a 52-bit geohash as the sorted-set
   score; `GEOSEARCH` finds members within a radius or box by scanning the covering cells and then
   filtering by distance. [1]
5. **Quadtrees adapt to density.** A quadtree splits a square into four children whenever it holds
   more than a set number of points, so dense downtowns get small cells and empty deserts stay as one
   big cell. Lookups descend the tree; it is usually kept in memory and rebuilt or updated
   incrementally. [3][10]
6. **R-trees index shapes.** PostGIS builds GiST (R-tree-like) indexes over bounding boxes, so
   `ST_DWithin` queries use the index first and exact geometry second. Guttman's R-tree (1984) is
   the classic structure. [4][5]
7. **S2 uses a space-filling curve on a cube.** Google's S2 projects the sphere onto six cube faces
   and orders cells with a Hilbert curve, giving 31 levels of hierarchical cells whose ids are 64-bit
   integers; a region is covered by a handful of cell-id ranges, which are cheap to query in any
   ordered key-value store. [6]
8. **H3 uses hexagons.** Uber's H3 grid tiles the world with hexagons at 16 resolutions; every
   neighbour of a hexagon is the same distance from its centre, which simplifies smoothing and
   "nearby" aggregation (surge pricing, supply/demand). [7][8]
9. **Read-heavy, slow-changing data → cache aggressively.** Business locations change rarely, so cell
   → business-id lists can be precomputed and cached; writes (new business) can propagate within
   minutes. Moving objects (drivers, friends) are the opposite: frequent ephemeral updates, kept in
   memory with TTLs and pushed via pub/sub. [10][11]
10. **Shard by geography carefully.** Sharding by cell keeps queries local but creates hot shards in
    dense cities; sharding by business id spreads load but needs scatter-gather for a radius query.
    A common answer: data is small enough to replicate fully to read replicas, and only scale reads.
    [10][12]
11. **Search engines do geo too.** Elasticsearch's `geo_distance` query filters documents by distance
    from a point using `geo_point` fields, combining location with text relevance. [9]

## Numbers worth remembering

- Geohash length → cell size (approx., equator): 4 ≈ 39 km × 20 km; 5 ≈ 4.9 km × 4.9 km;
  6 ≈ 1.2 km × 0.6 km; 7 ≈ 153 m × 153 m. [2]
- 200 M businesses × ~1 KB metadata ≈ 200 GB — fits on a few machines; the index of (cell, id)
  pairs is much smaller (derived).
- Radius query = 9 cell lookups (cell + 8 neighbours) then a distance filter.

## Engine mapping

- Gap `geo-index`: an index kind (none / lat-lng B-tree / geohash / quadtree) whose per-query cost
  and rows-scanned depend on the choice, plus a density skew ("downtown") workload parameter that
  creates hot cells. Uses `p95`, `peakBusy`.
- Planned `redis` caching of cell results already gives the read-heavy part of the lesson.

## Misconceptions

- "Index latitude and longitude separately." Each index alone scans a huge band. [4][9]
- "Same geohash prefix means close; different prefix means far." Edge effects break both. [1][2]
- "Locations of drivers belong in the main database." They are ephemeral, high-rate updates; keep
  them in memory with TTLs. [7][11]

## Analogy ideas

- Postcodes: a shorter postcode prefix is a bigger area; to find shops near the border of two
  postcodes you check both.

## Caveats

- Cell sizes vary with latitude for geohash; S2 and H3 cells are closer to equal area.

## Sources

Primary:
1. *Redis geospatial indexes* (GEOADD/GEOSEARCH, 52-bit geohash score) — Redis —
   https://redis.io/docs/latest/develop/data-types/geospatial/ — accessed 2026-10-19.
2. *Geohash* (encoding, precision table) — Elasticsearch Reference, "Geohash grid aggregation" —
   https://www.elastic.co/docs/reference/aggregations/search-aggregations-bucket-geohashgrid-aggregation — accessed 2026-10-19.
3. *Quad trees: a data structure for retrieval on composite keys* — R. A. Finkel, J. L. Bentley,
   Acta Informatica 4 — https://link.springer.com/article/10.1007/BF00288933 — 1974.
4. *Spatial Indexing* — PostGIS Workshop — https://postgis.net/workshops/postgis-intro/indexing.html —
   accessed 2026-10-19.
5. *R-trees: A Dynamic Index Structure for Spatial Searching* — A. Guttman, SIGMOD —
   https://dl.acm.org/doi/10.1145/602259.602266 — 1984.
6. *S2 Geometry — S2 Cells* — Google — http://s2geometry.io/devguide/s2cell_hierarchy.html —
   accessed 2026-10-19.
7. *H3: Uber's Hexagonal Hierarchical Spatial Index* — Uber Engineering —
   https://www.uber.com/blog/h3/ — 2018.
8. *H3 documentation — overview* — h3geo.org — https://h3geo.org/docs/ — accessed 2026-10-19.
9. *Geo-distance query* — Elasticsearch Reference —
   https://www.elastic.co/docs/reference/query-languages/query-dsl/query-dsl-geo-distance-query — accessed 2026-10-19.

Books:
10. [B41] *System Design Interview*, vol. 2 — Xu, Lam — "Proximity Service" and "Nearby Friends"
    chapters (topic map only).
11. [B14] *Redis in Action* — Carlson — ch. 5 (TTL-based ephemeral data) and ch. 8 (pub/sub-style
    fan-out).
12. [B1] *Designing Data-Intensive Applications* — Kleppmann — ch. 3 "Multi-column indexes"
    (R-trees, space-filling curves) and ch. 6 "Partitioning" (hot spots).

Repos:
13. [G4] ashishps1/awesome-system-design-resources — geospatial indexing articles —
    https://github.com/ashishps1/awesome-system-design-resources.
14. [G11] binhnguyennus/awesome-scalability — Uber/Yelp geo posts —
    https://github.com/binhnguyennus/awesome-scalability.
