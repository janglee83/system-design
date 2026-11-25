import { LOCALE_COOKIE, type Locale } from "@/i18n/routing";

/** The remembered-language cookie, with the middleware's settings; Secure when the page is on https (review). */
export function localeCookie(next: Locale, protocol: string): string {
  const { name, maxAge, sameSite } = LOCALE_COOKIE;
  return `${name}=${next}; path=/; max-age=${maxAge}; samesite=${sameSite}${protocol === "https:" ? "; secure" : ""}`;
}
