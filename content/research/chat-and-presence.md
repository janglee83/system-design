# Chat systems and online presence — research note

- Level: L5
- Feeds lessons: `l5-chat-system`, `l5-chat-presence` (challenge `c-l5-chat`)
- Researched: 2026-10-19

## Key facts (in our words)

1. **Long-lived connections**: clients keep a WebSocket (or similar) open so the server can push
   messages; WebSocket upgrades an HTTP connection to a full-duplex channel (RFC 6455). [1][10]
2. **Connection servers are stateful**: each holds many open sockets; a routing layer must know which
   server holds which user. When one dies, its clients reconnect — possibly all at once. [2][3]
3. **Message ordering and IDs**: per-conversation, time-sortable IDs (Discord uses Snowflakes) give a
   stable order and make "fetch messages after X" cheap. [4][5]
4. **Storage by conversation**: Discord partitions messages by channel and time bucket; hot channels
   create hot partitions, which drove its move to ScyllaDB plus a request-coalescing data service. [4][5]
5. **Group chat fan-out**: a message to a group of N becomes N inbox writes or N pushes; small groups
   push, large channels are read on demand. [6][11]
6. **Slack's real-time architecture** uses channel servers and gateway servers to fan messages out to
   connected clients across regions. [6]
7. **Presence** is heartbeat-based failure detection for users: client heartbeats every few seconds;
   "offline" after a timeout; changes are published to interested contacts. LinkedIn added a delay
   before marking offline to absorb brief disconnects. [7]
8. **Elixir/Erlang at Discord** handled millions of concurrent users with per-guild processes. [3]

## Engine mapping

- `chat` profile, `fanout`, `presence` (`statusFlaps`, `staleOnline`) and `id_generator`
  (`outOfOrderIds`) are planned → `l5-chat-presence` needs 1b only. Per-server connection capacity
  and reconnect storms → gap `long-lived-connections`.

## Misconceptions

- "Polling every second is fine." Latency and load both suffer at scale. [1][10]
- "Timestamps order messages." Clock skew and same-millisecond messages → use IDs. [5]
- "Offline as soon as the socket drops." Phones drop constantly; debounce. [7]

## Sources

Primary:
1. *RFC 6455: The WebSocket Protocol* — I. Fette, A. Melnikov, IETF — https://www.rfc-editor.org/rfc/rfc6455 — 2011.
2. *Real-time Messaging* — Sameera Thangudu, Slack Engineering —
   https://slack.engineering/real-time-messaging/ — 2023.
3. *How Discord Scaled Elixir to 5,000,000 Concurrent Users* — Stanislav Vishnevskiy, Discord —
   https://discord.com/blog/how-discord-scaled-elixir-to-5-000-000-concurrent-users — 2017.
4. *How Discord Stores Billions of Messages* — Stanislav Vishnevskiy, Discord —
   https://discord.com/blog/how-discord-stores-billions-of-messages — 2017.
5. *How Discord Stores Trillions of Messages* — Bo Ingram, Discord —
   https://discord.com/blog/how-discord-stores-trillions-of-messages — 2023.
6. *Slack's real-time messaging architecture* — see [2]; and *Scaling Slack's Job Queue* —
   https://slack.engineering/scaling-slacks-job-queue/ — 2020.
7. *Now You See Me, Now You Don't: LinkedIn's Real-Time Presence Platform* — LinkedIn Engineering —
   https://engineering.linkedin.com/blog/2018/01/now-you-see-me--now-you-dont--linkedins-real-time-presence-platf — 2018.
8. *The WebSocket API* — MDN Web Docs — https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API —
   accessed 2026-10-19.

Books:
10. [B46] *High Performance Browser Networking* — Grigorik — ch. 17 "WebSocket".
11. [B40] *System Design Interview*, vol. 1 — ch. 12 "Design a Chat System" (topic map only).
12. [B3] *Database Internals* — ch. 9 "Failure Detection" (heartbeats).

Repos:
13. [G3] karanpratapsingh/system-design — "WhatsApp" design — https://github.com/karanpratapsingh/system-design.
14. [G11] binhnguyennus/awesome-scalability — chat/messaging posts — https://github.com/binhnguyennus/awesome-scalability.
