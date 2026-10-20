---
id: l0-cache-basics
title: "Caches: keeping a copy within reach"
---

## Outcome
Compute how much a cache relieves the database for a given hit ratio, and name a cache's two
risks: stale data and the moment the cache disappears.

## Picture it first
You cook every day. Salt, fish sauce and pepper sit on the shelf by the stove; the rice sack lives
in the storeroom. The shelf is small but within reach; the storeroom is big but a walk away. If the
fish sauce bottle on the shelf runs out and you do not notice, you still think you have some. And
if someone clears the shelf, you are back to fetching every item from the storeroom.

## Terms
- **Cache**: a small, fast copy of data that is slow or costly to fetch, usually kept in RAM (the
  computer's working memory).
- **Cache hit**: the data is in the cache. **Cache miss**: it is not, so it is fetched from the
  source, and usually a copy is kept.
- **Hit ratio**: hits ÷ all lookups.
- **TTL** (time to live): how long a copy counts as fresh.
- **Eviction**: removing entries when the cache is full. For example, **LRU** (least recently used)
  drops whatever has gone unused the longest.
- **Source of truth**: where the master copy lives, usually the database. The cache only holds a
  copy.

Why caches are fast: reading memory takes about 100 nanoseconds, a random read from an SSD about
16 microseconds, and a round trip inside one data centre about 0.5 milliseconds.

## Common misconceptions
- **M1**: "A cache keeps everything forever." It has a size limit, and copies expire.
- **M2**: "A cache is just a faster database." It is a copy; the master copy lives elsewhere.
- **M3**: "Adding a cache can only help." It can serve stale data, and when it fails, every read
  lands on the database at once.

## Step 1: observe
A product page gets 10,000 reads per second. With no cache, the database receives 10,000 queries
per second.

## Step 2: analyse
Put a cache in front of the database with a 90% hit ratio:

- 9,000 reads per second are answered by the cache.
- Only 1,000 reads per second (10%) reach the database.

At 99% hits, only 100 reads per second reach the database. Each extra "nine" cuts the database
load tenfold.

## Step 3: apply
A product's price changes at 10:00 and the cache TTL is 5 minutes. At 10:03 shoppers still see the
old price: a **stale read**. You have two options: a shorter TTL (more reads go to the database),
or delete the cache entry whenever the price changes (and remember to do it everywhere). L2 goes
deeper.

## Questions
Pass with 4 correct answers out of 5.

- **q1**: 20,000 reads per second arrive and the hit ratio is 95%. How many queries per second
  reach the database?
- **q2**: The cache restarts and comes back empty. What happens to the database?
- **q2.a**: Nothing changes; it keeps its usual load.
- **q2.b**: Almost every read suddenly lands on it at once.
- **q2.c**: The site stops, because the data only existed in the cache.
- **q3**: What are the upside and the downside of a long TTL?
- **q3.a**: More hits, but changed data stays stale for longer.
- **q3.b**: Fewer hits, but the data is always fresh.
- **q3.c**: It makes no difference either way.
- **q4**: Why do caches usually live in RAM?
- **q4.a**: RAM is cheaper per gigabyte than disk.
- **q4.b**: RAM keeps its data when the power goes off.
- **q4.c**: Reading RAM is hundreds or thousands of times faster than a disk or a network trip.
- **q5**: True or false: the cache holds the master copy of the data.
- **q5.a**: True.
- **q5.b**: False.

## Feedback
- **q2**: While the cache was full, it absorbed most of the reads. Empty, it misses every time, so
  for a while the database receives the whole load it was protected from. That is the second risk
  every cache brings.
- **q3**: A cache entry lives until its TTL runs out or it is evicted. A long TTL keeps more answers
  in the cache, so more hits, but a change at the source stays invisible for longer.
- **q5**: The cache is a convenient copy. The master copy lives in the source of truth, usually the
  database, which is why a cache can be emptied without losing data.

## Takeaways
- A cache is a small, fast, expiring copy of data.
- The hit ratio decides how much the database is relieved.
- Two risks always come along: stale data and the cache disappearing.

## Review questions
1. Tell a cache hit from a cache miss.
2. Which entry does LRU evict?
3. Name three places a web request may meet a cache. *(The browser, DNS, a CDN, an application
   cache, inside the database.)*

## Coming later: the experiment
When the lab gains a cache component, this lesson becomes an experiment: users → web → cache →
database at 12,000 reads per second. Adding a large-enough cache keeps the database calm; buying a
bigger database instead works but costs more; a tiny cache barely helps. A fault that switches the
cache off will show the second risk live.
