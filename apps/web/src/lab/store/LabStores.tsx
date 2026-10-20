"use client";
import { createContext, useContext, useState } from "react";
import { useStore } from "zustand";
import type { Design } from "../model/design";
import { createDesignStore, type DesignState, type DesignStore } from "./design-store";
import { createUiStore, type UiState } from "./ui-store";

interface Stores {
  design: DesignStore;
  ui: ReturnType<typeof createUiStore>;
}
const Ctx = createContext<Stores | null>(null);

export function LabStoresProvider({ initial, children }: { initial?: Design; children: React.ReactNode }) {
  const [stores] = useState<Stores>(() => ({ design: createDesignStore(initial), ui: createUiStore() }));
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
