import { defineRouting } from "next-intl/routing";

/** Remembers the language choice for a year (plan ruling R6). */
export const LOCALE_COOKIE = { name: "NEXT_LOCALE", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" } as const;

export const routing = defineRouting({
  locales: ["vi", "en"],
  defaultLocale: "vi",
  localePrefix: "always",
  localeCookie: LOCALE_COOKIE,
});

export type Locale = (typeof routing.locales)[number];
