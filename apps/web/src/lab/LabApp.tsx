"use client";
import { useTranslations } from "next-intl";
import { useEngineStart } from "@/engine/EngineProvider";
import { EngineStatus } from "@/engine/EngineStatus";

export function LabApp() {
  useEngineStart();
  const t = useTranslations("lab");
  return (
    <div data-testid="lab-page" className="flex min-h-0 flex-1 flex-col p-3">
      <h1 className="sr-only">{t("title")}</h1>
      <EngineStatus />
    </div>
  );
}
