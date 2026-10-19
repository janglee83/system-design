# Authentication, authorization and TLS at scale — research note

- Level: L3
- Feeds lessons: `l3-auth-basics` (new)
- Researched: 2026-10-19

## Key facts (in our words)

1. **Authentication** establishes who the caller is; **authorization** decides what they may do.
   Mixing them up is a classic design bug. [1][9]
2. **Session cookies vs tokens.** Server-side sessions keep state in a store and send an opaque id;
   signed tokens such as JWTs carry claims the server can verify without a lookup, at the cost of
   harder revocation. [2][3]
3. **OAuth 2.0** delegates access: a client obtains an access token from an authorization server to
   call a resource server on a user's behalf; **OpenID Connect** adds identity (an ID token) on top. [4][5]
4. **TLS 1.3** encrypts and authenticates connections with a 1-RTT handshake (0-RTT resumption
   optional), cheaper than earlier versions. [6]
5. **TLS termination** often happens at the load balancer or gateway; traffic behind it may be
   re-encrypted (mutual TLS between services). [7][8]
6. **Gateways centralise checks**: validate tokens, rate-limit per identity, and pass a verified
   identity downstream. [7]
7. **Zero trust (BeyondCorp)**: do not trust the network location; authenticate and authorize every
   request based on device and user. [10]

## Engine mapping

- Not modelled (reading+check). Token validation cost could later be expressed as gateway
  `serviceMs`; no gap filed.

## Misconceptions

- "JWTs are encrypted." Usually only signed. [3]
- "Inside the VPC everything is trusted." [10]
- "OAuth is a login protocol." OIDC is. [4][5]

## Sources

Primary:
1. *Authentication Cheat Sheet* — OWASP —
   https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html — accessed 2026-10-19.
2. *Session Management Cheat Sheet* — OWASP —
   https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html — accessed 2026-10-19.
3. *RFC 7519: JSON Web Token (JWT)* — M. Jones, J. Bradley, N. Sakimura, IETF —
   https://www.rfc-editor.org/rfc/rfc7519 — 2015.
4. *RFC 6749: The OAuth 2.0 Authorization Framework* — D. Hardt (ed.), IETF —
   https://www.rfc-editor.org/rfc/rfc6749 — 2012.
5. *OpenID Connect Core 1.0* — OpenID Foundation — https://openid.net/specs/openid-connect-core-1_0.html
   — 2014 (errata).
6. *RFC 8446: The Transport Layer Security (TLS) Protocol Version 1.3* — E. Rescorla, IETF —
   https://www.rfc-editor.org/rfc/rfc8446 — 2018.
7. *What is Amazon API Gateway?* (authorization, throttling) — AWS docs —
   https://docs.aws.amazon.com/apigateway/latest/developerguide/welcome.html — accessed 2026-10-19.
8. *Mutual TLS: securing service-to-service traffic* — Istio docs —
   https://istio.io/latest/docs/concepts/security/ — accessed 2026-10-19.
10. *BeyondCorp: A New Approach to Enterprise Security* — R. Ward, B. Beyer, ;login: —
    https://research.google/pubs/pub43231/ — 2014.

Books:
9. [B18] *Building Secure and Reliable Systems* — Adkins et al. — chapters on least privilege and
   design for security.
11. [B46] *High Performance Browser Networking* — Grigorik — ch. 4 "Transport Layer Security".
12. [B27] *Microservices Patterns* — Richardson — chapter on API gateways and security.

Repos:
13. [G1] donnemartin/system-design-primer — "Security" section — https://github.com/donnemartin/system-design-primer.
