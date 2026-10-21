"use client";
import * as S from "@radix-ui/react-switch";

export function Switch({
  label,
  checked,
  onChange,
  disabled,
  id,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  id?: string;
}) {
  return (
    <S.Root
      id={id}
      aria-label={label}
      checked={checked}
      onCheckedChange={onChange}
      disabled={disabled}
      className="relative inline-flex h-5 w-9 shrink-0 items-center rounded-full bg-surface-3 transition-colors duration-120 data-[state=checked]:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
    >
      <S.Thumb className="block size-4 translate-x-0.5 rounded-full bg-surface shadow-1 transition-transform duration-120 data-[state=checked]:translate-x-[18px]" />
    </S.Root>
  );
}
