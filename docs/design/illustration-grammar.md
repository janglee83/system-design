# Component illustration grammar

These rules let anyone draw a new component kind so that it sits naturally next to the existing
21. The reference implementation is `docs/design/demos/shared/art.js`, and every kind in all its
states is shown in demo 01, section "Danh mục thành phần".

## Artboard

- **viewBox `0 0 64 48`.** The node tile (style 1A) renders it at 76×57. The palette uses 32×24,
  and the inspector header 34×26.
- **Live area x 4–60, y 4–44.** Arrows that leave the artboard may reach x 2 and x 62.
- **Ground line y = 42.** Objects that stand on something (servers, buckets, gates) rest on it.
  Feet and pins hang below it, down to y 46.
- **One primary object, roughly centred.** It may have one small secondary object, such as the
  gear on the worker or the clock on the scheduler, overlapping its top-right or bottom-right.
  Repeats (replicas, partitions, slots) are shown as at most 3–4 identical units.
- **Flow reads left → right.** Input arrows enter from the left edge and outputs leave to the
  right. Fan-out is drawn upward or to the right.

## Stroke and fill

| Element | Rule |
|---|---|
| Outline stroke | 1.6 px, `round` caps and joins, colour `var(--k)` (the category colour) |
| Body fill | `color-mix(var(--k) 16%, var(--surface))`, one tint per drawing, no gradients |
| Inner panels (slots, screens, labels) | `var(--surface)` fill with the same 1.6 stroke |
| Detail lines (text, vents, rows) | stroke only, 1.2–1.6 px, no fill |
| Indicator dots (LEDs, pins) | filled circles, r = 1.4–1.9 |
| Dashed outline | only means *not ours / a copy / outside the system*: 3–4 on, 2–2.5 off. Used for read replicas and third-party APIs |
| Corner radius | device bodies 2.5, chassis 3, pills and tubes = half their height, documents 2.5 |

Never use brand logos, product colours or trademarks. A product name may appear in the label,
for example "Redis (bộ nhớ đệm)". The drawing shows the generic concept.

## Category colour roles

Each category has one accent token, defined in `shared/tokens.css`. It tints the illustration
and the tile background (7 % behind the art, 10 % in the palette tile). Nothing else uses it.

| Category | Token | Light | Dark | Kinds |
|---|---|---|---|---|
| Lối vào (entry, edge) | `--c-entry` | `#4F57C9` | `#9AA2FF` | client, mobile, DNS, CDN, API gateway, load balancer, rate limiter |
| Tính toán (compute) | `--c-compute` | `#2C66C7` | `#79A6FF` | web server, worker, scheduler |
| Dữ liệu (data) | `--c-data` | `#7542B3` | `#BE97F6` | PostgreSQL, read replica, key–value store, search index |
| Bộ nhớ đệm (cache) | `--c-cache` | `#0B7A6E` | `#45CFB8` | Redis, Memcached |
| Tin nhắn (messaging) | `--c-msg` | `#B0397A` | `#F07FBB` | queue, RabbitMQ-like, Kafka-like stream |
| Lưu trữ tệp (storage) | `--c-storage` | `#3D6C8A` | `#8DB8D6` | object storage |
| Bên ngoài (external) | `--c-external` | `#5D6470` | `#A3ABB6` | third-party API |

State colours (busy amber, overloaded red, down grey, stable green) are reserved for state and
never used as a category colour.

## Where the drawing sits in a node (style 1A)

```
┌──────────────────────── 172 ────────────────────────┐
│ ×2                                     [⚠ Quá tải]  │  art band, 84 px high, category tint 7 %
│                 (illustration 76×57)                │  load fill rises from the bottom (water level)
├─────────────────────────────────────────────────────┤  1 px divider in the category colour (22 %)
│ Name (14/600)                                       │
│ config or live line (12, text-2)                    │  body, 12 px padding
│ price or load % (12 mono, text-3)                   │
└─────────────────────────────────────────────────────┘
```

- The replica count badge sits top-left of the art band. The state chip (icon + word) sits
  top-right, and only appears while running and when the state is not stable.
- The ports sit on the left and right edges, at the art band's vertical centre (y = 42).
- The lock badge sits outside the top-left corner, and the issue count outside the top-right.

## States (all kinds)

| State | Art band | Border | Other |
|---|---|---|---|
| Stable | category tint, green-free | 1 px `--border` | load % in the body |
| Busy (70–100 %) | `--busy-soft` with the level fill | `--busy-line` | chip "Bận" with a gauge icon |
| Overloaded (> 100 %) | hatched red at 45° | `--over` plus a 3 px soft halo that breathes (static under reduced motion) | chip "Quá tải" with an alert icon |
| Down | grey, illustration greyscale at 50 % | dashed `--border-strong` | chip "Ngừng chạy" with a power icon |
| Selected | unchanged | 2 px `--accent-text` outline, 3 px offset | `aria-current` |
| Keyboard focus | unchanged | 2 px dashed outline, 7 px offset | — |
| Locked | unchanged | dashed `--border-strong` | lock badge |
| Has issues | unchanged | unchanged | red count badge |

## Checklist for a new kind

1. Pick the category. Do not invent a new colour.
2. Sketch the concept as a physical object (a box, a tube, a document, a bucket) on the 64×48
   grid, standing on y = 42.
3. Add at most one secondary object and at most 4 repeats.
4. Use only the stroke and fill rules above. Check the drawing at 32×24 in the palette and at
   76×57 on the tile, in light and dark.
5. Add the kind to `SDData.kinds` with a label, category, status and one-line description. The
   gallery and palette pick it up automatically.
