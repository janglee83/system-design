FROM rust:1.85.1-bookworm

# Rust targets and tools. The Rust toolchain, wasm-pack and wasm-bindgen-cli are pinned to
# exact versions. Node (24.x) and pnpm (10.x) float within their major version; pinning base
# images by digest is deferred.
RUN rustup target add wasm32-unknown-unknown \
 && rustup component add clippy rustfmt \
 && cargo install wasm-pack --version 0.13.1 --locked \
 && cargo install wasm-bindgen-cli --version 0.2.100 --locked \
 && rm -rf /usr/local/cargo/registry /usr/local/cargo/git

# Node 24 (latest 24.x) copied from the official image, plus pnpm 10 (latest 10.x).
COPY --from=node:24-bookworm-slim /usr/local/bin/node /usr/local/bin/node
COPY --from=node:24-bookworm-slim /usr/local/lib/node_modules /usr/local/lib/node_modules
RUN ln -s /usr/local/lib/node_modules/npm/bin/npm-cli.js /usr/local/bin/npm \
 && ln -s /usr/local/lib/node_modules/npm/bin/npx-cli.js /usr/local/bin/npx \
 && npm install -g pnpm@10

ENV npm_config_store_dir=/pnpm-store \
    CARGO_TERM_COLOR=always \
    NEXT_TELEMETRY_DISABLED=1 \
    PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

# Playwright's Chromium and its system libraries, for the e2e tests (plan ruling R4). The
# version must equal @playwright/test in apps/web/package.json (checked by
# apps/web/src/test/toolchain.test.ts).
RUN npx -y playwright@1.63.0 install --with-deps chromium \
 && rm -rf /root/.npm /var/lib/apt/lists/*
WORKDIR /work
