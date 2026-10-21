# What makes a product feel finished

A prototype works. A finished product also tells you where you are, what to do next, what just
happened, and what went wrong, and it looks the same every time it does so. This checklist turns
that into 13 areas that can be scored. Each area has observable criteria, a 0–3 score scale, and
sources.

**How to score.** Score each area 0–3:

- **0 Absent.** The thing is missing.
- **1 Present but rough.** It exists, but it is inconsistent, unclear, or only on some screens.
- **2 Solid.** It is consistent and clear everywhere, with small gaps.
- **3 Polished.** It is solid, has been deliberately designed, and adds to the product's identity.

The maximum score is 39. The audit (`audit.md`) scores our current build. The benchmark
(`benchmark.md`) scores the reference product with the same sheet.

---

## 1. Visual identity

The product is recognisable from a cropped screenshot, with no logo in view.

- There is one signature visual idea, carried across screens. For a system-design lab this
  should be the way components are drawn.
- A small, named palette: one brand accent, a neutral ramp, and semantic colours. Colours are
  never picked ad hoc.
- An icon set with a single stroke weight and corner style. Branded third-party logos are not
  mixed in at a different visual weight.
- The wordmark and favicon match the product's shapes.

Sources: Refactoring UI, "Starting from scratch" and "Working with color" (https://www.refactoringui.com/book);
Atlassian Design, Brand and Foundations (https://atlassian.design/foundations);
GitHub Primer, Color (https://primer.style/foundations/color).

## 2. Hierarchy and type scale

Every screen has one obvious first read, a clear second read, and quiet supporting text.

- A modular type scale with 5–7 steps, used by role (display, title, heading, body, label,
  caption, mono numbers). Sizes are never one-offs.
- Body text is at least 14 px in dense tools and 16 px in reading pages. Line height is 1.4–1.6
  for body text and 1.2–1.3 for headings.
- Numbers use tabular figures, so columns of numbers do not jitter while they update.
- Hierarchy comes from weight and colour first, and from size second.
- Vietnamese diacritics fit inside the line box. A font with full Vietnamese coverage avoids
  clipped stacked marks, as in "Ưu", "Mở rộng" or "Sự cố".

Sources: Material 3, Typography (https://m3.material.io/styles/typography/overview);
Apple HIG, Typography (https://developer.apple.com/design/human-interface-guidelines/typography);
Refactoring UI, "Hierarchy is everything";
Carbon, Typography (https://carbondesignsystem.com/elements/typography/overview/).

## 3. Density and spacing rhythm

- A 4 px base grid, with the spacing set limited to 4 / 8 / 12 / 16 / 24 / 32 / 48.
- Fixed control heights: 28 (compact), 32 (default) and 40 (prominent), shared by buttons,
  inputs and selects.
- Panel widths are fixed and tuned to their content. The palette should fit its longest label
  plus its description, and the inspector should fit label + value without truncation.
- Grouping uses the law of proximity: more space between groups than inside them.
- A dense tool mode and a comfortable reading mode, used on purpose.

Sources: Laws of UX, Law of Proximity and Law of Common Region (https://lawsofux.com/);
Atlassian, Spacing (https://atlassian.design/foundations/spacing);
Primer, Spacing (https://primer.style/foundations/layout).

## 4. A primary action on every screen

- Each screen has exactly one filled, accent-coloured button. In the Lab it is **Run**.
- The primary action is in the same place on every screen, it has a keyboard shortcut, and its
  disabled state explains why it is disabled.
- Secondary actions are visibly quieter, and destructive actions are visibly different.
- Commercial prompts, such as an upgrade button, never compete with the primary action.

Sources: NN/g, "Primary & Secondary Actions" (https://www.nngroup.com/articles/primary-secondary-actions/);
Laws of UX, Von Restorff effect and Hick's law;
Material 3, Common buttons (https://m3.material.io/components/buttons/guidelines).

## 5. Empty, loading, error and success states

- **Empty:** the screen says what this place is, shows one action that fills it, and can offer
  a starter template. It is never a blank canvas with grey text.
- **Loading:** a skeleton in the final layout's shape for anything over 300 ms, with real
  progress shown for anything over 2 s.
- **Error:** the message names what failed and what the user can do, keeps the user's work, and
  offers a retry. It never shows only a code.
- **Success:** the confirmation is proportionate. Saving needs only a quiet tick, while passing
  a challenge earns a moment of celebration.
- Partial states, such as "3 of 5 goals met", are designed too.

Sources: NN/g, "Designing Empty States in Complex Applications" (https://www.nngroup.com/articles/empty-state-interface-design/);
NN/g, "Skeleton Screens 101" (https://www.nngroup.com/articles/skeleton-screens/);
NN/g, "Error-Message Guidelines" (https://www.nngroup.com/articles/error-message-guidelines/);
Carbon, Empty states pattern (https://carbondesignsystem.com/patterns/empty-states-pattern/).

## 6. Feedback for every action

- Every click, drop, connect and keypress has a visible response within 100 ms. This can be a
  hover or press state, a snap preview, or an optimistic update.
- Invalid actions are shown before the drop, not after. For example, a port that cannot accept
  this edge type dims while a connection is being dragged.
- Toasts are for results the user cannot see. Inline feedback is for results next to the
  cursor.
- Undo is offered instead of "are you sure?" dialogs.

Sources: NN/g, "Response Times: The 3 Important Limits" (https://www.nngroup.com/articles/response-times-3-important-limits/);
NN/g, "Visibility of System Status" (https://www.nngroup.com/articles/visibility-system-status/);
Laws of UX, Doherty threshold.

## 7. Motion

- Motion explains change: where a panel came from, what got added, and what is flowing. It is
  never decoration only.
- Three durations: 120 ms for micro-interactions, 200 ms for panels, and 300–400 ms for
  overlays. Ease-out when entering, ease-in when leaving.
- During a run, motion carries data: request dots move along edges, and node fill rises with
  load.
- `prefers-reduced-motion` replaces travel with fades and static indicators.

Sources: Material 3, Motion (https://m3.material.io/styles/motion/overview);
Apple HIG, Motion (https://developer.apple.com/design/human-interface-guidelines/motion);
Carbon, Motion (https://carbondesignsystem.com/elements/motion/overview/).

## 8. Microcopy

- One voice: plain, second person, and short. In Vietnamese, avoid half-translated mixes such as
  "Số consumer trên mỗi publisher".
- Labels are nouns, buttons are verbs ("Chạy mô phỏng", not "OK"), and numbers carry units.
- Errors explain cause and fix, and success messages name what changed.
- No truncated labels in core panels. If a label does not fit, change the layout, not the
  words.

Sources: NN/g, "UX Writing" articles (https://www.nngroup.com/topic/writing-web/);
Atlassian, Content design / Voice and tone (https://atlassian.design/content);
Primer, Content guidelines (https://primer.style/guides/content).

## 9. Onboarding

- The first minute ends with a working result: a starter design the user can run in one click.
- The product teaches by doing. Prefer a 3–5 step coach mark tied to real UI, which can be
  skipped and re-opened, over a slideshow.
- It uses progressive disclosure. Advanced fields such as overrides and seeds are collapsed
  until needed.

Sources: NN/g, "Onboarding Tutorials vs. Contextual Help" (https://www.nngroup.com/articles/onboarding-tutorials/);
NN/g, "Progressive Disclosure" (https://www.nngroup.com/articles/progressive-disclosure/);
Brilliant and Duolingo first-run flows (observed).

## 10. Keyboard and accessibility

- Text contrast is at least 4.5:1, and UI boundaries and state colours are at least 3:1
  (WCAG 2.2, criteria 1.4.3 and 1.4.11).
- State is never shown by colour alone. Busy, overloaded and down each carry an icon and a word.
- Every canvas operation has a keyboard path: add, select, move, connect, delete and run.
- Focus is visible on everything, focus order follows the visual layout, and targets are at
  least 24×24 px (criterion 2.5.8).
- Live regions announce run start, run end and the verdict.

Sources: WCAG 2.2 (https://www.w3.org/TR/WCAG22/);
Radix Primitives, Accessibility (https://www.radix-ui.com/primitives/docs/overview/accessibility);
React Flow, Accessibility (https://reactflow.dev/learn/advanced-use/accessibility).

## 11. Perceived performance

- The app shell paints immediately and the engine loads behind it, with progress shown.
- Validation feels instant: under 100 ms from an edit to the updated problem count.
- A run starts with a visible change within 100 ms, even when the result arrives later. For
  example, the Run button turns into a progress bar and edges start to animate.
- Heavy work, such as auto-layout and simulation, never freezes pointer input.

Sources: NN/g, "Response Times"; web.dev, "Interaction to Next Paint" (https://web.dev/articles/inp).

## 12. Consistency

- Tokens are the only source of colour, size and radius. No raw hex values in components.
- The same component looks and behaves the same everywhere. A number field in the inspector
  matches the one in the workload form.
- Light and dark mode are designed as a pair, not generated as inverses. Both have the same
  hierarchy.
- Labels on the canvas and in the panels use one language at a time.

Sources: Laws of UX, Jakob's law; Primer, Primitives (https://primer.style/primitives);
Radix Themes (https://www.radix-ui.com/themes/docs/overview/getting-started).

## 13. Delight

- There are a few moments of craft that reward attention, such as components that "breathe"
  under load, a satisfying verdict reveal, or an illustration that reacts to state.
- Delight never slows the expert path. It can be skipped and it is short.

Sources: Laws of UX, Peak-end rule; Aarron Walter, *Designing for Emotion* (A Book Apart, 2011).

---

## Score sheet template

| # | Area | Score (0–3) | Evidence (screenshot / note) |
|---|------|-------------|------------------------------|
| 1 | Visual identity | | |
| 2 | Hierarchy and type scale | | |
| 3 | Density and spacing rhythm | | |
| 4 | Primary action | | |
| 5 | Empty / loading / error / success | | |
| 6 | Feedback for every action | | |
| 7 | Motion | | |
| 8 | Microcopy | | |
| 9 | Onboarding | | |
| 10 | Keyboard and accessibility | | |
| 11 | Perceived performance | | |
| 12 | Consistency | | |
| 13 | Delight | | |
| | **Total** | **/39** | |
