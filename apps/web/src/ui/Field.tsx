"use client";
import { RotateCcw } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "./cn";
import { IconButton } from "./IconButton";

/**
 * A label above its control (design-system §4.1): the label never truncates, so long Vietnamese
 * labels wrap. `hint` explains the number under the control; `changed` marks a value that differs
 * from its default.
 */
export function Field({
  label,
  htmlFor,
  hint,
  inline,
  changed,
  onReset,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: React.ReactNode;
  /** A toggle: the label on the left and the switch on the right, on one row. */
  inline?: boolean;
  changed?: boolean;
  onReset?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      data-field
      className={cn(
        "relative flex min-w-0",
        inline ? "min-h-8 flex-row items-center justify-between gap-3" : "flex-col gap-1.5",
        changed && "before:absolute before:inset-y-0 before:-left-3 before:w-[3px] before:rounded-full before:bg-accent",
      )}
    >
      <label htmlFor={htmlFor} className="text-label break-words text-text-2">
        {label}
      </label>
      <div className={cn("flex min-w-0 items-center gap-1", !inline && "[&>*:first-child]:min-w-0 [&>*:first-child]:flex-1")}>
        {children}
        {changed && onReset ? <ResetButton onReset={onReset} /> : null}
      </div>
      {hint ? <p className="text-caption text-text-3">{hint}</p> : null}
    </div>
  );
}

/** Two short fields side by side (10 px gap). */
export function FieldPair({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-2.5">{children}</div>;
}

function ResetButton({ onReset }: { onReset: () => void }) {
  const t = useTranslations("world");
  return (
    <IconButton label={t("reset")} onClick={onReset} className="size-7 shrink-0">
      <RotateCcw size={14} aria-hidden />
    </IconButton>
  );
}
