import type { Workload } from "@sd/sim";
import { z } from "zod";
import { ARRIVALS, PROFILES } from "@/i18n/engine-codes";
import type { Design } from "./design";

export type PresetWorkload = Omit<Workload, "params">;
export interface Preset {
  id: string;
  /** Built-in presets are named from the catalog; user presets carry their own name. */
  nameKey?: string;
  name?: string;
  workload: PresetWorkload;
}

const base: PresetWorkload = { profile: "mixed", baseRps: 1000, writeRatio: 0.2, clients: 1000, clientTimeoutMs: 1000, surge: null };

/** Our own defaults (R21). */
export const BUILT_IN_PRESETS: readonly Preset[] = [
  { id: "quiet", nameKey: "presets.quiet", workload: { ...base, profile: "read-heavy", baseRps: 200, writeRatio: 0.1, clients: 200 } },
  { id: "lunch", nameKey: "presets.lunch", workload: { ...base, baseRps: 3000, writeRatio: 0.2, clients: 5000 } },
  {
    id: "flashSale",
    nameKey: "presets.flashSale",
    workload: { ...base, baseRps: 8000, writeRatio: 0.3, clients: 20000, surge: { factor: 3, atMs: 4000, durationMs: 3000 } },
  },
  { id: "writeStorm", nameKey: "presets.writeStorm", workload: { ...base, profile: "write-heavy", baseRps: 2000, writeRatio: 0.7, clients: 3000 } },
];

/** Replaces the traffic with the preset's; keeps params, duration and seed (R21). */
export function applyPreset(d: Design, p: Preset): Design {
  const rest: Workload = { ...d.workload };
  delete rest.trafficEndMs; // a preset without these means "not set"
  delete rest.arrivals;
  return { ...d, workload: { ...rest, ...structuredClone(p.workload), params: { ...d.workload.params } } };
}

/** The workload as a preset stores it: everything except the scenario params. */
export function presetWorkload(w: Workload): PresetWorkload {
  const copy: Partial<Workload> = structuredClone(w);
  delete copy.params;
  return copy as PresetWorkload;
}

const PresetSchema = z.object({
  id: z.string().min(1),
  nameKey: z.string().optional(),
  name: z.string().optional(),
  workload: z.object({
    profile: z.enum(PROFILES),
    baseRps: z.number().finite().min(0),
    writeRatio: z.number().min(0).max(1),
    clients: z.number().int().min(1),
    clientTimeoutMs: z.number().finite().positive(),
    surge: z.object({ factor: z.number().finite().min(0), atMs: z.number().finite().min(0), durationMs: z.number().finite().min(0) }).nullable(),
    trafficEndMs: z.number().finite().min(0).optional(),
    arrivals: z.enum(ARRIVALS).optional(),
  }),
});

/** A stored preset, or null when the stored value is not one (another version, or a damaged entry). */
export function parsePreset(value: unknown): Preset | null {
  const r = PresetSchema.safeParse(value);
  return r.success ? (r.data as Preset) : null;
}
