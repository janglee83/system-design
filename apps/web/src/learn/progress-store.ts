"use client";
import { getKv, setKv } from "@/lab/designs/db";
import type { Progress } from "./gating";

/** Where learning progress lives. Local for now (default 4); an account-backed store can replace it later. */
export interface ProgressStore {
  load(): Promise<Progress>;
  save(p: Progress): Promise<void>;
}

const EMPTY: Progress = { doneLessons: [], passedChallenges: [] };

/** Progress in this browser's IndexedDB (`sd-lab` kv, key "progress"). */
export const localProgress: ProgressStore = {
  async load() {
    try {
      const v = await getKv<Progress>("progress");
      return v && Array.isArray(v.doneLessons) && Array.isArray(v.passedChallenges) ? v : EMPTY;
    } catch {
      return EMPTY;
    }
  },
  async save(p) {
    await setKv("progress", p).catch(() => undefined);
  },
};
