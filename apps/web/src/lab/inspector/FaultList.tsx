"use client";
import type { ComponentMeta, Fault, FaultKind } from "@sd/sim";
import { Dices, Plus, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { ALL_FAULT_KINDS } from "@/i18n/engine-codes";
import { Button } from "@/ui/Button";
import { IconButton } from "@/ui/IconButton";
import { NumberField } from "@/ui/NumberField";
import { Section } from "@/ui/Section";
import { Select } from "@/ui/Select";
import { toast } from "@/ui/toast-store";
import { displayLabel } from "../labels";
import { defaultFault, randomFault, targetsFor } from "../model/faults";
import { setFaults } from "../model/ops";
import { useDesign, useDesignApi } from "../store/LabStores";

/** "any matching" in the target select; Select values cannot be null. */
const ANY = "__any";

/** The design's faults (R20). Kinds the engine does not apply yet are listed but disabled. */
export function FaultList({ supported, metas }: { supported: readonly FaultKind[]; metas: ReadonlyMap<string, ComponentMeta> }) {
  const t = useTranslations();
  const api = useDesignApi();
  const faults = useDesign((s) => s.design.faults);
  const design = useDesign((s) => s.design);
  const durationS = design.durationMs / 1000;
  const write = (next: Fault[]) => api.getState().apply((d) => setFaults(d, next));
  const update = (i: number, patch: Partial<Fault>) => write(faults.map((f, k) => (k === i ? { ...f, ...patch } : f)));
  const label = (id: string) => {
    const n = design.nodes.find((x) => x.id === id);
    return n ? displayLabel(n, metas.get(n.kind) ?? null, t) : id;
  };

  const addRandom = () => {
    const f = randomFault(api.getState().design, metas, supported);
    if (!f) {
      toast(t("faults.noCandidate"), "info");
      return;
    }
    write([...api.getState().design.faults, f]);
  };

  return (
    <Section title={t("faults.title")} defaultOpen>
      {faults.length === 0 ? <p className="pb-2 text-sm text-text-3">{t("faults.empty")}</p> : null}
      <ul className="flex flex-col gap-2">
        {faults.map((f, i) => {
          const targets = targetsFor(f.kind, design, metas);
          return (
            <li key={i} data-testid={`fault-${i}`} className="flex flex-col gap-1 rounded-md border border-border bg-surface p-2">
              <div className="flex items-center gap-1">
                <div className="min-w-0 flex-1">
                  <Select<FaultKind>
                    label={t("faults.kind")}
                    value={f.kind}
                    onChange={(kind) => update(i, { kind, target: null })}
                    options={ALL_FAULT_KINDS.map((k) => ({
                      value: k,
                      label: t(`fault.${k}`),
                      disabled: !supported.includes(k),
                      hint: supported.includes(k) ? undefined : t("faults.comingSoon"),
                    }))}
                  />
                </div>
                <IconButton label={t("faults.remove")} onClick={() => write(faults.filter((_, k) => k !== i))} className="size-7">
                  <X size={14} aria-hidden />
                </IconButton>
              </div>
              <div className="flex items-center gap-1">
                <div className="min-w-0 flex-1">
                  {f.kind === "traffic-surge-3x" ? (
                    <p className="px-1 text-xs text-text-2">{t("faults.noTarget")}</p>
                  ) : (
                    <Select<string>
                      label={t("faults.target")}
                      value={f.target ?? ANY}
                      onChange={(v) => update(i, { target: v === ANY ? null : v })}
                      options={[{ value: ANY, label: t("faults.anyTarget") }, ...targets.map((id) => ({ value: id, label: label(id) }))]}
                    />
                  )}
                </div>
                <div className="w-28">
                  <NumberField
                    label={t("faults.at")}
                    value={f.atMs / 1000}
                    min={0}
                    max={durationS}
                    step={0.1}
                    onChange={(v) => v !== undefined && update(i, { atMs: Math.round(v * 1000) })}
                  />
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      <div className="flex gap-2 pt-2">
        <Button size="sm" onClick={() => write([...api.getState().design.faults, defaultFault(api.getState().design, metas, supported)])}>
          <Plus size={14} aria-hidden />
          {t("faults.add")}
        </Button>
        <Button size="sm" variant="ghost" onClick={addRandom}>
          <Dices size={14} aria-hidden />
          {t("faults.random")}
        </Button>
      </div>
    </Section>
  );
}
