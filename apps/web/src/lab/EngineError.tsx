"use client";
import { ShieldCheck, TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEngineStore } from "@/engine/EngineProvider";
import { Button } from "@/ui/Button";
import { useDesign, useUi, useUiApi } from "./store/LabStores";

/**
 * The engine error card (design-system §9). The design stays on the canvas (greyed by LabApp) and
 * is never cleared; "Sửa thiết kế khi chưa chạy được" puts the card aside so editing works.
 */
export function EngineError() {
  const t = useTranslations();
  const status = useEngineStore((s) => s.status);
  const error = useEngineStore((s) => s.error);
  const retry = useEngineStore((s) => s.retry);
  const name = useDesign((s) => s.design.name) || t("inspector.untitled");
  const dismissed = useUi((s) => s.errorDismissed);
  const ui = useUiApi();
  if (status !== "error" || dismissed) return null;
  return (
    <div className="pointer-events-none absolute inset-0 z-20 grid place-items-center p-6">
      <div
        role="alert"
        data-testid="engine-error"
        className="pointer-events-auto w-[460px] rounded-xl border bg-surface p-5 shadow-3"
        style={{ borderColor: "color-mix(in srgb, var(--sd-over) 35%, transparent)" }}
      >
        <div className="flex items-start gap-3">
          <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-full bg-over-soft text-over">
            <TriangleAlert size={18} />
          </span>
          <div className="min-w-0">
            <p className="text-heading">{t("engineError.title")}</p>
            <p className="mt-1 text-body text-text-2">{t("engineError.cause")}</p>
          </div>
        </div>
        <p className="mt-3 flex items-center gap-2 rounded-md bg-ok-soft px-3 py-2 text-caption text-ok">
          <ShieldCheck size={14} aria-hidden />
          {t("engineError.safe", { name })}
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button
            variant="primary"
            onClick={() => {
              ui.getState().set({ errorDismissed: false });
              retry();
            }}
          >
            {t("common.retry")}
          </Button>
          <Button variant="ghost" onClick={() => ui.getState().set({ errorDismissed: true })}>
            {t("engineError.edit")}
          </Button>
        </div>
        {error ? (
          <details className="mt-3 text-caption text-text-3">
            <summary className="cursor-default">{t("engineError.details")}</summary>
            <code className="mt-1 block font-mono break-all">{error}</code>
          </details>
        ) : null}
      </div>
    </div>
  );
}
