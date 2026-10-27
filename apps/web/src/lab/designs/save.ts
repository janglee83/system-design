import { setName } from "../model/ops";
import type { DesignStore } from "../store/design-store";
import type { DocStore } from "../store/doc-store";
import { getDesign, putDesign } from "./db";
import { flushDraft } from "./use-autosave";

export interface DocStores {
  design: DesignStore;
  doc: DocStore;
}

async function write(stores: DocStores, id: string, name: string, createdAt: number): Promise<string> {
  if (stores.design.getState().design.name !== name) stores.design.getState().apply((d) => setName(d, name));
  const now = Date.now();
  await putDesign({ id, name, createdAt, updatedAt: now, design: stores.design.getState().design });
  stores.doc.getState().markSaved(id, now);
  await flushDraft(stores.design, stores.doc); // a reload right after saving keeps everything
  return id;
}

/**
 * Saves over the open saved design, or creates one named `name` (required the first time).
 * Throws when storage is unavailable; callers show `designs.storageUnavailable`.
 */
export async function saveCurrent(stores: DocStores, name?: string): Promise<string> {
  const id = stores.doc.getState().savedId;
  const existing = id ? await getDesign(id) : undefined;
  if (id && existing) return write(stores, id, name ?? existing.name, existing.createdAt);
  if (!name) throw new Error("a first save needs a name");
  return write(stores, crypto.randomUUID(), name, Date.now());
}

/** Saves the current design as a new saved design and switches to it. */
export const saveAs = (stores: DocStores, name: string): Promise<string> => write(stores, crypto.randomUUID(), name, Date.now());

/** Loads a saved design (fresh undo history). The caller has asked about unsaved changes. */
export async function openSaved(stores: DocStores, id: string): Promise<boolean> {
  const saved = await getDesign(id);
  if (!saved) return false;
  stores.design.getState().replace(saved.design);
  stores.doc.getState().reset(id); // after replace: replacing marks the doc dirty
  return true;
}

export async function renameSaved(id: string, name: string): Promise<void> {
  const saved = await getDesign(id);
  if (!saved) return;
  await putDesign({ ...saved, name, design: { ...saved.design, name }, updatedAt: Date.now() });
}

/** A copy named "<name> (<suffix>)"; returns the new id. */
export async function duplicateSaved(id: string, suffix: string): Promise<string> {
  const saved = await getDesign(id);
  if (!saved) throw new Error(`no saved design ${id}`);
  const copy = crypto.randomUUID();
  const name = `${saved.name} (${suffix})`;
  const now = Date.now();
  await putDesign({ id: copy, name, createdAt: now, updatedAt: now, design: { ...saved.design, name } });
  return copy;
}
