"use client";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { createPortal } from "react-dom";
import { create } from "zustand";
import { cn } from "./cn";
import { IconButton } from "./IconButton";
import { useToasts, type Toast } from "./toast-store";

const BAR: Record<Toast["tone"], string> = {
  info: "var(--sd-info)",
  warn: "var(--sd-busy-line)",
  error: "var(--sd-over)",
};

/** Where toasts go instead of floating: a page's own lane (the Lab's status strip), so they never cover content. */
export const useToastLane = create<{ lane: HTMLElement | null; setLane(el: HTMLElement | null): void }>()((set) => ({
  lane: null,
  setLane: (lane) => set({ lane }),
}));

/** Short messages in one polite live region. Mounted once by the shell. */
export function Toaster() {
  const t = useTranslations("common");
  const toasts = useToasts((s) => s.toasts);
  const dismiss = useToasts((s) => s.dismiss);
  const lane = useToastLane((s) => s.lane);
  const shown = lane ? toasts.slice(-1) : toasts; // a lane is one line: the latest message
  const list = (
    <div
      aria-live="polite"
      role="status"
      className={cn(
        "flex gap-2",
        lane ? "h-full min-w-0 items-center" : "pointer-events-none fixed top-16 right-4 z-50 flex-col items-end",
      )}
    >
      {shown.map((x) => (
        <div
          key={x.id}
          data-testid="toast"
          title={x.message}
          className={cn(
            "pointer-events-auto flex min-w-0 items-center gap-2 border-l-[3px] bg-surface",
            lane ? "h-[22px] rounded-sm border border-border pl-2 text-caption text-text" : "max-w-md gap-3 rounded-lg border border-border py-1 pr-1 pl-3 text-body shadow-2",
          )}
          style={{ borderLeftColor: BAR[x.tone] }}
        >
          <span className={cn("min-w-0 flex-1", lane && "truncate")}>{x.message}</span>
          <IconButton label={t("close")} onClick={() => dismiss(x.id)} className={lane ? "size-5" : undefined}>
            <X size={lane ? 12 : 14} aria-hidden />
          </IconButton>
        </div>
      ))}
    </div>
  );
  return lane ? createPortal(list, lane) : list;
}
