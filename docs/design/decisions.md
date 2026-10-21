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
| 1 | Node style on the canvas (`demos/01-node-style`) | **A** Illustrated tile (172×148): our own line drawing, with the name and numbers inside the tile. Load rises like a water level, and replicas are stacked cards behind it. **B** Compact card with a category rail (248×64). **C** Ring station: a circular node with a load gauge ring, and the label in a caption under it. | **A.** It answers "nhìn xấu" directly: it has an identity as strong as Syscraft's drawings, and is more legible and compact. The name lives inside the shape, so hover, selection and state wrap one object, which fixes Syscraft's floating labels. The water-level fill and hatching read at 75 % zoom (see the density test). C is the most original and is the runner-up. Choose C if you want the canvas to feel like a network map rather than a whiteboard. B is safe, but looks like an admin tool. | |
| 2 | Colour palette, typography and default theme (`demos/02-colour-type-theme`) | **A** Giấy & Mực: warm paper, deep teal, Be Vietnam Pro + JetBrains Mono, 8–12 px radii. **B** Than chì & Chàm: cool graphite, indigo, IBM Plex Sans/Mono, 4–8 px radii. **C** Mực đêm & Chanh: navy, lime, Plus Jakarta Sans, 12–22 px radii. Theme for all three: follow the system on first open, remember the user's toggle, and design light and dark as a pair. | **A.** It is visibly different from Syscraft's dark-navy and blue screenshots. Be Vietnam Pro was drawn for Vietnamese, so stacked diacritics never clip. It continues our current tokens, so there is less churn. Teal clashes with no state colour. Every text pair passes AA, as computed live on the page and checked by the a11y review (below). | |
| 3 | App shell, toolbar and the primary Run action (`demos/03-app-shell`) | **A** One 56 px bar: nav, design name and save state, undo/redo, problems, and one accent **Chạy mô phỏng ⌘↵** split button. There is a 28 px status strip, and rare tools go into ⌘K and the canvas controls. **B** A 44 px nav plus a 48 px design toolbar, with every tool labelled. **C** A full-bleed canvas with floating palette and inspector cards, and a bottom dock. | **A.** It gives the canvas the most room and has exactly one accent-filled control on screen. In running mode the Run button turns into progress + Dừng in the same place, with a 2 px progress line along the bar. This fixes our biggest audit gap (there is no primary action today) and Syscraft's (two crowded bars, an upgrade button louder than Run). B is the fallback if the owner wants every tool visible. C hides the design under the cards at 1280 px. | |

## Batch 2 (built after batch 1 is chosen)

| # | Element | Options | Recommendation | Owner choice |
|---|---|---|---|---|
| 4 | Component palette | — | — | |
| 5 | Inspector layout | — | — | |
| 6 | Edges, ports, legend, floating canvas controls | — | — | |
| 7 | Run feedback: playback bar, verdict, node states, request dots | — | — | |
| 8 | Bottom panel: metrics, events, logs, simulation | — | — | |
| 9 | Empty, loading and error states | — | — | |
| 10 | Onboarding tour | — | — | |
| 11 | Learn and challenge pages | — | — | |

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
