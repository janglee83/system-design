import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { Design } from "../model/design";
import type { Preset } from "../model/presets";

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

export const listPresets = async (): Promise<Preset[]> => (await openLabDb()).getAll("presets");
export const putPreset = async (p: Preset): Promise<void> => void (await (await openLabDb()).put("presets", p));
export const deletePreset = async (id: string): Promise<void> => (await openLabDb()).delete("presets", id);
export const getKv = async <T = unknown>(key: string): Promise<T | undefined> => (await (await openLabDb()).get("kv", key)) as T | undefined;
export const setKv = async (key: string, value: unknown): Promise<void> => void (await (await openLabDb()).put("kv", value, key));

/** Saved designs, newest `updatedAt` first. No count limit (R22). */
export const listDesigns = async (): Promise<SavedDesign[]> =>
  (await (await openLabDb()).getAllFromIndex("designs", "updatedAt")).reverse();
export const getDesign = async (id: string): Promise<SavedDesign | undefined> => (await openLabDb()).get("designs", id);
export const putDesign = async (d: SavedDesign): Promise<void> => void (await (await openLabDb()).put("designs", d));
export const deleteDesign = async (id: string): Promise<void> => (await openLabDb()).delete("designs", id);
