"use client";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
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
        // Remember the choice explicitly (R6); the middleware reads this cookie on "/".
        document.cookie = `NEXT_LOCALE=${next}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
        const query = window.location.search;
        router.replace(`${pathname}${query}`, { locale: next });
      }}
      items={routing.locales.map((l) => ({ value: l, label: l.toUpperCase(), title: t(l) }))}
    />
  );
}
