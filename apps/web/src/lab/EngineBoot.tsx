"use client";
import { Check, Circle, LoaderCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEngineStore } from "@/engine/EngineProvider";
import { cn } from "@/ui/cn";
import { useUi } from "./store/LabStores";

type StepState = "done" | "working" | "waiting";
const stepState = (done: boolean, isCurrent: boolean): StepState => (done ? "done" : isCurrent ? "working" : "waiting");

/** The boot card in the canvas centre while the engine starts (design-system §9): real steps, not a timer. */
export function EngineBoot() {
  const t = useTranslations("boot");
  const status = useEngineStore((s) => s.status);
  const boot = useEngineStore((s) => s.boot);
  const draft = useUi((s) => s.draftChecked);
  if (status !== "loading" && status !== "idle") return null;
  const steps = [
    { key: "core", done: boot.core },
    { key: "calibration", done: boot.calibration },
    { key: "canvas", done: boot.components },
    { key: "draft", done: boot.core && boot.calibration && boot.components && draft },
  ] as const;
  const current = steps.findIndex((s) => !s.done);
  const done = steps.filter((s) => s.done).length;
  return (
    <div className="pointer-events-none absolute inset-0 grid place-items-center">
      <div role="status" data-testid="engine-boot" className="pointer-events-auto w-[380px] rounded-xl border border-border bg-surface p-5 shadow-2">
        <p className="text-heading">{t("title")}</p>
        <p className="mt-0.5 text-caption text-text-3">{t("sub")}</p>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-3">
          <div className="h-full rounded-full bg-accent transition-[width] duration-(--sd-t-panel)" style={{ width: `${(done / steps.length) * 100}%` }} />
        </div>
        <ol className="mt-3 flex flex-col gap-1.5">
          {steps.map((s, i) => {
            const state = stepState(s.done, i === current);
            const Icon = state === "done" ? Check : state === "working" ? LoaderCircle : Circle;
            return (
              <li key={s.key} data-state={state} className={cn("flex items-center gap-2 text-body", state === "waiting" && "text-text-3")}>
                <Icon size={14} aria-hidden className={cn(state === "done" && "text-ok", state === "working" && "animate-spin text-accent-text")} />
                <span className="flex-1">{t(s.key)}</span>
                <span className="sr-only">{t(state)}</span>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
