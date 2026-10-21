"use client";
import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { useEngineStore } from "@/engine/EngineProvider";
import { Dialog } from "@/ui/Dialog";

export function AboutDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const t = useTranslations("about");
  const start = useEngineStore((s) => s.start);
  const engineVersion = useEngineStore((s) => s.info?.version ?? "…");
  // Opening About is enough reason to start the engine, so its version can be shown.
  useEffect(() => {
    if (open) start();
  }, [open, start]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={t("title")}>
      <p className="text-sm text-text-2">{t("body")}</p>
      <div className="num mt-4 space-y-1 text-xs text-text-3">
        <p>{t("appVersion", { version: process.env.NEXT_PUBLIC_APP_VERSION ?? "" })}</p>
        <p>{t("engineVersion", { version: engineVersion })}</p>
      </div>
    </Dialog>
  );
}
