"use client";
import { useEffect, useState } from "react";

/** Names and labels are short: longer text would only be cut off on the canvas. */
export const TEXT_MAX = 80;

/** A text input that commits trimmed text on blur or Enter (one history step per edit). */
export function TextField({
  id,
  label,
  value,
  placeholder,
  disabled,
  onCommit,
}: {
  id?: string;
  label: string;
  value: string;
  placeholder?: string;
  disabled?: boolean;
  onCommit: (v: string) => void;
}) {
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]);
  const commit = () => {
    const next = text.trim();
    setText(next);
    if (next !== value) onCommit(next);
  };
  return (
    <input
      id={id}
      type="text"
      aria-label={label}
      value={text}
      placeholder={placeholder}
      maxLength={TEXT_MAX}
      disabled={disabled}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") commit();
        if (e.key === "Escape") setText(value);
      }}
      className="h-8 w-full min-w-0 rounded-sm border border-border-strong bg-surface px-2 text-sm placeholder:text-text-3 disabled:cursor-not-allowed disabled:opacity-50"
    />
  );
}
