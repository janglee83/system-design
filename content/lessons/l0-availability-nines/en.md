---
id: l0-availability-nines
title: Availability and the nines
---

## Outcome
Convert a target such as "99.9%" into downtime per year, and compute the availability of a chain
of dependencies and of two redundant copies.

## Picture it first
A café promises to be "open 99% of the time". That sounds like always, but 1% of a year is more
than three and a half days closed. If the café needs power, water and the espresso machine all
working at once, its chances of being open are lower still; with two espresso machines, they go
up.

## Terms
- **Availability**: the share of time (or of requests) in which the service does its job. Counted
  by requests: successful requests ÷ valid requests.
- **"Nines"**: shorthand. "Three nines" means 99.9%; "five nines" means 99.999%.
- **Hard dependency**: a component whose outage means your service is out too.
- **MTBF** (mean time between failures) and **MTTR** (mean time to recover). Availability ≈
  MTBF ÷ (MTBF + MTTR).
- **Error budget**: the unavailability you are allowed, for example 0.1% for a 99.9% target.

## Common misconceptions
- **M1**: "99% is nearly perfect." It allows more than three and a half days of downtime a year.
- **M2**: "Combine several 99.99% services and you still have 99.99%." Serial dependencies multiply,
  and the result shrinks.
- **M3**: "One more nine costs just a bit more." Each extra nine usually costs far more than the
  one before.

## Table to remember

| Target | Most downtime allowed per year |
|---|---|
| 99% | about 3 days 15 hours |
| 99.9% | about 8 hours 45 minutes |
| 99.95% | about 4 hours 22 minutes |
| 99.99% | about 52 minutes |
| 99.999% | about 5 minutes |

## Step 1: observe a chain of dependencies
Your service is 99.99% available and needs two other services, each also 99.99%. In the best case:
0.9999 × 0.9999 × 0.9999 ≈ 99.97%.

## Step 2: analyse redundancy
Two independent copies at 99.9% each, where one working copy is enough: both are down together
with probability 0.001 × 0.001 = 0.000001, so availability is about 99.9999%. The key condition is
**independent failure**: no shared rack, power supply or software bug.

## Step 3: apply
A machine fails on average every 150 days and takes 1 hour to recover. Availability ≈ 3,600 hours
÷ (3,600 + 1) ≈ 99.97%. Cut recovery to 6 minutes and it rises to about 99.997%: recovering faster
is worth as much as failing less often.

## Questions
Pass with 4 correct answers out of 5.

- **q1**: How many hours of downtime per year does a 99.9% target allow?
- **q2**: A service has three hard dependencies at 99.9% each. In the best case, what is its
  availability, in percent?
- **q3**: Two independent copies at 99% each, and one is enough. What is the availability, in
  percent?
- **q4**: Why are two servers in the same rack not truly independent?
- **q4.a**: They usually run the same operating system version.
- **q4.b**: A power or network failure in that rack takes both down at once.
- **q4.c**: They sit too close together to share the load.
- **q5**: Out of 1,000,000 requests, how many may fail under a 99.95% target?

## Feedback
- **q1**: 0.1% of the 8,760 hours in a year is about 8.8 hours, a full working day. "Ninety-nine
  point something" always sounds better than the downtime it allows; convert it before you agree to
  it.
- **q2**: Each dependency must be up for your service to be up, so the chances multiply: 0.999 ×
  0.999 × 0.999 ≈ 0.997, or 99.7%. Three good parts in a chain make a weaker whole.
- **M3**: Going from 99.9% to 99.99% removes about 8 hours of downtime a year, but the last minutes
  are the hardest: they need redundant copies in separate places, automatic failover and people on
  call. Ask what each extra nine is worth to users before paying for it.

## Takeaways
- Turn percentages into downtime to see the real number.
- Serial dependencies multiply and pull availability down; independent copies pull it up.
- Recovering fast matters as much as failing rarely.

## Review questions
1. Write availability in terms of MTBF and MTTR.
2. What is the error budget of a 99.99% target over a 30-day month, in minutes? *(About 4.3
   minutes.)*
3. Why is 100% usually the wrong target? *(It is too expensive, users cannot tell the difference,
   and their own networks and devices are not 100% either.)*
