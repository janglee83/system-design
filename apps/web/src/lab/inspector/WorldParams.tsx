"use client";
import type { Calibration } from "@sd/sim";
import { useTranslations } from "next-intl";
import { Button } from "@/ui/Button";
import { Field } from "@/ui/Field";
import { NumberField } from "@/ui/NumberField";
import { Section } from "@/ui/Section";
import { CALIBRATION_GROUPS, calibrationBounds } from "../model/calibration-meta";
import { setCalibration } from "../model/ops";
import { useDesign, useDesignApi } from "../store/LabStores";

/** The design's world parameters (spec §5.3). Only values that differ from the engine's defaults are stored. */
export function WorldParams({ defaults }: { defaults: Calibration }) {
  const t = useTranslations();
  const api = useDesignApi();
  const overrides = useDesign((s) => s.design.calibration);
  const changed = Object.keys(overrides).length;
  const title = changed > 0 ? `${t("world.title")} · ${t("world.changed", { count: changed })}` : t("world.title");

  return (
    <Section title={title} id="design:world" summary={changed > 0 ? t("world.changed", { count: changed }) : t("world.allDefault")}>
      <p className="text-caption text-text-3">{t("world.intro")}</p>
      {CALIBRATION_GROUPS.map((g) => (
        <div key={g.id} className="flex flex-col gap-3">
          <h3 className="section-label">{t(`world.group.${g.id}`)}</h3>
          {g.fields.map((f) => {
            const value = overrides[f] ?? defaults[f];
            const isChanged = overrides[f] !== undefined;
            const { min, max, step } = calibrationBounds(f);
            return (
              <div key={f} data-testid={`world-${f}`} data-changed={isChanged}>
                <Field
                  label={t(`calibration.${f}`)}
                  changed={isChanged}
                  hint={isChanged ? t("world.default", { value: defaults[f] }) : undefined}
                  onReset={() => api.getState().apply((d) => setCalibration(d, f, undefined, defaults))}
                >
                  <NumberField
                    label={t(`calibration.${f}`)}
                    value={value}
                    min={min}
                    max={max}
                    step={step}
                    onChange={(v) => v !== undefined && api.getState().apply((d) => setCalibration(d, f, v, defaults))}
                  />
                </Field>
              </div>
            );
          })}
        </div>
      ))}
      {changed > 0 ? (
        <Button size="sm" variant="ghost" onClick={() => api.getState().apply((d) => ({ ...d, calibration: {} }))}>
          {t("world.resetAll")}
        </Button>
      ) : null}
    </Section>
  );
}
