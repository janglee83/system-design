# Reverse proxies and API gateways — research note

- Level: L1
- Feeds lessons: `l1-reverse-proxy-and-gateway`, `l1-public-entry-point`
- Researched: 2026-10-18

## Key facts (in our words)

1. **A reverse proxy receives requests on behalf of servers**, forwards them to a backend,
   collects the response and returns it. It can rewrite headers (e.g. pass the client IP) and
   buffer responses so slow clients do not tie up backends. [1]
2. **Proxies are a normal part of HTTP:** caching, filtering, load balancing, authentication and
   logging can all live in an intermediary. [2]
3. **An API gateway is a reverse proxy specialised for APIs:** the "front door" that handles
   routing, authorization, throttling, monitoring and versioning for many backend services. [3]
4. **At scale it becomes critical infrastructure.** Netflix's Zuul gateway fronts its backend
   services and adds features such as adaptive retries and concurrency limits to protect origins.
   [4]
5. **Load balancer vs gateway:** LB = spread traffic for one service; gateway = one public face for
   many services plus cross-cutting rules. Often both appear (gateway behind an LB, or one product
   doing both). [1][3][5]
6. **Single public entry point.** Keeping backends private and exposing only the proxy/LB reduces
   attack surface and ensures every request passes the same checks. [5]

## How this maps to the engine

- `api-gateway` component is planned (spec §6.2) and counts as an entry point for
  `exposedBackends`. Rate limiting (planned, per-client rpm) is the natural gateway feature.
- Request routing by path to different backend services is not described → engine gap
  `gateway-path-routing` (needed from L3 on for microservice designs).

## Misconceptions

- "A gateway makes the system faster." (It adds a hop; it adds control.)
- "Gateway and load balancer are the same thing." (Overlap, different jobs. [3][5])
- "Backends can stay public as a fallback." (Bypasses auth and limits. [5])

## Analogy ideas (ours)

- A hotel reception desk: guests never walk into the kitchen or laundry; they ask reception,
  which routes the request, checks the room key, and refuses guests who call 50 times a minute.

## Sources

1. *NGINX Reverse Proxy* — NGINX documentation —
   https://docs.nginx.com/nginx/admin-guide/web-server/reverse-proxy/ — accessed 2026-10-18.
2. *Overview of HTTP* (proxies) — MDN Web Docs —
   https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Overview — 2026-10-08.
3. *What is Amazon API Gateway?* — AWS documentation —
   https://docs.aws.amazon.com/apigateway/latest/developerguide/welcome.html — accessed
   2026-10-18.
4. *Zuul* (README) — Netflix, GitHub — https://github.com/Netflix/zuul — accessed 2026-10-18.
5. *How Elastic Load Balancing works* (internet-facing vs internal) — AWS documentation —
   https://docs.aws.amazon.com/elasticloadbalancing/latest/userguide/how-elastic-load-balancing-works.html
   — accessed 2026-10-18.
6. *RFC 9110: HTTP Semantics* (intermediaries) — R. Fielding et al., IETF —
   https://www.rfc-editor.org/rfc/rfc9110 — June 2022.
