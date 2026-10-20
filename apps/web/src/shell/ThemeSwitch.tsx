"use client";
import { Monitor, Moon, Sun } from "lucide-react";
import { useTranslations } from "next-intl";
import { Segmented } from "@/ui/Segmented";
import type { ThemePref } from "./theme";
import { useTheme } from "./use-theme";

export function ThemeSwitch() {
  const t = useTranslations("theme");
  const [pref, setPref] = useTheme();
  return (
    <Segmented<ThemePref>
      label={t("label")}
      value={pref}
      onChange={setPref}
      items={[
        { value: "light", label: t("light"), icon: <Sun size={14} aria-hidden /> },
        { value: "dark", label: t("dark"), icon: <Moon size={14} aria-hidden /> },
        { value: "system", label: t("system"), icon: <Monitor size={14} aria-hidden /> },
      ]}
    />
  );
}
