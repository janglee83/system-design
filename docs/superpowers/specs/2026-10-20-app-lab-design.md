# Sub-project 3: App shell and Lab canvas — Design

Date: 2026-10-20
Status: Draft, awaiting review

## 1. Goal

The first usable product: a Next.js app where a learner builds a system on a canvas, runs it on
our engine in the browser, and watches what happens, at least as well as the reference product
does it. It also adds the app shell (navigation, search, language, theme) that later sub-projects
plug into.

It covers every feature-parity row marked **3** or **A** in `docs/feature-parity.md`. Rows owned by
4 (lessons), 5 (challenges) and 6 (accounts, AI) only get their entry points here.

Product rules from the engine spec (§1.1) still apply:
- All text and visuals are our own, in Vietnamese and English.
- The app never calls the reference site.
- The engine emits codes; the UI turns them into words.

## 2. Stack

| Concern | Choice | Why |
|---|---|---|
| Framework | Next.js 15 (App Router), React 19, TypeScript strict | Decided in the engine spec |
| Canvas | `@xyflow/react` (React Flow 12) | Mature node/edge editor: ports, zoom, minimap, selection, keyboard; MIT |
| Auto-layout | `elkjs` | Layered layout with orthogonal edges |
| State | Zustand, with an undo/redo history of design snapshots | Small, works outside React (worker messages, shortcuts) |
| Styling | Tailwind CSS 4 with design tokens as CSS variables; Radix UI primitives; `lucide-react` icons | Accessible primitives, our own look, light and dark |
| i18n | `next-intl`; message catalogs in `apps/web/messages/{vi,en}.json` | Typed keys; missing-key test |
| Charts | `uplot` | Fast time series for the metrics tab |
| Storage | IndexedDB through `idb` | Saved designs stay in the browser until sub-project 6 adds accounts |
| Engine | `@sd/sim` (wasm) in a Web Worker | The UI stays responsive; one run is about 2 ms |
| Content | `@sd/content` types; the generated `content/curriculum.json` and challenge files are read at build time | Starting a design from a challenge; search |
| Tests | Vitest + Testing Library (unit), Playwright (e2e, in Docker), `@axe-core/playwright` (a11y) | |

Everything runs through `./dev`. The compose file gains a `web` service that exposes port 3000 for
`next dev`.

## 3. Layout and routes

```
apps/web/
  app/[locale]/(shell)/layout.tsx     top bar, command palette, providers
  app/[locale]/(shell)/lab/page.tsx   the Lab (this sub-project)
  app/[locale]/(shell)/learn/…        placeholder that lists the curriculum (sub-project 4 fills it)
  app/[locale]/(shell)/challenges/…   placeholder list; "open in Lab" (sub-project 5 fills it)
  app/[locale]/(shell)/leaderboard/…  placeholder (sub-project 6)
  src/lab/                            canvas, inspector, panels, store, worker client
  src/shell/                          nav, palette, theme, language
  src/ui/                             shared components on Radix
  messages/vi.json, messages/en.json
```

Routes live under `/vi/...` and `/en/...`. A first visit picks the browser language, then
remembers the choice.

## 4. App shell

- **Top bar:** Lab, Learn, Challenges, Leaderboard, a search button, the language switch,
  the theme switch (light, dark, or follow the system), and a help menu.
- **Command palette (⌘K / Ctrl+K):**
  - Lab commands: add component, run, fit view, auto-layout, open saved, export.
  - Every lesson and challenge in the curriculum.
  - Every component kind, with its description.
  - Fuzzy search in both languages.
- **Help menu:** keyboard shortcut sheet, replay the onboarding tour, about (engine version).

## 5. Lab

### 5.1 Canvas editing

- **Palette:**
  - Every component from `listComponents()`, grouped by `category`.
  - Search box; description on hover.
  - Add a component by dragging it onto the canvas, or by clicking it (it lands at the centre of
    the view).
- **Nodes:**
  - Show the icon, label, kind, replica count and monthly cost.
  - Ports show which edge kinds they accept (`accepts`).
- **Connecting:**
  - Drag between ports.
  - Keyboard: select the source, press `C`, pick the target from a list.
  - The edge kind is inferred from the target's role (database → `db`, otherwise `http`) and can
    be changed in the inspector.
- **Validation as you edit:**
  - `validateGraph` runs on every change, debounced in the worker.
  - Issues show on the node or edge and in a problems list, as translated messages from their
    codes (`edge.not-accepted`, `graph.no-client`, …).
  - Run is disabled while any blocking issue exists.
- **Edges:** coloured by kind (http, db, cache, msg), with a legend; orthogonal routing.
- **Editing commands:** select, multi-select, delete, duplicate, copy and paste, undo and redo
  (at least 100 steps), snap to grid, auto-layout (elkjs, left to right), fit view, zoom, minimap.
- **Grouping:**
  - A group is a labelled frame that moves its children together.
  - It is a UI-only concept and is not sent to the engine.

### 5.2 Inspector

- **Selected node:**
  - Label and replicas.
  - Every `ConfigField` rendered from its metadata:
    - number fields → stepper with min, max and integer rules;
    - `options` → select;
    - booleans → toggle.
  - Estimated monthly cost.
  - Per-node overrides (`rpsPerInstance`, `serviceMs`, `costPerMonth`) under "Advanced".
- **Selected edge:** kind.
- **Nothing selected:** design-wide settings (§5.3).

### 5.3 Workload, faults and world parameters

- **Traffic:**
  - Profile, total rps, write ratio, distinct clients, client timeout, arrivals, surge.
  - Scenario `params`.
  - Duration and seed.
  - Saved presets: our own defaults plus user presets.
- **Faults:**
  - A list the user can add any number of faults to: kind, target (picked from matching nodes),
    and time.
  - "Random fault" draws a supported kind and target with a seeded RNG.
  - Fault kinds the engine does not support yet are shown disabled, with a "coming soon" tooltip
    taken from `capabilities()`.
- **World parameters:**
  - Every `Calibration` field with its default from `defaultCalibration()`.
  - Changed values are highlighted, with a reset per field and for all fields.
  - These become `SimInput.calibration`.

### 5.4 Running and playback

- **Run** (button or ⌘↵):
  - Builds `SimInput`, runs it in the worker, and keeps the result.
  - A new run replaces the old one.
  - The last 10 results stay in a run history for comparison.
- **Playback over the timeline** (100 ms frames; fields `inFlight`, `queued`, `busy`, `rejected`,
  `up`):
  - Play and pause, scrub bar, speed 0.25× to 4×, skip to the end.
  - Requests are drawn as dots moving along the edges. Dot density follows the traffic on each
    edge, and the dots are rendered on one canvas layer above React Flow, so the animation holds
    60 fps with 30 nodes.
  - Node state colours: normal; busy (amber) when `busy ≥ 0.7`; overloaded (red) when
    `rejected > 0` or `busy ≥ 0.95`; down (grey) when `up = 0`.
  - Event markers on the scrub bar.
- **Follow a request:**
  - Pick a sampled trace from a list, filtered by outcome and sorted by latency.
  - The canvas highlights its path.
  - A step list shows each hop's wait and service time.
  - Keyboard: next and previous hop.

### 5.5 Bottom panel

| Tab | Content |
|---|---|
| Metrics | p50/p95/p99, availability, throughput, cost, request breakdown. Per-node time series (busy, queued, rejected) with `uplot`. Compare with the previous run. |
| Events | Engine events, translated from their codes, with time and node. Clicking one jumps the playback there. |
| Logs | A text log built from events and run milestones, filterable by level. |
| Simulation | The run input (`SimInput`) and engine version. Buttons: export the run as JSON; copy the input. |

### 5.6 Designs

- **Save and open:**
  - Saves the whole design: graph, layout, groups, workload, faults, world parameters.
  - Designs are named and kept in IndexedDB, with no limit on how many.
  - Open, rename, duplicate, delete.
  - Autosave a draft.
- **Import and export:** a versioned design file (`designFormatVersion: 1`).
- **New from a challenge:** loads the challenge's `start` and marks its `lockedNodes` as locked,
  so they can't be deleted or edited.
- **New from a template:** empty, or client → web server → database.

### 5.7 Onboarding tour

A 6–8 step tour of the Lab on its first visit, replayable from the help menu. Our own text.

## 6. Engine and content boundaries

- The worker owns the wasm instance. Messages:
  - `validate`
  - `run` → it returns metrics, events, timeline header and data as a transferable buffer, and
    trace summaries
  - `trace(i)`
  - `listComponents`
  - `defaultCalibration`
  - `capabilities`
- **New in `sim-wasm` (small, additive):** `capabilities()`, exposing the sim-core function that
  sub-project 2 added. Nothing else in the engine changes.
- **Translations:** component names (`labelKey`), event codes, validation codes, fault kinds and
  metric names are translated in the message catalogs. A unit test fails on any missing key, in
  either language, for every code the engine and `capabilities()` can produce.

## 7. Quality bar

- **Accessibility:**
  - Every control is reachable by keyboard.
  - The canvas has a keyboard mode: Tab moves between nodes; arrows move a node; Enter opens it
    in the inspector.
  - Axe checks show no serious violations on every page.
- **Performance:**
  - First load of the Lab is under 2.5 s on a local build.
  - A run in the worker is under 50 ms with 30 nodes.
  - Playback holds 60 fps with 30 nodes on a mid-range laptop.
- **Visual design:**
  - Our own tokens, type scale and icons; both themes are designed, not just inverted.
  - The layout works from 1280 px wide; below that a "best on desktop" notice shows, and the
    page still renders.
- **Errors:**
  - A failed wasm load or a worker crash shows a recoverable message with a retry button.
  - An invalid imported file reports what is wrong.

## 8. Testing

- **Unit:**
  - The store (add, connect, undo and redo, locking).
  - `SimInput` building.
  - Translations complete.
  - Design-file round trip.
  - Node state from timeline values.
- **E2E (Playwright):**
  1. Build client → lb → 2× web → postgres with mouse, then again with keyboard only.
  2. Run it, then scrub, follow a trace, and check the metrics.
  3. Inject `instance-down`, run, and see the node go grey and the event listed.
  4. Change a world parameter and see p95 change.
  5. Save, reload, open.
  6. Open `c-l0-first-launch` from the challenges list, check the locked node, run.
  7. Switch the language and theme.
  8. Run axe on each page.
- **Visual:** Playwright screenshots of the Lab in both themes, as baselines updated on purpose.

## 9. CI

A new `web` workflow, path-filtered to `apps/web/**`, `packages/**`, `crates/sim-wasm/**`,
`crates/sim-core/**`, `content/**` and the workflow file. It runs lint, typecheck, unit tests,
`next build`, and Playwright with axe in the dev container. The `engine` workflow's filters already
cover `packages/**`.

## 10. Phases (for the plan)

1. **Scaffold:**
   - The `apps/web` app with the shell, i18n, themes and tokens.
   - The worker client, plus `capabilities()` in wasm.
   - The CI workflow.
2. **Canvas editing:** palette, nodes, edges, validation, inspector, undo/redo, layout, groups,
   keyboard mode.
3. **Workload, faults and world parameters**, then running, with metrics and the events, logs and
   simulation tabs.
4. **Playback:** dots, node states, scrub and speed, following a request.
5. **Designs and the rest:**
   - Save and open, import and export, start from a challenge or a template.
   - Command palette, tour, shortcut sheet.
   - Placeholder pages.
6. **Polish:** the a11y, performance and visual baselines; e2e coverage complete.

## 11. Out of scope

- Lesson and experiment pages (4) and challenge play, grading and hints (5).
- Accounts, server storage, leaderboard data and AI (6).
- New engine components and faults (plan 1b).
- Mobile editing.

## 12. Done when

- Every feature-parity row marked 3 or A is implemented, or explicitly listed as deferred with a
  reason.
- The e2e suite passes in CI, including axe.
- The performance targets in §7 are met and recorded.
- No hard-coded user-facing string sits outside the message catalogs (lint rule).
