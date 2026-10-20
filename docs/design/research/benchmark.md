# Benchmark

This document studies the reference product, Syscraft (https://dashboard.syscraft.app), and the
best-in-class tools for each job our Lab has to do. Everything here is written in our own words
and numbers. No code, styles, assets or text were copied.

## How the observations were collected

**Reference product**

- **REA.** We used REA (`rea-agents` 6.7.0 CLI, `capture-browser-scenario`, launch mode, headless
  Chromium 155) on the public pages only, with no login. The page structure and accessibility
  trees are in Evidence records `ev_48878f6f…` (1440 px, dark, vi), `ev_cab1b217…` (1280 px,
  light), `ev_21c9dd46…` (1440 px, light) and `ev_6ba5aac5…` (1920 px, light).
  - Signed out, `/`, `/lab`, `/leaderboard` and `/workspace/*` redirect to `/login`.
  - `/learn`, `/lessons/*`, `/concepts` and `/challenges` are public.
- **Playwright MCP browser.** We used it in the owner's signed-in session, following the owner's
  rules: run, view results and playback, with no settings, billing or delete actions.
  - We took measurements with `getComputedStyle` and `getBoundingClientRect`.
  - We recorded the run flow as timed frames at 150, 400, 800, 1500, 2500, 4000 and 6000 ms
    after pressing Run.
- **Earlier owner screenshots.** We also used the earlier screenshots in `.playwright-mcp/*.png`
  (lab1–9, ws1–5, s1–4, vi-dark, concepts, runopts).
- **Where the screenshots are.** Our new reference screenshots are kept outside the repo, in the
  session scratchpad folder `syscraft-shots/`. The files are:
  - `lab-{1280,1440,1920}-current.png`
  - `run-t{150…6000}.png` and `run-end.png`
  - `workspace-{1280,1440,1920}-dark-vi.png`
  - `lesson-1440-dark-vi.png`, `concepts-1440-dark-vi.png`, `challenges-1440-dark-vi.png` and
    `leaderboard-1440-dark-vi.png`
  - `rea-*-{1280,1440,1920}-light-en.png` and `rea-*-1440-dark-vi.png`

**Measured numbers (Lab, 1440×900, dark)**

| Thing | Value |
|---|---|
| Top bar height | 48 px |
| Lab toolbar height | 48 px; two stacked bars make 96 px of chrome |
| Palette width | 224 px |
| Inspector / results width | about 360 px |
| Bottom tab strip | 40 px collapsed |
| Buttons | 32 px (top bar) and 36 px (toolbar); radius 4–6 px |
| Palette rows | 57 px tall (36 px logo tile + name + category) |
| Type, by element count | 14/400 ×126, 12/400 ×119, 14/500 ×45, 12/600 ×19, 12 mono ×39, 24/600 ×1 (page title) |
| Font families | system-ui with ui-monospace; no brand typeface |
| Spacing, by frequency | 8 px ×136, 16 ×67, 12 ×54, 4 ×52, 6 ×43, 3 ×28. Mostly a 4 px grid, with stray 3 and 6 |
| Colour roles (dark) | page about #101113; surface about #1F2125 / #292C31; text #ECEDEF / #B1B5BD / #969BA5; accent blue about #6CA8FF; success green about #6CCB98; upgrade button saturated yellow |
| Transitions | 160 ms ease-out on background, border and colour; no panel motion; the run uses frame-driven dots |
| Node footprint | an illustration about 208×179 px at 125 % zoom (about 165×140 at 100 %); label and kind sit below the drawing, outside any box |

**Run flow, timed**

1. **0–150 ms.** Run dims to a pressed state, and the toolbar status reads "Đang chạy trên
   server…". Edges become dashed and animated.
2. **About 400 ms.** A floating chip at the top centre reads "Đang chuẩn bị mô phỏng · tính lưu
   lượng trên server". The canvas does not change yet.
3. **About 1.5 s.** The layout switches to a run view:
   - The palette hides and the canvas becomes wider.
   - Load balancer replicas split into one drawing per instance inside a dashed group box,
     with a group label ("Load Balancer 1 · 2 instances").
   - The database becomes a Primary plus a Replica.
   - Every node gains a mono stat chip ("10 in flight · 14% busy").
   - Edges gain rate chips ("R 80/s · W 480/s").
4. **About 1.5–11 s.** Playback runs:
   - A bottom transport bar with play/pause and step controls, the time "03.515 s / 11.000 s",
     the current request, and speeds of 0.25×, 0.5×, 1× and 2×.
   - A timeline strip with one dot per sampled request.
   - The right panel lists 20 of the 24,000 requests. Picking one highlights its path.
5. **End.** The run auto-switches to the results panel:
   - The workload as a monospace paragraph.
   - "24,000 request đã mô phỏng".
   - A metric list (p95 37 ms, availability 100.00 %, and so on).
   - Buttons for timeline, log, replay and run again, plus a full-width "Tiếp tục chỉnh sửa".

---

## The reference product, element by element

| Element | Does well | Does badly |
|---|---|---|
| **Canvas** | Dark dotted grid, calm. Auto-fit and auto-layout are one click away. | The zoom bar (bottom left) and the legend (bottom right) collide at 1440 px: the legend overlaps the zoom bar in run view (`run-t4000.png`). Nodes can be dropped on top of each other with no nudge (owner's `lab2.png`). |
| **Nodes** | A strong signature. Each kind is an isometric line drawing (laptop, rack, server trio, cylinder), so the diagram reads like a whiteboard sketch. Run view splits replicas into separate drawings. | The drawings are large (about 165×140 px), so a 6-node design already fills the canvas. The label sits outside the drawing with no container, so the selection ring wraps only the drawing. Branded logos at full colour fight the monochrome line art. State is shown only by a red tint and a small chip; "busy" is hard to see. Long labels wrap ("Load Balancer 1 / #1"). |
| **Top bar + toolbar** | Run is a filled split button at the far right, and it is always visible. Undo and redo sit next to Save. | Two 48 px bars stack up. The top bar carries 10 items, including a "continue" pill whose label wraps onto two lines ("Tiếp / tục"), a run-quota meter, a yellow upgrade button that is louder than Run, search, language, theme and profile. Nav items are cut off ("Bảng xếp hạ…") at 1440 px. "Nhóm" overlaps the help icon (`lab2.png`). |
| **Palette** | Every item has a logo, a name and a category. There is a filter. | 25+ items in one long scroll, in a mix of English and Vietnamese ("Generic", "Bên thứ ba"). Brand logos at mixed weights. No description or price before adding. |
| **Inspector** | Sections can collapse, with a summary line when collapsed ("Mode: single · Read replica: 0"). Steppers have −/+ and a help "?" per field. | Labels are long, so the value column is narrow. Field names mix languages ("Concurrency", "Pool kết nối"). |
| **Run feedback** | Rich: request dots, per-node stat chips, rate chips on edges, a replay timeline and per-request tracing. | Very noisy. Mono chips on every node and edge at once, and the dashed group boxes, compete with each other. The results panel opens with a long monospace dump of every workload parameter, before any verdict. Requests are listed by number ("#8220"), which means nothing to a learner. |
| **Results / verdict** | In challenges: a modal with stars, a score (25/100), "Chưa đạt" and a "where did it break?" quiz. A goal checklist shows target vs measured. | Stars and a score out of 100 send two different signals. The modal blurs the design you need in order to understand the failure. |
| **Learn pages** | A list on the left and a detail on the right. The difficulty badge shows a 3-bar meter plus a word. A step list with "Quan sát / So sánh / Phân tích / Kiểm tra". | Mono labels for step types look like code. Big empty areas on lesson pages (`lesson-1440-dark-vi.png`: the content uses about 50 % of the height). Concept cards repeat their tags 2–3 times. |
| **Challenge pages** | Problem, goals and a starting-architecture sketch above the fold. Each mode has its own budget. | A wall of goals and modes. The starting sketch uses a different, boxy style from the Lab drawings. |

Score on our completeness sheet: identity 3, hierarchy 1, density 1, primary action 2,
states 2, feedback 2, motion 2, microcopy 1, onboarding 1, a11y 1, perceived performance 2,
consistency 1, delight 2. **Total 21/39.** It is a strong idea that was built quickly. The
signature drawings carry it, and the chrome and copy drag it down.

---

## Best-in-class patterns per element

### Canvas and nodes

- **Figma / FigJam.** Objects show a hover outline before selection, and the selection handles
  sit outside the object. Multiplayer cursors give a sense of life.
  - *We take:* hover is a quiet outline, selection is a thick accent ring outside the node, and
    nothing on the canvas moves when you select something.
- **tldraw and Excalidraw.** Hand-drawn shapes give the product its identity at very low visual
  cost. Excalidraw keeps the line weight constant at any zoom.
  - *We take:* a drawn identity can stay small if the strokes are thin and uniform. Our
    illustrations should be line art at a consistent 1.5 px stroke.
- **Eraser.io.** Architecture diagrams with a cloud-provider icon inside a soft rounded card. The
  label is always inside the card, and groups are tinted regions, not dashed boxes.
  - *We take:* keep the label inside the shape, so selection, hover and state wrap one object.
- **draw.io.** It is a counter-example: every style option is exposed, and it shows how quickly
  a diagram becomes noisy.
  - *We take:* very few node variations, all driven by state.
- **React Flow showcases** (for example the workflow-builder templates). Compact cards of about
  220×72 with a coloured left rail for the category and status badges in the top-right corner.
  - *We take:* a dense card is the readable option for 10+ nodes.

### Toolbar, shell and the primary action

- **Vercel dashboard.** One 56–64 px bar, the project name as a breadcrumb, and one high-contrast
  primary button. The deployment status sits right next to the name.
  - *We take:* name + status + Run in one bar. No second bar.
- **Linear.** Very little chrome. Commands live behind ⌘K, and the top bar shows only context.
  - *We take:* move rare actions (auto-layout, snap, group) into a ⌘K command list and the
    canvas floating bar.
- **GitHub Codespaces / VS Code.** A status bar along the bottom for engine state, problems
  count and cursor position.
  - *We take:* engine version and problems belong in a 28 px status strip, not as floating
    chips on the canvas.

### Run feedback, metrics and results

- **Grafana and Datadog.** A sparkline beside every number, a red threshold line, and a time
  cursor that scrubs every panel at once.
  - *We take:* a run is a timeline. Node state, the edge rate and the metric panel all follow
    one scrubber.
- **Datadog service map.** Nodes are coloured by health, edge thickness shows request rate, and
  you hover for p95.
  - *We take:* encode load in the node fill level and the edge weight, and show the numbers on
    hover or when a node is selected, not on every node at once.
- **Vercel deployment.** A build log streams, and a short verdict line with a coloured dot
  appears at the end.
  - *We take:* the verdict comes first ("Đạt 4/5 mục tiêu"), and the details follow.

### Learning pages and challenges

- **Brilliant.** One idea per screen, with a big interactive figure and a single "Continue"
  button. Progress is a thin bar at the top.
- **Exercism.** Each track lists exercises with clear status chips (locked, available, in
  progress, completed), plus mentoring.
- **Codecademy.** A split view with instructions on the left and the workspace on the right. A
  checklist of goals ticks live while you work.
- **Khan Academy.** A mastery level per skill, and energy points as quiet delight.
- *We take:*
  - challenge goals as a live checklist next to the canvas (Codecademy);
  - one step per screen in lessons, with a big figure (Brilliant);
  - a status chip vocabulary used everywhere (Exercism).

---

## What we take, in our own words

1. **Signature with restraint.** Our components get their own drawn identity. They are compact
   and stay readable at 10+ nodes, and the label lives inside the shape.
2. **One bar, one primary action.** Design name, status, undo/redo and **Run** go in one bar.
   Nothing else on the screen is accent-filled.
3. **State is a shape change, not just a colour.** The fill level shows load, the ring and
   icon show the state, and a word label covers accessibility.
4. **Numbers appear when asked.** Hover or selection reveals detail. The canvas shows only what
   is wrong.
5. **Verdict first.** Results lead with pass or fail and the goals. The parameters live behind
   a disclosure.
6. **One language at a time.** Every label on the screen is Vietnamese when the locale is `vi`.
