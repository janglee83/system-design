# Rate limiting: why, where and which algorithm — research note

- Level: L3 (L5 design)
- Feeds lessons: `l3-rate-limiting`, `l3-rate-limit-algorithms`, `l5-rate-limiter-design`
- Researched: 2026-10-19

## Key facts (in our words)

1. **A rate limiter caps how many requests a client (user, key, IP) may make per time window**,
   protecting shared capacity and enforcing fairness and quotas; rejected requests get HTTP 429 Too
   Many Requests, ideally with `Retry-After`. [1][2]
2. **Token bucket**: tokens refill at a steady rate up to a burst size; each request spends one.
   Allows short bursts, enforces an average rate. [3][9]
3. **Leaky bucket**: requests drain at a fixed rate from a queue; smooths bursts. NGINX `limit_req`
   implements a leaky-bucket style limiter with an optional `burst`. [4]
4. **Fixed window counters** are simple but allow up to 2× the limit around a window boundary;
   **sliding window log** is exact but stores every timestamp; **sliding window counter** weights the
   previous window to approximate cheaply — Cloudflare reported this approximation was very accurate
   on real traffic. [5][9]
5. **Stripe runs several limiters**: a request-rate limiter, a concurrent-request limiter, and load
   shedders that reserve capacity for critical traffic. [6]
6. **Distributed limiters need shared state** (e.g. Redis counters with atomic `INCR`/Lua, or a
   central rate-limit service like Envoy's global rate limiting); local per-node limits are cheaper
   but approximate. Decide fail-open vs fail-closed when the counter store is down. [7][8]
7. **Public APIs publish their limits** and remaining budget in headers (GitHub). [10]

## Engine mapping

- Per-client requests-per-minute limiting and `api-gateway` are planned (1b). Algorithm choice and
  burst behaviour → gap `rate-limit-algorithms`.

## Misconceptions

- "Rate limiting = load shedding." Limiting is per client and about fairness; shedding is about the
  server's own health. [6]
- "Fixed windows are exact." Boundary bursts. [5]
- "A distributed limiter must be perfectly consistent." Approximate is usually fine. [5][8]

## Sources

Primary:
1. *RFC 6585: Additional HTTP Status Codes* (429) — M. Nottingham, R. Fielding, IETF —
   https://www.rfc-editor.org/rfc/rfc6585 — 2012.
2. *Rate limiting best practices* — Cloudflare docs —
   https://developers.cloudflare.com/waf/rate-limiting-rules/best-practices/ — accessed 2026-10-19.
3. *RFC 2697: A Single Rate Three Color Marker* (token-bucket metering) — J. Heinanen, R. Guerin,
   IETF — https://www.rfc-editor.org/rfc/rfc2697 — 1999.
4. *Module ngx_http_limit_req_module* — NGINX — https://nginx.org/en/docs/http/ngx_http_limit_req_module.html
   — accessed 2026-10-19.
5. *How we built rate limiting capable of scaling to millions of domains* — Julien Desgats,
   Cloudflare Blog — https://blog.cloudflare.com/counting-things-a-lot-of-different-things/ — 2017.
6. *Scaling your API with rate limiters* — Paul Tarjan, Stripe —
   https://stripe.com/blog/rate-limiters — 2017.
7. *Global rate limiting* — Envoy proxy docs —
   https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/other_features/global_rate_limiting
   — accessed 2026-10-19.
8. *INCR — pattern: rate limiter* — Redis docs — https://redis.io/docs/latest/commands/incr/ —
   accessed 2026-10-19.
10. *Rate limits for the REST API* — GitHub Docs —
    https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api — accessed 2026-10-19.

Books:
9. [B40] *System Design Interview*, vol. 1 — Xu — ch. 4 "Design a Rate Limiter" (topic map only).
11. [B4] *Understanding Distributed Systems* — part "Resiliency", chapter "Upstream resiliency"
    (rate limiting, load shedding).
12. [B14] *Redis in Action* — Carlson — counters and rate limiting with Redis.

Repos:
13. [G4] ashishps1/awesome-system-design-resources — rate limiting algorithms —
    https://github.com/ashishps1/awesome-system-design-resources.
14. [G3] karanpratapsingh/system-design — "Rate Limiting" chapter — https://github.com/karanpratapsingh/system-design.
