"use client";
import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { LOCALE_COOKIE, type Locale } from "@/i18n/routing";

/** The current locale and a switch that keeps the page, query and hash, and remembers the choice (R6). */
export function useSwitchLocale(): [Locale, (next: Locale) => void] {
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const router = useRouter();
  const set = (next: Locale) => {
    // The same cookie settings the middleware uses.
    const { name, maxAge, sameSite } = LOCALE_COOKIE;
    document.cookie = `${name}=${next}; path=/; max-age=${maxAge}; samesite=${sameSite}`;
    // The Lab writes its pending draft first (R33).
    window.dispatchEvent(new Event("sd:before-locale-change"));
    const { search, hash } = window.location;
    router.replace(`${pathname}${search}${hash}`, { locale: next });
  };
  return [locale, set];
}
