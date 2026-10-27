"use client";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { IconButton } from "./IconButton";
import { useToasts, type Toast } from "./toast-store";

const BAR: Record<Toast["tone"], string> = {
  info: "var(--sd-info)",
  warn: "var(--sd-busy)",
  error: "var(--sd-over)",
};

/** Short messages at the bottom of the screen, in one polite live region. Mounted once by the shell. */
export function Toaster() {
  const t = useTranslations("common");
  const toasts = useToasts((s) => s.toasts);
  const dismiss = useToasts((s) => s.dismiss);
  return (
    <div
      aria-live="polite"
      role="status"
      className="pointer-events-none fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 flex-col items-center gap-2"
    >
      {toasts.map((x) => (
        <div
          key={x.id}
          data-testid="toast"
          className="pointer-events-auto flex max-w-md items-center gap-3 rounded-lg border border-l-[3px] border-border bg-surface py-1 pr-1 pl-3 text-sm shadow-2"
          style={{ borderLeftColor: BAR[x.tone] }}
        >
          <span className="flex-1">{x.message}</span>
          <IconButton label={t("close")} onClick={() => dismiss(x.id)}>
            <X size={14} aria-hidden />
          </IconButton>
        </div>
      ))}
    </div>
  );
}
