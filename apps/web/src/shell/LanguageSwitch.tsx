"use client";
import * as DM from "@radix-ui/react-dropdown-menu";
import { Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { routing, type Locale } from "@/i18n/routing";
import { IconButton } from "@/ui/IconButton";
import { MENU_CONTENT_CLASS, MENU_ITEM_CLASS } from "./menu-styles";
import { useSwitchLocale } from "./use-switch-locale";

/** A 32 px top-bar button showing the language code; its menu lists the languages by name. */
export function LanguageSwitch({ className }: { className?: string }) {
  const t = useTranslations("language");
  const [locale] = useSwitchLocale();
  return (
    <DM.Root modal={false}>
      <DM.Trigger asChild>
        <IconButton label={t("label")} className={className}>
          <span className="text-label font-semibold">{locale.toUpperCase()}</span>
        </IconButton>
      </DM.Trigger>
      <DM.Portal>
        <DM.Content align="end" sideOffset={6} className={MENU_CONTENT_CLASS}>
          <LanguageItems />
        </DM.Content>
      </DM.Portal>
    </DM.Root>
  );
}

/** The languages as menu radio items (also used inside the Help menu on narrow screens). */
export function LanguageItems() {
  const t = useTranslations("language");
  const [locale, setLocale] = useSwitchLocale();
  return (
    <DM.RadioGroup value={locale} onValueChange={(v) => setLocale(v as Locale)}>
      {routing.locales.map((l) => (
        <DM.RadioItem key={l} value={l} className={MENU_ITEM_CLASS}>
          <span className="flex-1">{t(l)}</span>
          <DM.ItemIndicator>
            <Check size={14} aria-hidden />
          </DM.ItemIndicator>
        </DM.RadioItem>
      ))}
    </DM.RadioGroup>
  );
}
