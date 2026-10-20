---
id: l0-dns-and-network-path
title: "From a name to a server: DNS and the path of a request"
---

## Outcome
List, in order, what happens between typing a web address and sending the first HTTP request, and
explain why changing a server's address does not reach everyone at once.

## Picture it first
You want to call Grandma. You do not know her number by heart, only the name "Grandma" in your
contacts. The phone looks up the number, then dials. If she changed numbers and your contacts are
out of date, you keep reaching the old number for a while.

## Terms
- **IP address**: the "phone number" of a machine on a network, for example `192.0.2.10`.
- **Domain name**: a memorable name such as `your-shop.example`. Read it from right to left:
  `example` is the top-level domain (**TLD**), then comes your own name.
- **DNS** (Domain Name System): the Internet's shared, spread-out contact list, which turns names
  into IP addresses.
- **Recursive resolver**: a server, often run by your internet provider, that does the asking for
  you.
- **Authoritative nameserver**: the server that holds the official answer for a domain.
- **TTL** (time to live): how many seconds a DNS answer may be kept in a cache before someone must
  ask again.
- **TCP handshake**: three small packets that open a connection. It costs one round trip before
  any data can flow.

## Common misconceptions
- **M1**: "Typing an address goes straight to the server." Several lookups may happen first.
- **M2**: "A DNS change is instant." Cached answers stay in use until their TTL runs out.
- **M3**: "One domain means one server." A name can point to many addresses, or to a load
  balancer.

## Step 1: observe the journey
1. The browser checks its own cache and the operating system's.
2. If the name is not there, it asks a recursive resolver.
3. The resolver asks a root server and is pointed to the servers for `.example`.
4. It asks a `.example` server and is pointed to the domain's authoritative nameserver.
5. The authoritative server returns the IP address with a TTL. Every layer keeps a copy.
6. The browser opens a TCP connection (one round trip), adds TLS for HTTPS, then sends the HTTP
   request.

## Step 2: analyse
- The first visit pays for steps 2 to 5 and the handshake; later visits are usually faster because
  of caches and reused connections.
- TTL is a trade-off. A long TTL means fewer lookups but slow changes; a short TTL means the
  opposite. Some cloud load balancers use a 60-second TTL.
- The lab does not model the cost of lookups and handshakes yet, so this lesson has no experiment.

## Step 3: apply
You move your site to a new server at 9:00, and the old DNS record had a 1-hour TTL. At 9:30 some
people still reach the old server. Why, and what should you have done the day before? *(They still
hold the old answer in a cache. Lower the TTL well before the move, and keep the old server running
for a while afterwards.)*

## Questions
Pass with 4 correct answers out of 5.

- **q1**: What does DNS turn into what?
- **q1.a**: A web page into HTML.
- **q1.b**: A domain name into an IP address.
- **q1.c**: A request into a response.
- **q2**: In `shop.en.example`, which part is the TLD?
- **q2.a**: `shop`
- **q2.b**: `en`
- **q2.c**: `example`
- **q3**: A DNS answer comes with a TTL of 300. For at most how many minutes may a resolver keep
  using it?
- **q4**: Why is your first visit to a site often slower than the second?
- **q4.a**: The server needs to warm up after each new visitor.
- **q4.b**: The first visit pays for the DNS lookup and the connection handshake; next time both
  are cached or reused.
- **q4.c**: The browser has to download itself again.
- **q5**: True or false: a domain name can point to only one server.
- **q5.a**: True.
- **q5.b**: False.

## Feedback
- **q3**: 300 seconds is 5 minutes. Until then, any cache holding the answer keeps handing it out,
  which is exactly why a DNS change spreads gradually instead of instantly.
- **q4**: Before the first byte of HTTP leaves your browser, it may have to find the address
  through several servers and then open a connection. Both results are kept, so the second visit
  skips most of that work.
- **q5**: Big sites answer one name with several addresses, or with the address of a load balancer
  that spreads requests across many servers.

## Takeaways
- Before an HTTP request there is usually a DNS lookup and a connection handshake.
- Caches make things fast but make changes slow to spread; the TTL decides how slow.
- A name can point to many machines or to a load balancer.

## Review questions
1. Name four kinds of server involved in a full DNS lookup.
2. What are the upside and the downside of a long TTL?
3. Why does the TCP handshake hurt far-away users more?
