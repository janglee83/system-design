"use client";
import * as D from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "./cn";

export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  footer,
  wide,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  footer?: React.ReactNode;
  wide?: boolean;
  children?: React.ReactNode;
}) {
  const t = useTranslations("common");
  return (
    <D.Root open={open} onOpenChange={onOpenChange}>
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-40 bg-scrim" />
        <D.Content
          className={cn(
            "fixed top-1/2 left-1/2 z-50 max-h-[85dvh] -translate-x-1/2 -translate-y-1/2 overflow-auto",
            "rounded-xl border border-border bg-surface p-6 shadow-3",
            wide ? "w-[720px]" : "w-[480px]",
          )}
        >
          <D.Title className="pr-8 text-lg font-semibold">{title}</D.Title>
          {description ? <D.Description className="mt-1 text-sm text-text-2">{description}</D.Description> : null}
          <div className="mt-4">{children}</div>
          {footer ? <div className="mt-6 flex justify-end gap-2">{footer}</div> : null}
          <D.Close
            aria-label={t("close")}
            className="absolute top-4 right-4 inline-flex size-8 items-center justify-center rounded-md text-text-2 hover:bg-surface-2"
          >
            <X size={16} aria-hidden />
          </D.Close>
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}
