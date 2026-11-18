"use client";
import { Lock, Search, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/ui/cn";
import { IconButton } from "@/ui/IconButton";
import { NodeArt } from "../canvas/art/NodeArt";
import { categoryColor, kindArt, type Category } from "../canvas/kinds";
import { KindCard } from "./KindCard";
import { canAdd, categoryItems, searchCatalog, type CatalogItem } from "./palette-model";

export const DRAG_MIME = "application/x-sd-kind";

/** The 260 px drawer (design-system §3): header, search across every category, and the rows. */
export function PaletteDrawer({
  items,
  category,
  query,
  onQuery,
  onAdd,
  onClose,
  prices,
}: {
  items: readonly CatalogItem[];
  category: Category;
  query: string;
  onQuery: (q: string) => void;
  onAdd: (kind: string) => void;
  onClose: () => void;
  prices: Readonly<Record<string, number | null>>;
}) {
  const t = useTranslations();
  const searching = query.trim() !== "";
  const groups = searching ? searchCatalog(items, query) : [{ category, items: categoryItems(items, category) }];
  return (
    <div
      id="palette-drawer"
      role="tabpanel"
      aria-labelledby={`palette-tab-${category}`}
      className="flex w-[260px] shrink-0 flex-col border-r border-border bg-surface"
    >
      <div className="px-3 pt-3 pb-2">
        <div className="flex items-start gap-1">
          <div className="min-w-0 flex-1">
            <h2 className="text-[15px] leading-5 font-semibold">{t(`paletteCategory.${category}.name`)}</h2>
            <p className="text-[12.5px] leading-[18px] text-text-3">{t(`paletteCategory.${category}.description`)}</p>
          </div>
          <IconButton label={t("palette.close")} className="-mt-1 -mr-1 size-7" onClick={onClose}>
            <X size={14} aria-hidden />
          </IconButton>
        </div>
        <label className="relative mt-2 block">
          <Search size={14} aria-hidden className="absolute top-1/2 left-2.5 -translate-y-1/2 text-text-3" />
          <input
            type="search"
            aria-label={t("palette.search")}
            placeholder={t("palette.search")}
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            className="h-[34px] w-full rounded-sm border border-transparent bg-surface-2 pr-2 pl-8 text-body placeholder:text-text-3 focus:border-border-strong"
          />
        </label>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
        {groups.length === 0 ? <p className="px-2 text-body text-text-3">{t("palette.noMatch", { query })}</p> : null}
        {groups.map((g) => (
          <section key={g.category} className="mb-2">
            {searching ? <h3 className="section-label px-2 pt-1 pb-1">{t(`paletteCategory.${g.category}.name`)}</h3> : null}
            <ul>
              {g.items.map((it) => (
                <li key={it.kind}>
                  <Row item={it} price={prices[it.kind]} onAdd={onAdd} />
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}

function Row({ item, price, onAdd }: { item: CatalogItem; price: number | null | undefined; onAdd: (kind: string) => void }) {
  const t = useTranslations();
  const ok = canAdd(item);
  const soon = item.status !== "ready";
  const art = kindArt(item.kind);
  const color = categoryColor(item.kind);
  return (
    <KindCard item={item} price={price}>
      <button
        type="button"
        aria-label={t("palette.add", { name: item.name })}
        aria-disabled={!ok || undefined}
        draggable={ok}
        onDragStart={(e) => {
          if (!ok) return e.preventDefault();
          e.dataTransfer.setData(DRAG_MIME, item.kind);
          e.dataTransfer.effectAllowed = "copy";
        }}
        onClick={() => ok && onAdd(item.kind)}
        className={cn(
          "grid w-full grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-2.5 rounded-md px-1.5 py-2 text-left hover:bg-surface-2",
          !ok && "cursor-not-allowed",
        )}
      >
        <span
          aria-hidden
          className={cn("grid size-10 place-items-center rounded-sm", !ok && "opacity-55")}
          style={{ color, background: `color-mix(in srgb, ${color} 10%, var(--sd-surface))` }}
        >
          {art ? <NodeArt kind={art} width={32} height={24} /> : null}
        </span>
        <span className="min-w-0">
          <span className="flex items-center gap-1.5">
            <span className={cn("truncate text-body font-semibold", !ok && "text-text-3")}>{item.name}</span>
            {soon ? <span className="shrink-0 rounded-full bg-surface-3 px-1.5 text-[10.5px] leading-4 font-semibold text-text-2">{t("palette.soon")}</span> : null}
            {!soon && !item.allowed ? (
              <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-surface-3 px-1.5 text-[10.5px] leading-4 font-semibold text-text-2">
                <Lock size={10} aria-hidden />
                {t("palette.locked")}
              </span>
            ) : null}
          </span>
          <span className="line-clamp-2 text-caption text-text-3">{item.description}</span>
        </span>
        {!soon ? <span className="num self-start pt-0.5 text-caption text-text-2">{typeof price === "number" ? t("palette.price", { price: Math.round(price) }) : ""}</span> : <span />}
      </button>
    </KindCard>
  );
}
