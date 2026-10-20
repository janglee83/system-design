"use client";
import { LoaderCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { Banner } from "@/ui/Banner";
import { Button } from "@/ui/Button";
import { useEngineStore } from "./EngineProvider";

/** Engine state: a small chip while loading or ready, an error banner with retry on failure. */
export function EngineStatus() {
  const t = useTranslations();
  const status = useEngineStore((s) => s.status);
  const version = useEngineStore((s) => s.info?.version ?? "");
  const retry = useEngineStore((s) => s.retry);

  if (status === "error") {
    return (
      <div data-testid="engine-status" data-status={status}>
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
      </div>
    );
  }

  return (
    <div
      data-testid="engine-status"
      data-status={status}
      role="status"
      className="inline-flex h-6 items-center gap-1.5 self-start rounded-full border border-border bg-surface px-2.5 text-xs text-text-2"
    >
      {status === "ready" ? (
        <>
          <span aria-hidden className="size-1.5 rounded-full bg-ok" />
          <span className="num">{t("engine.ready", { version })}</span>
        </>
      ) : (
        <>
          <LoaderCircle size={12} aria-hidden className="animate-spin" />
          {t("engine.loading")}
        </>
      )}
    </div>
  );
}
