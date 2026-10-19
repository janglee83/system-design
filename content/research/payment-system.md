# Payment systems: idempotency, ledgers and reconciliation — research note

- Level: L5
- Feeds lessons: `l5-payment-system` (challenge `c-l5-payments`; background for `l6-sagas`,
  `c-l6-payment-saga`, `c-l6-capstone`)
- Builds on: `delivery-semantics-and-idempotency`, `timeouts-retries-backoff`,
  `circuit-breakers-bulkheads-fallbacks`, `transactions-and-isolation`
- Researched: 2026-10-19

## Key facts (in our words)

1. **The money moves elsewhere.** A merchant's payment service rarely moves money itself; it calls a
   payment service provider (PSP) such as Stripe or Adyen, which talks to card networks and banks.
   Our system's job is to record intent, call the PSP exactly-once-in-effect, and keep its own books
   right. [11][12]
2. **Authorise, then capture.** Card payments are typically authorised first (funds held) and
   captured later (funds taken), for example when the goods ship; Stripe documents that an
   uncaptured online card authorisation is usually valid for about 7 days. [5]
3. **Timeouts make outcomes unknown.** If the call to the PSP times out, the charge may or may not
   have happened. Retrying blindly can charge twice; giving up can lose a paid order. [2][6]
4. **Idempotency keys make retries safe.** The client sends a unique key with the request; the
   server stores the key with the first result and returns the same result for repeats. Stripe
   saves the status code and body of the first request for a key and notes that keys can be
   removed after at least 24 hours. [1][2]
5. **Separate local transactions from network calls.** Airbnb's payments team described
   splitting each operation into a pre-RPC phase (record intent in the database), the RPC, and a
   post-RPC phase (record the result), never holding a database transaction open across the network
   call, with an idempotency key tying the phases together. [3]
6. **Ledgers are append-only and double-entry.** Every money movement is recorded as entries whose
   debits and credits sum to zero; entries are never edited, only reversed by new entries; balances
   are derived from entries. Square's "Books" service was built on exactly these rules. [4][10]
7. **Webhooks are at-least-once and unordered.** PSPs report asynchronous outcomes (succeeded,
   failed, disputed) by webhooks; Stripe warns that endpoints may receive the same event more than
   once and not in order, so handlers must dedupe by event id and check current state. [7]
8. **Reconciliation catches what code misses.** Periodically (often daily) the internal ledger is
   compared with the PSP's and the bank's settlement reports; every mismatch becomes a case to
   investigate. This is the safety net for bugs, partial failures and manual changes. [11][12]
9. **Exactly-once delivery is impossible; exactly-once effect is achievable** with at-least-once
   retries plus idempotent processing and unique operation ids carried end to end. [13][2]
10. **Never store raw card numbers.** The PCI DSS standard governs card data; most merchants use the
    PSP's hosted fields or tokens so card numbers never touch their servers. [8]
11. **Protect the dependency.** A slow PSP should not exhaust your threads: per-call timeouts,
    bounded retries with backoff, circuit breakers and a queue for non-interactive steps (payouts,
    refunds). [6][14]
12. **State machines, not booleans.** A payment moves through explicit states (created →
    authorised → captured → refunded / failed); transitions are validated and recorded, which makes
    retries and webhooks safe to apply. [3][7]

## Numbers worth remembering

- Idempotency key retention: ≥ 24 h (Stripe). [1]
- Card authorisation hold: ~7 days for online card payments (Stripe guidance; varies by network). [5]
- Retry budget example: 3 attempts with exponential backoff and jitter over ~1 minute, then queue
  for later or mark "needs attention" (our design choice, from the retry note).

## Engine mapping

- Needs `third-party-node` (PSP) with `third-party-slow`/`third-party-down`, and `idempotency-keys`
  so that `duplicateWrites` (double charges) drops to 0 when keys are used.
- Planned: `retries`, `circuit-breaker`, `queue`, `worker`, `postgres`.
- Proposed small extension: a `ledgerImbalance` metric (sum of entries ≠ 0, or orders paid but not
  recorded) to show reconciliation; could be folded into `outbox-cdc`'s dual-write metric.

## Misconceptions

- "Retry on timeout." Without an idempotency key, that is how double charges happen. [2][3]
- "The webhook tells me exactly once, in order." It does not. [7]
- "Store the balance as a number and update it." You lose history and cannot audit; derive from an
  append-only ledger. [4][10]
- "Wrap the PSP call in the database transaction." Long transactions plus unknown outcomes; record
  intent first, call, then record result. [3]

## Analogy ideas

- Posting a cheque with a numbered receipt: if you are unsure it arrived, you ask about receipt
  #123 instead of writing a second cheque.
- A shop's paper ledger with two columns that must always balance; mistakes are fixed by a new line,
  never by erasing.

## Caveats

- Card scheme rules and hold durations vary by network, region and merchant category; numbers are
  examples from one provider's docs.

## Sources

Primary:
1. *Idempotent requests* — Stripe API reference — https://docs.stripe.com/api/idempotent_requests —
   accessed 2026-10-19.
2. *Designing robust and predictable APIs with idempotency* — Brandur Leach, Stripe Blog —
   https://stripe.com/blog/idempotency — 2017.
3. *Avoiding Double Payments in a Distributed Payments System* — Jon Chew, Airbnb Engineering —
   https://medium.com/airbnb-engineering/avoiding-double-payments-in-a-distributed-payments-system-2981f6b070bb — 2019.
4. *Books: an immutable double-entry accounting database service* — Square Developer Blog —
   https://developer.squareup.com/blog/books-an-immutable-double-entry-accounting-database-service/ — 2019.
5. *Place a hold on a payment method* — Stripe Docs —
   https://docs.stripe.com/payments/place-a-hold-on-a-payment-method — accessed 2026-10-19.
6. *Timeouts, retries, and backoff with jitter* — Marc Brooker, Amazon Builders' Library —
   https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/ — 2019.
7. *Receive Stripe events in your webhook endpoint* (duplicate events, event ordering) — Stripe Docs —
   https://docs.stripe.com/webhooks — accessed 2026-10-19.
8. *PCI Data Security Standard* — PCI Security Standards Council —
   https://www.pcisecuritystandards.org/standards/pci-dss/ — accessed 2026-10-19.
9. *Making retries safe with idempotent APIs* — Malcolm Featonby, Amazon Builders' Library —
   https://aws.amazon.com/builders-library/making-retries-safe-with-idempotent-APIs/ — 2020.
10. *Accounting for Developers, Part I* — Modern Treasury Journal —
    https://www.moderntreasury.com/journal/accounting-for-developers-part-i — 2021.

Books:
11. [B41] *System Design Interview*, vol. 2 — Xu, Lam — "Payment System" and "Digital Wallet"
    chapters (topic map only).
12. [B43] *Acing the System Design Interview* — Tan — distributed transactions and services
    chapters (topic map only).
13. [B1] *Designing Data-Intensive Applications* — Kleppmann — ch. 12 "The Future of Data Systems",
    sections on exactly-once execution, duplicate suppression, operation identifiers and the
    end-to-end argument.
14. [B19] *Release It!*, 2nd ed. — Nygard — ch. 4–5 (integration points, timeouts, circuit breaker).

Repos:
15. [G4] ashishps1/awesome-system-design-resources — idempotency and payments articles —
    https://github.com/ashishps1/awesome-system-design-resources.
16. [G5] InterviewReady/system-design-resources — payments case studies —
    https://github.com/InterviewReady/system-design-resources.
