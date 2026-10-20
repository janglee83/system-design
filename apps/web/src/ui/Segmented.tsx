"use client";
import * as TG from "@radix-ui/react-toggle-group";
import { cn } from "./cn";

export function Segmented<T extends string>({
  label,
  value,
  onChange,
  items,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  items: { value: T; label: string; icon?: React.ReactNode; title?: string }[];
}) {
  return (
    <TG.Root
      type="single"
      aria-label={label}
      value={value}
      onValueChange={(v) => v && onChange(v as T)}
      className="inline-flex h-8 items-center rounded-md border border-border bg-surface-2 p-0.5"
    >
      {items.map((it) => (
        <TG.Item
          key={it.value}
          value={it.value}
          aria-label={it.icon ? it.label : undefined}
          title={it.title ?? (it.icon ? it.label : undefined)}
          className={cn(
            "inline-flex h-7 min-w-7 items-center justify-center rounded-sm px-1.5 text-xs font-medium text-text-2",
            "data-[state=on]:bg-surface data-[state=on]:text-text data-[state=on]:shadow-1",
          )}
        >
          {it.icon ?? it.label}
        </TG.Item>
      ))}
    </TG.Root>
  );
}
