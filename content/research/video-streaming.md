# Video streaming: upload, transcoding, adaptive bitrate and CDNs — research note

- Level: L5
- Feeds lessons: `l5-video-streaming` (challenge `c-l5-video-platform`)
- Builds on: `cdn-and-static-content`, `queues-and-workers`, `file-sync-and-object-storage`
- Researched: 2026-10-19

## Key facts (in our words)

1. **Two separate pipelines.** The upload path (receive original → store → transcode → publish) is
   a batch/background workload measured in minutes; the watch path (manifest + segments from a
   CDN) is a latency-sensitive read workload measured in milliseconds and terabits. [5][11]
2. **Transcoding produces a ladder.** One source becomes several renditions (resolution × bitrate,
   sometimes several codecs). Each rendition is cut into short segments (a few seconds) so the
   player can switch quality between segments. [1][2][5]
3. **Adaptive bitrate streaming (ABR).** HLS (RFC 8216) and MPEG-DASH describe the renditions in a
   manifest/playlist; the player downloads segments over plain HTTP and picks the bitrate for the
   next segment from measured throughput and how much video is buffered. Because segments are
   ordinary HTTP objects, any HTTP cache or CDN can serve them. [1][2]
4. **Buffer-based adaptation works.** Netflix researchers showed that choosing the bitrate mainly
   from the playback buffer level (rather than noisy throughput estimates) reduced rebuffering in a
   large production experiment while keeping quality similar. [3]
5. **Per-title encoding**: Netflix stopped using one fixed bitrate ladder for every title and
   computed a ladder per title based on its complexity (an animated show needs fewer bits than a
   grainy action film for the same visual quality), saving bandwidth or raising quality. [4]
6. **Transcoding is split and parallel.** Large sources are split into chunks that are encoded in
   parallel by many workers and reassembled; Netflix rebuilt its video processing pipeline as
   microservices for encoding, validation and packaging. [5]
7. **Hardware matters at YouTube scale.** Google designed and deployed custom video transcoding
   accelerators (VCUs) in its data centres because software encoding of every upload into many
   formats was too costly. [6]
8. **Serve from the edge, as close as possible.** Netflix's Open Connect puts Netflix-owned cache
   appliances inside ISP networks and at internet exchange points; popular content is pushed to them
   during off-peak "fill windows", so almost all viewing traffic never crosses the wider internet.
   [7]
9. **Popularity is skewed.** A small fraction of titles gets most views; the head stays in edge
   caches, while the long tail is fetched from deeper tiers or origin. Proactive placement uses
   predicted popularity. [7][10]
10. **Bandwidth per viewer dominates cost.** Netflix suggests about 5 Mbps for HD and 15 Mbps for
    4K Ultra HD. One million concurrent HD viewers is therefore about 5 Tbps of egress — a CDN
    problem, not a web-server problem. [8]
11. **Live is different from on-demand.** Live streams must encode and package in near real time;
    shorter segments lower delay but raise request rate and overhead. Low-latency HLS adds partial
    segments. [1][9]
12. **Resumable, direct uploads.** Uploads of multi-gigabyte originals use resumable/multipart
    uploads straight to object storage, then a message triggers transcoding. [5][12]

## Numbers worth remembering

- HD ≈ 5 Mbps, 4K ≈ 15 Mbps per stream (Netflix guidance). [8]
- Segment length: typically 2–10 s; HLS spec recommends a target duration of about 6 s. [1][9]
- 1 M concurrent HD streams ≈ 5 Tbps (derived).
- Storage multiplier: a ladder of ~6–10 renditions × codecs can store several times the bytes of
  the source (derived; depends on ladder).

## Engine mapping

- Planned: `cdn`, `object-storage`, `queue`, `worker` → the upload/transcode pipeline (queue depth,
  worker scaling) needs 1b only.
- Gap `static-request-share-and-cdn-hit-model`: watch traffic needs object popularity and an edge hit
  ratio; egress cost should be part of `costPerMonth`.
- Proposed gap `bandwidth-egress-model`: bytes per request and egress price per GB per tier (edge
  vs origin), so the lesson can show that origin egress, not CPU, dominates cost.
- ABR itself (rebuffering vs quality) is out of scope for the engine; teach it as reading.

## Misconceptions

- "Stream video from the web servers." Bandwidth, not CPU, is the limit; use a CDN. [7][8]
- "Transcode while the user waits for the upload to finish." Do it asynchronously; publish when done.
  [5]
- "Higher bitrate is always better." On a weak network it causes stalls; ABR trades quality for
  continuity. [3]
- "One bitrate ladder fits all videos." Per-title ladders save bits. [4]

## Analogy ideas

- A bakery that bakes each cake in several sizes overnight (transcoding) and stocks neighbourhood
  shops before opening (CDN fill), so morning customers never wait for the oven.
- ABR is like a driver changing gear for the slope ahead.

## Caveats

- Company practices (Open Connect, VCUs) are scale-specific; small services buy a CDN and a managed
  transcoder.

## Sources

Primary:
1. *RFC 8216: HTTP Live Streaming* — R. Pantos, W. May, IETF — https://www.rfc-editor.org/rfc/rfc8216 — 2017.
2. *MPEG-DASH (ISO/IEC 23009-1) overview and guidelines* — DASH Industry Forum —
   https://dashif.org/ — accessed 2026-10-19.
3. *A Buffer-Based Approach to Rate Adaptation: Evidence from a Large Video Streaming Service* —
   T.-Y. Huang, R. Johari, N. McKeown, M. Trunnell, M. Watson, SIGCOMM —
   https://dl.acm.org/doi/10.1145/2619239.2626296 — 2014.
4. *Per-Title Encode Optimization* — Netflix Technology Blog —
   https://netflixtechblog.com/per-title-encode-optimization-7e99442b62a2 — 2015.
5. *Rebuilding Netflix Video Processing Pipeline with Microservices* — Netflix Technology Blog —
   https://netflixtechblog.com/rebuilding-netflix-video-processing-pipeline-with-microservices-4e5e6310e359 — 2024.
6. *Warehouse-Scale Video Acceleration: Co-design and Deployment in the Wild* — P. Ranganathan et
   al., ASPLOS — https://dl.acm.org/doi/10.1145/3445814.3446723 — 2021.
7. *Open Connect overview* — Netflix — https://openconnect.netflix.com/en/ — accessed 2026-10-19.
8. *Internet connection speed recommendations* — Netflix Help Center —
   https://help.netflix.com/en/node/306 — accessed 2026-10-19.
9. *HTTP Live Streaming authoring specification for Apple devices* — Apple Developer —
   https://developer.apple.com/documentation/http-live-streaming/hls-authoring-specification-for-apple-devices — accessed 2026-10-19.

Books:
10. [B45] *Computer Networking: A Top-Down Approach*, 8th ed. — Kurose, Ross — ch. 2.6 "Video
    Streaming and Content Distribution Networks" (DASH, CDN cluster selection, Netflix/YouTube case
    studies).
11. [B40] *System Design Interview*, vol. 1 — Xu — ch. 14 "Design YouTube" (topic map only).
12. [B25] *The Datacenter as a Computer*, 3rd ed. — Barroso, Hölzle, Ranganathan — ch. 3
    (accelerators and specialised hardware in warehouse-scale computers).

Repos:
13. [G3] karanpratapsingh/system-design — "Netflix" worked design —
    https://github.com/karanpratapsingh/system-design.
14. [G11] binhnguyennus/awesome-scalability — Netflix/YouTube posts —
    https://github.com/binhnguyennus/awesome-scalability.
