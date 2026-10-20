"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { useStore } from "zustand";
import { createBrowserEngine } from "./client";
import { createEngineStore, type EngineState, type EngineStore } from "./engine-store";

const Ctx = createContext<EngineStore | null>(null);

/** One engine per tab, created on first use (the shell mounts it; the Lab starts it). */
export function EngineProvider({ children }: { children: React.ReactNode }) {
  const [store] = useState(() => createEngineStore(createBrowserEngine));
  useEffect(() => () => store.getState().client?.terminate(), [store]);
  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useEngineStore<T>(selector: (s: EngineState) => T): T {
  const store = useContext(Ctx);
  if (!store) throw new Error("useEngineStore outside EngineProvider");
  return useStore(store, selector);
}

/** Starts the engine when the calling component mounts. */
export function useEngineStart(): void {
  const start = useEngineStore((s) => s.start);
  useEffect(() => start(), [start]);
}
