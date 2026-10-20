"use client";
import { useTranslations } from "next-intl";
import { useId } from "react";
import { Field } from "@/ui/Field";
import { setName } from "../model/ops";
import { useDesign, useDesignApi } from "../store/LabStores";
import { TextField } from "./TextField";

/** Design-wide settings. Phase 3 adds workload, faults and world parameters. */
export function DesignSettings() {
  const t = useTranslations("inspector");
  const api = useDesignApi();
  const name = useDesign((s) => s.design.name);
  const id = useId();
  return (
    <div data-testid="design-settings" className="flex flex-col gap-2">
      <h2 className="pb-1 text-sm font-semibold">{t("design")}</h2>
      <Field label={t("name")} htmlFor={id}>
        <TextField id={id} label={t("name")} value={name} placeholder={t("untitled")} onCommit={(v) => api.getState().apply((d) => setName(d, v))} />
      </Field>
    </div>
  );
}
