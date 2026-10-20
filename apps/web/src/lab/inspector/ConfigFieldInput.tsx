"use client";
import type { ConfigField, ConfigValue } from "@sd/sim";
import { useTranslations } from "next-intl";
import { NumberField } from "@/ui/NumberField";
import { Select } from "@/ui/Select";
import { Switch } from "@/ui/Switch";

export function ConfigFieldInput({
  field,
  value,
  onChange,
  disabled,
}: {
  field: ConfigField;
  value: ConfigValue | undefined;
  onChange: (v: ConfigValue | undefined) => void;
  disabled?: boolean;
}) {
  const t = useTranslations();
  const label = t(`configField.${field.key}`);
  const current = value ?? field.default;
  if (typeof field.default === "boolean") {
    return <Switch label={label} checked={current === true} onChange={(v) => onChange(v)} disabled={disabled} />;
  }
  if (field.kind === "choice") {
    return (
      <Select
        label={label}
        value={String(current)}
        onChange={(v) => onChange(v)}
        disabled={disabled}
        options={field.options.map((o) => ({ value: o, label: t(`configOption.${field.key}.${o}`) }))}
      />
    );
  }
  return (
    <NumberField
      label={label}
      value={typeof current === "number" ? current : undefined}
      onChange={(v) => onChange(v)}
      min={field.min}
      max={field.max}
      integer={field.integer}
      disabled={disabled}
    />
  );
}
