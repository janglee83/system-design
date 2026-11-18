"use client";
import * as DM from "@radix-ui/react-dropdown-menu";
import { Check, Monitor, Moon, Sun } from "lucide-react";
import { useTranslations } from "next-intl";
import { IconButton } from "@/ui/IconButton";
import { MENU_CONTENT_CLASS, MENU_ITEM_CLASS } from "./menu-styles";
import type { ThemePref } from "./theme";
import { useTheme } from "./use-theme";

const ICON = { light: Sun, dark: Moon, system: Monitor } as const;
const PREFS: ThemePref[] = ["light", "dark", "system"];

/** A 32 px top-bar button with the current theme's icon; its menu has light, dark and follow the system. */
export function ThemeSwitch() {
  const t = useTranslations("theme");
  const [pref, setPref] = useTheme();
  const Current = ICON[pref];
  return (
    <DM.Root modal={false}>
      <DM.Trigger asChild>
        <IconButton label={t("label")}>
          <Current size={16} aria-hidden />
        </IconButton>
      </DM.Trigger>
      <DM.Portal>
        <DM.Content align="end" sideOffset={6} className={MENU_CONTENT_CLASS}>
          <DM.RadioGroup value={pref} onValueChange={(v) => setPref(v as ThemePref)}>
            {PREFS.map((p) => {
              const Icon = ICON[p];
              return (
                <DM.RadioItem key={p} value={p} className={MENU_ITEM_CLASS}>
                  <Icon size={14} aria-hidden className="text-text-2" />
                  <span className="flex-1">{t(p)}</span>
                  <DM.ItemIndicator>
                    <Check size={14} aria-hidden />
                  </DM.ItemIndicator>
                </DM.RadioItem>
              );
            })}
          </DM.RadioGroup>
        </DM.Content>
      </DM.Portal>
    </DM.Root>
  );
}
