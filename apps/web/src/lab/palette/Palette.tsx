"use client";
import type { ComponentMeta } from "@sd/sim";
import { Lock, Plus, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { cn } from "@/ui/cn";
import { Tooltip } from "@/ui/Tooltip";
import { categoryColor, iconFor } from "../canvas/icons";
import { paletteGroups } from "./palette-model";

export const DRAG_MIME = "application/x-sd-kind";

export function Palette({
  metas,
  onAdd,
  allowedKinds,
}: {
  metas: readonly ComponentMeta[];
  onAdd: (kind: string) => void;
  allowedKinds?: readonly string[] | null;
}) {
  const tAll = useTranslations();
  const t = useTranslations("palette");
  const [query, setQuery] = useState("");
  const groups = useMemo(() => paletteGroups(metas, { query, t: tAll, allowedKinds }), [metas, query, tAll, allowedKinds]);
  return (
    <div className="flex h-full flex-col">
      <label className="relative m-3">
        <Search size={14} aria-hidden className="absolute top-1/2 left-2.5 -translate-y-1/2 text-text-3" />
        <input
          type="search"
          aria-label={t("search")}
          placeholder={t("search")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="h-8 w-full rounded-sm border border-border-strong bg-surface pr-2 pl-8 text-sm placeholder:text-text-3"
        />
      </label>
      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
        {groups.length === 0 ? <p className="px-2 text-sm text-text-3">{t("noMatch", { query })}</p> : null}
        {groups.map((g) => (
          <section key={g.category} className="mb-3">
            <h2 className="section-label px-2 pb-1">{tAll(`category.${g.category}`)}</h2>
            <ul>
              {g.items.map((it) => {
                const Icon = iconFor(it.kind);
                const color = categoryColor(metas.find((m) => m.kind === it.kind)?.category);
                return (
                  <li key={it.kind}>
                    <Tooltip side="right" content={it.allowed ? it.description : t("notAllowed")}>
                      <button
                        type="button"
                        aria-label={t("add", { name: it.name })}
                        aria-disabled={!it.allowed}
                        draggable={it.allowed}
                        onDragStart={(e) => {
                          e.dataTransfer.setData(DRAG_MIME, it.kind);
                          e.dataTransfer.effectAllowed = "copy";
                        }}
                        onClick={() => it.allowed && onAdd(it.kind)}
                        className={cn(
                          "group flex h-9 w-full items-center gap-2 rounded-md px-2 text-left text-sm font-medium hover:bg-surface-2",
                          !it.allowed && "cursor-not-allowed opacity-50",
                        )}
                      >
                        <span className="flex size-6 items-center justify-center rounded-sm" style={{ color, background: `color-mix(in srgb, ${color} 14%, transparent)` }}>
                          <Icon size={14} aria-hidden />
                        </span>
                        <span className="flex-1 truncate">{it.name}</span>
                        {it.allowed ? (
                          <Plus size={14} aria-hidden className="text-text-3 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100" />
                        ) : (
                          <Lock size={14} aria-hidden className="text-text-3" />
                        )}
                      </button>
                    </Tooltip>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
