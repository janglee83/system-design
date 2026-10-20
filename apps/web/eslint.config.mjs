import { FlatCompat } from "@eslint/eslintrc";
import i18next from "eslint-plugin-i18next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const compat = new FlatCompat({ baseDirectory: path.dirname(fileURLToPath(import.meta.url)) });

// User-facing attributes; every other attribute is technical (class names, ids, roles…).
// The plugin anchors string patterns itself (^…$) and uses RegExp objects as given.
const TEXT_ATTRIBUTES = [
  "aria-label",
  "aria-description",
  "aria-roledescription",
  "aria-valuetext",
  "aria-placeholder",
  "title",
  "placeholder",
  "alt",
  "label",
];

const config = [
  { ignores: [".next/**", "playwright-report/**", "test-results/**", "blob-report/**", "next-env.d.ts"] },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    files: ["app/**/*.tsx", "src/**/*.tsx"],
    ignores: ["**/*.test.tsx"],
    plugins: { i18next },
    rules: {
      "i18next/no-literal-string": [
        "error",
        {
          mode: "jsx-only",
          "jsx-attributes": { include: TEXT_ATTRIBUTES, exclude: [".*"] },
          "jsx-components": { include: [], exclude: [] },
          // Pure punctuation/symbols/digits and ALL-CAPS tokens (HTTP, VI, EN) are not prose.
          // RegExp objects, because the plugin compiles strings without the `u` flag.
          words: { exclude: [/^[\s\d\p{P}\p{S}]+$/u, /^[A-Z0-9_-]+$/] },
        },
      ],
    },
  },
];

export default config;
