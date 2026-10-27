# System Design Lab

Internal learning platform for system design. All commands run inside the dev container.

## Setup

    docker compose build dev
    ./dev pnpm install

## Everyday commands

| Command | What it does |
|---|---|
| `./dev pnpm test` | Full suite: rustfmt check, Rust tests, clippy, type freshness, wasm + TS tests, CLI perf budget, parity check against `fixtures/parity` |
| `./dev cargo test -p sim-core` | Engine tests only |
| `./dev cargo run -p sim-cli -- check fixtures/golden` | Check golden fixtures |
| `./dev cargo run -q -p sim-cli -- parity fixtures/parity` | Parity check: compare the engine with the committed reference results (offline) |
| `./dev cargo run -p sim-cli -- run fixtures/golden/web-tier-surge-single.json fixtures/golden/web-tier-surge-scaled.json` | Compare two designs side by side |
| `./dev pnpm build:sim` | Build the wasm packages into `packages/sim/wasm/` |
| `./dev cargo bench -p sim-core` | Native benchmark |
| `docker compose up web` | Run the app at http://localhost:3000 (Next dev server, hot reload) |
| `./dev pnpm test:web` | App lint, typecheck, production build and Playwright e2e + axe |
| `./dev pnpm --filter @sd/web test` | App unit tests only |

## Layout

- `crates/sim-core` — the engine (pure Rust)
- `crates/sim-cli` — native CLI
- `crates/sim-wasm` — wasm bindings
- `packages/sim` — `@sd/sim` TypeScript wrapper
- `apps/web` — the Next.js app (shell and Lab)
- `fixtures/golden` — engine contract scenarios
- `fixtures/parity` — reference results used to calibrate the engine (offline; the product never calls any external site)
- `docs/superpowers` — specs and plans
