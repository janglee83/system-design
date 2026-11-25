import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { Design } from "../model/design";
import { validateDesign } from "../model/design-file";
import { parsePreset, type Preset } from "../model/presets";

export interface SavedDesign {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  design: Design;
}

interface LabDb extends DBSchema {
  designs: { key: string; value: SavedDesign; indexes: { updatedAt: number } };
  presets: { key: string; value: Preset };
  kv: { key: string; value: unknown };
}

let dbp: Promise<IDBPDatabase<LabDb>> | null = null;

/** Database `sd-lab`, version 1 (R22). */
export function openLabDb(): Promise<IDBPDatabase<LabDb>> {
  dbp ??= openDB<LabDb>("sd-lab", 1, {
    upgrade(db) {
      db.createObjectStore("designs", { keyPath: "id" }).createIndex("updatedAt", "updatedAt");
      db.createObjectStore("presets", { keyPath: "id" });
      db.createObjectStore("kv");
    },
  }).catch((e) => {
    dbp = null;
    throw e;
  });
  return dbp;
}

/** Saved presets; entries that are not valid presets are skipped, not trusted. */
export const listPresets = async (): Promise<Preset[]> =>
  (await (await openLabDb()).getAll("presets")).map(parsePreset).filter((p): p is Preset => p !== null);
export const putPreset = async (p: Preset): Promise<void> => void (await (await openLabDb()).put("presets", p));
export const deletePreset = async (id: string): Promise<void> => (await openLabDb()).delete("presets", id);
export const getKv = async <T = unknown>(key: string): Promise<T | undefined> => (await (await openLabDb()).get("kv", key)) as T | undefined;
export const setKv = async (key: string, value: unknown): Promise<void> => void (await (await openLabDb()).put("kv", value, key));

/** A stored record that is a saved design, or null; damaged records are skipped, never trusted (review). */
function parseSaved(raw: unknown): SavedDesign | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Partial<SavedDesign>;
  if (typeof r.id !== "string" || typeof r.name !== "string" || typeof r.createdAt !== "number" || typeof r.updatedAt !== "number") return null;
  const design = validateDesign(r.design);
  return design ? { id: r.id, name: r.name, createdAt: r.createdAt, updatedAt: r.updatedAt, design } : null;
}

/** Saved designs, newest `updatedAt` first. No count limit (R22). */
export const listDesigns = async (): Promise<SavedDesign[]> =>
  (await (await openLabDb()).getAllFromIndex("designs", "updatedAt"))
    .reverse()
    .map(parseSaved)
    .filter((d): d is SavedDesign => d !== null);
export const getDesign = async (id: string): Promise<SavedDesign | undefined> => parseSaved(await (await openLabDb()).get("designs", id)) ?? undefined;
export const putDesign = async (d: SavedDesign): Promise<void> => void (await (await openLabDb()).put("designs", d));
export const deleteDesign = async (id: string): Promise<void> => (await openLabDb()).delete("designs", id);
