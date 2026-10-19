# DNS and the path of a request — research note

- Level: L0
- Feeds lessons: `l0-dns-and-network-path` (and background for `l0-latency-and-distance`,
  `l1-dns-and-global-entry`)
- Researched: 2026-10-18

## Key facts (in our words)

1. **Names vs addresses.** Computers find each other by IP address; people use domain names.
   DNS (Domain Name System) is the distributed directory that turns a name into addresses. [1][2]
2. **Names are hierarchical, read right to left.** `shop.example.com` → top-level domain `com`,
   then `example`, then `shop`. Each label is 1–63 characters. [2][3]
3. **No single owner of the whole directory.** Responsibility is delegated zone by zone, which
   is why DNS scaled from thousands to hundreds of millions of names. [1]
4. **The lookup chain.** The browser first checks local caches. If it misses, a *recursive
   resolver* (usually run by the ISP or a public resolver) asks a *root* nameserver, which
   points to the *TLD* nameserver (`.com`), which points to the domain's *authoritative*
   nameserver, which returns the address. [2][3]
5. **Caching with TTL.** Every DNS answer carries a time-to-live; resolvers and clients reuse it
   until it expires. This makes lookups fast but means changes take time to spread. [3][4]
6. **DNS can spread load.** A name can return several addresses, or different addresses to
   different users, which is the first, coarsest layer of load balancing. Its control is limited
   because resolvers cache answers and hide where the user really is. [4]
7. **Load balancers use short TTLs.** For example, AWS Elastic Load Balancing returns the
   addresses of its nodes with a 60 s TTL so it can remap quickly. [5]
8. **After DNS: connect, then request.** With an address in hand the client opens a TCP
   connection (one round trip), adds TLS for HTTPS (more round trips), then sends the HTTP
   request. [6][7]

## Numbers worth remembering

- ELB DNS TTL: 60 s [5].
- TCP handshake: 1 round trip before the request [6].

## How this maps to the engine

- The engine does not model DNS. The lesson is `reading+check`; the closest knob is
  `edgeDelayHttpMs` (time on the wire per hop). A future "first request vs repeat request"
  experiment would need a DNS/connection-setup cost model → listed as an engine gap
  (`connection-setup-cost`), low priority.

## Misconceptions

- "Typing a URL goes straight to the server." (Several lookups may happen first.)
- "Changing DNS is instant." (Cached answers live until TTL expiry. [3][4])
- "One domain = one server." (One name can map to many addresses and to load balancers. [4][5])

## Analogy ideas (ours)

- A phone contact list: you tap "Grandma", the phone dials a number. If the list is out of
  date (stale cache), you reach the old number until you refresh it.

## Sources

1. *RFC 1034: Domain Names — Concepts and Facilities* — P. Mockapetris, IETF —
   https://www.rfc-editor.org/rfc/rfc1034 — November 1987.
2. *What is a domain name?* — MDN Web Docs, Mozilla —
   https://developer.mozilla.org/en-US/docs/Learn_web_development/Howto/Web_mechanics/What_is_a_domain_name
   — last modified 2025-06-23.
3. *DNS server types* — Cloudflare Learning Center —
   https://www.cloudflare.com/learning/dns/dns-server-types/ — accessed 2026-10-18.
4. *Site Reliability Engineering*, ch. 19 "Load Balancing at the Frontend" — Piotr Lewandowski,
   ed. Beyer et al., Google / O'Reilly — https://sre.google/sre-book/load-balancing-frontend/ —
   2016.
5. *How Elastic Load Balancing works* — Amazon Web Services documentation —
   https://docs.aws.amazon.com/elasticloadbalancing/latest/userguide/how-elastic-load-balancing-works.html
   — accessed 2026-10-18.
6. *High Performance Browser Networking*, ch. 2 "Building Blocks of TCP" — Ilya Grigorik,
   O'Reilly — https://hpbn.co/building-blocks-of-tcp/ — 2013.
7. *RFC 9293: Transmission Control Protocol (TCP)* — W. Eddy (ed.), IETF —
   https://www.rfc-editor.org/rfc/rfc9293 — August 2022.
