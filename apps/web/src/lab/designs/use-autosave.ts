"use client";
import { useEffect } from "react";
import type { Design } from "../model/design";
import type { DesignStore } from "../store/design-store";
import type { DocStore } from "../store/doc-store";
import { useDesignApi, useDocApi } from "../store/LabStores";
import { getKv, setKv } from "./db";

export const AUTOSAVE_MS = 1000;
export interface Draft {
  design: Design;
  savedId: string | null;
  at: number;
}

/** Writes the draft now (after a save, or before the locale changes, R33). Storage errors are ignored. */
export function flushDraft(design: DesignStore, doc: DocStore): Promise<void> {
  const draft: Draft = { design: design.getState().design, savedId: doc.getState().savedId, at: Date.now() };
  return setKv("draft", draft).catch(() => {});
}

/** 1 s after the last change, keeps the design as the draft (R22); any change makes the doc dirty. */
export function useAutosave(): void {
  const design = useDesignApi();
  const doc = useDocApi();
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const unsub = design.subscribe((s, prev) => {
      if (s.design === prev.design) return;
      doc.getState().markDirty();
      clearTimeout(timer);
      timer = setTimeout(() => void flushDraft(design, doc), AUTOSAVE_MS);
    });
    return () => {
      clearTimeout(timer);
      unsub();
    };
  }, [design, doc]);
}

export const loadDraft = (): Promise<Draft | undefined> => getKv<Draft>("draft").catch(() => undefined);
