"use client";
import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { type Locale } from "@/i18n/routing";
import { localeCookie } from "./locale-cookie";

/** The current locale and a switch that keeps the page, query and hash, and remembers the choice (R6). */
export function useSwitchLocale(): [Locale, (next: Locale) => void] {
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const router = useRouter();
  const set = (next: Locale) => {
    document.cookie = localeCookie(next, window.location.protocol);
    // The Lab writes its pending draft first (R33).
    window.dispatchEvent(new Event("sd:before-locale-change"));
    const { search, hash } = window.location;
    router.replace(`${pathname}${search}${hash}`, { locale: next });
  };
  return [locale, set];
}
