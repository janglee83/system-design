"use client";
import * as T from "@radix-ui/react-tabs";

export const Tabs = T.Root;
export const TabsContent = T.Content;

export function TabsList({ label, items }: { label: string; items: { value: string; label: string; badge?: number; badgeLabel?: string }[] }) {
  return (
    <T.List aria-label={label} className="flex h-9 items-stretch gap-1">
      {items.map((it) => (
        <T.Trigger
          key={it.value}
          value={it.value}
          className="relative inline-flex items-center gap-1.5 px-2.5 text-label font-medium text-text-2 hover:text-text data-[state=active]:font-semibold data-[state=active]:text-text data-[state=active]:after:absolute data-[state=active]:after:inset-x-2 data-[state=active]:after:bottom-0 data-[state=active]:after:h-0.5 data-[state=active]:after:bg-accent-text"
        >
          {it.label}
          {it.badge ? (
            <span className="num rounded-full bg-over-soft px-1.5 text-[11px] leading-4 font-semibold text-over" aria-label={it.badgeLabel}>
              {it.badge}
            </span>
          ) : null}
        </T.Trigger>
      ))}
    </T.List>
  );
}
