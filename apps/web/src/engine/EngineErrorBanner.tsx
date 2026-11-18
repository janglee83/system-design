"use client";
import { useTranslations } from "next-intl";
import { Banner } from "@/ui/Banner";
import { Button } from "@/ui/Button";
import { useEngineStore } from "./EngineProvider";

/** The engine failure banner with retry; nothing while loading or ready (the status strip shows those). */
export function EngineErrorBanner() {
  const t = useTranslations();
  const status = useEngineStore((s) => s.status);
  const retry = useEngineStore((s) => s.retry);
  if (status !== "error") return null;
  return (
    <Banner
      tone="error"
      action={
        <Button size="sm" variant="secondary" onClick={retry}>
          {t("common.retry")}
        </Button>
      }
    >
      {t("engine.failed")}
    </Banner>
  );
}
