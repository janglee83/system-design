"use client";
import { createContext, useContext, useState } from "react";
import { useStore } from "zustand";
import { useEngineStore } from "@/engine/EngineProvider";
import type { Design } from "../model/design";
import { createCheckStore, hasBlocking, type CheckState } from "./check-store";
import { createDesignStore, type DesignState, type DesignStore } from "./design-store";
import { createRunStore, type RunState } from "./run-store";
import { createUiStore, type UiState } from "./ui-store";

interface Stores {
  design: DesignStore;
  ui: ReturnType<typeof createUiStore>;
  check: ReturnType<typeof createCheckStore>;
  runs: ReturnType<typeof createRunStore>;
}
const Ctx = createContext<Stores | null>(null);

export function LabStoresProvider({ initial, children }: { initial?: Design; children: React.ReactNode }) {
  const [stores] = useState<Stores>(() => ({
    design: createDesignStore(initial),
    ui: createUiStore(),
    check: createCheckStore(),
    runs: createRunStore(),
  }));
  return <Ctx.Provider value={stores}>{children}</Ctx.Provider>;
}

function useStores(): Stores {
  const s = useContext(Ctx);
  if (!s) throw new Error("Lab stores used outside LabStoresProvider");
  return s;
}

export const useDesign = <T,>(sel: (s: DesignState) => T): T => useStore(useStores().design, sel);
export const useDesignApi = (): DesignStore => useStores().design;
export const useUi = <T,>(sel: (s: UiState) => T): T => useStore(useStores().ui, sel);
export const useUiApi = () => useStores().ui;
export const useCheck = <T,>(sel: (s: CheckState) => T): T => useStore(useStores().check, sel);
export const useCheckApi = () => useStores().check;
export const useRuns = <T,>(sel: (s: RunState) => T): T => useStore(useStores().runs, sel);
export const useRunsApi = () => useStores().runs;

/** Run is possible once the engine is ready and the latest check found nothing blocking (R11). */
export function useCanRun(): boolean {
  const ready = useEngineStore((s) => s.status === "ready");
  const blocking = useCheck(hasBlocking);
  const checked = useCheck((s) => s.status === "done");
  return ready && checked && !blocking;
}
