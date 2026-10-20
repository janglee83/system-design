"use client";
import type { Arrivals, Profile, Workload } from "@sd/sim";
import { Plus, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId, useRef, useState } from "react";
import { ARRIVALS, PROFILES } from "@/i18n/engine-codes";
import { Field } from "@/ui/Field";
import { IconButton } from "@/ui/IconButton";
import { NumberField } from "@/ui/NumberField";
import { Section } from "@/ui/Section";
import { Select } from "@/ui/Select";
import { Switch } from "@/ui/Switch";
import type { Design } from "../model/design";
import { setDuration, setSeed, setWorkload } from "../model/ops";
import { useDesign, useDesignApi } from "../store/LabStores";

const DEFAULT_SURGE = { factor: 3, atMs: 3000, durationMs: 2000 };
const MAX_SEED = 4_294_967_295;
/** sim-core caps a run at 600 000 ms. */
const MAX_DURATION_S = 600;
const ms = (s: number) => Math.round(s * 1000);

/** Traffic, scenario parameters and run settings of the design (spec §5.2). */
export function WorkloadForm({ workloadParams }: { workloadParams: readonly string[] }) {
  const t = useTranslations();
  const api = useDesignApi();
  const workload = useDesign((s) => s.design.workload);
  const durationMs = useDesign((s) => s.design.durationMs);
  const seed = useDesign((s) => s.design.seed);
  const apply = (fn: (d: Design) => Design) => api.getState().apply(fn);
  const patch = (p: Partial<Workload>) => apply((d) => setWorkload(d, p));
  const sec = t("workload.seconds");

  return (
    <div className="flex flex-col">
      <Section title={t("workload.traffic")} defaultOpen>
        <Field label={t("workload.field.profile")}>
          <Select<Profile>
            label={t("workload.field.profile")}
            value={workload.profile}
            onChange={(profile) => patch({ profile })}
            options={PROFILES.map((p) => ({ value: p, label: t(`profile.${p}`) }))}
          />
        </Field>
        <Field label={t("workload.field.baseRps")}>
          <NumberField label={t("workload.field.baseRps")} value={workload.baseRps} min={0} max={1_000_000} step={100} onChange={(v) => v !== undefined && patch({ baseRps: v })} />
        </Field>
        <Field label={t("workload.field.writeRatio")}>
          <NumberField
            label={t("workload.field.writeRatio")}
            value={Math.round(workload.writeRatio * 100)}
            min={0}
            max={100}
            integer
            unit={t("workload.percent")}
            onChange={(v) => v !== undefined && patch({ writeRatio: v / 100 })}
          />
        </Field>
        <Field label={t("workload.field.clients")}>
          <NumberField label={t("workload.field.clients")} value={workload.clients} min={1} max={10_000_000} integer onChange={(v) => v !== undefined && patch({ clients: v })} />
        </Field>
        <Field label={t("workload.field.clientTimeoutMs")}>
          <NumberField label={t("workload.field.clientTimeoutMs")} value={workload.clientTimeoutMs} min={1} max={600_000} integer step={100} onChange={(v) => v !== undefined && patch({ clientTimeoutMs: v })} />
        </Field>
        <Field label={t("workload.field.arrivals")}>
          <Select<Arrivals>
            label={t("workload.field.arrivals")}
            value={workload.arrivals ?? "poisson"}
            onChange={(arrivals) => patch({ arrivals })}
            options={ARRIVALS.map((a) => ({ value: a, label: t(`arrivals.${a}`) }))}
          />
        </Field>
        <Field label={t("workload.surgeToggle")}>
          <Switch label={t("workload.surgeToggle")} checked={workload.surge !== null} onChange={(on) => patch({ surge: on ? { ...DEFAULT_SURGE } : null })} />
        </Field>
        {workload.surge ? (
          <div className="border-l-2 border-border pl-2">
            <Field label={t("workload.field.surge.factor")}>
              <NumberField label={t("workload.field.surge.factor")} value={workload.surge.factor} min={0} max={20} step={0.5} onChange={(v) => v !== undefined && patch({ surge: { ...workload.surge!, factor: v } })} />
            </Field>
            <Field label={t("workload.field.surge.atMs")}>
              <NumberField label={t("workload.field.surge.atMs")} value={workload.surge.atMs / 1000} min={0} max={MAX_DURATION_S} unit={sec} onChange={(v) => v !== undefined && patch({ surge: { ...workload.surge!, atMs: ms(v) } })} />
            </Field>
            <Field label={t("workload.field.surge.durationMs")}>
              <NumberField label={t("workload.field.surge.durationMs")} value={workload.surge.durationMs / 1000} min={0} max={MAX_DURATION_S} unit={sec} onChange={(v) => v !== undefined && patch({ surge: { ...workload.surge!, durationMs: ms(v) } })} />
            </Field>
          </div>
        ) : null}
        <Field label={t("workload.field.trafficEndMs")}>
          <NumberField
            label={t("workload.field.trafficEndMs")}
            value={workload.trafficEndMs === undefined ? undefined : workload.trafficEndMs / 1000}
            min={0}
            max={MAX_DURATION_S}
            unit={sec}
            allowEmpty
            onChange={(v) => patch({ trafficEndMs: v === undefined ? undefined : ms(v) })}
          />
        </Field>
      </Section>
      <Section title={t("workload.params")} defaultOpen>
        <ParamRows params={workload.params} known={workloadParams} onChange={(params) => patch({ params })} />
      </Section>
      <Section title={t("workload.runSettings")} defaultOpen>
        <Field label={t("workload.field.durationMs")}>
          <NumberField label={t("workload.field.durationMs")} value={durationMs / 1000} min={1} max={MAX_DURATION_S} step={1} unit={sec} onChange={(v) => v !== undefined && apply((d) => setDuration(d, ms(v)))} />
        </Field>
        <Field label={t("workload.field.seed")}>
          <NumberField label={t("workload.field.seed")} value={seed} min={0} max={MAX_SEED} integer onChange={(v) => v !== undefined && apply((d) => setSeed(d, v))} />
        </Field>
      </Section>
    </div>
  );
}

function ParamRows({
  params,
  known,
  onChange,
}: {
  params: Workload["params"];
  known: readonly string[];
  onChange: (p: Workload["params"]) => void;
}) {
  const t = useTranslations("workload");
  const listId = useId();
  const [name, setName] = useState("");
  const [value, setValue] = useState<number | undefined>(undefined);
  // Refs as well as state: a click on "Add" right after typing first blurs (commits) the value.
  const nameRef = useRef("");
  const valueRef = useRef<number | undefined>(undefined);
  const entries = Object.entries(params).filter((e): e is [string, number] => typeof e[1] === "number");

  const add = () => {
    const key = nameRef.current.trim();
    const v = valueRef.current;
    if (!key || v === undefined) return;
    onChange({ ...params, [key]: v });
    nameRef.current = "";
    valueRef.current = undefined;
    setName("");
    setValue(undefined);
  };
  const remove = (key: string) => {
    const next = { ...params };
    delete next[key];
    onChange(next);
  };

  return (
    <div className="flex flex-col gap-1">
      {entries.map(([key, v]) => (
        <div key={key} data-testid={`param-${key}`}>
          <Field label={key}>
            <NumberField label={key} value={v} onChange={(x) => x !== undefined && onChange({ ...params, [key]: x })} />
            <IconButton label={t("paramRemove", { name: key })} onClick={() => remove(key)} className="size-7">
              <X size={14} aria-hidden />
            </IconButton>
          </Field>
          {known.includes(key) ? null : <p className="pb-1 text-xs text-text-3">{t("paramIgnored", { name: key })}</p>}
        </div>
      ))}
      <div className="flex items-center gap-1">
        <input
          type="text"
          list={listId}
          aria-label={t("paramKey")}
          placeholder={t("paramKey")}
          value={name}
          onChange={(e) => {
            nameRef.current = e.target.value;
            setName(e.target.value);
          }}
          className="h-8 min-w-0 flex-1 rounded-sm border border-border-strong bg-surface px-2 text-sm placeholder:text-text-3"
        />
        <datalist id={listId}>
          {known.map((k) => (
            <option key={k} value={k} />
          ))}
        </datalist>
        <div className="w-28">
          <NumberField
            label={t("paramValue")}
            value={value}
            allowEmpty
            onChange={(v) => {
              valueRef.current = v;
              setValue(v);
            }}
          />
        </div>
        <IconButton label={t("paramAdd")} onClick={add} className="size-7">
          <Plus size={14} aria-hidden />
        </IconButton>
      </div>
    </div>
  );
}
