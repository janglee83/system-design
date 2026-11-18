# Audit of our current UI

This audit covers commit `9be2052` on `origin/feat/app-lab`. The build is a production build
(`next build` then `next start`) inside the dev container, using a separate checkout
(`.worktrees/preview`, project `sdpreview`). The screenshots were taken by Playwright with an
untracked spec (`e2e/zz-shots.spec.ts`).

The audit compresses the screenshots to WebP and keeps them in `docs/design/audit-shots/`. These
are our own UI. The repo ignores `*.png`.

| Screen | Light | Dark |
|---|---|---|
| Lab, empty, VI | `lab-empty-vi-light.webp` | `lab-empty-vi-dark.webp` |
| Lab, empty, EN | `lab-empty-en-light.webp` | `lab-empty-en-dark.webp` |
| Lab, 5-node design, VI, 1440 | `lab-design-vi-light.webp` | `lab-design-vi-dark.webp` |
| Same at 1280 / 1920 | `lab-design-vi-light-1280.webp`, `-1920` | `lab-design-vi-dark-1280.webp`, `-1920` |
| Inspector: web server / LB | `lab-inspector-vi-light.webp`, `lab-inspector-lb-vi-light.webp` | `…-dark.webp` |
| Design settings (nothing selected) | `lab-designsettings-vi-light.webp` | `…-dark.webp` |
| Problems popover | `lab-problems-vi-light.webp` | `…-dark.webp` |
| Home `/vi` (renders the Lab) | `home-vi-light.webp` | `home-vi-dark.webp` |
| Learn / Challenges / Leaderboard | `learn-vi-light.webp`, `challenges-…`, `leaderboard-…` | `…-dark.webp` |
| Mobile 390 px | `lab-mobile-vi-light.webp` | `lab-mobile-vi-dark.webp` |

**States that do not exist yet** and could not be captured: running, playback, results,
verdict, loading skeleton, engine error, onboarding.

**Measured (1440×900)**

- Chrome is a 41 px top bar plus no toolbar. The palette is 256 px, the canvas 864 px and the
  inspector 320 px.
- Nodes are 184×76 cards. The type scale is 11, 12, 13, 14, 16, 18, 22, 28 and 36 px, which is
  9 steps; on screen 11–13 px dominates. The fonts are Be Vietnam Pro and JetBrains Mono. The
  control height is 26–28 px.

## Scores (completeness sheet, 0–3)

| # | Area | Score | Evidence |
|---|---|---|---|
| 1 | Visual identity | **0** | The nodes are generic React Flow cards with a 16 px Lucide icon. Nothing is recognisable without the "SD Lab" wordmark. The teal accent is the only identity cue. |
| 2 | Hierarchy | **1** | Node titles (13/600), subtitles (11) and footers (11 mono) are all small and close together. The panel headings are 11 px uppercase letter-spaced, quieter than the field labels they head. There is no screen title. |
| 3 | Density / rhythm | **1** | The palette is 256 px wide but holds 4 one-line items, leaving 90 % of it empty. The inspector is 320 px, and its labels truncate ("Tổng số yêu cầu mỗi g…", "Chi phí ước tính mỗi t…"). The canvas has the least room of the three. |
| 4 | Primary action | **0** | There is no Run button. Nothing on the screen is accent-filled. The most prominent item at the bottom is the "Không có vấn đề" pill. |
| 5 | States | **1** | The empty state is one grey line in the canvas centre. The empty Learn page says "Dưới đây là lộ trình…" ("below is the roadmap"), but nothing is below it. There is no loading skeleton, and no designed error. |
| 6 | Feedback | **2** | Toasts work, the add action is announced, and problems update live. Invalid connections are refused with a message, but only after the drop. |
| 7 | Motion | **0** | The only motion is an overload pulse that cannot be reached yet. Panels snap open, and nodes appear without entering. |
| 8 | Microcopy | **2** | The Vietnamese is natural and consistent ("Chưa có sự cố nào. Lần chạy sẽ yên ổn."). Two lapses: the `$/tháng` unit sits after the number in a mono font ("23 $/tháng"), and the field labels are too long for their column. |
| 9 | Onboarding | **0** | None. A new user sees an empty canvas, 4 items and a 20-field form. |
| 10 | Keyboard / a11y | **2** | Strong work: aria text, keyboard move, focus rings and an announcer. Weak points: state relies on 1.5 px tinted borders, the minimap is decorative, and 26 px targets are near the 24 px minimum. |
| 11 | Perceived performance | **2** | The shell paints immediately and the engine chip shows status. Without a run, the run-start feedback cannot be judged. |
| 12 | Consistency | **2** | Tokens are used throughout, and light and dark are designed as a pair. The legend, engine chip, controls and minimap are four floating islands with four styles of shadow and radius. |
| 13 | Delight | **0** | None yet. |
| | **Total** | **13/39** | The reference product scores 21/39. |

## Gaps, ranked by impact

Impact means how much the gap contributes to the owner's verdict ("nhìn xấu"), weighted by how
many screens it touches.

1. **No visual identity on the canvas.** The nodes are plain cards, and the canvas is the
   product's face. The reference product's drawings are its whole personality. Fix: element 1
   (node style).
2. **No primary action, and no app bar for the design.** There is no Run button, no design
   name, no save state and no undo/redo in view. The screen feels like a form, not a tool. Fix:
   element 3 (app shell).
3. **Nothing happens.** There is no running state, no playback, no results and no verdict, so
   the core loop "build → run → see it break" is invisible. Fix: elements 7 and 8; the node
   states are prototyped in element 1.
4. **Type is too small and too flat.** 11–13 px everywhere, 9 scale steps, and section headings
   quieter than the labels under them. Fix: element 2 (type scale with 6 steps, 14 px body
   minimum in panels).
5. **The panel layout wastes room and truncates labels.** A 256 px palette for 4 items, and a
   320 px inspector that cuts every long label. Fix: element 3 (palette 240 → collapsible,
   inspector 360 with stacked label-over-field) and element 5.
6. **Floating canvas furniture is scattered.** The legend (top left), engine chip (top right),
   zoom stack (bottom left), problems pill (bottom centre) and minimap (bottom right) are five
   islands with no system. Fix: element 6. The engine and problems move into a status strip in
   element 3.
7. **Empty states are bare.** The Lab, Learn, Challenges and Leaderboard each show one sentence,
   and Learn promises content that is not there. Fix: element 9.
8. **No onboarding or starter design.** The first run needs a one-click template ("Web 3 tầng").
   Fix: elements 9 and 10.
9. **Weak state encoding.** The busy, overloaded and down states are a 2 px border with a tint
   and a 14 px icon; at 100 % zoom they are hard to tell apart. Fix: element 1 (fill level, ring
   and word label).
10. **Edge rendering artefacts.** Two edges into the same port merge into one oversized
    arrowhead (both web servers into PostgreSQL). PostgreSQL shows an output port though it has
    no valid outgoing kind. The minimap renders nodes as flat bars and is cut off on the left.
    Fix: element 6.

**Smaller items found on the way**

- The problems pill keeps a thick focus ring after a mouse click. It should only show on
  `:focus-visible`.
- At 1440 px the 5-node design does not fit the view: PostgreSQL is clipped at the right edge.
  Fit-view does not run after the design is built.
- The `/vi` home route renders the Lab, so there is no landing page. That is acceptable for
  sub-project 3, but worth deciding.
- At 390 px the layout breaks. The 3 columns overlap, the inspector runs off-screen, the nav
  wraps to 3 lines, and the empty-state text wraps one word per line. The desktop notice is
  right, but an "open on a larger screen" state would be cleaner.
