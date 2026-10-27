# System Design Lab: design system v2

This is the build reference for the chosen direction:

- **1A** illustrated node tiles
- **2A** Giấy & Mực (paper and ink) colours and type
- **3A** one bar with one Run button
- **4C** category rail plus drawer
- **5A** collapsible inspector sections
- **6A** curved typed edges with one controls cluster
- **7A** verdict on the canvas
- **8A** tabbed bottom panel
- **9A** illustrated states with templates
- **10B** first-run checklist
- **11A** learning path

Everything needed to build is here or in a file this document links. The live references are the
demos in `docs/design/demos/` (open with `python3 -m http.server` from that folder). Where a demo
and this document disagree, this document wins.

Owner choices and the product defaults are in `decisions.md`. The task list is in
`build-tasks.md`.

**Conventions**

- Token names keep the app's existing `--sd-` prefix (`apps/web/src/ui/tokens.css`).
- Pixel values are CSS px at 100 % zoom.
- Vietnamese copy is the source text. English follows `messages/en.json`.

---

## 1. Tokens

### 1.1 Colour roles (2A · Giấy & Mực)

Light values go on `:root`, dark values on `[data-theme="dark"]`. **Bold** marks a change from
today's `tokens.css`.

| Token | Light | Dark | Use |
|---|---|---|---|
| `--sd-bg` | **`#F3F1EB`** | **`#0E1215`** | app background, docked panels |
| `--sd-canvas` | **`#F9F7F2`** | `#0B0F12` | canvas background |
| `--sd-grid` | **`#D8D2C4`** | **`#1E262D`** | canvas dot grid (1 px dots, 20 px pitch) |
| `--sd-surface` | `#FFFFFF` | **`#151B20`** | cards, nodes, inputs, menus, bars |
| `--sd-surface-2` | **`#F4F1EA`** | `#1B2329` | hover rows, inactive fills |
| `--sd-surface-3` | **`#EAE6DC`** | **`#232D35`** | pressed, tracks, neutral chips |
| `--sd-border` | **`#E1DCD0`** | **`#283239`** | dividers, card borders |
| `--sd-border-strong` | **`#8A8374`** | **`#5F6C78`** | input borders, dashed states (≥ 3:1) |
| `--sd-text` | **`#191C20`** | `#E8ECEF` | primary text |
| `--sd-text-2` | **`#474C54`** | **`#B2BCC5`** | secondary text, labels |
| `--sd-text-3` | **`#61666E`** | **`#8E99A4`** | captions, hints (≥ 4.5:1 on surface and bg) |
| `--sd-accent` | **`#0B6870`** | **`#3FC3CB`** | the one primary action (Run), progress, selection |
| `--sd-accent-hover` | **`#08545B`** | **`#66D2D8`** | hover on accent |
| `--sd-accent-soft` | **`#DDEEEE`** | **`#0F3438`** | valid-target halo, current item fill |
| `--sd-accent-text` | **new** `#0B6870` | **new** `#5BD0D7` | accent used as text, outlines and focus |
| `--sd-on-accent` | `#FFFFFF` | **`#041A1C`** | text on accent |
| `--sd-ok` / `--sd-ok-soft` | **`#1D7849`** / **new** `#DDF1E5` | **`#4CC68B`** / **new** `#12301F` | stable, goal met |
| `--sd-busy` / `--sd-busy-soft` | **`#9A5A00`** / **`#FBEED5`** | **`#F2AA3E`** / **`#34270F`** | busy text / fill |
| `--sd-busy-line` | **new** `#C47A0A` | **new** `#F2AA3E` | busy borders, gauges, charts (≥ 3:1) |
| `--sd-over` / `--sd-over-soft` | **`#BF3328`** / **`#FBE2DE`** | **`#FF6F62`** / **`#3B1916`** | overloaded, goal failed, errors |
| `--sd-down` / `--sd-down-soft` | **`#5E636D`** / **`#ECECEE`** | **`#848D98`** / `#1D232A` | down, disabled state |
| `--sd-edge-http` | **`#2F5FD0`** | **`#7C9DFF`** | HTTP edges (solid) |
| `--sd-edge-db` | **`#7F44C4`** | **`#BB94F5`** | database edges (dash 7 4) |
| `--sd-edge-cache` | **`#0B8460`** | **`#45CC9E`** | cache edges (dash 2 4) |
| `--sd-edge-msg` | **`#B8387D`** | **`#F07FBB`** | message edges (dash 9 4 2 4) |
| `--sd-scrim` | `rgb(10 14 18 / .55)` | `rgb(0 0 0 / .6)` | dialogs, spotlight |

**Category accents.** These replace `--sd-cat-general`, `--sd-cat-compute` and `--sd-cat-data`.
They tint illustrations and tiles only. Nothing else uses them.

| Token | Light | Dark | Kinds |
|---|---|---|---|
| `--sd-cat-entry` | `#4F57C9` | `#9AA2FF` | client, mobile, dns, cdn, api-gateway, lb, rate-limiter |
| `--sd-cat-compute` | `#2C66C7` | `#79A6FF` | web-server, worker, scheduler |
| `--sd-cat-data` | `#7542B3` | `#BE97F6` | postgres, read-replica, kv-store, search |
| `--sd-cat-cache` | `#0B7A6E` | `#45CFB8` | redis, memcached |
| `--sd-cat-msg` | `#B0397A` | `#F07FBB` | queue, rabbitmq, stream |
| `--sd-cat-storage` | `#3D6C8A` | `#8DB8D6` | object-storage |
| `--sd-cat-external` | `#5D6470` | `#A3ABB6` | third-party |

**Contrast pairs.** Extend `tokens.test.ts` to check these:

- At 4.5:1: `text`, `text-2` and `text-3` on `surface` and `bg`; `accent-text` on `surface`;
  `on-accent` on `accent`; `ok` on `ok-soft`, `busy` on `busy-soft`, `over` on `over-soft`,
  `down` on `down-soft`; `canvas` (badge text) on `over`.
- At 3:1: `border-strong` on `surface`; `edge-*` on `canvas`; `busy-line` on `surface`.

All pass. Demo 02 computes them live.

### 1.2 Type

| Fonts | Value |
|---|---|
| UI | **Be Vietnam Pro** 400/500/600/700, bundled from `@fontsource/be-vietnam-pro` |
| Numbers | **JetBrains Mono Variable** with `font-variant-numeric: tabular-nums` |

Six steps replace today's nine:

| Role | Size / line height | Weight | Use |
|---|---|---|---|
| `display` | 28/36, −0.01em | 700 | page titles (Học, Thử thách), lesson title |
| `title` | 20/28 | 600 | dialog titles, verdict on a page, inspector live headline |
| `heading` | 16/22 | 600 | inspector title, card titles, section titles on pages |
| `body` | 14/20 | 400–600 | default UI text, node name (600) |
| `label` | 13/18 | 500 | field labels, tabs, buttons, section headers (600) |
| `caption` | 12/16 | 400 | hints, meta lines, node detail lines (never below 12) |
| `mono` | 12–22 | 500–600 | numbers: costs, rates, times, metric values (KPI 20/26) |

Reading pages (lessons) use 16/26 body text.

Section headers are sentence case at 13/600, not uppercase. The uppercase 11 px labels are
retired.

### 1.3 Space, size, radius, shadow

- **Spacing.** A 4 px grid. Steps: 2, 4, 6, 8, 10, 12, 14, 16, 20, 24, 28, 32, 48.
- **Control heights.** 32 is the default (buttons, inputs, steppers, selects). 36 is for the
  Run button and Stop. 28 is for pills, chips and dense rows. 24 is the minimum target.
- **Radii.** `--sd-r-xs` 4, `--sd-r-sm` 6 (inputs, buttons), `--sd-r-md` 8 (menus, popover rows,
  chips), `--sd-r-lg` 12 (nodes, cards, popovers), `--sd-r-xl` 16 (dialogs, result cards). Pills
  are 999.

| Shadow | Light | Dark |
|---|---|---|
| `--sd-shadow-1` | `0 1px 2px rgb(25 28 32/.06), 0 1px 1px rgb(25 28 32/.04)` | `0 1px 2px rgb(0 0 0/.5)` |
| `--sd-shadow-2` | `0 6px 16px rgb(25 28 32/.08), 0 2px 4px rgb(25 28 32/.05)` | `0 8px 20px rgb(0 0 0/.45)` |
| `--sd-shadow-3` | `0 18px 40px rgb(25 28 32/.16)` | `0 18px 44px rgb(0 0 0/.6)` |

Every raised surface also keeps a 1 px `border`.

### 1.4 Motion

| Token | Value | Use |
|---|---|---|
| `--sd-ease-out` | `cubic-bezier(.2,.8,.2,1)` | entering, state change |
| `--sd-ease-in` | `cubic-bezier(.4,0,1,1)` | leaving |
| `--sd-t-fast` | 120 ms | hover, press, port reveal |
| `--sd-t-panel` | 200 ms | panels, drawer, popovers, theme switch |
| `--sd-t-overlay` | 320 ms | dialogs, spotlight move |
| load fill | 600 ms ease-out | node water level, gauges |
| overload breathe | 1.6 s loop | overloaded node halo |

Under `prefers-reduced-motion: reduce`:

- all durations become 0;
- the breathe animation becomes a static 3 px halo;
- request dots are not drawn (edges keep their rate pills);
- the live dot does not pulse.

Listen for changes with `matchMedia(...).addEventListener("change")`. Reading the setting once at
start-up is not enough.

### 1.5 Focus

- **Everything focusable:** `outline: 2px solid var(--sd-accent-text); outline-offset: 2px`, on
  `:focus-visible` only. A mouse click never leaves a ring; today's problems pill does.
- **Nodes:** a dashed 2 px `accent-text` outline with a 7 px offset, so focus looks different
  from selection (solid, 3 px offset).
- **Inverse surfaces** (the dark demo bar, tooltips): use `#7FD3D8`.

---

## 2. App shell (3A)

The grid, top to bottom: top bar 56 · main row · playback bar 52 (only when a run exists) ·
bottom panel (8A, resizable) · status strip 28.

The main row, left to right: palette (4C) · canvas · inspector (5A, 368, resizable 320–480).

### 2.1 Top bar (56 px, `surface`, bottom `border`)

The top bar holds these items, left to right:

1. **Brand.**
   - The mark is a 26×26, r 7, `accent` square with a three-node glyph in `on-accent`.
   - The wordmark is "SD Lab", 15/700.
2. **Nav.** Lab · Học · Thử thách · Bảng xếp hạng.
   - Each tab is 14/500 `text-2` with 6×10 padding and r-sm.
   - The current tab is `text` on `surface-2` with `aria-current="page"`.
3. **Separator.** 1×20, `border`.
4. **Design name.** 14/600, ellipsis, minimum 150 px wide.
   - Below it is a save line, 12 `text-3`, after a 6 px dot.
   - The save line reads "Đã lưu trên trình duyệt này · 2 phút trước". The wording follows
     default 4; never say "đã lưu vào tài khoản".
   - Clicking the name renames the design.
5. **Flexible space.**
6. **Undo / Redo.** 32×32 ghost icon buttons, with tooltips that include the shortcut.
7. **Separator.**
8. **Problems pill.** 28 high, r-full, 12.5/500.
   - With no problems: `ok-soft` / `ok` with a check icon, "Không có vấn đề".
   - With problems: `over-soft` / `over` with an alert icon, "N vấn đề". It opens the problems
     popover.
9. **Theme, Language (VI), Help.** 32×32 ghost buttons.
10. **Run split button** (below).

**Responsiveness.** At 1400 px or less, Language and Help move into the Help menu, the ⌘↵ chip
hides, and nav padding drops to 6×8.

### 2.2 Run button: the only accent-filled control in the Lab

The Run button is 36 high and r-sm. It is in two parts:

- **The main part** (`.go`) has 12/14 padding. It holds a play icon, "Chạy mô phỏng", and a
  ⌘↵ kbd chip (mono 11, 16 % `on-accent` background).
- **The menu part** (`.more`) is 32 wide with a chevron. It opens the run settings popover
  (duration, seed, faults summary, a link to the design settings).

Its states:

| State | Look | Behaviour |
|---|---|---|
| Ready | `accent` / `on-accent`, `shadow-1` | ⌘↵ or a click starts a run |
| Hover / pressed | `accent-hover` / pressed one step darker | — |
| Disabled | `surface-3` / `text-3`, `aria-disabled="true"` (stays focusable) | Its tooltip gives the reason: "Thêm Người dùng và một máy chủ để chạy", "Còn N vấn đề cần sửa", or "Bộ mô phỏng đang khởi động" |
| Running | The whole split button is replaced in place by a progress block and **Dừng**. The progress block is 168 wide: "Đang chạy" in 12 `text-2` and "4,2 / 10 giây" in mono 12/600, over a 4 px track (`surface-3`, `accent` fill). **Dừng** is 36 high, a secondary button with a `border-strong` 1 px border and a stop icon. A 2 px `accent` line also grows along the bottom edge of the top bar. | Esc or Dừng stops the run |
| Done | Back to Ready. The design name's save line reads "Lần chạy #3 xong · vừa xong". | — |

There is no run counter or quota (default 6).

### 2.3 Status strip (28 px, `surface`, top `border`, 12 `text-3`)

The status strip shows, left to right:

- the engine state: "Bộ mô phỏng 0.1.0 sẵn sàng" with a 6 px `ok` dot, "đang khởi động…", or
  "lỗi" in `over`;
- "N thành phần · M kết nối".

On the right it shows the total monthly cost (mono) and "Lưu tự động trên trình duyệt này".

The engine chip and problems pill that currently float on the canvas move here and into the top
bar.

---

## 3. Palette (4C: category rail plus drawer)

**Rail** (76 px, `surface`, right `border`):

- Seven buttons, 66×52 minimum, r-md, stacked with 6 px gaps and 12 px top padding.
- Each holds a 26×26 r 8 tile tinted with the category colour at 12 %, showing the category's
  first kind at 22×16, and a label of 10.5/13, at most 2 lines.
- The labels are: Lối vào, Tính toán, Dữ liệu, Đệm, Tin nhắn, Tệp, Bên ngoài.
- The active button has a `surface-2` fill, `text` colour and 600 weight.
- The buttons form a `role="tablist"` with a vertical orientation.

**Drawer** (260 px, `surface`, right `border`):

- It opens next to the rail. Clicking the active category again closes it, and the rail stays.
- **Header:** the category name 15/600, its description 12.5 `text-3`, and a search field
  (34 high, r-sm, `surface-2`, "Tìm thành phần ⌘K").
- **Search:** typing searches all categories without accents ("bo nho dem" finds both caches).
  Results show grouped with the category headers. ⌘K focuses the search and opens the drawer.
- **Rows** (grid 40 / 1fr / auto, padding 8×6, r-md, hover `surface-2`):
  - the art tile is 40×40, r-sm, tinted 10 %, with the art at 32×24;
  - the name is 14/600;
  - the description is 12 `text-3`, clamped to 2 lines;
  - the price is mono 12 `text-2` ("25 $"; the client shows "0 $").
  - Ready kinds come first. A row can be dragged to the canvas; Enter adds it at a free spot and
    announces the add.
- **Coming-soon rows** (default 1, disabled):
  - `aria-disabled="true"`, still focusable;
  - the name and description are `text-3`, and the tile is at 55 % opacity;
  - a "Sắp có" pill (10.5/600, `surface-3`) follows the name; there is no price;
  - they cannot be dragged.
- **Hover/focus card** (300 px, r-lg, `shadow-3`, a pointer on the left):
  - a header with a 56×44 tile, the name and the category;
  - the description;
  - a definition list: Trạng thái, Giá, Nhận nối (the accepted edge kinds);
  - for coming-soon kinds, a `surface-2` note: "Chưa kéo vào khung vẽ được. Bài học dùng loại
    này sẽ mở khi bộ mô phỏng hỗ trợ."
  - It opens after 300 ms of hover, or straight away on focus.
- **Challenge restrictions:** kinds a challenge does not allow use the same disabled styling,
  with a lock pill, and the hover card says "Thử thách này không cho dùng…".

**Running:** the drawer closes and the rail stays at 64 px. Adding is blocked during a run, and
the rail buttons show the tooltip "Dừng lần chạy để thêm thành phần".

The data is one catalogue: `{ kind, labelKey, category, status: "ready" | "planned" | "later",
price? }`, read from the engine `meta()` plus a planned list (`content/curriculum.json →
engine.planned.components`).

---

## 4. Inspector (5A)

The inspector is 368 px wide by default and resizable from 320 to 480 (Task 35a's
`PanelResizer`). It uses `surface` with a left `border`.

### 4.1 Layout

- **Header:** padding 14×16, bottom `border`, grid 44 / 1fr / auto.
  - The tile is 44×44 r-md, category tinted 10 %, with the art at 34×26. Nothing selected shows
    a layout icon.
  - The editable name is 16/600 and shows a 1 px `border` on hover.
  - The subline is "Máy chủ web · Tính toán", 12 `text-3`.
  - A collapse-panel button sits on the right.
- **Sections:** an accordion.
  - The header is 13/600 with a 14 px chevron (rotated −90° when closed) and 12×16 padding.
  - A **closed** section shows a one-line summary on the right, 12 `text-3`, ellipsis, max
    190 px. For example "1 vCPU · 2 GB · ×2" or "Theo tham số thế giới".
  - The body has 0×16×16 padding and a 12 px gap between fields.
  - Open/closed state is remembered per kind in this browser.
- **Fields:** the label sits **above** the control and never truncates, so long Vietnamese labels
  wrap.
  - Label 13/500 `text-2`, then 6 px, then the control.
  - Two short numeric fields may share a row (two columns, 10 px gap).
  - A hint goes under the control: 12/16 `text-3`, explaining the number. For example "Cả nhóm
    chịu khoảng 18.000 yêu cầu/giây".
- **Controls:**
  - Stepper: 32 high, 1 px `border-strong`, r-sm, with 32 px −/+ cells on `surface-2`, the value
    in mono 14/500 centred and a unit suffix in 12 `text-3`.
  - Select: 32 high with a trailing chevron.
  - Toggle: 36×20.
  - A changed world parameter gets a 3 px `accent` bar on its left and a reset button.
- **Footer:** padding 12×16, top `border`. Secondary actions sit on the left; Xoá is a danger
  button on the far right.

### 4.2 The three contents

1. **Node selected:**
   - Cấu hình (the engine `configFields`);
   - Chi phí mỗi tháng (mono 22/600, with the breakdown line "2 máy × 22,5 $ …");
   - Kết nối (in and out rows: an edge swatch, the other node, the kind);
   - Nâng cao (overrides, closed by default).
   - Footer: Nhân bản, Xoá.
   - A locked node also shows a notice row "Thử thách đã khóa thành phần này…", and its controls
     are disabled.
2. **Nothing selected (the design):**
   - Lưu lượng (preset, profile, base rps, write ratio, clients, timeout, arrivals, surge);
   - Thiết lập lần chạy (duration, seed);
   - Sự cố (fault cards: kind in 600, time in mono, target in 12 `text-3`; buttons "+ Thêm sự
     cố" and "Sự cố ngẫu nhiên").
   - Footer: Xuất thiết kế.
3. **Running or after a run, with a node selected:**
   - Ngay lúc này · giây t: a 76 px ring gauge in the state colour, the load % in mono 24/600,
     the state words and instances up, and a 2×2 KPI grid (Yêu cầu/giây, p95 tại đây, Đang chờ,
     Bị từ chối) on `surface-2` r-md;
   - Độ bận theo thời gian: a 64 px chart with dashed 70 % (`busy-line`) and 100 % (`over`)
     lines and the playback cursor;
   - Sự kiện của thành phần này.
   - Footer: "Theo một yêu cầu qua đây".

---

## 5. Node tile (1A)

See `illustration-grammar.md` for the drawing rules. The production assets are in
`assets/nodes/`.

**Size.** 172 × 148. The tile has a `shadow-1` (`shadow-2` on hover), r-lg and a 1 px `border`.

**Art band** (84 high, top radius r-lg):

- the background is the category colour at 7 % over `surface`;
- the illustration is 76×57, centred, `color: var(--sd-cat-*)`;
- the replicas badge "×2" (mono 11/600, `surface-3`, r-xs) sits top-left at 8,8;
- the state chip (icon plus word, 12/600, pill) sits top-right at 8,8, only while running and
  only when the state is not stable;
- a load fill rises from the bottom with a height of `min(load, 100)%`, in the category colour
  at 16 %.

**Body** (padding 8/12/10; the top border is the category colour at 22 % mixed into `border`):

- line 1: the name, 14/600, ellipsis;
- line 2: the configuration ("1 vCPU · 2 GB") while editing, or the live line ("12.000/giây",
  "Từ chối 2.000/giây", "Ngừng từ giây 3") while running, 12 `text-2`;
- line 3: mono 12 `text-3`. While editing it shows "45 $/tháng" (or "Miễn phí", or "Chưa có
  giá"). While running it shows "**67%** tải", with the percentage in the state colour.

**Replicas.** Two stacked copies of the tile sit behind it, offset +5/+5 and +10/+10, with the
second at 55 % opacity.

**Ports.** A 10 px visible circle (`surface` fill, 1.5 px `border-strong`) at y = 42 on the left
(in) and right (out) edges, inside a **24×24 hit area**.

- Ports show on hover, focus, selection and while connecting.
- Kinds that accept nothing (client, mobile) have no in-port.

**Badges.**

- **Lock:** a 22 px circle outside the top-left corner, `surface-3`, with a lock icon. Its
  accessible name is "Thử thách đã khóa…".
- **Issues:** a 20 px pill outside the top-right corner, `over` with `canvas`-coloured text and
  a 2 px `canvas` ring.

**States.** Every state is shown by more than colour.

| State | Art band | Border / outline | Other |
|---|---|---|---|
| Stable (< 70 %) | category tint plus load fill | 1 px `border` | no chip |
| Busy (70–100 %) | `busy-soft` plus a `busy-line` 30 % fill | `busy-line` | chip "Bận" with a gauge icon |
| Overloaded (> 100 %) | `over-soft` plus 45° hatching (`over` 26 %/14 %, 6 px bands) | `over` plus a 3 px `over-soft` halo that breathes over 1.6 s | chip "Quá tải" with an alert icon; the live line shows rejections |
| Down | `down-soft`, art greyscale at 50 % | dashed `border-strong` | chip "Ngừng chạy" with a power icon |
| Selected | — | 2 px solid `accent-text` outline, offset 3 | `aria-current="true"` |
| Focus | — | 2 px dashed `accent-text` outline, offset 7 | — |
| Locked | — | dashed `border-strong` | lock badge |
| Valid connect target | — | `accent-text` outline plus an 8 px `accent-soft` halo | the in-port grows to 14 px |
| Invalid connect target | opacity .35, greyscale .6 | — | tooltip with the reason |
| Trace on path / off path | — | outline `accent-text` / — | off-path nodes drop to opacity .28 |

**Accessible name.** "Máy chủ web 1, Máy chủ web, Bận 67%, đang chọn, đã khoá, 2 vấn đề".
Include only the parts that apply.

---

## 6. Edges, ports, legend and controls (6A)

### 6.1 Edges

- **Path:** a cubic Bézier from the out-port to the in-port, with control points at
  `max(40, dx/2)` horizontally.
- **Stroke:** 1.8 px in `--sd-edge-<kind>`, with the dash patterns http solid, db `7 4`,
  cache `2 4`, msg `9 4 2 4`. Colour and dash always go together.
- **Arrowhead:** an open chevron, **fixed size** (`markerUnits="userSpaceOnUse"`, 11×11), in the
  kind colour.
- **Selected:** 3 px with a glow (`drop-shadow` of `accent-text` at 50 %, 3 px). A popover below
  the target node shows "Kết nối đang chọn", the source → target, the kind, the delay, and the
  buttons Đảo chiều and Xoá.
- **Running:**
  - HTTP edges stay solid;
  - an edge into an overloaded node turns `over` at 2.4 px;
  - an edge to or from a down node turns `down` at opacity .45;
  - a rate pill sits at the midpoint (mono 12/500, `surface`, 1 px `border`, pill, `shadow-1`):
    a hot edge shows an alert icon in `over`, and a dead edge shows struck-through `text-3`.
- **Width:** there is **no** traffic-weighted width (owner choice 6A plain).

### 6.2 Connecting

1. Dragging from an out-port draws a ghost Bézier: `accent-text`, dashed `5 4`, 2.2 px, with an
   end dot (r 5, `surface` fill, 2 px `accent-text`).
2. While dragging:
   - **valid targets** get the valid-target state plus a tooltip above them (an `accent` pill)
     reading "Thả để nối · Cơ sở dữ liệu";
   - **invalid targets** dim and show an inverse tooltip with the reason, such as "Người dùng
     không nhận kết nối đi vào".
3. A hint pill appears top-centre on the canvas: "Thả vào một thành phần để nối · Esc để huỷ ·
   hoặc bấm C để chọn từ danh sách".
4. **Keyboard:** with a node selected, C opens the connect dialog (it exists, Task 13), which
   lists only valid targets and greys out invalid ones with the reason.

### 6.3 Controls cluster

The controls cluster is one floating bar at the bottom-right of the canvas, 16/14 px from the
edges. It has 3 px padding, r-md, `surface`, a 1 px `border` and `shadow-2`.

It holds, in order:

- − · zoom % (mono 12) · + · Vừa màn hình;
- a separator;
- Sắp xếp gọn · Bám lưới (a toggle, `accent-soft` when on);
- a separator;
- **Chú giải** (an info icon and the label, a toggle).

The legend popover opens above the cluster (250 px). Its title is "Kiểu kết nối trong thiết
kế". Each row has a 30 px line sample, the name, and a count ("3 đường"); unused kinds are
dimmed with "chưa dùng". The popover is closed by default and its state is remembered.

There is no minimap.

The fixed legend card, the engine chip and the floating problems pill all go away.

---

## 7. Run feedback (7A)

### 7.1 While running

- **Live chip** at the top-centre of the canvas: a pill, `surface`, `shadow-2`, 7×14 padding.
  It holds a pulsing 8 px `accent-text` dot, "giây 4,2 / 10" (mono 600), "2 sự kiện", and the
  worst live metric in `over`, such as "p95 đang 184 ms". It is `aria-live="polite"` and
  throttled to one update per second.
- Nodes, edges, rate pills and request dots follow §5 and §6. Request dots are 3.2 r circles in
  the edge kind colour, 4 per edge per 2.4 s. Rejected dots are hollow (`canvas` fill with a
  2 px `over` stroke).
- The palette collapses to the rail and the Run button becomes progress plus Dừng (§2.2).

### 7.2 Playback bar

The playback bar is 52 high, spans the full width under the main row, `surface`, with a top
`border`. It appears once a run exists and replaces the floating run bar in the current plan.

It holds, left to right:

- **Play/Pause:** a 32 px outline button. Space toggles it. It is required (WCAG 2.2.2) because
  playback auto-starts.
- **Current time:** mono 13 `text-2`, "00:04,2".
- **Scrubber** (flex 1):
  - a 2 px `surface-3` line, with the played part in `accent`;
  - event markers as 16 px circles on `surface` with a 1.5 px border in the severity colour and
    an icon inside. Each is focusable and has a tooltip "giây 3,0: Máy chủ web 2 ngừng chạy";
  - a `role="slider"` with arrow keys ±0.1 s, PageUp/PageDown ±1 s, and Home/End.
- **End time.**
- **Speed:** a segmented control of 0,25× · 0,5× · 1× · 2× · 4× (`SPEEDS`), mono 12.

The bar stays after a run ends, for replay.

### 7.3 Verdict (when a run ends)

The verdict is a strip inset 16 px at the top of the canvas: r-lg, `surface`, `shadow-2`, with a
1 px border in the outcome colour at 40 %. Its grid is auto / 1fr / auto with a 16 px gap.

- **Badge and headline:** a 32 px circle (`over-soft` with an × icon, or `ok-soft` with a check)
  and "Chưa đạt · 2/5" or "Đạt · 5/5" at 18/700 in `over` or `ok`. This is the n/N of default 3.
- **Goal chips:** one per goal. Each is 12.5/500 with a 12 px icon and the measured value in mono
  600. Met goals are `ok-soft`/`ok`; failed goals are `over-soft`/`over`. They wrap onto 2 lines
  at most, and at 1280 px or less only the failed goals show, plus "+N đạt".
- **Actions:** **Hỏng ở đâu?** (a primary button with an alert icon; the only accent fill while
  the verdict is open) and **Chạy lại** (secondary, with a retry icon).
- "Hỏng ở đâu?" selects the first failing node, pans it into view, and opens a callout under it:
  280 px, inverse colours (`text` background, `bg` text), r-md, `shadow-3`, a pointer on top.
  The callout has a heading "Đây là chỗ gãy" and one sentence built from the goal reason and the
  node's numbers.
- A design with no goals (free Lab) shows a neutral strip "Lần chạy #3 xong" with the 4 headline
  numbers.
- An optional `score` slot stays hidden in the Lab; challenges (sub-project 5) use it.

### 7.4 Follow a request (Task 28)

- The request's path nodes get the on-path outline. Other nodes drop to .28. Path edges are
  3 px solid `accent-text`; other edges are .18.
- **Trace card** (330 px, top-right of the canvas, r-lg, `shadow-2`):
  - header: "Theo một yêu cầu" with the id in mono;
  - one row per hop, on a 2 px timeline: a 10 px dot in `accent-text`, or `over` for the failing
    hop;
  - each row has "Action · Node" in 600, using the trace action words (Gửi đi, Được xử lý, Bị từ
    chối, Gặp máy đã ngừng), a delta time in mono on the right, and a 12 `text-3` cause line;
  - footer: the outcome in its colour and "Yêu cầu tiếp theo cùng loại".
- `[` and `]` step between hops.

---

## 8. Bottom panel (8A)

This styles the panel that already exists (`apps/web/src/lab/panel/*`). The structure does not
change.

- **Container:** `surface`, top `border`, a 6 px grip (a 36×3 `border-strong` bar at 50 %) that
  resizes from 160 px to 60 % with keyboard ±16 px. The default height is 320.
- **Tab bar:**
  - tabs are 13/500 `text-2`, padding 9×10; the active tab is 600 `text` with a 2 px
    `accent-text` underline;
  - the Sự kiện tab has a count badge (mono 11, `over-soft`/`over`) when there are warnings;
  - on the right: a run selector (28 high pill, "Lần #3 · so với #2", clock icon), export, and
    collapse.
- **Chỉ số:**
  - six KPI tiles (`surface`, 1 px `border`, r-md, padding 10×12): a 12 `text-3` label, the value
    in mono 20/26/600 (`over` when it fails its goal), and a delta line in mono 11.5 ("▲ 146 ms
    so với #2"). The delta is `over` when worse and `ok` when better;
  - four 70 px charts (uPlot), each with a dashed goal line (`over`), event lines (`over` at .5),
    and the playback cursor (`accent-text` 1.5 px).
- **Sự kiện:** rows with time (mono 12 `text-3`), a 20 px severity icon circle, the translated
  message, and a link "Xem trên sơ đồ" in `accent-text` that selects and pans. The row at the
  playback time is highlighted `accent-soft`.
- **Nhật ký:**
  - filter chips (Tất cả · Bị từ chối · Quá hạn · Không tới đích, each with a count);
  - a table with a sticky header (Thời điểm, Yêu cầu, Đường đi, Kết quả, Thời gian);
  - outcome pills in `ok`, `over` or `busy`;
  - clicking a row starts "follow a request".
- **Mô phỏng:** the workload form in 4 columns, using the §4 controls.

---

## 9. Empty, loading and error states (9A)

- **Empty Lab:** centred in the canvas, max 720 wide.
  - Hero: three illustrations at 80×60 (client, web-server, postgres) joined by dashed
    `border-strong` lines.
  - Title 20/28 "Dựng hệ thống đầu tiên của bạn", and one sentence in `text-2`.
  - **Template cards** in 3 columns: r-lg, `surface`, `shadow-1`, lifting on hover. Each has a
    54 px mini strip of kind tiles on the canvas grid, the name in 14/600, and a 12 `text-3`
    line. The suggested card has a 2 px `accent-text` outline and a "Gợi ý" pill.
  - Templates follow default 2: **Trống**, **Người dùng → Máy chủ web → PostgreSQL**, and each
    challenge's `start.graph`, shown as "Bắt đầu từ thử thách: …" with a list of up to 3 and a
    "Xem tất cả" link.
  - Footer hint: "hoặc bấm ⌘K để tìm thành phần · ? để xem phím tắt".
  - The Run button is disabled, with its reason as the tooltip, and the problems pill shows
    "1 vấn đề".
- **Engine loading:**
  - the palette shows skeleton rows (shimmer 1.4 s, or a static fill under reduced motion);
  - the canvas centre shows a card (380 px, r-xl): the title, "Lần đầu mất vài giây…", a 6 px
    progress track, and real steps with done/spinner/waiting icons. The steps are: tải lõi mô
    phỏng, đọc tham số thế giới, chuẩn bị khung vẽ, mở thiết kế gần nhất;
  - `role="status"`, and the canvas has `aria-busy="true"`.
- **Engine error:**
  - the design stays on the canvas, greyed (`grayscale(1)` at .45);
  - a card (460 px, r-xl, 1 px border in `over` at 35 %) has an alert badge, the title "Không
    khởi động được bộ mô phỏng", a cause sentence, and a green reassurance row "Thiết kế
    “…” vẫn an toàn trên trình duyệt này";
  - buttons **Thử lại** (primary) and "Sửa thiết kế khi chưa chạy được" (which closes the card;
    editing works, Run stays disabled);
  - a collapsed "Chi tiết kỹ thuật" disclosure;
  - `role="alert"`.
- **Run failure** (a worker error) uses the same card pattern inside the verdict slot, with
  Thử lại.
- **Other empty lists** (no run yet, no events, no saved designs): a 40 px icon in a 64 px
  `surface-2` circle, a 16/600 title and one 13 line.

---

## 10. First-run checklist (10B)

- **Card:** 320 px, bottom-left of the canvas at 16/14, r-lg, `shadow-3`. On first open the
  canvas fit leaves room for it.
- **Header:** a 40 px progress ring (`ok` on `surface-3`, 5 px stroke), "Làm quen với Lab" in
  14/600, "N/5 việc · khoảng 3 phút" in 12 `text-3`, and a collapse button.
- **Tasks:** each is a 22 px check circle, the label, and on the current task "Chỉ cho tôi".
  The tasks tick themselves from app events:
  1. Thêm Người dùng (a node of kind `client` exists)
  2. Thêm một Máy chủ web và nối lại (an edge from a client into a web-server, directly or
     through a load balancer)
  3. Thêm PostgreSQL để lưu dữ liệu
  4. Chạy mô phỏng lần đầu (the first run completes)
  5. Mở "Hỏng ở đâu?" sau khi chạy (the verdict action is used, or a passing verdict is seen)
- Done rows are `text-3` with a strikethrough and a filled `ok` circle. The current row has an
  `accent-soft` background.
- **"Chỉ cho tôi"** opens the coach bubble for that step only:
  - a 320 px card with "Bước n/4" in mono 12 `accent-text`, the title 16/600, the text, dots,
    Bỏ qua, and Tiếp;
  - a spotlight on the target, made with `box-shadow: 0 0 0 4px accent-text, 0 0 0 9999px
    scrim`;
  - the targets are the existing `[data-tour]` attributes.
- **Footer:** "Mở lại bất cứ lúc nào ở nút ?" and Ẩn.
- **When complete:** the ring is full, the title becomes "Hoàn thành phần làm quen", and the
  next-step row reads "Tiếp theo: thử thách đầu tiên · Mở bán cửa hàng nhỏ" with a Bắt đầu
  button.
- **Storage:** progress and the hidden state are kept in this browser (`sd-onboarding`). Help →
  "Làm quen với Lab" re-opens the card.

---

## 11. Learn and challenge pages (11A)

The page shell is the §2.1 top bar without the design controls. It shows a points chip
"Cấp 0 · 18/100 điểm" (mono value), plus search, theme, language and help. Content is max
1180 wide with 24/28 padding on `bg`.

**Learn list:**

- **Header:** "Học" (display), a one-line `text-2` description, and the view toggle "Xem dạng
  danh sách". The list view is the 11B layout, kept for searching.
- **Level strip:** 7 cards in a 7-column grid with 6 px gaps. Each has "L0 · 0–10" (mono 11.5
  `text-3`), the title (13/600, 2 lines) and a 4 px progress bar.
  - The current level has an `accent-text` border and a 3 px `accent-soft` ring.
  - Locked levels (default 5) are at .55 opacity with a lock icon, and their tooltip says "Cần
    qua bài kiểm tra cuối cấp N". Clicking a locked level opens a read-only preview of its
    lessons and outcomes.
- **Path** (main column):
  - A 2 px `border` line runs down the left, with stations in a grid of 48 / 1fr / auto.
  - Each station is a 48 px circle. Done stations are filled `ok` with a check. The current
    station has an `accent-text` ring with a 5 px `accent-soft` halo. Upcoming stations are
    outlined, with the kind icon (book for Bài đọc, route for Thí nghiệm).
  - The card next to a station is r-md: the title 14.5/600, and the meta line "Thí nghiệm ·
    15 phút · ●●○". Difficulty shows as 3 dots, never bars or colour alone.
  - The current card is raised and shows "Đang học · bước 2/5" and **Tiếp tục**.
  - Challenges are **milestone flags**: a rounded-square station in `busy-line` tint and a dashed
    card with "N chế độ · rps · readiness pill".
  - The readiness pills are "Chạy được trong Lab" (`ok`), "Chờ bộ mô phỏng" (neutral) and
    "Không cần Lab".
- **Right rail** (320 px, sticky):
  - a "Tiếp tục" card (`accent-soft`) with the lesson title, its step and time left, and a
    primary button;
  - a "Xong cấp N, bạn sẽ" card listing the level outcomes from `curriculum.json`.

**Lesson page:**

- Grid: TOC 210 · reading 640 · aside ≥ 220.
- **TOC:** sticky. It has a "Học / Cấp 0" back link, a 4 px progress bar, and step links (a 20 px
  number circle; done steps are `ok` with a check; the current step is `accent` and 600 on
  `surface`).
- **Reading:** a meta line, the title in display, step sections as `##` at 18/26, and body text
  at 16/26. Strong text is 600.
- **Figure card:** r-lg with a 170 px canvas strip showing the kind tiles from the lesson's
  `engine.needs`, rate labels between them, and an interactive control row (slider and value).
  A kind that is not supported yet shows "Thử trong Lab khi có …".
- **Misconception callout:** `busy-soft` with a 3 px `busy-line` left border and the label "Hiểu
  lầm thường gặp (Mx):" in `busy` 600.
- **Next bar:** a secondary button for the previous step on the left and a large primary button
  for the next step on the right.
- **Aside:** a "Thuật ngữ trong bước này" card.

**Challenge list:**

- The path view per level, all milestones.
- A rail with "Tiến độ" (mono 28, "1 / 44") and "Cách chấm".
- Locked challenges follow level gating, and their prerequisites are listed as links.

**Challenge brief:**

- Grid: 1fr · 380.
- **Main column:**
  - a breadcrumb and readiness pill;
  - the title in display;
  - the lead in 16/26;
  - "Mục tiêu ở mọi chế độ": a 2-column grid of goal tiles (the metric name and the target in
    mono 600, such as "Độ trễ p95 ≤ 50 ms");
  - "Chọn chế độ": 3 cards for Tiêu chuẩn, Ngân sách chặt and Hỗn loạn. Each has the budget in
    mono 18/600 with "/tháng" and one line on the conditions. The selected card has an
    `accent-text` border and ring;
  - "Gợi ý · mở khi cần": collapsed `<details>` for h1–h3.
- **Rail:**
  - the start canvas (210 px) with the locked start nodes as 1A tiles at 85 %;
  - "Bắt đầu với: … · tối đa 5 thành phần, 8 máy";
  - "Thành phần được dùng" as pills with art;
  - the full-width primary button "Vào thử thách · Tiêu chuẩn";
  - "Lần thử được lưu trên trình duyệt này".
- A 0–100 score and stars belong to sub-project 5 and only appear on this page and the result.

In sub-project 3, the Learn and Challenges routes render these layouts with real data from
`content/curriculum.json` (Task 31). Lessons and challenges that are not built link into the Lab
or show "Sắp có".

---

## 12. Illustration grammar

The full rules are in `docs/design/illustration-grammar.md`. In summary:

- a 64×48 viewBox;
- a live area of x 4–60 and y 4–44, with the ground at y 42;
- a 1.6 px round stroke in `currentColor`;
- body fill `var(--sd-art-fill, color-mix(in srgb, currentColor 16%, var(--sd-surface)))`;
- inner panels in `var(--sd-surface)`;
- one primary object, flowing left to right, with at most 4 repeats;
- dashed outlines only for "copy" or "outside the system";
- no brand marks.

**Assets** (`docs/design/assets/nodes/`):

- `<kind>.svg` for each of the 21 kinds: standalone, with a `<title>` and `role="img"`;
- `NodeArt.tsx`: a React component, `<NodeArt kind="redis" style={{color: "var(--sd-cat-cache)"}} />`,
  `aria-hidden` by default;
- `manifest.json`: kind → file, category, status and the Vietnamese label.

They are generated from `demos/shared/art.js`. If a drawing changes, regenerate them all; do not
edit files by hand.

---

## 13. Accessibility requirements

These come from the batch-1 review (`ecc:a11y-architect`) and apply to everything above.

1. **Contrast:** the §1.1 pairs are unit-tested in both themes.
2. **Not colour alone:** every node state has an icon and a word; edge kinds have a dash
   pattern; hot rate pills have an icon; rejected dots are hollow; difficulty is dots plus a
   word in the tooltip.
3. **Focus:** visible `:focus-visible` everywhere (§1.5). Nodes have a dashed ring that looks
   different from selection. Selection uses `outline`, so the overload animation cannot hide
   it.
4. **Targets:** ≥ 24×24 for every interactive element. **Ports have a 24×24 hit area** around
   the 10 px visual.
5. **Keyboard connect:** C, or the context menu "Nối tới…", opens the connect dialog; dragging
   is never the only way (WCAG 2.5.7).
6. **Playback:** the playback bar has a **pause control** and Space toggles it (WCAG 2.2.2). The
   scrubber is a slider with keyboard steps. Event markers are focusable.
7. **Reduced motion:** §1.4, listened to live. Animation that auto-starts stops with the
   preference.
8. **Announcements:** run start and end, the verdict (n/N and the first failing goal), add,
   delete, connect and refusals go to the existing `Announcer` (polite). Engine errors are
   assertive.
9. **Names:** nodes use the §5 accessible name; disabled controls keep focus and explain
   themselves (`aria-disabled` plus a tooltip, also on focus); the palette rail is a tablist and
   the drawer its tabpanel.
10. **Language:** `lang` follows the locale, and all screen text comes from the catalogues. No
    mixed-language labels in VI, such as "Số consumer".
