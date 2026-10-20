"use client";
import type { ComponentMeta, EdgeKind } from "@sd/sim";
import { useTranslations } from "next-intl";
import { EDGE_KINDS } from "@/i18n/engine-codes";
import { Field } from "@/ui/Field";
import { Select } from "@/ui/Select";
import { displayLabel } from "../labels";
import { setEdgeKind } from "../model/ops";
import { useDesign, useDesignApi } from "../store/LabStores";

/** One connection: its ends and its kind. A kind the target does not accept stays selectable (R13). */
export function EdgeInspector({ edgeId, metas }: { edgeId: string; metas: ReadonlyMap<string, ComponentMeta> }) {
  const t = useTranslations();
  const api = useDesignApi();
  const edge = useDesign((s) => s.design.edges.find((e) => e.id === edgeId));
  const nodes = useDesign((s) => s.design.nodes);
  if (!edge) return null;
  const label = (id: string) => {
    const n = nodes.find((x) => x.id === id);
    return n ? displayLabel(n, metas.get(n.kind) ?? null, t) : id;
  };
  const target = nodes.find((n) => n.id === edge.to);
  const accepts = target ? metas.get(target.kind)?.accepts : undefined;
  return (
    <div data-testid="inspector-edge" className="flex flex-col gap-2">
      <header className="pb-1">
        <h2 className="text-sm font-semibold">{t("inspector.edge")}</h2>
        <p className="truncate text-xs text-text-2">
          {label(edge.from)} → {label(edge.to)}
        </p>
      </header>
      <Field label={t("inspector.edgeKind")}>
        <Select<EdgeKind>
          label={t("inspector.edgeKind")}
          value={edge.kind}
          onChange={(k) => api.getState().apply((d) => setEdgeKind(d, edgeId, k))}
          options={EDGE_KINDS.map((k) => ({
            value: k,
            label:
              !accepts || accepts.includes(k)
                ? t(`edgeKind.${k}`)
                : t("inspector.edgeKindNotAccepted", { kind: t(`edgeKind.${k}`), target: label(edge.to) }),
          }))}
        />
      </Field>
    </div>
  );
}
