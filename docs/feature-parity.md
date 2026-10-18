# Feature checklist

Every feature observed while using the reference product on 2026-10-18, mapped to the
sub-project that delivers it, plus where we go further. Each sub-project spec must tick its
rows before it is approved. Features and interaction patterns are matched; all text, visuals
and branding are our own.

Sub-projects: **1** sim engine · **2** content format + validator · **3** canvas editor + Lab ·
**4** lessons + concept map · **5** challenges · **6** progress storage + AI tutor ·
**7** multi-agent content workflow · **A** app shell (part of 3).

## App shell

| Feature | Sub-project | Our extension |
|---|---|---|
| Top navigation: Lab, Learn, Challenges, Leaderboard | A | — |
| Global search / command palette (⌘K) across lessons, challenges, concepts | A | Search inside lesson text and engine docs |
| Language switch VI/EN | A | Missing-translation test (reference had an English string inside Vietnamese text) |
| Light/dark theme | A | Follows OS by default |
| Sign in (Google) | 6 | Local accounts too, for internal use |
| Profile menu, plan badge | 6 | No paid plan; usage stats instead |
| Onboarding tours (Lab 5 steps, workspace 8 steps) | 3, 5 | Replayable from the help menu |

## Learn

| Feature | Sub-project | Our extension |
|---|---|---|
| Lesson library with search and filters (format, difficulty, topic) | 4 | Filter by curriculum level L0–L6 and by status |
| Lesson cards: number, title, difficulty 1–3, minutes, format, topic, progress | 4 | — |
| Lesson preview: outcomes, model diagram, step list, key ideas | 4 | Prerequisites shown and enforced |
| Reading lessons with numbered steps (observe / analyse / apply) and "mark as read" | 4 | Every lesson also has a check question |
| Guided experiments: steps Observe → Fix it, locked until previous passes | 4 | Wrong-choice feedback per misconception |
| Experiment controls (number steppers, selects), fixed settings list, prediction question | 4 | Prediction is recorded and compared with the result |
| "Earned through experiments" takeaways that unlock as steps pass | 4 | Spaced-repetition review of takeaways |
| Run simulation, run again, skip animation | 1, 4 | — |
| Concept map: map and cards views, grouped by topic, difficulty filter, relations | 4 | Shows which lessons/challenges prove each concept |
| Concept detail: how it works, key points, trade-offs | 4 | Sources listed |

## Experiment bench and Lab canvas

| Feature | Sub-project | Our extension |
|---|---|---|
| Component palette with search, grouped by category | 3 | More components (plan 1b and later) |
| Drag or click to add; drag between ports to connect | 3 | Keyboard-only connect |
| Edge kinds coloured by type (HTTP, database, cache, messaging) with legend | 3 | — |
| Connection validation with message (incompatible component pairs) | 1, 3 | — |
| Inspector: label, replicas, monthly cost, settings, concurrency, replication, scaling, traffic, resources, circuit breaker | 1, 3 | **World parameters editor** (calibration overrides) and per-node overrides |
| Delete, duplicate, undo/redo, snap to grid, group, auto-layout, fit, zoom, orthogonal edges | 3 | — |
| Keyboard shortcuts sheet | 3 | Button not hidden behind another control (reference bug) |
| Save designs, open saved, start from a challenge's starting architecture | 3, 6 | Unlimited saves |
| Run with animated request dots, busy (amber) / overloaded (red) states | 1, 3 | — |
| Playback: play/pause, scrub timeline, speed | 1, 3 | — |
| Follow request: pick a sampled request, see each hop with timing | 1, 3 | — |
| Bottom tabs: Metrics, Logs, Events, Simulation | 1, 3 | Export run as JSON |
| Traffic settings: profile, total rps, write ratio, consumers per publisher, distinct clients, scenario parameters | 1, 3 | Any workload parameter, plus custom presets |
| Fault injection list (14 kinds), random draw | 1, 3 | No per-run limit; combine several |
| Run usage counter | — | Not needed (no limits) |

## Challenges

| Feature | Sub-project | Our extension |
|---|---|---|
| Challenge list with search, difficulty, status, more filters | 5 | Filter by level and concept |
| Problem statement, numbers, goals, starting architecture | 5 | — |
| Modes per challenge (standard, tight budget, misbehaving servers, chaos) with budgets | 5 | All modes available |
| Rules: allowed component types, max components, max instances, budget, locked starting components | 1, 5 | — |
| Goals with targets and measured values, live estimated cost | 1, 5 | — |
| Save attempt, attempt history, reset | 5, 6 | Diff between attempts |
| Result modal: pass/fail, score /100, stars, replay, next mode | 1, 5 | — |
| "Where did it break?" diagnosis quiz: pick the component, then evidence (slowest request, saturation window) | 1, 5 | — |
| Hints (3 levels, recorded) | 5 | — |
| Explain result with AI | 6 | No daily limit |
| Ask AI about the challenge (Socratic, does not see the design) | 6 | Can optionally see the design |
| AI-chosen chaos mode | 6 | — |
| Leaderboard (cheapest passing design) | 6 | Optional, local |

## Profile and progress

| Feature | Sub-project | Our extension |
|---|---|---|
| Overview: continue where you left off, completed counts, next practice | 6 | Curriculum level 0–100 score |
| Learning tab (paged lesson list with status) | 6 | — |
| Skills map by topic (applied / tried / not tried) | 6 | — |
| Activity feed | 6 | — |
| Saved designs | 6 | — |
| Settings | 6 | — |

## Engine (sub-project 1) parity

| Feature | Plan |
|---|---|
| Same pass/fail per goal as the reference for the same design and scenario | 1a Task 15 |
| Numbers within tolerance (p95 ±15%, availability ±0.5 pt, …) | 1a Task 15 |
| Overridable world parameters and per-node overrides | 1a Tasks 1, 4, 6 |
| Remaining components, faults, behaviors, auto scaling, retries, circuit breaker, rate limit | 1b |
