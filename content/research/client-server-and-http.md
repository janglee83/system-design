# Client, server and HTTP — research note

- Level: L0
- Feeds lessons: `l0-client-server`, `l0-http-basics`
- Researched: 2026-10-18
- Status: facts verified against the sources listed at the end

## Key facts (in our words)

1. **Two roles, not two kinds of machine.** A *client* is any program that opens a connection
   and sends a request; a *server* is a program that waits for requests and answers them. The
   same machine can be both (a web server is a client of its database). [1][4]
2. **HTTP is a request/response protocol.** Every exchange is one request message from the
   client and one response message back. The request carries a method, a target path, a
   protocol version, headers and an optional body; the response carries a status code, headers
   and an optional body. [1][2]
3. **HTTP is stateless.** The protocol does not remember earlier requests on its own; anything
   that must survive between requests (who you are, what is in your cart) is carried by the
   client (for example a cookie) or stored by the server in a backing store. [1][2][6]
4. **Methods have meaning.** GET, HEAD, OPTIONS and TRACE are *safe* (they should not change
   anything on the server). GET, HEAD, PUT, DELETE, OPTIONS and TRACE are *idempotent* (sending
   the same request twice has the same intended effect as sending it once). POST is neither by
   default. [1]
5. **Status code classes:** 1xx informational, 2xx success, 3xx redirection, 4xx the client
   made a mistake, 5xx the server failed. [1]
6. **The four steps of one HTTP exchange:** open (or reuse) a TCP connection, send the request,
   read the response, close or keep the connection for the next request. [2]
7. **HTTP runs on top of TCP** (or QUIC for HTTP/3). TCP gives reliable, in-order delivery of
   bytes, using sequence numbers, acknowledgements and retransmission. [3]
8. **Static vs dynamic responses.** A static site returns the same stored file for a URL; a
   dynamic site builds the response per request, usually by reading a database and filling a
   template. [4]
9. **Proxies sit in the middle.** Between client and server there may be proxies that cache,
   filter, balance load, authenticate or log. The client usually cannot tell. [2]
10. **Opening connections costs round trips.** A brand-new TCP connection needs one round trip
    for the handshake before the first request can go out; HTTP keep-alive reuses the
    connection and saves that round trip on later requests. [5]

## Numbers worth remembering

- New TCP connection: at least 1 extra round trip before data flows [5].
- Browsers open about 6 parallel connections per host for HTTP/1.x [5].

## How this maps to the engine

- `client` node = the population of users; `web-server` node = the program that answers.
- An `http` edge is a request path. A web server with no outgoing edge answers by itself (static
  or computed response); with a `db` edge it must also ask the database.
- A `lb` with nothing behind it cannot answer: every request becomes *unreachable* (golden
  fixture `lb-without-backends`). Useful to show that "something in the middle" is not a server.
- The engine splits traffic into `read` and `write` classes by `writeRatio`, a stand-in for
  safe (GET) vs state-changing (POST/PUT/DELETE) methods.

## Beginner misconceptions seen in forums and teaching

- "The website lives in my browser." (The browser only shows what a server sent.)
- "A client is a computer and a server is a special big computer." (Roles, not hardware. [1])
- "The browser talks straight to the database." (In a normal web app the server does. [4])
- "HTTP remembers me." (It is stateless; cookies and server storage do the remembering. [1][2])
- "Any box in the path can answer the request." (A proxy or load balancer forwards; it needs a
  server behind it.)

## Analogy ideas (ours)

- Ordering at a food stall: you (client) hand over an order slip (request) with a fixed format;
  the cook (server) hands back food and a receipt line ("OK", "sold out", "kitchen fire").
  The cook does not remember you next time unless you show your loyalty card (cookie).

## Caveats

- HTTP/2 and HTTP/3 change the wire format (binary frames, multiplexing, QUIC) but not the
  request/response semantics; L0 stays at the semantic level.

## Sources

1. *RFC 9110: HTTP Semantics* — R. Fielding, M. Nottingham, J. Reschke (eds.), IETF —
   https://www.rfc-editor.org/rfc/rfc9110 — June 2022.
2. *Overview of HTTP* — MDN Web Docs, Mozilla —
   https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Overview — last modified 2026-10-08.
3. *RFC 9293: Transmission Control Protocol (TCP)* — W. Eddy (ed.), IETF —
   https://www.rfc-editor.org/rfc/rfc9293 — August 2022.
4. *Client-Server overview* — MDN Web Docs, Mozilla —
   https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Server-side/First_steps/Client-Server_overview
   — last modified 2026-09-10.
5. *High Performance Browser Networking*, ch. 2 "Building Blocks of TCP" and ch. 11 "HTTP/1.X"
   — Ilya Grigorik, O'Reilly — https://hpbn.co/building-blocks-of-tcp/ and https://hpbn.co/http1x/
   — 2013.
6. *Session Management Cheat Sheet* — OWASP Cheat Sheet Series —
   https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html — accessed
   2026-10-18.
7. *PostgreSQL 18 Documentation, §1.2 Architectural Fundamentals* (the database is itself a
   server with clients) — The PostgreSQL Global Development Group —
   https://www.postgresql.org/docs/current/tutorial-arch.html — 2026.
