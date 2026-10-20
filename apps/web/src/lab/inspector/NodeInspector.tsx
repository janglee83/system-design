"use client";
import type { ComponentMeta } from "@sd/sim";
import { useTranslations } from "next-intl";
import { useId } from "react";
import { Banner } from "@/ui/Banner";
import { Field } from "@/ui/Field";
import { NumberField } from "@/ui/NumberField";
import { Section } from "@/ui/Section";
import { categoryColor, iconFor } from "../canvas/icons";
import { displayLabel } from "../labels";
import type { Design } from "../model/design";
import { MAX_REPLICAS, setConfig, updateNode } from "../model/ops";
import { useCheck, useDesign, useDesignApi } from "../store/LabStores";
import { ConfigFieldInput } from "./ConfigFieldInput";
import { TextField } from "./TextField";

/** Settings of one node. Every control is disabled when a challenge locks the node (R12). */
export function NodeInspector({
  nodeId,
  metas,
  overrideKeys,
}: {
  nodeId: string;
  metas: ReadonlyMap<string, ComponentMeta>;
  overrideKeys: readonly string[];
}) {
  const t = useTranslations();
  const api = useDesignApi();
  const node = useDesign((s) => s.design.nodes.find((n) => n.id === nodeId));
  const locked = useDesign((s) => s.design.locked.includes(nodeId));
  const cost = useCheck((s) => s.costs[nodeId]);
  const labelId = useId();
  if (!node) return null;

  const meta = metas.get(node.kind) ?? null;
  const apply = (fn: (d: Design) => Design) => api.getState().apply(fn);
  const Icon = iconFor(node.kind);
  const color = categoryColor(meta?.category);

  return (
    <div data-testid="node-inspector" className="flex flex-col gap-2">
      <header className="flex items-center gap-2 pb-1">
        <span className="flex size-7 items-center justify-center rounded-sm" style={{ color, background: `color-mix(in srgb, ${color} 14%, transparent)` }}>
          <Icon size={16} aria-hidden />
        </span>
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold">{displayLabel(node, meta, t)}</h2>
          <p className="truncate text-2xs text-text-3">{meta ? t(meta.labelKey) : node.kind}</p>
        </div>
      </header>
      {locked ? <Banner tone="info">{t("inspector.lockedNotice")}</Banner> : null}
      <div>
        <Field label={t("inspector.label")} htmlFor={labelId}>
          <TextField
            id={labelId}
            label={t("inspector.label")}
            value={node.label}
            placeholder={displayLabel({ ...node, label: "" }, meta, t)}
            disabled={locked}
            onCommit={(label) => apply((d) => updateNode(d, nodeId, { label }))}
          />
        </Field>
        <Field label={t("inspector.replicas")}>
          <NumberField
            label={t("inspector.replicas")}
            value={node.replicas}
            min={1}
            max={MAX_REPLICAS}
            integer
            disabled={locked}
            onChange={(v) => {
              if (v !== undefined) apply((d) => updateNode(d, nodeId, { replicas: v }));
            }}
          />
        </Field>
        <Field label={t("inspector.cost")}>
          <span data-testid="node-cost" className="num text-sm">
            {typeof cost === "number" ? t("inspector.costValue", { cost: Math.round(cost) }) : t("lab.node.costUnknown")}
          </span>
        </Field>
      </div>
      {meta && meta.fields.length > 0 ? (
        <Section title={t("inspector.settings")} defaultOpen>
          {meta.fields.map((f) => (
            <Field key={f.key} label={t(`configField.${f.key}`)}>
              <ConfigFieldInput
                field={f}
                value={node.config[f.key]}
                disabled={locked}
                onChange={(v) => apply((d) => setConfig(d, nodeId, f.key, v))}
              />
            </Field>
          ))}
        </Section>
      ) : null}
      {overrideKeys.length > 0 ? (
        <Section title={t("inspector.advanced")}>
          <p className="pb-1 text-xs text-text-3">{t("inspector.advancedHint")}</p>
          {overrideKeys.map((k) => {
            const v = node.config[k];
            return (
              <Field key={k} label={t(`override.${k}`)}>
                <NumberField
                  label={t(`override.${k}`)}
                  value={typeof v === "number" ? v : undefined}
                  min={0}
                  allowEmpty
                  disabled={locked}
                  onChange={(x) => apply((d) => setConfig(d, nodeId, k, x))}
                />
              </Field>
            );
          })}
        </Section>
      ) : null}
    </div>
  );
}
