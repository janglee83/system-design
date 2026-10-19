# Latency and distance — research note

- Level: L0
- Feeds lessons: `l0-latency-and-distance`; background for `l1-cdn-static-content`,
  `l6-multi-region-basics`
- Researched: 2026-10-18

## Key facts (in our words)

1. **Latency is waiting time**: the time from sending something to getting it (or its answer)
   back. Bandwidth is how much can flow per second. They are different: a wide pipe can still
   be slow to deliver the first byte. [1][6]
2. **Four parts of network latency:** propagation (distance), transmission (pushing the bits
   onto the wire), processing (routers reading headers) and queuing (waiting in buffers). [1]
3. **Light in fibre is about two thirds of its vacuum speed**, roughly 200,000 km/s, i.e. about
   5 ms per 1,000 km one way. Distance therefore sets a hard floor no hardware upgrade removes.
   [1]
4. **Real round trips** over fibre (best case): New York–San Francisco ~42 ms, New
   York–London ~56 ms, New York–Sydney ~160 ms. [1]
5. **The last mile is often worse than the ocean.** Home connections add roughly 10–65 ms
   depending on technology. [1]
6. **Inside one data centre** a round trip is about 0.5 ms; a packet California → Netherlands →
   California is about 150 ms. [3][4]
7. **Round trips multiply.** A new TCP connection costs one round trip before the request; TLS
   adds more. Far-away users pay the distance several times per page. [2]
8. **People notice.** Responses under ~100 ms feel instant; over 1 s users lose focus; around
   10 s they give up. [5]
9. **What helps:** moving the content or the server closer (CDN, regions), reusing
   connections, and doing fewer sequential round trips. Faster CPUs do not shorten the wire. [1][2][7]

## Numbers worth remembering

| What | Approx. |
|---|---|
| Same data centre round trip | 0.5 ms [3][4] |
| 1,000 km of fibre, one way | 5 ms [1] |
| NY ↔ London round trip | 56 ms [1] |
| NY ↔ Sydney round trip | 160 ms [1] |
| "Feels instant" | < 100 ms [5] |

## How this maps to the engine

- `calibration.edgeDelayHttpMs` = network time added per HTTP hop (default 0.5 ms, same-AZ).
  The lesson exposes it as a "where is the server?" select: same city 2 ms, same continent
  40 ms, other side of the world 160 ms (round-trip numbers from [1]). Overrides are part of
  spec §6.7, so this is runnable on 1a.
- Engine latency per node is `serviceMs / (1 − utilization)` + queue wait; the edge delay is
  added on top. So raising `cpu` lowers the service part only. Checked with our scratch
  re-implementation of the 1a model: at 2,000 rps, 1 vCPU, delay 160 ms → p95 ≈ 163 ms;
  8 vCPU → p95 ≈ 162 ms; delay 40 ms → p95 ≈ 43 ms.

## Misconceptions

- "A faster server makes a far-away user fast." (Only the service part shrinks.)
- "More bandwidth = lower latency." (Different quantities. [1])
- "The internet is basically instant." (Physics: ~5 ms per 1,000 km one way. [1])

## Analogy ideas (ours)

- Sending a letter to a friend abroad: a faster typist at the post office does not make the
  plane fly faster.

## Sources

1. *High Performance Browser Networking*, ch. 1 "Primer on Latency and Bandwidth" — Ilya
   Grigorik, O'Reilly — https://hpbn.co/primer-on-latency-and-bandwidth/ — 2013.
2. *High Performance Browser Networking*, ch. 2 "Building Blocks of TCP" — Ilya Grigorik,
   O'Reilly — https://hpbn.co/building-blocks-of-tcp/ — 2013.
3. *Latency Numbers Every Programmer Should Know* (interactive) — Colin Scott, after Peter
   Norvig and Jeff Dean —
   https://colin-scott.github.io/personal_website/research/interactive_latency.html — numbers
   for 2020.
4. *Designs, Lessons and Advice from Building Large Distributed Systems* (LADIS keynote) — Jeff
   Dean, Google — https://www.cs.cornell.edu/projects/ladis2009/talks/dean-keynote-ladis2009.pdf
   — October 2009.
5. *Measure performance with the RAIL model* — web.dev, Google Chrome team —
   https://web.dev/articles/rail — accessed 2026-10-18.
6. *RFC 9293: Transmission Control Protocol (TCP)* — W. Eddy (ed.), IETF —
   https://www.rfc-editor.org/rfc/rfc9293 — August 2022.
7. *What is Amazon CloudFront?* — Amazon Web Services documentation —
   https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/Introduction.html —
   accessed 2026-10-18.
