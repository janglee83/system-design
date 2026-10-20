import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Both packages export TypeScript source (plan ruling R2).
  transpilePackages: ["@sd/sim", "@sd/content"],
  // Lint runs as its own step (pnpm lint), with the i18n rule.
  eslint: { ignoreDuringBuilds: true },
};

export default config;
