# Design decisions

There is one row per UI element. The owner fills in the **Owner choice** column. The
`system-builder` agent builds nothing visual until a row is chosen.

**Opening the demos.** Run `python3 -m http.server 8765` from `docs/design/demos`, then open
http://127.0.0.1:8765/. You can also open `docs/design/demos/index.html` directly from disk.

Each demo has a dark control bar at the top. It switches the option, light/dark, and
editing/running.

The demos share their choices with each other:

- The palette chosen in demo 02 is also used by demos 01 and 03.
- The node style chosen in demo 01 is also used by demo 03.

## Batch 1

| # | Element | Options | Recommendation and reason | Owner choice |
|---|---|---|---|---|
| 1 | Node style on the canvas (`demos/01-node-style`) | **A** Illustrated tile (172×148): our own line drawing, with the name and numbers inside the tile. Load rises like a water level, and replicas are stacked cards behind it. **B** Compact card with a category rail (248×64). **C** Ring station: a circular node with a load gauge ring, and the label in a caption under it. | **A.** It answers "nhìn xấu" directly: it has an identity as strong as Syscraft's drawings, and is more legible and compact. The name lives inside the shape, so hover, selection and state wrap one object, which fixes Syscraft's floating labels. The water-level fill and hatching read at 75 % zoom (see the density test). C is the most original and is the runner-up. Choose C if you want the canvas to feel like a network map rather than a whiteboard. B is safe, but looks like an admin tool. | **A** (2026-10-21) |
| 2 | Colour palette, typography and default theme (`demos/02-colour-type-theme`) | **A** Giấy & Mực: warm paper, deep teal, Be Vietnam Pro + JetBrains Mono, 8–12 px radii. **B** Than chì & Chàm: cool graphite, indigo, IBM Plex Sans/Mono, 4–8 px radii. **C** Mực đêm & Chanh: navy, lime, Plus Jakarta Sans, 12–22 px radii. Theme for all three: follow the system on first open, remember the user's toggle, and design light and dark as a pair. | **A.** It is visibly different from Syscraft's dark-navy and blue screenshots. Be Vietnam Pro was drawn for Vietnamese, so stacked diacritics never clip. It continues our current tokens, so there is less churn. Teal clashes with no state colour. Every text pair passes AA, as computed live on the page and checked by the a11y review (below). | **A** (2026-10-21) |
| 3 | App shell, toolbar and the primary Run action (`demos/03-app-shell`) | **A** One 56 px bar: nav, design name and save state, undo/redo, problems, and one accent **Chạy mô phỏng ⌘↵** split button. There is a 28 px status strip, and rare tools go into ⌘K and the canvas controls. **B** A 44 px nav plus a 48 px design toolbar, with every tool labelled. **C** A full-bleed canvas with floating palette and inspector cards, and a bottom dock. | **A.** It gives the canvas the most room and has exactly one accent-filled control on screen. In running mode the Run button turns into progress + Dừng in the same place, with a 2 px progress line along the bar. This fixes our biggest audit gap (there is no primary action today) and Syscraft's (two crowded bars, an upgrade button louder than Run). B is the fallback if the owner wants every tool visible. C hides the design under the cards at 1280 px. | **A** (2026-10-21) |

## Batch 2 (built in the chosen 1A / 2A / 3A style)

| # | Element | Options | Recommendation and reason | Owner choice |
|---|---|---|---|---|
| 4 | Component palette (`demos/04-palette`) | **A** Grouped list: 7 categories, each row has the art, name, one-line description and price. A hover card shows edge kinds, price and status. Coming-soon kinds are dimmed in place. **B** Two-column tile grid with large art and category filter chips. **C** A 76 px category rail plus a drawer. | **A.** Learners need the description and the price before dragging. Accent-insensitive search ("bo nho dem" finds both caches). It scales to 21+ kinds by adding rows. **C** is the fallback once the catalogue passes about 35 kinds. | **C** (2026-10-27). The owner chose the rail + drawer over the recommended A; the drawer rows keep A's description, price and hover card |
| 5 | Inspector (`demos/05-inspector`) | **A** Collapsible sections, label above the field, a one-line summary when collapsed. **B** Tabs. **C** Dense two-column property sheet. Each has three states: one node selected, nothing selected (design: traffic, run settings, faults), and running (live gauge, numbers, busy-over-time chart, node events). | **A.** It fixes the truncated labels in today's 320 px inspector (the panel is 368 px and the label sits above the field). Hints explain the numbers ("the group handles about 18,000 req/s"). One template covers node, design and live states. | **A** (2026-10-27) |
| 6 | Edges, ports, legend, canvas controls (`demos/06-edges-controls`) | **A** Bezier edges with colour and a dash pattern per kind. One control cluster (zoom, fit, layout, snap, legend popover with per-kind counts). Connect-time validation: the valid target glows and names the edge kind, the invalid one dims and says why *before* the drop. **B** Orthogonal edges with kind badges, legend in the status strip. **C** Edge width by request rate while running, an open legend card and a minimap. | **A**, and borrow **C**'s width-by-rate in running mode only. It replaces the five scattered floating widgets with one cluster and moves the error to before the drop. Arrowheads stay a fixed size. | **A** (2026-10-27), plain: no traffic-weighted edge width |
| 7 | Run feedback (`demos/07-run-feedback`) | **A** A verdict strip on the canvas: pass/fail, X/5, one chip per goal with the measured value, "Hỏng ở đâu?" pointing at the failing node with a one-line cause. **B** A results panel on the right with per-goal target vs measured bars and reasons. **C** A floating result card with a score ring. All three share a live chip while running and a follow-a-request trace (path highlighted, hop list using the engine's trace actions). | **A.** The verdict comes first and the design stays visible, so the cause sits next to the conclusion. This avoids Syscraft's parameter dump and its modal that hides the design. **B**'s reasons per goal should feed the "Hỏng ở đâu?" text. | **A** (2026-10-27) |
| 8 | Bottom panel (`demos/08-bottom-panel`) | **A** A resizable tabbed panel (Chỉ số · Sự kiện · Nhật ký · Mô phỏng): 6 KPIs with the delta vs the previous run, then 4 small charts with goal lines and event markers. **B** A unified timeline: lanes for metrics and per-node busy heat strips under one time cursor. **C** A right-hand results drawer. | **A**, because it matches the panel the builder has already shipped (`apps/web/src/lab/panel/*`), so this is visual polish rather than restructuring. Add **B** later as a "Dòng thời gian" tab. It is the most powerful teaching view, but it is new to beginners. | **A** (2026-10-27) |
| 9 | Empty, loading, error states (`demos/09-states`) | **A** Illustrated empty state with 3 starter templates. A loading skeleton in the palette's shape plus a step-by-step boot card. An error card that says the design is safe and offers a retry. **B** Ghost drop targets on the canvas, a progress line, an error banner over a greyed design. **C** Minimal text (today's behaviour). | **A.** The first minute ends in a real run (the "Web 3 tầng" template), and loading shows progress rather than a spinner. Errors reassure the user that no work is lost. Run, when disabled, says why. | **A** (2026-10-27) |
| 10 | Onboarding (`demos/10-onboarding`) | **A** 4 coach marks with a spotlight on the real UI. **B** A first-run checklist card (5 tasks, auto-ticked, "Chỉ cho tôi" opens A's bubble for that step, ends by offering the first challenge). **C** A 3-slide intro, then a template. | **B.** It is contextual and non-blocking (NN/g: contextual help beats up-front tutorials), shows visible progress, and hands off to challenge "Mở bán cửa hàng nhỏ". It reuses A's bubble for "show me". | **B** (2026-10-27) |
| 11 | Learn and challenge pages (`demos/11-learn-challenges`) | **A** Learning path: a 7-level strip (0–100 points), lessons as stations on a path, challenges as milestone flags, a "Tiếp tục" card and the level outcomes. **B** List plus preview (filters, list, preview pane). **C** Card grid with a strip of component illustrations. A shared lesson page (one step per screen, interactive figure, misconception callout) and a shared challenge brief (goals, 3 mode cards with budgets, locked start design, allowed kinds, hints). | **A.** It maps exactly onto the authored 0→100 curriculum (7 levels, 136 lessons, 44 challenges) and always shows "where am I and what's next". Keep **B** as the "Xem dạng danh sách" view for searching. | **A** (2026-10-27) |

## Product defaults (default, owner can override)

The owner did not answer the six open questions. These defaults apply. Each one is built so that changing it later is a small, contained change, and the mechanism is noted.

| # | Question | Default (default, owner can override) | How it stays cheap to change |
|---|---|---|---|
| 1 | Coming-soon components | They stay **disabled** in the palette, with an explanation on hover or focus ("Bộ mô phỏng chưa hỗ trợ…"). They cannot be placed. | One flag per kind (`status: ready / planned / later` in the kind catalogue). Enabling sketching later means letting `planned` kinds be placed with `excludedFromRun`, without changing the palette UI. |
| 2 | Starter templates | Reuse each challenge's `start.graph`, plus two built-ins: **Trống** (blank) and **Người dùng → Máy chủ web → PostgreSQL**. | Templates are data (`templates.ts` reading challenge JSON plus 2 local entries). Adding or removing one is a data change. |
| 3 | Verdict | The Lab shows **goals met n/N** only. The 0–100 score and stars belong to challenges (sub-project 5). | The verdict strip takes `{ met, total, goals[] }`. A score slot exists but is hidden unless a challenge passes `score`. |
| 4 | Progress | Stored **in this browser** now. An account comes later (sub-project 6). The wording never promises more ("Lưu trên trình duyệt này"). | One `progress-store` interface with a local IndexedDB adapter. An account adapter can be swapped in later. All wording comes from one catalogue key group (`storage.*`). |
| 5 | Levels | Prerequisites are **shown and enforced**, following feature-parity. The next level is locked until the previous level's exit check passes. Locked items say why ("Cần qua bài kiểm tra cuối cấp 0") and can be previewed (read-only brief). | Gating is one pure function `isUnlocked(item, progress)`. Relaxing it to "open but marked" is a one-line policy change. |
| 6 | Quotas | **No run or AI quotas, and no run counter.** | Nothing to change; the top bar has no quota slot. |

## Accessibility review of batch 1 (ecc:a11y-architect)

**Contrast.** The review computed every text, state and non-text pair for the 3 palettes × 2
themes by hand. Two pairs needed a fix, and both are fixed:

- A dark `--down` is now `#848D98`, up from 4.47:1 to about 4.7:1.
- C light `--over` is now `#B82E26`, up from 4.50:1 to about 4.9:1.

The live checker in demo 02 also caught the light-theme `--down` values at 4.2:1. These were
darkened to about `#5E636D`.

**Fixed in the demos**

- Nodes now have a dashed `:focus-visible` ring, separate from the solid selection outline.
- Selection uses `outline`, so the overload pulse can no longer hide it.
- The issue badge text uses the canvas colour. White on light coral was unreadable in dark
  themes.
- The aria label now includes the selected, locked and issue count states.
- Hot edge rate pills now carry an icon, and rejected request dots are hollow, so neither
  relies on colour alone.
- Request dots are not drawn under `prefers-reduced-motion`.

**Carried into the build spec**

- Ports need a 24×24 hit area, and keyboard and touch users need a "Nối tới…" menu as an
  alternative to dragging (WCAG 2.5.7 and 2.5.8). The app already has a connect dialog, so
  keep it.
- Run playback that auto-starts and lasts more than 5 s needs a pause control (WCAG 2.2.2).
- The reduced-motion change must be listened to live, not read once.
- The lime accent in palette C must never be the only boundary of a progress bar or state.
