"use client";
import * as T from "@radix-ui/react-tabs";

export const Tabs = T.Root;
export const TabsContent = T.Content;

export function TabsList({ label, items }: { label: string; items: { value: string; label: string }[] }) {
  return (
    <T.List aria-label={label} className="flex h-9 items-stretch gap-1">
      {items.map((it) => (
        <T.Trigger
          key={it.value}
          value={it.value}
          className="relative px-2 text-sm font-medium text-text-2 hover:text-text data-[state=active]:text-text data-[state=active]:after:absolute data-[state=active]:after:inset-x-2 data-[state=active]:after:bottom-0 data-[state=active]:after:h-0.5 data-[state=active]:after:bg-accent"
        >
          {it.label}
        </T.Trigger>
      ))}
    </T.List>
  );
}
