"use client";
import { Minus, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useId, useState } from "react";
import { cn } from "./cn";

interface Props {
  label: string;
  value: number | undefined;
  onChange: (v: number | undefined) => void;
  min?: number | null;
  max?: number | null;
  step?: number;
  integer?: boolean;
  unit?: string;
  disabled?: boolean;
  placeholder?: string;
  allowEmpty?: boolean;
  id?: string;
}

export function NumberField({ label, value, onChange, min, max, step, integer, unit, disabled, placeholder, allowEmpty, id }: Props) {
  const t = useTranslations("inspector");
  const autoId = useId();
  const inputId = id ?? autoId;
  const [text, setText] = useState(value === undefined ? "" : String(value));
  useEffect(() => setText(value === undefined ? "" : String(value)), [value]);
  const s = step ?? (integer ? 1 : 0.5);

  const clamp = (v: number) => {
    let x = integer ? Math.round(v) : v;
    if (min !== undefined && min !== null) x = Math.max(min, x);
    if (max !== undefined && max !== null) x = Math.min(max, x);
    return x;
  };
  const commit = (raw: string) => {
    if (raw.trim() === "") {
      if (allowEmpty) onChange(undefined);
      else setText(value === undefined ? "" : String(value));
      return;
    }
    // "1,000" is a thousands separator, not 1.0: refuse it rather than guess. A single decimal
    // comma ("2,5", as written in Vietnamese) is accepted.
    const trimmed = raw.trim();
    const n = /^-?\d{1,3}(,\d{3})+$/.test(trimmed) ? Number.NaN : Number(trimmed.replace(",", "."));
    if (!Number.isFinite(n)) {
      setText(value === undefined ? "" : String(value));
      return;
    }
    const v = clamp(n);
    setText(String(v));
    if (v !== value) onChange(v);
  };
  const bump = (dir: 1 | -1) => commit(String((value ?? min ?? 0) + dir * s));

  return (
    <div
      className={cn(
        "flex h-8 items-center rounded-sm border border-border-strong bg-surface",
        // The ring sits on the whole stepper; the input itself draws none (globals.css :focus-visible is in @layer base).
        "focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-focus",
        disabled && "opacity-50",
      )}
    >
      <button type="button" aria-label={t("decrease", { label })} disabled={disabled} onClick={() => bump(-1)} className="flex h-full w-7 items-center justify-center text-text-2 hover:text-text">
        <Minus size={12} aria-hidden />
      </button>
      <input
        id={inputId}
        role="spinbutton"
        aria-label={label}
        aria-valuemin={min ?? undefined}
        aria-valuemax={max ?? undefined}
        aria-valuenow={value}
        inputMode="decimal"
        disabled={disabled}
        placeholder={placeholder}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={(e) => commit(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit((e.target as HTMLInputElement).value);
          if (e.key === "ArrowUp" || e.key === "ArrowDown") {
            e.preventDefault();
            bump(e.key === "ArrowUp" ? 1 : -1);
          }
        }}
        className="num h-full w-full min-w-0 bg-transparent text-center text-sm outline-none focus-visible:outline-none"
      />
      {unit ? <span className="pr-1 text-2xs text-text-3">{unit}</span> : null}
      <button type="button" aria-label={t("increase", { label })} disabled={disabled} onClick={() => bump(1)} className="flex h-full w-7 items-center justify-center text-text-2 hover:text-text">
        <Plus size={12} aria-hidden />
      </button>
    </div>
  );
}
