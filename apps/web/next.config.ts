import fs from "node:fs";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const pkg = JSON.parse(fs.readFileSync(new URL("./package.json", import.meta.url), "utf8")) as { version: string };

const config: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Both packages export TypeScript source (plan ruling R2).
  transpilePackages: ["@sd/sim", "@sd/content"],
  // Lint runs as its own step (pnpm lint), with the i18n rule.
  eslint: { ignoreDuringBuilds: true },
  env: { NEXT_PUBLIC_APP_VERSION: pkg.version },
};

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");
export default withNextIntl(config);
