# Stateless web servers and session state — research note

- Level: L1
- Feeds lessons: `l1-stateless-servers`, `l1-session-store`
- Researched: 2026-10-18

## Key facts (in our words)

1. **Stateless process = keeps nothing between requests that another copy would need.**
   Twelve-factor apps are "stateless and share-nothing"; anything that must persist goes to a
   backing service. [1]
2. **HTTP is stateless; sessions are built on top.** A session ID (usually in a cookie) links
   requests to server-side state such as login and cart. The meaning of the session must live on
   the server side. [2][3]
3. **Where the session lives decides how you can scale.** In one server's memory: the user must
   always return to that server, and the session dies with it. In a shared store (Redis,
   Memcached, a database): any server can handle any request. [1]
4. **Sticky sessions are a workaround, not a cure.** LBs can pin a user to one target with a
   cookie (ALB `AWSALB`, NGINX `sticky cookie`). If that target fails, the LB picks a new one and
   in-memory state is gone; stickiness can also leave load uneven after scaling out, which AWS
   documents as needing manual rebalancing. [4][5]
5. **Twelve-factor explicitly calls sticky sessions a violation** and recommends a time-expiring
   datastore for session state. [1]
6. **Stateless enables everything in L1:** any-server routing, autoscaling, rolling deploys and
   painless instance loss. [1][6]

## How this maps to the engine

- The engine has no notion of per-user state, cookies or stickiness. Losing an instance in 1a
  loses capacity only, never sessions.
- Needed for an experiment: a `sessionState: local | shared` setting on `web-server`, LB
  `stickiness`, and a metric such as `lostSessions` when an instance with local state goes down
  → engine gap `session-state-model`. Shared store would use `redis` (planned 1b).
- Until then: `reading+check` lesson with a prediction question.

## Misconceptions

- "Sticky sessions make my servers stateless." (They hide the state; it still dies with the
  server. [4])
- "Storing sessions in memory is faster, so it's better." (Fast until the server restarts. [1])
- "Stateless means no data at all." (It means data lives elsewhere. [1])

## Analogy ideas (ours)

- A café where your loyalty stamps are written on one barista's notepad versus in the shop's
  shared app: the notepad works only if that barista is on shift.

## Sources

1. *The Twelve-Factor App, VI. Processes* — Adam Wiggins (Heroku) —
   https://12factor.net/processes — 2011.
2. *RFC 9110: HTTP Semantics* (stateless protocol) — R. Fielding, M. Nottingham, J. Reschke
   (eds.), IETF — https://www.rfc-editor.org/rfc/rfc9110 — June 2022.
3. *Session Management Cheat Sheet* — OWASP —
   https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html —
   accessed 2026-10-18.
4. *Edit target group attributes for your Application Load Balancer* (sticky sessions) — AWS
   documentation —
   https://docs.aws.amazon.com/elasticloadbalancing/latest/application/edit-target-group-attributes.html
   — accessed 2026-10-18.
5. *HTTP Load Balancing* (session persistence) — NGINX documentation —
   https://docs.nginx.com/nginx/admin-guide/load-balancer/http-load-balancer/ — accessed
   2026-10-18.
6. *Overview of HTTP* (stateless but not sessionless) — MDN Web Docs —
   https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Overview — 2026-10-08.
