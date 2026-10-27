import { createStore } from "zustand/vanilla";

/** Which saved design the Lab is editing, and whether it has changed since the last save. */
export interface DocState {
  savedId: string | null;
  savedAt: number | null;
  dirty: boolean;
  markSaved(id: string, at?: number): void;
  markDirty(): void;
  /** A design was opened (or a draft restored): it matches `savedId` as of now. */
  reset(savedId: string | null): void;
}

export function createDocStore() {
  return createStore<DocState>()((set) => ({
    savedId: null,
    savedAt: null,
    dirty: false,
    markSaved: (id, at = Date.now()) => set({ savedId: id, savedAt: at, dirty: false }),
    markDirty: () => set({ dirty: true }),
    reset: (savedId) => set({ savedId, savedAt: null, dirty: false }),
  }));
}

export type DocStore = ReturnType<typeof createDocStore>;
