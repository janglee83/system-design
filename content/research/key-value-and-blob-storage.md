# Key-value stores and blob storage — research note

- Level: L2
- Feeds lessons: `l2-nosql-key-value`, `l2-blob-storage`
- Researched: 2026-10-19

## Key facts (in our words)

1. **A key-value store maps a key to an opaque value** with get/put/delete by key; no joins and
   usually no secondary indexes, which makes partitioning and replication simple. [1][2][9]
2. **Dynamo** (Amazon) was built for always-writable shopping carts: consistent hashing,
   replication to N nodes, sloppy quorums and vector clocks, trading consistency for availability. [1]
3. **DynamoDB** exposes partition key (+ optional sort key), eventually consistent reads by default
   and strongly consistent reads on request. [2]
4. **Redis is an in-memory data-structure server** (strings, hashes, lists, sets, sorted sets) often
   used as cache, counter store or session store. [3]
5. **Large files belong in object storage, not in database rows.** Objects live in buckets under
   keys; the database keeps metadata and the key. Clients can upload/download directly with
   presigned URLs so bytes skip the app servers. [4][5]
6. **Facebook Haystack** stored billions of photos by packing many into large files to cut metadata
   I/O; **f4** moved cold ("warm") blobs to erasure-coded storage to save space. [6][7]
7. **Dropbox Magic Pocket** is an in-house exabyte-scale block store, showing that blob storage is a
   system of its own (replication, erasure coding, verification). [8]

## Engine mapping

- `kv-store`, `object-storage`, `kv-node-down` and `object-storage-down` are planned (1b) →
  `l2-nosql-key-value` and `l2-blob-storage` need 1b only.

## Misconceptions

- "Key-value stores are just caches." Many are durable primary stores. [1][2]
- "Store images as BLOBs in Postgres to keep things simple." Fine for tiny scale; bloats backups,
  replication and DB I/O. [4][6]
- "Uploads must go through my servers." Presigned URLs avoid it. [5]

## Sources

Primary:
1. *Dynamo: Amazon's Highly Available Key-value Store* — G. DeCandia et al., SOSP —
   https://www.allthingsdistributed.com/files/amazon-dynamo-sosp2007.pdf — 2007.
2. *DynamoDB read consistency* — AWS docs —
   https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/HowItWorks.ReadConsistency.html —
   accessed 2026-10-19.
3. *Redis data types* — Redis docs — https://redis.io/docs/latest/develop/data-types/ — accessed
   2026-10-19.
4. *What is Amazon S3?* — AWS docs — https://docs.aws.amazon.com/AmazonS3/latest/userguide/Welcome.html — accessed 2026-10-19.
5. *Sharing objects with presigned URLs* — AWS docs —
   https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-presigned-url.html — accessed 2026-10-19.
6. *Finding a needle in Haystack: Facebook's photo storage* — D. Beaver et al., OSDI —
   https://www.usenix.org/legacy/event/osdi10/tech/full_papers/Beaver.pdf — 2010.
7. *f4: Facebook's Warm BLOB Storage System* — S. Muralidhar et al., OSDI —
   https://www.usenix.org/system/files/conference/osdi14/osdi14-paper-muralidhar.pdf — 2014.
8. *Inside the Magic Pocket* — James Cowling, Dropbox Tech —
   https://dropbox.tech/infrastructure/inside-the-magic-pocket — 2016.

Books:
9. [B1] *Designing Data-Intensive Applications* — ch. 3 "Storage and Retrieval" (hash indexes,
   SSTables) and ch. 5/6 on Dynamo-style stores.
10. [B14] *Redis in Action* — Carlson — part 1 (data structures).
11. [B4] *Understanding Distributed Systems* — part "Scalability", chapter "File storage".

Repos:
12. [G23] papers-we-love/papers-we-love — datastores section (Dynamo, Bigtable) —
    https://github.com/papers-we-love/papers-we-love.
