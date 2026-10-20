"use client";
import { RotateCcw } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "./cn";
import { IconButton } from "./IconButton";

/** A 32 px label/control row. `changed` marks a value that differs from its default. */
export function Field({
  label,
  htmlFor,
  changed,
  onReset,
  children,
}: {
  label: string;
  htmlFor?: string;
  changed?: boolean;
  onReset?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "relative flex min-h-8 items-center justify-between gap-3 py-0.5",
        changed && "before:absolute before:inset-y-1 before:-left-3 before:w-[3px] before:rounded-full before:bg-accent",
      )}
    >
      <label htmlFor={htmlFor} className="min-w-0 flex-1 truncate text-sm text-text-2">
        {label}
      </label>
      <div className="flex w-40 shrink-0 items-center justify-end gap-1">
        {children}
        {changed && onReset ? <ResetButton onReset={onReset} /> : null}
      </div>
    </div>
  );
}

function ResetButton({ onReset }: { onReset: () => void }) {
  const t = useTranslations("world");
  return (
    <IconButton label={t("reset")} onClick={onReset} className="size-7">
      <RotateCcw size={14} aria-hidden />
    </IconButton>
  );
}
