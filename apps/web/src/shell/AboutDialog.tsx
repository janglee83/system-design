"use client";
import { useTranslations } from "next-intl";
import { Dialog } from "@/ui/Dialog";

export function AboutDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const t = useTranslations("about");
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={t("title")}>
      <p className="text-sm text-text-2">{t("body")}</p>
      <p className="num mt-4 text-xs text-text-3">
        {t("appVersion", { version: process.env.NEXT_PUBLIC_APP_VERSION ?? "" })}
      </p>
    </Dialog>
  );
}
