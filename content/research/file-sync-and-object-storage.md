# File storage, sync and object storage — research note

- Level: L5
- Feeds lessons: `l5-file-sync`, `l5-object-storage-design` (background: `l2-blob-storage`,
  `l1-object-storage-for-assets`)
- Builds on: `key-value-and-blob-storage`, `cdn-and-static-content`, `conflict-resolution-and-crdts`
- Researched: 2026-10-19

## Key facts (in our words)

1. **Split metadata from bytes.** A file-sync service keeps two very different stores: a metadata
   database (folders, file names, versions, which blocks make up each version, who can see it) and
   a block/object store for the bytes. Metadata is small, relational and transactional; bytes are
   huge, immutable and content-addressed. [1][2][12]
2. **Chunk and hash.** Dropbox splits files into blocks of up to 4 MB and names each block by its
   SHA-256 hash. A client asks which hashes the server lacks and uploads only those, so editing one
   part of a large file, or uploading a file someone already stored, moves little data
   (deduplication). [1][2]
3. **Streaming sync**: Dropbox pipelined upload and download so the receiving device can start
   fetching blocks before the sender has committed the whole file, cutting end-to-end sync time
   for large files. [1]
4. **A sync engine compares trees.** Dropbox's rewritten sync engine (Nucleus) models three trees:
   the remote tree (server state), the local tree (disk state) and the synced tree (the last state
   both agreed on). Differences against the synced tree tell which side changed. [3]
5. **Concurrent edits create conflicts, not merges.** When two devices change the same file before
   syncing, Dropbox keeps both and saves one as a "conflicted copy" rather than guessing. [4]
6. **Change notification**: clients learn about remote changes through a long-lived notification
   channel (long polling or push) and then pull the metadata delta, rather than polling the whole
   tree. [1][12]
7. **Object storage is a flat key → object namespace over HTTP.** Amazon S3 offers PUT/GET/DELETE
   by key, read-after-write consistency for all operations since December 2020, and is designed for
   99.999999999% (11 nines) durability by storing data redundantly across devices and facilities. [5][6]
8. **Big uploads go in parts.** S3 multipart upload splits an object into up to 10,000 parts of
   5 MiB–5 GiB (the last part may be smaller); parts upload in parallel and failed parts retry
   alone. [7]
9. **Clients upload directly to storage.** A pre-signed URL grants time-limited permission to PUT
   or GET one object, so bytes bypass the application servers, which only issue the URL and record
   metadata. [8]
10. **Replication vs erasure coding.** GFS kept three full replicas of 64 MB chunks with a single
    master holding metadata. [9] Facebook's f4 moved "warm" BLOBs from triple-replicated Haystack
    (effective replication factor 3.6) to Reed–Solomon erasure coding plus XOR across data centres
    (effective factor 2.1), trading slower reconstruction for much less storage. [10][11]
11. **Small-file metadata is the hidden cost.** Haystack packed many photos into large volume files
    so that reading a photo needs one disk seek instead of several filesystem metadata lookups. [11]
12. **Dropbox built its own block store (Magic Pocket)** for exabytes of immutable blocks, with
    blocks of up to 4 MB, replication and erasure coding across zones, and a metadata index mapping
    block hash to location. [2]

## Numbers worth remembering

- Block size: Dropbox ≤ 4 MB; GFS chunk 64 MB. [1][9]
- S3 multipart: ≤ 10,000 parts, 5 MiB–5 GiB each. [7]
- Durability design target: 11 nines (S3 standard classes). [6]
- Storage overhead: 3 replicas = 3.0×; Reed–Solomon (10,4) = 1.4× per site. [10]

## Engine mapping

- Planned: `object-storage`, `object-storage-down`, `queue`, `worker`, `postgres` (metadata).
- Gap `chunked-upload-dedupe` (refined): per-upload chunk size, a dedupe ratio (share of chunks
  already stored), bytes-transferred and storage-cost metrics, and a sync-notification fan-out to
  a user's other devices. Conflict counting would reuse `conflict-resolution`.
- `l5-object-storage-design` additionally needs `erasure-coding-and-durability` (proposed gap):
  storage overhead vs tolerated disk/node losses, and a `dataLoss` metric under multiple
  `object-storage-node-down` faults.

## Misconceptions

- "Store files in the database." Large BLOBs bloat backups and replication; keep bytes in object
  storage and references in the database. [12][13]
- "Sync means re-uploading the file." Block hashing uploads only changed blocks. [1]
- "Three copies is the only way to be durable." Erasure coding gives similar durability for less
  space, at the cost of reconstruction work. [10]
- "Last writer wins is fine for files." Silent overwrite loses someone's work; keep both. [4]

## Analogy ideas

- A library catalogue (metadata) vs the shelves (bytes): you can rename a book in the catalogue
  without moving it.
- Chunk hashes are like fingerprints: if the fingerprint is already on file, you do not need the
  person.

## Caveats

- Block size and engine design are Dropbox-specific; other products use variable-size
  (content-defined) chunking.

## Sources

Primary:
1. *Streaming File Synchronization* — Nipunn Koorapati, Dropbox Tech —
   https://dropbox.tech/infrastructure/streaming-file-synchronization — 2014.
2. *Inside the Magic Pocket* — James Cowling, Dropbox Tech —
   https://dropbox.tech/infrastructure/inside-the-magic-pocket — 2016.
3. *Rewriting the heart of our sync engine* — Sujay Jayakar, Dropbox Tech —
   https://dropbox.tech/infrastructure/rewriting-the-heart-of-our-sync-engine — 2020.
4. *What's a conflicted copy?* — Dropbox Help Center —
   https://help.dropbox.com/organize/conflicted-copy — accessed 2026-10-19.
5. *Amazon S3 Update – Strong Read-After-Write Consistency* — Jeff Barr, AWS News Blog —
   https://aws.amazon.com/blogs/aws/amazon-s3-update-strong-read-after-write-consistency/ — 2020.
6. *Data protection in Amazon S3* (durability design) — AWS docs —
   https://docs.aws.amazon.com/AmazonS3/latest/userguide/DataDurability.html — accessed 2026-10-19.
7. *Amazon S3 multipart upload limits* — AWS docs —
   https://docs.aws.amazon.com/AmazonS3/latest/userguide/qfacts.html — accessed 2026-10-19.
8. *Sharing objects with presigned URLs* — AWS docs —
   https://docs.aws.amazon.com/AmazonS3/latest/userguide/ShareObjectPreSignedURL.html — accessed 2026-10-19.
9. *The Google File System* — S. Ghemawat, H. Gobioff, S.-T. Leung, SOSP —
   https://research.google/pubs/the-google-file-system/ — 2003.
10. *f4: Facebook's Warm BLOB Storage System* — S. Muralidhar et al., OSDI —
    https://www.usenix.org/conference/osdi14/technical-sessions/presentation/muralidhar — 2014.
11. *Finding a Needle in Haystack: Facebook's Photo Storage* — D. Beaver et al., OSDI —
    https://www.usenix.org/conference/osdi10/finding-needle-haystack-facebooks-photo-storage — 2010.

Books:
12. [B40] *System Design Interview*, vol. 1 — Xu — ch. 15 "Design Google Drive" (topic map only).
13. [B41] *System Design Interview*, vol. 2 — Xu, Lam — "S3-like Object Storage" chapter (topic map only).
14. [B1] *Designing Data-Intensive Applications* — Kleppmann — ch. 5 "Replication" (handling
    write conflicts) and ch. 10 "Batch Processing" (distributed filesystems, HDFS vs object stores).
15. [B25] *The Datacenter as a Computer*, 3rd ed. — Barroso, Hölzle, Ranganathan — ch. 2 (storage
    infrastructure, erasure coding at warehouse scale).

Repos:
16. [G21] jhuangtw/xg2xg — maps GFS/Colossus to open-source equivalents with paper links —
    https://github.com/jhuangtw/xg2xg.
17. [G11] binhnguyennus/awesome-scalability — Dropbox and storage posts —
    https://github.com/binhnguyennus/awesome-scalability.
