"use client";
import { Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { formatCombo } from "@/lab/shortcuts";
import { useIsMac } from "@/lab/use-shortcuts";
import { IconButton } from "@/ui/IconButton";
import { usePaletteOpen } from "./command-registry";

/** Opens the command palette (the palette's own search field shows the shortcut too). */
export function SearchButton() {
  const t = useTranslations("palette2");
  const setOpen = usePaletteOpen((s) => s.setOpen);
  return (
    <IconButton label={t("open")} shortcut={formatCombo("Mod+K", useIsMac())} onClick={() => setOpen(true)}>
      <Search size={16} aria-hidden />
    </IconButton>
  );
}
