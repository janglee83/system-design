# News feed / home timeline — research note

- Level: L5
- Feeds lessons: `l5-news-feed` (challenge `c-l5-news-feed`)
- Researched: 2026-10-19

## Key facts (in our words)

1. **Two strategies.** *Fan-out on write (push)*: when someone posts, write the post id into every
   follower's precomputed timeline; reads are cheap. *Fan-out on read (pull)*: assemble the timeline
   at read time from the people you follow; writes are cheap. [1][2][9]
2. **Celebrity problem**: an account with millions of followers makes push expensive; Twitter mixed
   the two — push for most accounts, merge celebrity posts at read time. [1][9]
3. **Selective materialisation**: "Feeding Frenzy" showed choosing per producer–consumer pair
   whether to push or pull, based on their rates, minimises cost. [3]
4. **Timelines are kept in memory** (Redis lists at Twitter) and hold post ids, not full posts; the
   posts are hydrated from a cache/store. [1][4]
5. **Read-heavy graph data**: Facebook's TAO caches objects and associations (who follows whom,
   who liked what) in front of MySQL. [4]
6. **Ranking** turns a chronological list into a scored feed, adding a candidate-generation and
   ranking pipeline. [5][6]
7. **Inactive users** need not get pushed timelines; computing on next login saves writes. [1][2]

## Engine mapping

- `fanout` behavior (group/friend fan-out on write → `inboxWritesPerSec`, queue load) and `feed`
  profile are planned → lesson needs 1b only.

## Misconceptions

- "Pick push or pull for everyone." Hybrid wins at scale. [1][3]
- "Store whole posts in each timeline." Store ids. [1]

## Sources

Primary:
1. *Timelines at Scale* (talk) — Raffi Krikorian, Twitter, QCon SF —
   https://www.infoq.com/presentations/Twitter-Timeline-Scalability/ — 2013.
2. *Designing Data-Intensive Applications*, 2nd ed., ch. 2 case study (see Books) — and the 1st ed.
   "Describing Load" Twitter example.
3. *Feeding Frenzy: Selectively Materializing Users' Event Feeds* — A. Silberstein, J. Terrace,
   B. F. Cooper, R. Ramakrishnan, SIGMOD — https://dl.acm.org/doi/10.1145/1807167.1807224 — 2010.
4. *TAO: Facebook's Distributed Data Store for the Social Graph* — N. Bronson et al., USENIX ATC —
   https://www.usenix.org/system/files/conference/atc13/atc13-bronson.pdf — 2013.
5. *Twitter's Recommendation Algorithm* — Twitter Engineering —
   https://blog.x.com/engineering/en_us/topics/open-source/2023/twitter-recommendation-algorithm — 2023.
6. *Instagram Feed Ranking: How Instagram ranks content* — Adam Mosseri, Instagram —
   https://about.instagram.com/blog/announcements/instagram-ranking-explained — 2023.
7. *Scaling Memcache at Facebook* — NSDI '13 — https://pdos.csail.mit.edu/6.824/papers/memcache-fb.pdf — 2013.

Books:
9. [B2] *Designing Data-Intensive Applications*, 2nd ed. — ch. 2 "Case Study: Social Network Home
   Timelines" (and [B1] ch. 1 "Describing Load").
10. [B40] *System Design Interview*, vol. 1 — ch. 11 "Design a News Feed System" (topic map only).
11. [B38] *Web Scalability for Startup Engineers* — ch. 6 "Caching", ch. 7 "Asynchronous Processing".

Repos:
12. [G1] donnemartin/system-design-primer — "Design the Twitter timeline and search" —
    https://github.com/donnemartin/system-design-primer.
13. [G5] InterviewReady/system-design-resources — feed case studies —
    https://github.com/InterviewReady/system-design-resources.
