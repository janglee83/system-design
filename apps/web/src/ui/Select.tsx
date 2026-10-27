"use client";
import * as S from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "./cn";

export interface SelectOption<T extends string> {
  value: T;
  label: string;
  hint?: string;
  disabled?: boolean;
  /** Options with a group are listed under that group's heading, in order of first appearance. */
  group?: string;
}

export function Select<T extends string>({
  label,
  value,
  onChange,
  options,
  disabled,
  id,
  placeholder,
}: {
  label: string;
  /** "" shows the placeholder. */
  value: T | "";
  onChange: (v: T) => void;
  options: SelectOption<T>[];
  disabled?: boolean;
  id?: string;
  placeholder?: string;
}) {
  const groups: { name: string | undefined; items: SelectOption<T>[] }[] = [];
  for (const o of options) {
    const g = groups.find((x) => x.name === o.group);
    if (g) g.items.push(o);
    else groups.push({ name: o.group, items: [o] });
  }
  const item = (o: SelectOption<T>) => (
    <S.Item
      key={o.value}
      value={o.value}
      disabled={o.disabled}
      className="relative flex h-7 cursor-default items-center rounded-sm pr-2 pl-6 text-sm outline-none select-none data-[disabled]:text-text-3 data-[highlighted]:bg-surface-2"
    >
      <S.ItemIndicator className="absolute left-1.5">
        <Check size={12} aria-hidden />
      </S.ItemIndicator>
      <S.ItemText>{o.label}</S.ItemText>
      {o.hint ? <span className="ml-2 text-xs text-text-3">{o.hint}</span> : null}
    </S.Item>
  );
  return (
    <S.Root value={value} onValueChange={(v) => onChange(v as T)} disabled={disabled}>
      <S.Trigger
        id={id}
        aria-label={label}
        className={cn(
          "inline-flex h-8 w-full min-w-0 items-center justify-between gap-1 rounded-sm border border-border-strong bg-surface px-2 text-sm",
          "disabled:cursor-not-allowed disabled:opacity-50",
        )}
      >
        <span className="truncate">
          <S.Value placeholder={placeholder} />
        </span>
        <S.Icon>
          <ChevronDown size={14} aria-hidden className="text-text-3" />
        </S.Icon>
      </S.Trigger>
      <S.Portal>
        <S.Content position="popper" sideOffset={4} className="z-50 min-w-[var(--radix-select-trigger-width)] rounded-md border border-border bg-surface p-1 shadow-2">
          <S.Viewport>
            {groups.map((g, i) =>
              g.name === undefined ? (
                g.items.map(item)
              ) : (
                <S.Group key={g.name}>
                  {i > 0 ? <S.Separator className="my-1 h-px bg-border" /> : null}
                  <S.Label className="section-label px-2 py-1">{g.name}</S.Label>
                  {g.items.map(item)}
                </S.Group>
              ),
            )}
          </S.Viewport>
        </S.Content>
      </S.Portal>
    </S.Root>
  );
}
