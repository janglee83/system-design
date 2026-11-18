"use client";
import type { ComponentMeta, ConfigField } from "@sd/sim";
import { Copy, Lock, Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/ui/Button";
import { Field, FieldPair } from "@/ui/Field";
import { NumberField } from "@/ui/NumberField";
import { Section } from "@/ui/Section";
import { NodeArt } from "../canvas/art/NodeArt";
import { categoryColor, categoryOf, kindArt } from "../canvas/kinds";
import { deleteSelection, duplicateSelection } from "../commands";
import { displayLabel } from "../labels";
import type { Design } from "../model/design";
import { MAX_REPLICAS, setConfig, updateNode } from "../model/ops";
import { useCheck, useDesign, useDesignApi } from "../store/LabStores";
import { ConfigFieldInput } from "./ConfigFieldInput";
import { advancedSummary, configSummary, connectionsSummary, costBreakdown } from "./summaries";
import { TextField } from "./TextField";

/** Short numeric fields share a row in pairs (design-system §4.1). */
const isShort = (f: ConfigField) => f.kind !== "choice" && typeof f.default !== "boolean";

/** Settings of one node (design-system §4.2, 1). Every control is disabled when a challenge locks the node (R12). */
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
  const locale = useLocale();
  const api = useDesignApi();
  const node = useDesign((s) => s.design.nodes.find((n) => n.id === nodeId));
  const locked = useDesign((s) => s.design.locked.includes(nodeId));
  const edges = useDesign((s) => s.design.edges);
  const nodes = useDesign((s) => s.design.nodes);
  const baseRps = useDesign((s) => s.design.workload.baseRps);
  const cost = useCheck((s) => s.costs[nodeId]);
  if (!node) return null;

  const meta = metas.get(node.kind) ?? null;
  const apply = (fn: (d: Design) => Design) => api.getState().apply(fn);
  const art = kindArt(node.kind);
  const color = categoryColor(node.kind);
  const name = (id: string) => {
    const n = nodes.find((x) => x.id === id);
    return n ? displayLabel(n, metas.get(n.kind) ?? null, t) : id;
  };
  const incoming = edges.filter((e) => e.to === nodeId);
  const outgoing = edges.filter((e) => e.from === nodeId);
  const fields = meta?.fields ?? [];
  const short = fields.filter(isShort);
  const other = fields.filter((f) => !isShort(f));
  const fieldInput = (f: ConfigField) => (
    <Field key={f.key} label={t(`configField.${f.key}`)} inline={typeof f.default === "boolean"}>
      <ConfigFieldInput field={f} value={node.config[f.key]} disabled={locked} onChange={(v) => apply((d) => setConfig(d, nodeId, f.key, v))} />
    </Field>
  );
  const costText = typeof cost === "number" ? t("inspector.costValue", { cost: Math.round(cost) }) : t("lab.node.noPrice");

  return (
    <div data-testid="inspector-node" className="flex min-h-full flex-col">
      <header className="grid grid-cols-[44px_minmax(0,1fr)] items-center gap-3 border-b border-border px-4 py-3.5">
        <span className="grid size-11 place-items-center rounded-md" style={{ color, background: `color-mix(in srgb, ${color} 10%, var(--sd-surface))` }}>
          {art ? <NodeArt kind={art} width={34} height={26} /> : null}
        </span>
        <div className="min-w-0">
          <h2 className="sr-only">{displayLabel(node, meta, t)}</h2>
          <TextField
            label={t("inspector.label")}
            value={node.label}
            placeholder={displayLabel({ ...node, label: "" }, meta, t)}
            disabled={locked}
            variant="title"
            onCommit={(label) => apply((d) => updateNode(d, nodeId, { label }))}
          />
          <p className="truncate px-1 text-caption text-text-3">
            {meta ? t(meta.labelKey) : node.kind} · {t(`paletteCategory.${categoryOf(node.kind)}.name`)}
          </p>
        </div>
      </header>
      {locked ? (
        <p className="flex items-start gap-2 border-b border-border bg-surface-2 px-4 py-2.5 text-caption text-text-2">
          <Lock size={14} aria-hidden className="mt-px shrink-0" />
          {t("inspector.lockedNotice")}
        </p>
      ) : null}

      <Section
        title={t("inspector.settings")}
        id={`${node.kind}:config`}
        summary={configSummary(node, meta, baseRps, t, locale)}
        defaultOpen
      >
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
        {short.length >= 2 ? (
          <FieldPair>
            {short.slice(0, 2).map(fieldInput)}
          </FieldPair>
        ) : (
          short.map(fieldInput)
        )}
        {short.slice(2).map(fieldInput)}
        {other.map(fieldInput)}
      </Section>

      <Section title={t("inspector.cost")} id={`${node.kind}:cost`} summary={costText} defaultOpen>
        <div>
          <p data-testid="inspector-node-cost" className="num text-[22px] leading-7 font-semibold">
            {costText}
          </p>
          <p className="text-caption text-text-3">{costBreakdown(cost, node.replicas, t, locale)}</p>
        </div>
      </Section>

      <Section title={t("inspector.connections")} id={`${node.kind}:connections`} summary={connectionsSummary(incoming.length, outgoing.length, t)}>
        {incoming.length + outgoing.length === 0 ? (
          <p className="text-caption text-text-3">{t("inspector.summary.noConnections")}</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {[...incoming.map((e) => ({ e, dir: "in" as const, other: e.from })), ...outgoing.map((e) => ({ e, dir: "out" as const, other: e.to }))].map(
              ({ e, dir, other: o }) => (
                <li key={e.id} className="flex items-center gap-2 text-body">
                  <span aria-hidden className="h-0.5 w-4 shrink-0 rounded-full" style={{ background: `var(--sd-edge-${e.kind})` }} />
                  <span className="min-w-0 flex-1 truncate">{t(`inspector.connection.${dir}`, { name: name(o) })}</span>
                  <span className="shrink-0 text-caption text-text-3">{t(`edgeKind.${e.kind}`)}</span>
                </li>
              ),
            )}
          </ul>
        )}
      </Section>

      {overrideKeys.length > 0 ? (
        <Section title={t("inspector.advanced")} id={`${node.kind}:advanced`} summary={advancedSummary(node, overrideKeys, t)}>
          <p className="text-caption text-text-3">{t("inspector.advancedHint")}</p>
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

      <footer className="mt-auto flex items-center gap-2 border-t border-border px-4 py-3">
        <Button variant="ghost" disabled={locked} onClick={() => duplicateSelection(api)}>
          <Copy size={14} aria-hidden />
          {t("inspector.duplicate")}
        </Button>
        <Button variant="danger" className="ml-auto" disabled={locked} onClick={() => deleteSelection(api)}>
          <Trash2 size={14} aria-hidden />
          {t("inspector.delete")}
        </Button>
      </footer>
    </div>
  );
}
