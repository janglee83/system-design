"use client";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { LOCALE_COOKIE, routing, type Locale } from "@/i18n/routing";
import { Segmented } from "@/ui/Segmented";

export function LanguageSwitch() {
  const t = useTranslations("language");
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const router = useRouter();
  return (
    <Segmented
      label={t("label")}
      value={locale}
      onChange={(next: Locale) => {
        // Remember the choice explicitly (R6), with the same cookie settings the middleware uses.
        const { name, maxAge, sameSite } = LOCALE_COOKIE;
        document.cookie = `${name}=${next}; path=/; max-age=${maxAge}; samesite=${sameSite}`;
        const { search, hash } = window.location;
        router.replace(`${pathname}${search}${hash}`, { locale: next });
      }}
      items={routing.locales.map((l) => ({ value: l, label: l.toUpperCase(), title: t(l) }))}
    />
  );
}
