"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { create } from "zustand";
import type { SearchItem } from "./search";

type SetItems = (key: string, items: SearchItem[] | null) => void;
// The setter has its own context so registering never changes it: a setter that changed with the
// items would re-run every registration effect, which registers again, for ever.
const SetCtx = createContext<SetItems | null>(null);
const ItemsCtx = createContext<SearchItem[]>([]);

/** Commands contributed by the page (the Lab), merged in registration order. */
export function CommandRegistryProvider({ children }: { children: React.ReactNode }) {
  const [byKey, setByKey] = useState<ReadonlyMap<string, SearchItem[]>>(new Map());
  const set = useCallback<SetItems>(
    (key, items) =>
      setByKey((m) => {
        const next = new Map(m);
        if (items) next.set(key, items);
        else next.delete(key);
        return next;
      }),
    [],
  );
  const items = useMemo(() => [...byKey.values()].flat(), [byKey]);
  return (
    <SetCtx.Provider value={set}>
      <ItemsCtx.Provider value={items}>{children}</ItemsCtx.Provider>
    </SetCtx.Provider>
  );
}

export function useRegisteredCommands(): SearchItem[] {
  return useContext(ItemsCtx);
}

/** Adds `items` while the calling component is mounted. */
export function useRegisterCommands(key: string, items: SearchItem[]): void {
  const set = useContext(SetCtx);
  useEffect(() => {
    set?.(key, items);
    return () => set?.(key, null);
  }, [set, key, items]);
}

/** Whether the palette is open (the top-bar button, Mod+K, tests). */
export const usePaletteOpen = create<{ open: boolean; setOpen(open: boolean): void }>()((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
}));
