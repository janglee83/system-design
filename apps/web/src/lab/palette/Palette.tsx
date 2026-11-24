"use client";
import type { ComponentMeta } from "@sd/sim";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import type { Category } from "../canvas/kinds";
import { CategoryRail } from "./CategoryRail";
import { PaletteDrawer } from "./PaletteDrawer";
import { buildCatalog, CATEGORIES, canAdd } from "./palette-model";

export { DRAG_MIME } from "./PaletteDrawer";

const OPEN_KEY = "sd-palette-open";

/**
 * The open category, remembered in this browser ("" = closed). Without a remembered choice the
 * drawer starts open on wide screens and closed at 1400 px or less, where the canvas needs the room.
 */
function readOpen(): Category | null {
  const fallback: Category | null = window.innerWidth > 1400 ? "entry" : null;
  try {
    const v = window.localStorage.getItem(OPEN_KEY);
    if (v === null) return fallback;
    if (v === "") return null;
    return CATEGORIES.includes(v as Category) ? (v as Category) : fallback;
  } catch {
    return fallback;
  }
}

/** The 4C palette: a category rail plus a drawer (design-system §3). Presentation; adding is onAdd. */
export function Palette({
  metas,
  planned,
  onAdd,
  allowedKinds,
  running = false,
  prices = {},
}: {
  metas: readonly ComponentMeta[];
  planned: readonly string[];
  onAdd: (kind: string) => void;
  allowedKinds?: readonly string[] | null;
  running?: boolean;
  prices?: Readonly<Record<string, number | null>>;
}) {
  const t = useTranslations();
  const [open, setOpenState] = useState<Category | null>("entry");
  const [query, setQuery] = useState("");
  useEffect(() => setOpenState(readOpen()), []);
  const setOpen = (c: Category | null) => {
    setOpenState(c);
    try {
      window.localStorage.setItem(OPEN_KEY, c ?? "");
    } catch {
      // storage blocked: remembered for this page only
    }
  };
  const items = useMemo(() => buildCatalog({ metas, planned, t, allowedKinds }), [metas, planned, t, allowedKinds]);
  const add = (kind: string) => {
    const it = items.find((i) => i.kind === kind);
    if (it && canAdd(it) && !running) onAdd(kind);
  };
  // While a run is on the drawer closes and adding waits (design-system §3, Running).
  const shown = running ? null : open;
  return (
    <div className="flex h-full min-h-0" data-testid="palette">
      <CategoryRail items={items} open={shown} onOpen={setOpen} blocked={running ? t("palette.running") : null} />
      {shown ? (
        <PaletteDrawer items={items} category={shown} query={query} onQuery={setQuery} onAdd={add} onClose={() => setOpen(null)} prices={prices} />
      ) : null}
    </div>
  );
}
