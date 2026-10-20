"use client";
import * as S from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "./cn";

export interface SelectOption<T extends string> {
  value: T;
  label: string;
  hint?: string;
  disabled?: boolean;
}

export function Select<T extends string>({
  label,
  value,
  onChange,
  options,
  disabled,
  id,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: SelectOption<T>[];
  disabled?: boolean;
  id?: string;
}) {
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
          <S.Value />
        </span>
        <S.Icon>
          <ChevronDown size={14} aria-hidden className="text-text-3" />
        </S.Icon>
      </S.Trigger>
      <S.Portal>
        <S.Content position="popper" sideOffset={4} className="z-50 min-w-[var(--radix-select-trigger-width)] rounded-md border border-border bg-surface p-1 shadow-2">
          <S.Viewport>
            {options.map((o) => (
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
            ))}
          </S.Viewport>
        </S.Content>
      </S.Portal>
    </S.Root>
  );
}
