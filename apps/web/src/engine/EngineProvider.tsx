"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { useStore } from "zustand";
import { createBrowserEngine, type EngineClient } from "./client";
import { createEngineStore, type EngineState, type EngineStore } from "./engine-store";

const Ctx = createContext<EngineStore | null>(null);

/** One engine per tab, created on first use (the shell mounts it; the Lab starts it). */
export function EngineProvider({
  children,
  makeClient = createBrowserEngine,
}: {
  children: React.ReactNode;
  /** Tests inject an in-process worker. */
  makeClient?: () => EngineClient;
}) {
  const [store] = useState(() => createEngineStore(makeClient));
  // stop(), not just terminate(): under StrictMode React unmounts and remounts effects, and the
  // remounted start() must create a fresh client instead of reusing the terminated one.
  useEffect(() => () => store.getState().stop(), [store]);
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
