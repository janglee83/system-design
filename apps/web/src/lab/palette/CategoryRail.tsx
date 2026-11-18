"use client";
import { useTranslations } from "next-intl";
import { useRef } from "react";
import { cn } from "@/ui/cn";
import { Tooltip } from "@/ui/Tooltip";
import { NodeArt } from "../canvas/art/NodeArt";
import type { Category } from "../canvas/kinds";
import { kindArt } from "../canvas/kinds";
import { CATEGORIES, type CatalogItem } from "./palette-model";

/** The 76 px category rail (design-system §3): a vertical tablist; the active tab again closes the drawer. */
export function CategoryRail({
  items,
  open,
  onOpen,
  blocked,
}: {
  items: readonly CatalogItem[];
  open: Category | null;
  onOpen: (c: Category | null) => void;
  /** While a run is on: the reason adding is blocked. */
  blocked: string | null;
}) {
  const t = useTranslations();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const move = (from: number, by: number) => refs.current[(from + by + CATEGORIES.length) % CATEGORIES.length]?.focus();
  return (
    <div
      role="tablist"
      aria-orientation="vertical"
      aria-label={t("palette.rail")}
      className="flex w-[76px] shrink-0 flex-col items-center gap-1.5 overflow-y-auto border-r border-border bg-surface pt-3 pb-3"
    >
      {CATEGORIES.map((c, i) => {
        const first = items.find((it) => it.category === c);
        const art = first ? kindArt(first.kind) : null;
        const active = open === c;
        const tab = (
          <button
            key={c}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="tab"
            id={`palette-tab-${c}`}
            aria-selected={active}
            aria-controls={active ? "palette-drawer" : undefined}
            aria-disabled={blocked ? true : undefined}
            tabIndex={active || (open === null && i === 0) ? 0 : -1}
            onClick={() => !blocked && onOpen(active ? null : c)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") move(i, 1);
              else if (e.key === "ArrowUp") move(i, -1);
              else return;
              e.preventDefault();
            }}
            className={cn(
              "flex min-h-[52px] w-[66px] flex-col items-center justify-center gap-1 rounded-md px-1 py-1.5 text-center text-[10.5px] leading-[13px] text-text-2 hover:bg-surface-2 hover:text-text",
              active && "bg-surface-2 font-semibold text-text",
              blocked && "cursor-not-allowed opacity-60",
            )}
          >
            <span
              aria-hidden
              className="grid size-[26px] place-items-center rounded-[8px]"
              style={{ color: `var(--sd-cat-${c})`, background: `color-mix(in srgb, var(--sd-cat-${c}) 12%, transparent)` }}
            >
              {art ? <NodeArt kind={art} width={22} height={16} /> : null}
            </span>
            <span className="line-clamp-2">{t(`paletteCategory.${c}.short`)}</span>
          </button>
        );
        return blocked ? (
          <Tooltip key={c} side="right" content={blocked}>
            {tab}
          </Tooltip>
        ) : (
          tab
        );
      })}
    </div>
  );
}
