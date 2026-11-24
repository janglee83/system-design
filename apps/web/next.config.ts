import fs from "node:fs";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { SECURITY_HEADERS, workerCsp } from "./src/security/csp";

const pkg = JSON.parse(fs.readFileSync(new URL("./package.json", import.meta.url), "utf8")) as { version: string };

const config: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Both packages export TypeScript source (plan ruling R2).
  transpilePackages: ["@sd/sim", "@sd/content"],
  // Lint runs as its own step (pnpm lint), with the i18n rule.
  eslint: { ignoreDuringBuilds: true },
  env: { NEXT_PUBLIC_APP_VERSION: pkg.version },
  // Hardening headers everywhere; scripts (the engine worker) get their own CSP. Pages get a
  // nonce-based CSP from the middleware (Phase 1 review M11).
  async headers() {
    return [
      { source: "/:path*", headers: SECURITY_HEADERS },
      { source: "/_next/static/:path*", headers: [{ key: "Content-Security-Policy", value: workerCsp() }] },
    ];
  },
};

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");
export default withNextIntl(config);
