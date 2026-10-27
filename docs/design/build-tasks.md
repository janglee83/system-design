# Design v2: build tasks for `system-builder`

**Sources**

- Spec: `docs/design/design-system.md`. It replaces the plan's "Visual design" section.
- Decisions: `docs/design/decisions.md` (owner picks 1A 2A 3A 4C 5A 6A 7A 8A 9A 10B 11A, and the
  product defaults).
- Assets: `docs/design/assets/nodes/` (21 SVGs, `NodeArt.tsx`, `manifest.json`).
- Plan: `docs/superpowers/plans/2026-10-20-app-lab.md`.
- Live references: `docs/design/demos/*`. Each task names the demo and the state to compare
  against.

**Where the build is now** (git log, 2026-10-28):

- Done: Phases 1–3 (tasks 1–24) and Task 29.
- Not yet built: Phase 4 playback (25–28), Tasks 30–33, Phase 6 (34–37).
- So the Design v2 tasks restyle finished code, and change the not-yet-built tasks before they
  are written.

**Rules for every DV task**

- TDD where there is logic.
- Every string goes in `messages/{vi,en}.json` (R9).
- Tokens only, no raw hex in components.
- Both themes.
- Run the existing `pnpm test` and the e2e suite in the container.
- Commit as `feat(web): …`.
- Playwright checks go in the named spec files and run in the default e2e run unless marked
  `@sweep`.

---

## A. Changes to existing plan rulings and tasks

| Plan item | Change |
|---|---|
| **Visual design section** | Superseded by `design-system.md`. Keep its structure notes (grid, accessibility notes); take values from the new document. |
| **R14 Edges** | Edges become **Bézier** (React Flow `default`/`bezier` edge, or the custom path in §6.1), not `smoothstep`. Auto-layout (ELK) stays. Arrowheads are fixed size. |
| **R19 Playback** | Unchanged (speeds 0.25–4). The controls move from the floating run bar to the **playback bar** (design-system §7.2). |
| **R27 Onboarding tour** | Replaced by the **first-run checklist** (10B). Coach bubbles open only from "Chỉ cho tôi". The `[data-tour]` anchors stay. `localStorage["sd-tour-lab"]` becomes `sd-onboarding` (`{ hidden, done: string[] }`). |
| **Task 11** (done) | Node cards, minimap, legend card and zoom pill are restyled or removed by DV-3 and DV-6. |
| **Task 12** (done) | The palette becomes 4C (DV-4). `palette-model.ts` gains categories and status. |
| **Task 15** (done) | The inspector is restyled by DV-5 (labels above fields, collapsible sections with summaries). |
| **Task 22** (done) | `RunBar` is replaced by the top-bar Run split button (DV-2). Keep `data-testid="run-bar"` on the new split button for test continuity, with `data-status` and `data-run-id`. |
| **Task 23–24** (done) | The bottom panel is restyled by DV-8 (KPI deltas, goal and event lines in charts, the event "Xem trên sơ đồ" link, log filters and outcome pills, the Mô phỏng form). |
| **Task 25: Playback clock and controls** | Same clock, store and loop. `PlaybackBar` is a **full-width 52 px bar** under the main row (not inside the run bar). Speed is a segmented control with all 5 speeds. The pause control is required. The scrubber is a `role="slider"` with keyboard steps and event markers as focusable 16 px circles. Use `docs/design/demos/07-run-feedback?mode=running` as the reference. |
| **Task 26: Node states during playback** | Use the 1A states from design-system §5: water-level fill, busy/over/down art band and border, state chip with icon and word, 1.6 s breathe (static under reduced motion), and the live line and load % in the body. The edge states (hot, dead) and rate pills from §6.1 also go here. |
| **Task 27: Request dots** | Dots r 3.2 in the edge kind colour. Rejected dots are hollow (`canvas` fill, 2 px `over`). No dots under reduced motion, and the setting is listened to live. Add a live chip at the top-centre of the canvas (§7.1). |
| **Task 28: Follow a request** | The path highlight uses §7.4: on-path outline, others at .28, path edges 3 px `accent-text`, and a trace card at the top-right with a hop list using the trace action words. Clicking a log row starts the follow. `[` and `]` step between hops. |
| **Task 31: Start from a challenge or template; Learn and Challenges lists** | Templates follow default 2 (challenge `start.graph` + Trống + Người dùng → Máy chủ web → PostgreSQL), shown in the 9A empty state (DV-7). The Learn and Challenges pages follow 11A (DV-11). |
| **Task 33: Shortcut sheet, onboarding tour, about** | The **tour becomes the 10B checklist** (DV-10). The shortcut sheet and About are unchanged. The Help menu gains "Làm quen với Lab". |
| **Task 34: Accessibility** | Add the design-system §13 checks: 24 px port hit areas, keyboard connect (C), the playback pause control, reduced motion listened to live, and disabled-with-reason controls. |
| **Task 35a: UI review and polish** | The sweep now compares every state against the demos and `design-system.md`. Steps 3–4 (resizable panels, no truncated labels) stay. Inspector default width becomes **368** (range 320–480). The palette is the 4C rail plus drawer (drawer 260, not resizable; the rail is fixed). |
| **Task 36: Visual baselines** | Take the baselines **after** DV-1…DV-11. Add the baseline states listed under each DV task below, in light and dark at 1440. |

---

## B. New tasks (in build order)

Order: DV-1 tokens → DV-2 shell → DV-3 nodes → DV-4 palette → DV-5 inspector → DV-6 controls →
DV-9 run feedback → DV-7 states → Task 25–28 playback (as amended) → DV-10 checklist → DV-11
learn/challenge pages → DV-8 bottom panel polish (any time after DV-1).

### DV-1: Tokens, theme and fonts (2A)

- **Files:**
  - modify `apps/web/src/ui/tokens.css`, `apps/web/src/ui/globals.css` (Tailwind `@theme`
    mapping, type scale), `apps/web/src/ui/tokens.test.ts`, `apps/web/src/lab/canvas/icons.ts`
    (category → `--sd-cat-*`);
  - remove the `--sd-cat-general` usages.
- **Do:**
  - set every value in design-system §1.1, light and dark, including the new `accent-text`,
    `ok-soft`, `busy-line` and the 7 category tokens;
  - replace the 9-step type scale with the 6 roles of §1.2 (keep Tailwind names as aliases for
    one task, then remove them);
  - add the radii, shadows and motion tokens from §1.3–1.4;
  - set the focus ring rule (§1.5) globally with `:focus-visible` only;
  - fonts stay as they are: Be Vietnam Pro and JetBrains Mono, already bundled.
- **Acceptance:**
  - `tokens.test.ts` checks every contrast pair in §1.1 in both themes;
  - a grep finds no raw hex in `src/**/*.tsx`;
  - the reduced-motion media query sets every duration to 0.
- **Playwright** (`e2e/shell.spec.ts`):
  - `getComputedStyle(document.documentElement)` returns `--sd-accent` `#0B6870` in light and
    `#3FC3CB` in dark;
  - clicking the problems pill with the mouse leaves no outline (`outline-style: none`);
  - focusing it with Tab shows a 2 px outline.

### DV-2: App shell: top bar, Run split button, status strip (3A)

- **Files:**
  - modify `apps/web/src/shell/TopBar.tsx`, `apps/web/src/shell/Mark.tsx`,
    `apps/web/src/shell/NavLinks.tsx`, `apps/web/src/lab/LabApp.tsx`,
    `apps/web/src/lab/Problems.tsx`;
  - replace `apps/web/src/lab/run/RunBar.tsx` with `apps/web/src/lab/run/RunButton.tsx`;
  - create `apps/web/src/lab/StatusStrip.tsx` and `apps/web/src/lab/DesignTitle.tsx`;
  - update `messages/{vi,en}.json`.
- **Do:**
  - design-system §2: a 56 px bar with brand, nav, design name and save line (wording "trên
    trình duyệt này"), undo/redo, problems pill, utilities, and the Run split button with all
    the §2.2 states;
  - a 28 px status strip with the engine state, counts, cost and autosave note;
  - remove the floating engine chip and the floating problems pill from the canvas;
  - no run counter;
  - at 1400 px or less, collapse the utilities into Help.
- **Acceptance:**
  - Run is the only element in the Lab with `background: var(--sd-accent)` while editing;
  - disabled Run keeps focus and shows its reason in the tooltip on focus;
  - while running, the progress block and Dừng replace the split button in the same box (no
    layout shift: the top bar width is unchanged);
  - Esc stops a run.
- **Playwright** (`e2e/shell.spec.ts`, `e2e/run.spec.ts`):
  - on an empty Lab, `run-bar` has `aria-disabled=true` and the tooltip text "Thêm Người dùng và
    một máy chủ để chạy";
  - after building the 5-node fixture, ⌘↵ shows "Đang chạy" and then returns to "Chạy mô
    phỏng";
  - the status strip shows "5 thành phần";
  - at 1280 px nothing in the top bar overflows (`scrollWidth <= clientWidth`).
- **Baselines:** the Lab editing top bar, running top bar and disabled Run, light and dark.

### DV-3: Node tiles (1A) and illustrations

- **Files:**
  - create `apps/web/src/lab/canvas/art/NodeArt.tsx` (copied from
    `docs/design/assets/nodes/NodeArt.tsx`) and `apps/web/src/lab/canvas/kinds.ts` (kind →
    category, status, from `manifest.json`);
  - modify `apps/web/src/lab/canvas/LabNode.tsx`, `apps/web/src/lab/canvas/rf-adapter.ts`,
    `apps/web/src/lab/canvas/aria.ts`, `apps/web/src/lab/canvas/layout.ts` (node size 172×148);
  - add `apps/web/src/lab/canvas/LabNode.test.tsx`.
- **Do:**
  - design-system §5: the art band with the category tint and replicas badge, a 3-line body,
    stacked replica cards, ports at y 42 with **24×24 hit areas**, lock and issue badges;
  - the editing states (selected outline, focus dashed ring, locked);
  - leave the running states to Task 26, but put the CSS for them in this task;
  - the accessible name from §5;
  - keep the existing test ids (`node-<id>`, `handle-in-<id>`, `handle-out-<id>`).
- **Acceptance:**
  - every engine kind and the 17 planned/later kinds render without a missing art fallback
    (unit test over `manifest.json`);
  - a port's hit box is at least 24×24;
  - selection uses `outline`, not `box-shadow`;
  - focus looks different from selection.
- **Playwright** (`e2e/lab.spec.ts`):
  - after adding a Web server, `node-web-server-1` is 172×148 (±1) at 100 % zoom;
  - the `handle-out` bounding box is at least 24×24;
  - its `aria-label` contains "Máy chủ web";
  - with replicas 2, the "×2" badge is visible;
  - Tab to a node shows a dashed outline.
- **Baselines:** the 5-node design, editing, light and dark (compare
  `demos/01-node-style?opt=a&mode=editing`).

### DV-4: Palette (4C: rail plus drawer, full catalogue)

- **Files:**
  - modify `apps/web/src/lab/palette/Palette.tsx` and `apps/web/src/lab/palette/palette-model.ts`
    (categories, status, accent-insensitive search; search already folds accents);
  - create `apps/web/src/lab/palette/CategoryRail.tsx`,
    `apps/web/src/lab/palette/PaletteDrawer.tsx` and `apps/web/src/lab/palette/KindCard.tsx`
    (the hover card);
  - modify `apps/web/src/lab/canvas/use-add-component.ts` (refuse non-ready kinds) and
    `messages`.
- **Do:**
  - design-system §3: a 76 px rail tablist with 7 categories, and a 260 px drawer with rows
    (art, name, 2-line description, price);
  - coming-soon rows are `aria-disabled` with the "Sắp có" pill and cannot be dragged;
  - the hover/focus card;
  - challenge-disallowed kinds look disabled and have a lock pill;
  - search across categories with ⌘K;
  - while running, the drawer closes and adding is blocked with a tooltip;
  - the kind list = engine `meta()` kinds (ready) + `content/curriculum.json →
    engine.planned.components` (planned) + the later list in `manifest.json` (later).
- **Acceptance:**
  - planned and later kinds cannot be added by drag, click, Enter or the command palette;
  - the hover card opens on focus;
  - the drawer state (open category) is remembered in this browser;
  - the existing palette tests still pass with updated selectors.
- **Playwright** (`e2e/lab.spec.ts`):
  - the rail has 7 tabs;
  - opening "Bộ nhớ đệm" shows Redis and Memcached with "Sắp có", and dragging Redis creates no
    node;
  - searching "bo nho dem" lists both;
  - focusing CDN shows the card text "Chưa kéo vào khung vẽ được";
  - "Thêm Máy chủ web" still adds a node.
- **Baselines:** the drawer open on Lối vào; search results; the hover card.

### DV-5: Inspector restyle (5A)

- **Files:**
  - modify `apps/web/src/lab/inspector/Inspector.tsx`, `NodeInspector.tsx`, `DesignSettings.tsx`,
    `EdgeInspector.tsx`, `ConfigFieldInput.tsx`, `apps/web/src/ui/Field.tsx`,
    `apps/web/src/ui/Section.tsx` (accordion with summary), and `messages`;
  - create `apps/web/src/lab/inspector/summaries.ts` (+ test).
- **Do:**
  - design-system §4: a 368 px default width (35a range 320–480);
  - the header with tile and editable name;
  - sections with a chevron and a one-line summary when closed, open state remembered per kind;
  - labels above fields, hints that explain numbers, paired short fields;
  - the cost block with its breakdown;
  - a Kết nối section;
  - the live section (gauge, 4 KPIs, busy chart, node events) is created here and fed by
    Task 26.
- **Acceptance:**
  - no label truncation at 1280 in VI (35a's test);
  - the summaries are correct for every engine config field (unit test);
  - the cost breakdown matches the engine price.
- **Playwright** (`e2e/lab.spec.ts`, `e2e/polish.spec.ts`):
  - selecting a web server shows "Cấu hình" open and "Nâng cao" closed with the summary "Theo
    tham số thế giới";
  - the vCPU stepper changes the cost line;
  - every `Field` label has `scrollWidth <= clientWidth`.
- **Baselines:** node, design and edge inspector.

### DV-6: Edges, ports, connect feedback, controls cluster (6A)

- **Files:**
  - modify `apps/web/src/lab/canvas/LabEdge.tsx` (Bézier, dash per kind, fixed-size arrowhead,
    selected glow, edge popover), `apps/web/src/lab/canvas/Canvas.tsx`
    (`isValidConnection` → valid/invalid target classes and tooltips, hint pill) and
    `apps/web/src/lab/canvas/CanvasControls.tsx` (one cluster + legend popover);
  - delete `apps/web/src/lab/canvas/EdgeLegend.tsx` and the minimap;
  - update `messages`.
- **Do:**
  - design-system §6. No traffic-weighted width.
  - The legend popover counts edges per kind.
  - C opens the connect dialog that already exists.
- **Acceptance:**
  - while dragging from a web server's out-port, PostgreSQL gets the valid-target state and
    Người dùng the invalid one, before the drop;
  - arrowheads are the same pixel size at 50 % and 150 % zoom;
  - there is no minimap and no floating legend card.
- **Playwright** (`e2e/lab.spec.ts`):
  - start a drag from `handle-out-web-server-1`, move over `node-postgres-1`: the tooltip "Thả để
    nối" is visible and `node-postgres-1` has `data-target="valid"`; move over `node-client-1`:
    `data-target="invalid"` and the reason text is visible;
  - Esc cancels;
  - the legend button toggles a popover containing "HTTP" and "2 đường";
  - pressing C with a node selected opens the connect dialog.
- **Baselines:** the connect state; the selected edge with its popover; the legend open.

### DV-9: Run feedback and verdict (7A)

- **Files:**
  - create `apps/web/src/lab/run/LiveChip.tsx`, `apps/web/src/lab/run/Verdict.tsx`,
    `apps/web/src/lab/run/verdict-model.ts` (+ test: goals → met/total/first failing node and
    reason) and `apps/web/src/lab/run/WhyCallout.tsx`;
  - modify `apps/web/src/lab/LabApp.tsx` and `messages`.
- **Do:**
  - design-system §7.1 and §7.3;
  - goals come from the design's challenge (when started from one), otherwise a neutral strip;
  - n/N only (default 3), with a hidden score slot;
  - "Hỏng ở đâu?" selects, pans and shows the callout;
  - announce the verdict.
- **Acceptance:**
  - the failing-node choice is deterministic (the first failed goal → the node with the highest
    peak busy, or the node named by the reason);
  - the verdict never covers the design: the canvas fit leaves 96 px at the top while it is
    open;
  - announcer text is "Chưa đạt 2 trên 5 mục tiêu…".
- **Playwright** (`e2e/run.spec.ts`):
  - run the c-l0-first-launch start with only a web server: the verdict shows "Chưa đạt", the
    chips include "Độ trễ p95";
  - clicking "Hỏng ở đâu?" selects a node and shows "Đây là chỗ gãy";
  - a passing reference design shows "Đạt".
- **Baselines:** the verdict failing and passing, the callout.

### DV-7: Empty, loading and error states with templates (9A)

- **Files:**
  - create `apps/web/src/lab/EmptyLab.tsx`, `apps/web/src/lab/EngineBoot.tsx`,
    `apps/web/src/lab/EngineError.tsx` and `apps/web/src/lab/templates.ts` (+ test: challenge
    `start.graph` + 2 built-ins);
  - modify `apps/web/src/engine/EngineStatus.tsx` (expose boot steps),
    `apps/web/src/lab/LabApp.tsx` and `messages`.
- **Do:**
  - design-system §9;
  - the boot steps come from real worker milestones (wasm fetched, calibration read, canvas
    ready, last design opened);
  - the error card keeps the design greyed and editable after "Sửa thiết kế khi chưa chạy
    được".
- **Acceptance:**
  - choosing a template creates the design and fits it in view;
  - an engine error never clears the design;
  - `aria-busy` while booting;
  - `role="alert"` on error.
- **Playwright** (`e2e/lab.spec.ts`, `e2e/engine.spec.ts`):
  - an empty Lab shows the 3 template kinds, and clicking "Người dùng → Máy chủ web →
    PostgreSQL" creates 3 nodes;
  - with the wasm route aborted (`page.route`), the error card appears, the design from
    IndexedDB is still on the canvas, and "Thử lại" re-runs the boot.
- **Baselines:** empty, loading (frozen with a route delay), error.

### Phase 4 (Tasks 25–28, as amended in section A)

Build them after DV-7.

- **Playwright additions** (`e2e/playback.spec.ts`):
  - the playback bar has a button named "Tạm dừng" while playing;
  - Space toggles it;
  - the scrubber has `role="slider"` and ArrowRight moves time by 0.1 s;
  - with `reducedMotion: "reduce"`, no `circle.dot` elements exist;
  - a log row click shows the trace card with ≥ 2 hops.
- **Baselines:** running at 4.2 s; follow-a-request.

### DV-10: First-run checklist (10B, replaces the Task 33 tour)

- **Files:**
  - create `apps/web/src/shell/Onboarding.tsx`, `apps/web/src/shell/onboarding-model.ts`
    (+ test: task completion from design and run events) and
    `apps/web/src/shell/CoachBubble.tsx`;
  - modify `apps/web/src/shell/HelpMenu.tsx`, `apps/web/src/lab/LabApp.tsx` and `messages`;
  - remove `Tour.tsx` and `tour-steps.ts` if they were created.
- **Do:**
  - design-system §10. The five tasks are ticked from store events.
  - "Chỉ cho tôi" spotlights one `[data-tour]` target.
  - When complete, offer the first challenge.
  - Stored in this browser (`sd-onboarding`). Help → "Làm quen với Lab" re-opens it.
- **Acceptance:**
  - the card never blocks the canvas (pointer events pass outside it);
  - the coach bubble closes with Esc and returns focus;
  - completion survives a reload.
- **Playwright** (`e2e/help.spec.ts`):
  - first visit shows "Làm quen với Lab · 0/5";
  - adding Người dùng ticks task 1;
  - "Chỉ cho tôi" shows a dialog "Bước 2/4" anchored near the canvas;
  - after a run, 4/5;
  - Ẩn hides it, and the Help menu shows it again.
- **Baseline:** the checklist at 3/5.

### DV-11: Learn and Challenges pages (11A, placeholder-level for sub-project 3)

- **Files:**
  - modify `apps/web/app/[locale]/(shell)/learn/page.tsx` and
    `apps/web/app/[locale]/(shell)/challenges/page.tsx`;
  - create `apps/web/src/learn/LevelStrip.tsx`, `apps/web/src/learn/LearningPath.tsx`,
    `apps/web/src/learn/ContinueCard.tsx`, `apps/web/src/learn/gating.ts` (+ test:
    `isUnlocked(item, progress)` per default 5) and `apps/web/src/learn/progress-store.ts`
    (a local IndexedDB adapter behind an interface; default 4);
  - update `messages`.
- **Do:**
  - design-system §11 list pages with real data from `content/curriculum.json` (R24 server
    components): level strip, path with stations and milestone flags, readiness pills,
    Continue card, outcomes;
  - locked levels are dimmed with the reason and a read-only preview;
  - the "Xem dạng danh sách" toggle;
  - the lesson page and challenge brief are **sub-project 4/5**: here, a station links to the Lab
    with the lesson or challenge start design (Task 31), or shows "Sắp có" for unbuilt items.
- **Acceptance:**
  - counts match `curriculum.json` (7 levels, 136 lessons, 44 challenges);
  - L1+ are locked on a fresh browser with the reason "Cần qua bài kiểm tra cuối cấp 0";
  - no wording mentions accounts.
- **Playwright** (`e2e/shell.spec.ts`):
  - `/vi/learn` shows 7 level cards and the first lesson title "Ai hỏi, ai trả lời: client và
    server";
  - a locked level shows the lock reason on focus;
  - `/vi/challenges` lists "Mở bán cửa hàng nhỏ", and its button opens the Lab with 1 locked
    client node.
- **Baselines:** Learn and Challenges, light and dark.

### DV-8: Bottom panel polish (8A)

This can run in parallel after DV-1.

- **Files:** modify `apps/web/src/lab/panel/BottomPanel.tsx`, `MetricsTab.tsx`, `EventsTab.tsx`,
  `LogsTab.tsx`, `SimulationTab.tsx`, `SeriesChart.tsx`, `compare.ts`, and `messages`.
- **Do:**
  - design-system §8: KPI tiles with mono values and deltas vs the previous run (the comparison
    exists in `compare.ts`);
  - 4 small charts with goal and event lines and the playback cursor;
  - events with severity icons and "Xem trên sơ đồ";
  - logs with filter chips and outcome pills;
  - the Mô phỏng form using the §4 controls;
  - the grip handle (`ResizeHandle` exists) with a default height of 320.
- **Acceptance:**
  - delta colours follow "better or worse for that metric" (unit test in `compare.test.ts`);
  - the Sự kiện tab badge counts warnings and errors.
- **Playwright** (`e2e/panel.spec.ts`):
  - after two runs, the p95 tile shows a delta line containing "so với #";
  - clicking "Xem trên sơ đồ" selects the node;
  - the "Bị từ chối" filter shows only rejected rows.
- **Baselines:** Chỉ số and Nhật ký.

---

## C. Tracking

| DV | Depends on | Changes plan task | Demo reference |
|---|---|---|---|
| DV-1 | — | 5 (values) | 02 `?opt=a` |
| DV-2 | DV-1 | 6, 22 | 03 `?opt=a` |
| DV-3 | DV-1 | 11 | 01 `?opt=a` (and the catalogue) |
| DV-4 | DV-3 | 12 | 04 `?opt=c` |
| DV-5 | DV-1 | 15, 35a | 05 `?opt=a` |
| DV-6 | DV-3 | 11, 13, R14 | 06 `?opt=a` |
| DV-9 | DV-2, DV-3 | 22 | 07 `?opt=a&mode=done` |
| DV-7 | DV-2 | 31 | 09 `?opt=a` |
| 25–28 | DV-3, DV-6, DV-9 | 25–28 | 07 `?mode=running`, `?mode=trace` |
| DV-10 | DV-2 | 33, R27 | 10 `?opt=b` |
| DV-11 | DV-1 | 31 | 11 `?opt=a` |
| DV-8 | DV-1 | 23, 24 | 08 `?opt=a` |

Task 35a's sweep and Task 36's baselines run after all of the above.
