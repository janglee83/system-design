"use client";
import * as D from "@radix-ui/react-dialog";
import { Command } from "cmdk";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { createSearch, groupResults, type SearchItem } from "./search";

/** ⌘K: one search over commands, components, lessons and challenges, in either language (R25). */
export function CommandPalette({
  open,
  onOpenChange,
  items,
  locale,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: readonly SearchItem[];
  locale: string;
}) {
  const t = useTranslations("palette2");
  const [query, setQuery] = useState("");
  const search = useMemo(() => createSearch(items), [items]);
  const results = useMemo(() => search(query), [search, query]);
  const lang = locale === "vi" ? "vi" : "en";
  useEffect(() => {
    if (open) setQuery("");
  }, [open]);

  return (
    <D.Root open={open} onOpenChange={onOpenChange}>
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-40 bg-scrim" />
        <D.Content
          aria-describedby={undefined}
          className="fixed top-[12dvh] left-1/2 z-50 w-[560px] max-w-[calc(100vw-32px)] -translate-x-1/2 overflow-hidden rounded-xl border border-border bg-surface shadow-3"
        >
          <D.Title className="sr-only">{t("open")}</D.Title>
          <Command shouldFilter={false} loop label={t("open")}>
            <Command.Input
              autoFocus
              aria-label={t("open")}
              placeholder={t("placeholder")}
              value={query}
              onValueChange={setQuery}
              className="h-11 w-full border-b border-border bg-transparent px-4 text-body outline-none placeholder:text-text-3"
            />
            <Command.List className="max-h-[50dvh] overflow-y-auto p-1">
              {results.length === 0 && query.trim() ? (
                <Command.Empty className="px-3 py-4 text-body text-text-3">{t("empty", { query: query.trim() })}</Command.Empty>
              ) : null}
              {groupResults(results).map(({ group: g, items: inGroup }) => {
                return (
                  <Command.Group key={g} heading={t(`group.${g}`)} className="pb-1 [&_[cmdk-group-heading]]:section-label [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1">
                    {inGroup.map((item) => (
                      <Command.Item
                        key={item.id}
                        value={item.id}
                        onSelect={() => {
                          onOpenChange(false);
                          item.run();
                        }}
                        className="flex cursor-default items-center gap-3 rounded-md px-2 py-1.5 text-body data-[selected=true]:bg-surface-2"
                      >
                        <span className="min-w-0 flex-1 truncate">{item.title[lang]}</span>
                        {item.subtitle ? <span className="truncate text-caption text-text-3">{item.subtitle[lang]}</span> : null}
                      </Command.Item>
                    ))}
                  </Command.Group>
                );
              })}
            </Command.List>
          </Command>
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}
