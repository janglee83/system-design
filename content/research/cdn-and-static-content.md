# CDN, static content and object storage — research note

- Level: L1
- Feeds lessons: `l1-cdn-static-content`, `l1-object-storage-for-assets`
- Researched: 2026-10-18

## Key facts (in our words)

1. **A CDN is a worldwide set of caching servers ("edge locations", "points of presence") close to
   users.** A request is routed to a nearby edge; if the edge has the file, it answers at once;
   if not, it fetches from the *origin* and keeps a copy. [1][2]
2. **What it buys:** lower latency (shorter distance, fewer networks crossed), less load on the
   origin, and more availability because copies exist in many places. [1][2]
3. **Static vs dynamic.** By default CDNs cache static file types (images, CSS, JS, fonts) and do
   not cache HTML or JSON unless told to; `private`, `no-store`, `Set-Cookie` and non-GET
   requests are not cached. [3][4]
4. **Freshness is controlled by headers.** `Cache-Control: max-age` sets how long a copy is fresh;
   CloudFront's default object lifetime at the edge is 24 h. Changing a file therefore needs
   versioned file names or invalidation. [1][4]
5. **Scale of real CDNs:** Akamai's 2010 platform had 61,000+ servers in ~1,000 networks in 70
   countries. Netflix embeds its own Open Connect appliances inside ISPs and serves essentially all
   of its video from them, pre-filling popular titles per region. [5][6]
6. **Routing users to the nearest edge** uses DNS-based selection or anycast (the same IP announced
   from many places, with BGP picking the closest). Anycast also spreads attack traffic. [5][7]
7. **Object storage is the usual origin for static files.** Amazon S3 stores objects (file +
   metadata) under keys in buckets, is accessed over HTTP, and is commonly put behind a CDN. [8][1]

## How this maps to the engine

- `cdn` and `object-storage` components and the `object-storage-down` fault are planned (spec
  §6.2, §4.1). The spec does not say how a workload marks which requests are static, nor how the
  CDN hit ratio is computed → engine gap `static-request-share-and-cdn-hit-model` (confirm in plan
  1b; may already be intended).
- Expected experiment: 70% static requests; without a CDN every byte crosses the long
  `edgeDelayHttpMs` and hits the web tier; with a CDN static requests end at the edge.

## Misconceptions

- "A CDN speeds up everything, including personalised pages." (Mostly static, cacheable content.
  [3])
- "After I upload a new logo, everyone sees it." (Edges keep the old copy until it expires. [1])
- "The CDN replaces my servers." (It still needs an origin. [1])

## Analogy ideas (ours)

- A publisher printing a bestseller in regional warehouses instead of shipping each copy from the
  head office.

## Sources

1. *What is Amazon CloudFront?* — AWS documentation —
   https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/Introduction.html —
   accessed 2026-10-18.
2. *The Akamai Network: A Platform for High-Performance Internet Applications* — Erik Nygren,
   Ramesh K. Sitaraman, Jennifer Sun, ACM SIGOPS Operating Systems Review 44(3) —
   https://pdos.csail.mit.edu/6.824/papers/akamai.pdf — 2010.
3. *Default cache behavior* — Cloudflare Cache documentation —
   https://developers.cloudflare.com/cache/concepts/default-cache-behavior/ — accessed 2026-10-18.
4. *HTTP caching* — MDN Web Docs —
   https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Caching — 2026-08-14.
5. *What is Anycast?* — Cloudflare Learning Center —
   https://www.cloudflare.com/learning/cdn/what-is-anycast/ — accessed 2026-10-18.
6. *How Netflix works with ISPs around the globe to deliver a great viewing experience* —
   Netflix —
   https://about.netflix.com/en/news/how-netflix-works-with-isps-around-the-globe-to-deliver-a-great-viewing-experience
   — accessed 2026-10-18.
7. *Site Reliability Engineering*, ch. 19 "Load Balancing at the Frontend" — Piotr Lewandowski,
   Google — https://sre.google/sre-book/load-balancing-frontend/ — 2016.
8. *What is Amazon S3?* — AWS documentation —
   https://docs.aws.amazon.com/AmazonS3/latest/userguide/Welcome.html — accessed 2026-10-18.
