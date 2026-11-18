"use client";
import { Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { formatCombo } from "@/lab/shortcuts";
import { useIsMac } from "@/lab/use-shortcuts";
import { usePaletteOpen } from "./command-registry";

/** The top-bar search look-alike; it opens the command palette. */
export function SearchButton() {
  const t = useTranslations("palette2");
  const setOpen = usePaletteOpen((s) => s.setOpen);
  const combo = formatCombo("Mod+K", useIsMac());
  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className="inline-flex h-8 w-56 items-center gap-2 rounded-md border border-border bg-surface-2 px-2.5 text-sm text-text-3 hover:text-text-2"
    >
      <Search size={14} aria-hidden />
      <span className="flex-1 text-left">{t("open")}</span>
      <kbd className="num text-2xs">{combo}</kbd>
    </button>
  );
}
